// src/AI/services/geminiLiveService.ts
// Gemini HomeMade 2.0 — Live API
// WebSocket streaming: mikrofon → PCM 16kHz → Gemini → PCM 24kHz → reproduktory
// Wake word detection z inputTranscription, function calling, VAD.

import { GoogleGenAI, Modality, EndSensitivity, StartSensitivity } from '@google/genai';
import type { Session, LiveServerMessage } from '@google/genai';
import { configService } from '../../services/configService';
import { aiLog } from './aiLogger';
import { executeFunction, SYSTEM_PROMPT } from './geminiApi';
import { toolsDefinition } from '../tools';

// ==================== TYPY ====================

export type LiveState = 'off' | 'dormant' | 'listening' | 'processing' | 'speaking';

export interface GeminiLiveCallbacks {
  onStateChange: (state: LiveState) => void;
  onTranscript: (text: string) => void;       // přepis uživatele
  onResponse: (text: string) => void;         // přepis odpovědi modelu
  onError: (msg: string) => void;
}

// ==================== KONSTANTY ====================

// Gemini 3 Live model (https://ai.google.dev/gemini-api/docs/models/gemini-3.1-flash-live-preview)
// "High-quality, low-latency Live API model for real-time dialogue and voice-first AI applications"
// Fallback pokud selže: 'gemini-live-2.5-flash-preview' nebo 'gemini-2.0-flash-live-preview-04-09'
const MODEL = 'gemini-3.1-flash-live-preview';

// ── Výběr hlasu ─────────────────────────────────────────────────────────────
// Všech 30 dostupných hlasů (https://ai.google.dev/gemini-api/docs/speech-generation)
// Zkus je postupně, pokud je přízvuk špatný — změň VOICE níže.
//
// Charakter hlasu:
//   Zephyr       — Bright        Puck         — Upbeat
//   Charon       — Informative   Kore         — Firm
//   Fenrir       — Excitable     Leda         — Youthful
//   Orus         — Firm          Aoede        — Breezy       ← původní, špatný přízvuk
//   Callirrhoe   — Easy-going    Autonoe      — Bright
//   Enceladus    — Breathy       Iapetus      — Clear        ← dobrý kandidát pro CZ
//   Umbriel      — Easy-going    Algieba      — Smooth
//   Despina      — Smooth        Erinome      — Clear        ← dobrý kandidát pro CZ
//   Algenib      — Gravelly      Rasalgethi   — Informative
//   Laomedeia    — Upbeat        Achernar     — Soft
//   Alnilam      — Firm          Schedar      — Even
//   Gacrux       — Mature        Pulcherrima  — Forward
//   Achird       — Friendly      Zubenelgenubi— Casual
//   Vindemiatrix — Gentle        Sadachbia    — Lively
//   Sadaltager   — Knowledgeable Sulafat      — Warm
//
// Pro češtinu jsou nejlepší kandidáti: Kore, Iapetus, Erinome, Charon, Sulafat
const VOICE = 'Kore';   // ← ZMĚŇ ZDE pro testování jiného hlasu

// Wake word fráze v češtině (Android transkribuje různě)
const WAKE_PHRASES = [
  'gemini', 'hej gemini', 'hey gemini', 'ahoj gemini',
  'hejgemini', 'hegemi', 'hej geminii', 'geminii', 'džemini',
  'ok gemini', 'hele gemini', 'good gemini', 'ej gemini',
];

// Systémový prompt rozšířený o wake-word instrukce
const LIVE_SYSTEM_PROMPT = `${SYSTEM_PROMPT}

WAKE-WORD INSTRUKCE:
Jsi v pohotovostním režimu. Nasloucháš mikrofonu nepřetržitě.
ODPOVÍDEJ POUZE pokud uživatel začne nebo obsahuje slovo "Gemini" nebo "Hej Gemini".
Pokud uživatel mluví bez probuzovacího slova, NEVYDÁVEJ ŽÁDNÝ ZVUK ANI TEXT.
Jakmile zaslechneš "Gemini" + příkaz, okamžitě zpracuj příkaz a odpověz.
`;

// ==================== HELPER: konverze toolsDefinition ====================
// toolsDefinition používá snake_case (function_declarations), Live API chce camelCase
function buildLiveTools() {
  return toolsDefinition.map(td => ({
    functionDeclarations: (td as any).function_declarations ?? (td as any).functionDeclarations ?? [],
  }));
}

// ==================== HELPER: PCM playback ====================

