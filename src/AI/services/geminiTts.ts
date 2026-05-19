// src/AI/services/geminiTts.ts
// Gemini TTS (gemini-2.5-flash-preview-tts)
// Fallback: browser SpeechSynthesis cs-CZ

import { configService } from '../../services/configService';
import { aiLog } from './aiLogger';

let cachedKey: string | null = null;
const getKey = async () => {
  if (!cachedKey) cachedKey = await configService.getApiKey('gemini');
  return cachedKey || '';
};

function pcm16ToWav(base64: string, sampleRate = 24000): Blob {
  const binary = atob(base64);
  const pcm = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) pcm[i] = binary.charCodeAt(i);

  const buf = new ArrayBuffer(44 + pcm.length);
  const v = new DataView(buf);
  const str = (o: number, s: string) => {
    for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i));
  };

  str(0, 'RIFF'); v.setUint32(4, 36 + pcm.length, true);
  str(8, 'WAVE'); str(12, 'fmt ');
  v.setUint32(16, 16, true); v.setUint16(20, 1, true);
  v.setUint16(22, 1, true);
  v.setUint32(24, sampleRate, true);
  v.setUint32(28, sampleRate * 2, true);
  v.setUint16(32, 2, true); v.setUint16(34, 16, true);
  str(36, 'data'); v.setUint32(40, pcm.length, true);
  new Uint8Array(buf, 44).set(pcm);

  return new Blob([buf], { type: 'audio/wav' });
}

// Přehraje text zadaným hlasem přes Gemini TTS REST API.
// Vrátí true pokud se podařilo, false pokud fallback na browser.
export async function playGeminiVoiceNamed(text: string, voiceName: string): Promise<boolean> {
  const key = await getKey();
  if (!key) return false;

  for (const apiVersion of ['v1alpha', 'v1beta']) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/${apiVersion}/models/gemini-2.5-flash-preview-tts:generateContent?key=${key}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text }] }],
            generationConfig: {
              responseModalities: ['AUDIO'],
              speechConfig: {
                voiceConfig: { prebuiltVoiceConfig: { voiceName } },
              },
            },
          }),
        }
      );
      if (!res.ok) { if (res.status === 404) continue; return false; }
      const data = await res.json();
      const audioPart = data?.candidates?.[0]?.content?.parts?.[0]?.inlineData;
      if (!audioPart?.data) return false;
      const wav = pcm16ToWav(audioPart.data);
      const url = URL.createObjectURL(wav);
      const audio = new Audio(url);
      audio.playbackRate = 1.1;
      await new Promise<void>((resolve) => {
        audio.onended = () => { URL.revokeObjectURL(url); resolve(); };
        audio.onerror = () => { URL.revokeObjectURL(url); resolve(); };
        audio.play().catch(() => resolve());
      });
      return true;
    } catch { continue; }
  }
  return false;
}

export const playGeminiVoice = async (text: string): Promise<void> => {
  const activeVoice = (() => { try { return localStorage.getItem('gemini.voice') || 'Kore'; } catch { return 'Kore'; } })();
  const ok = await playGeminiVoiceNamed(text, activeVoice);
  if (!ok) {
    aiLog('INFO', 'browserTts fallback');
    return browserTts(text);
  }
};

function browserTts(text: string): Promise<void> {
  return new Promise((resolve) => {
    // Fix #3: na Androidu window.speechSynthesis občas nikdy nespustí onend/onerror
    // → záchranný timeout aby handleCommand nezůstal viset navždy
    const timeout = setTimeout(() => {
      aiLog('ERR', 'browserTts timeout 12s — SpeechSynthesis neodpověděl (Android bug)');
      resolve();
    }, 12_000);

    const done = () => { clearTimeout(timeout); resolve(); };

    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'cs-CZ';
    const czVoice = window.speechSynthesis.getVoices().find(v => v.lang.startsWith('cs')) ?? null;
    if (czVoice) u.voice = czVoice;
    u.rate = 1.2;
    u.onend  = done;
    u.onerror = done;
    window.speechSynthesis.speak(u);
  });
}