class PcmPlayer {
  private ctx: AudioContext;
  private nextPlayTime = 0;

  constructor() {
    this.ctx = new AudioContext({ sampleRate: 24000 });
  }

  enqueue(base64: string): void {
    try {
      // base64 → binary → Int16Array
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

      // Int16 → Float32
      const int16 = new Int16Array(bytes.buffer);
      const float32 = new Float32Array(int16.length);
      for (let i = 0; i < int16.length; i++) {
        float32[i] = int16[i] / 32768;
      }

      if (float32.length === 0) return;

      const buffer = this.ctx.createBuffer(1, float32.length, 24000);
      buffer.copyToChannel(float32, 0);

      const src = this.ctx.createBufferSource();
      src.buffer = buffer;
      src.connect(this.ctx.destination);

      const startAt = Math.max(this.ctx.currentTime + 0.02, this.nextPlayTime);
      src.start(startAt);
      this.nextPlayTime = startAt + buffer.duration;
    } catch (e) {
      aiLog('WARN', `PcmPlayer.enqueue chyba: ${String(e)}`);
    }
  }

  stop(): void {
    // Zastavíme přehrávání — zavřeme a znovu otevřeme context
    try {
      this.ctx.close();
    } catch (_) { /* ignore */ }
    this.ctx = new AudioContext({ sampleRate: 24000 });
    this.nextPlayTime = 0;
  }

  destroy(): void {
    try { this.ctx.close(); } catch (_) { /* ignore */ }
  }
}

// ==================== HLAVNÍ TŘÍDA ====================

export class GeminiLiveService {
  private callbacks: GeminiLiveCallbacks;
  private session: Session | null = null;
  private micStream: MediaStream | null = null;
  private audioCtx: AudioContext | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private player: PcmPlayer | null = null;
  private state: LiveState = 'off';
  private _destroyed = false;
  private _wsOk = false;   // true po úspěšném onopen, false po onclose/onerror

  // Průběžný přepis modelu
  private modelTranscriptBuf = '';

  constructor(callbacks: GeminiLiveCallbacks) {
    this.callbacks = callbacks;
  }

  // ─────────────────────────────────────────────
  //  PUBLIC API
  // ─────────────────────────────────────────────

  /** Spustí session (mikrofon + WebSocket) */
  async start(): Promise<void> {
    if (this._destroyed) return;
    aiLog('INFO', 'GeminiLive: start()');
    try {
      await this._openSession();
      // Počkáme krátce — onclose přijde asynchronně těsně po connect()
      await new Promise<void>(r => setTimeout(r, 300));
      // Zkontrolujeme, že WebSocket je stále otevřen (mohl selhat s 1011)
      if (!this._wsOk) {
        throw new Error('Session se ihned uzavřela — zkontroluj model a API klíč.');
      }
      await this._startMic();
      this._setState('dormant');
    } catch (e) {
      const msg = `Nepodařilo se spustit Live API: ${String(e)}`;
      aiLog('ERR', msg);
      this.callbacks.onError(msg);
      this._setState('off');
    }
  }

  /** Zastaví session a mikrofon */
  stop(): void {
    aiLog('INFO', 'GeminiLive: stop()');
    this._closeMic();
    this._closeSession();
    this.player?.stop();
    this._setState('off');
  }

  /** Zruší aktuální odpověď (interrupt) */
  cancel(): void {
    aiLog('INFO', 'GeminiLive: cancel()');
    this.player?.stop();
    this._setState('dormant');
    this.modelTranscriptBuf = '';
  }

  /** Manuálně aktivuje poslouchání (klik na orb) */
  activateManually(): void {
    if (this.state === 'dormant') {
      aiLog('INFO', 'GeminiLive: manuální aktivace');
      this._setState('listening');
    }
  }

  /** Zničí instanci (cleanup při unmount) */
  destroy(): void {
    this._destroyed = true;
    this._closeMic();
    this._closeSession();
    this.player?.destroy();
    this.player = null;
  }

  getState(): LiveState {
    return this.state;
  }

  // ─────────────────────────────────────────────
  //  PRIVATE: SESSION
  // ─────────────────────────────────────────────

  private async _openSession(): Promise<void> {
    const key = await configService.getApiKey('gemini');
    if (!key) throw new Error('Chybí Gemini API klíč (Firestore: appConfig/apiKeys/gemini)');

    const ai = new GoogleGenAI({ apiKey: key });

    aiLog('INFO', `GeminiLive: připojuji k modelu ${MODEL}, hlas: ${VOICE}`);

    this.session = await ai.live.connect({
      model: MODEL,
      config: {
        responseModalities: [Modality.AUDIO],   // Live API: jen AUDIO; přepis přes outputAudioTranscription
        systemInstruction: { parts: [{ text: LIVE_SYSTEM_PROMPT }] },
        tools: buildLiveTools() as any,
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: VOICE } },
        },
        inputAudioTranscription: {},   // chceme přepis vstupu
        outputAudioTranscription: {},  // chceme přepis výstupu
        realtimeInputConfig: {
          automaticActivityDetection: {
            disabled: false,
            startOfSpeechSensitivity: StartSensitivity.START_SENSITIVITY_HIGH,
            endOfSpeechSensitivity: EndSensitivity.END_SENSITIVITY_LOW,
            prefixPaddingMs: 200,
            silenceDurationMs: 1500,
          },
        },
      },
      callbacks: {
        onopen: () => {
          this._wsOk = true;
          aiLog('INFO', 'GeminiLive: WebSocket otevřen');
        },
        onmessage: (msg: LiveServerMessage) => this._handleMessage(msg),
        onerror: (e: ErrorEvent) => {
          this._wsOk = false;
          aiLog('ERR', `GeminiLive WS error: ${e.message ?? String(e)}`);
          this.callbacks.onError(`Chyba spojení: ${e.message ?? 'neznámá chyba'}`);
        },
        onclose: (e: CloseEvent) => {
          this._wsOk = false;
          const hint = e.code === 1011
            ? ' (1011 = server error — zkus jiný model nebo zkontroluj API klíč)'
            : e.code === 1008
            ? ' (1008 = policy violation — zkontroluj API klíč / quota)'
            : '';
          aiLog('INFO', `GeminiLive: WS uzavřen (code=${e.code}, reason=${e.reason})${hint}`);
          this.session = null;   // explicitně nullujeme
          if (!this._destroyed && this.state !== 'off') {
            this._setState('off');
          }
        },
      },
    });

    aiLog('INFO', 'GeminiLive: session vytvořena');
  }

  private _closeSession(): void {
    if (this.session) {
      try { this.session.close(); } catch (_) { /* ignore */ }
      this.session = null;
    }
  }

  // ─────────────────────────────────────────────
  //  PRIVATE: MIKROFON + WORKLET
  // ─────────────────────────────────────────────

  private async _startMic(): Promise<void> {
    // Požadujeme mono, 16kHz
    this.micStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        sampleRate: 16000,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });

    // AudioContext na 16kHz — Chrome bude resamplovate interně
    this.audioCtx = new AudioContext({ sampleRate: 16000 });

    // Načteme AudioWorklet procesor
    await this.audioCtx.audioWorklet.addModule('/ai-pcm-processor.js');

    const sourceNode = this.audioCtx.createMediaStreamSource(this.micStream);
    this.workletNode = new AudioWorkletNode(this.audioCtx, 'ai-pcm-processor');

    // Přijímáme Int16 chunky a posíláme do Gemini
    this.workletNode.port.onmessage = (ev: MessageEvent<ArrayBuffer>) => {
      if (!this.session || this._destroyed) return;
      const int16 = new Int16Array(ev.data);
      const base64 = btoa(String.fromCharCode(...new Uint8Array(int16.buffer)));
      try {
        this.session.sendRealtimeInput({
          audio: { data: base64, mimeType: 'audio/pcm;rate=16000' },
        });
      } catch (e) {
        // Silence — session může být momentálně uzavřena
      }
    };

    sourceNode.connect(this.workletNode);
    // workletNode NENÍ připojen k destination — chceme jen zpracovávat, ne přehrávat zpět
    aiLog('INFO', 'GeminiLive: mikrofon spuštěn, AudioWorklet aktivní');
  }

  private _closeMic(): void {
    if (this.workletNode) {
      this.workletNode.disconnect();
      this.workletNode = null;
    }
    if (this.micStream) {
      this.micStream.getTracks().forEach(t => t.stop());
      this.micStream = null;
    }
    if (this.audioCtx) {
      try { this.audioCtx.close(); } catch (_) { /* ignore */ }
      this.audioCtx = null;
    }
  }

  // ─────────────────────────────────────────────
  //  PRIVATE: MESSAGE HANDLER
  // ─────────────────────────────────────────────

  private async _handleMessage(msg: LiveServerMessage): Promise<void> {
    if (this._destroyed) return;

    const sc = msg.serverContent;

    // ── Přepis vstupu (co uživatel řekl) ──
    if (sc?.inputTranscription?.text) {
      const text = sc.inputTranscription.text.trim();
      if (text) {
        aiLog('INFO', `Transcript: "${text}"`);

        // Wake word detekce — jen v dormant stavu
        if (this.state === 'dormant') {
          if (this._containsWakeWord(text)) {
            aiLog('INFO', `Wake word detekován: "${text}"`);
            this._setState('listening');
            this.callbacks.onTranscript(text);
          }
          // Bez wake word v dormant — ignorujeme
        } else {
          this.callbacks.onTranscript(text);
        }
      }
    }

    // ── Zvuk od modelu ──
    if (sc?.modelTurn?.parts) {
      let hasAudio = false;
      for (const part of sc.modelTurn.parts) {
        const inlineData = (part as any).inlineData;
        if (inlineData?.data && inlineData.mimeType?.startsWith('audio/')) {
          // Přehráváme audio jen pokud jsme v aktivním stavu
          if (this.state === 'listening' || this.state === 'processing' || this.state === 'speaking') {
            if (!this.player) this.player = new PcmPlayer();
            this.player.enqueue(inlineData.data);
            hasAudio = true;
          }
        }
      }
      if (hasAudio && this.state !== 'speaking') {
        this._setState('speaking');
      }
    }

    // ── Přepis výstupu (co model řekl) ──
    if (sc?.outputTranscription?.text) {
      const text = sc.outputTranscription.text;
      this.modelTranscriptBuf += text;
      // Průběžně aktualizujeme response
      if (this.state === 'processing' || this.state === 'speaking') {
        this.callbacks.onResponse(this.modelTranscriptBuf);
      }
    }

    // ── Konec turnu modelu ──
    if (sc?.turnComplete) {
      aiLog('INFO', 'GeminiLive: turnComplete');
      if (this.modelTranscriptBuf) {
        this.callbacks.onResponse(this.modelTranscriptBuf);
        this.modelTranscriptBuf = '';
      }
      // Vrátíme se do dormant po krátkém zpoždění (aby se dohrál zvuk)
      setTimeout(() => {
        if (!this._destroyed && this.state !== 'off') {
          this._setState('dormant');
        }
      }, 800);
    }

    // ── Interrupted (model byl přerušen) ──
    if (sc?.interrupted) {
      aiLog('INFO', 'GeminiLive: interrupted');
      this.player?.stop();
      this.modelTranscriptBuf = '';
    }

    // ── Tool calls (function calling) ──
    if (msg.toolCall?.functionCalls?.length) {
      await this._handleToolCalls(msg.toolCall.functionCalls);
    }
  }

  // ─────────────────────────────────────────────
  //  PRIVATE: TOOL CALLING
  // ─────────────────────────────────────────────

  private async _handleToolCalls(
    functionCalls: Array<{ id?: string; name?: string; args?: Record<string, unknown> }>
  ): Promise<void> {
    if (!this.session) return;
    aiLog('INFO', `GeminiLive: tool calls (${functionCalls.length}): ${functionCalls.map(f => f.name).join(', ')}`);
    this._setState('processing');

    const responses = await Promise.all(
      functionCalls.map(async fc => {
        const name = fc.name ?? '';
        const args = (fc.args ?? {}) as Record<string, any>;
        try {
          const result = await executeFunction(name, args);
          aiLog('INFO', `Tool ${name} → ${result.slice(0, 80)}`);
          return { id: fc.id ?? '', name, response: { output: result } };
        } catch (e) {
          aiLog('ERR', `Tool ${name} chyba: ${String(e)}`);
          return { id: fc.id ?? '', name, response: { error: String(e) } };
        }
      })
    );

    try {
      this.session.sendToolResponse({ functionResponses: responses });
    } catch (e) {
      aiLog('ERR', `sendToolResponse chyba: ${String(e)}`);
    }
  }

  // ─────────────────────────────────────────────
  //  PRIVATE: HELPERS
  // ─────────────────────────────────────────────

  private _setState(newState: LiveState): void {
    if (this.state === newState) return;
    aiLog('INFO', `GeminiLive: stav ${this.state} → ${newState}`);
    this.state = newState;
    this.callbacks.onStateChange(newState);
  }

  private _containsWakeWord(text: string): boolean {
    const lower = text.toLowerCase().replace(/[,!?.]/g, '').trim();
    return WAKE_PHRASES.some(phrase => lower.includes(phrase));
  }
}
