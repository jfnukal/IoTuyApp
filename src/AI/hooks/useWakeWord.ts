// src/AI/hooks/useWakeWord.ts
//
// Stavy:
//   off       — always-on vypnutý, jen manuální spuštění
//   dormant   — tiše poslouchá na pozadí, čeká na wake word
//   listening — wake word zachycen (nebo manuální klik), čeká na příkaz
//   processing — odesílá dotaz na Gemini
//   speaking  — přehrává TTS odpověď
//
// Android specifika:
//   - continuous:true session se ukončuje po ~60s ticha → restart + systémový beep
//   - interimResults:true udržuje session živou déle (interim traffic = "ne ticho")
//   - cs-CZ nemusí být na tabletu nainstalovaná → fallback na en-US detekci "gemini"
//   - confidence na Androidu bývá nízká (~0.4–0.6), proto snižujeme práh

import { useState, useCallback, useEffect, useRef } from 'react';
import { sendToGemini } from '../services/geminiApi';
import { playGeminiVoice } from '../services/geminiTts';

export type WakeState = 'off' | 'dormant' | 'listening' | 'processing' | 'speaking';

// Primární wake fráze (česky)
const WAKE_PHRASES = [
  'hej gemini', 'hey gemini',
  'hej džemíni', 'hey džemíni',
  'hej džemini', 'hey džemini',
  'hej jemini',  'hey jemini',
  'ahoj gemini',
];

// Fallback: samotné "gemini" ve všech pravděpodobných přepisech
const WAKE_FALLBACK = [
  'gemini', 'džemíni', 'džemini', 'jemini', 'gimini',
  'dżemini', 'gemíni', 'žemini',
];

// Minimální confidence pro fallback — Android bývá nízký, snižujeme na 0.5
const FALLBACK_MIN_CONFIDENCE = 0.5;

// Prodloužený delay po restartu → méně beepů za minutu
const RESTART_DELAY_MS = 1200;

const RECOGNITION_ERRORS: Record<string, string> = {
  'not-allowed':            'Mikrofon není povolen — povol přístup v prohlížeči',
  'audio-capture':          'Mikrofon nenalezen nebo je obsazený',
  'network':                'Chyba služby rozpoznávání řeči — zkus to znovu',
  'language-not-supported': 'Čeština není podporována v tomto prohlížeči',
};

const getSpeechRecognition = () =>
  (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition || null;

// Hledá wake word v textu — normalizace: diakritika, mezery
const containsWakeWord = (text: string): boolean => {
  const t = text.toLowerCase().trim();
  if (WAKE_PHRASES.some(w => t.includes(w))) return true;
  return false;
};

const containsFallback = (text: string, confidence: number): boolean => {
  const t = text.toLowerCase().trim();
  if (confidence < FALLBACK_MIN_CONFIDENCE) return false;
  return WAKE_FALLBACK.some(w => t === w || t.startsWith(w + ' ') || t.endsWith(' ' + w));
};

// Odstraní wake word ze začátku textu → zbyde příkaz
const stripWakeWord = (text: string): string => {
  const t = text.toLowerCase().trim();
  const allPhrases = [...WAKE_PHRASES, ...WAKE_FALLBACK];
  for (const w of allPhrases) {
    const idx = t.indexOf(w);
    if (idx !== -1) {
      return text.slice(idx + w.length).trim();
    }
  }
  return text.trim();
};

export const useWakeWord = () => {
  const [state, setState]           = useState<WakeState>('off');
  const [alwaysOn, setAlwaysOn]     = useState(false);
  const [transcript, setTranscript] = useState('');
  const [response, setResponse]     = useState('');
  const [errorMsg, setErrorMsg]     = useState('');

  const recognitionRef  = useRef<any>(null);
  const enabledRef      = useRef(false);
  const awakeRef        = useRef(false);
  const processingRef   = useRef(false);
  const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleRestart = useCallback((delay = RESTART_DELAY_MS) => {
    if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
    restartTimerRef.current = setTimeout(() => startDormant(), delay);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ───────── Spuštění dormant poslechu ─────────
  const startDormant = useCallback(() => {
    if (!enabledRef.current || processingRef.current) return;

    const SpeechRecognition = getSpeechRecognition();
    if (!SpeechRecognition) return;

    // Zruš předchozí session
    try { recognitionRef.current?.abort(); } catch (_) { /* ignore */ }

    const r = new SpeechRecognition();
    recognitionRef.current = r;
    r.lang = 'cs-CZ';
    r.continuous = true;
    // interimResults:true → browser průběžně posílá data → méně "ticha" → méně předčasných ukončení na Androidu
    r.interimResults = true;
    r.maxAlternatives = 3; // více alternativ = větší šance zachytit "gemini"
    awakeRef.current = false;

    r.onstart = () => {
      if (!awakeRef.current && enabledRef.current) {
        setState('dormant');
      }
    };

    r.onresult = (event: any) => {
      // Zpracováváme jen finální výsledky pro wake word detekci
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (!result.isFinal) continue;

        // Vyzkoušej všechny alternativy
        for (let alt = 0; alt < result.length; alt++) {
          const text = result[alt].transcript.toLowerCase().trim();
          const confidence: number = result[alt].confidence ?? 0.5;

          console.log('[WakeWord] slyším:', JSON.stringify(text), 'confidence:', confidence.toFixed(2), 'final:', result.isFinal);

          if (!awakeRef.current) {
            const phraseMatch  = containsWakeWord(text);
            const fallbackMatch = containsFallback(text, confidence);

            if (!phraseMatch && !fallbackMatch) continue;

            awakeRef.current = true;
            setState('listening');
            setTranscript('');
            setResponse('');
            setErrorMsg('');

            // Příkaz ve stejné promluvě
            const cmd = stripWakeWord(text);
            if (cmd.length > 3) {
              handleCommand(cmd);
            }
            break; // nepotřebujeme další alternativy

          } else if (!processingRef.current) {
            // Probuzeno — příkaz
            const cmd = result[0].transcript.trim();
            if (cmd.length > 1) handleCommand(cmd);
            break;
          }
        }
      }
    };

    r.onerror = (e: any) => {
      console.log('[WakeWord] onerror:', e.error);
      if (e.error === 'no-speech' || e.error === 'aborted') {
        if (enabledRef.current && !processingRef.current) {
          scheduleRestart();
        }
        return;
      }
      // network error — kratší retry protože může být jen přechodné
      if (e.error === 'network') {
        if (enabledRef.current && !processingRef.current) {
          scheduleRestart(3000);
        }
        return;
      }
      console.warn('[WakeWord] recognition error:', e.error);
      const msg = RECOGNITION_ERRORS[e.error] ?? `Chyba rozpoznávání: ${e.error}`;
      setErrorMsg(msg);
      if (enabledRef.current) scheduleRestart(2000);
    };

    r.onend = () => {
      console.log('[WakeWord] onend, enabled:', enabledRef.current, 'processing:', processingRef.current);
      if (enabledRef.current && !processingRef.current) {
        scheduleRestart();
      }
    };

    try {
      r.start();
    } catch (err) {
      console.warn('[WakeWord] start error:', err);
      if (enabledRef.current) scheduleRestart(2000);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ───────── Zpracování příkazu ─────────
  const handleCommand = useCallback(async (text: string) => {
    processingRef.current = true;
    try { recognitionRef.current?.stop(); } catch (_) { /* ignore */ }

    setTranscript(text);
    setState('processing');
    setErrorMsg('');

    try {
      const reply = await sendToGemini(text);
      setResponse(reply);
      setState('speaking');
      await playGeminiVoice(reply);
    } catch (err) {
      console.error('[WakeWord] Gemini error:', err);
      setErrorMsg('Chyba komunikace s Gemini');
    }

    processingRef.current = false;

    if (enabledRef.current) {
      setTimeout(() => {
        setState('dormant');
        startDormant();
      }, 600);
    } else {
      setState('off');
    }
  }, [startDormant]);

  // ───────── Toggle always-on ─────────
  const toggleAlwaysOn = useCallback(() => {
    const nowEnabled = !enabledRef.current;
    enabledRef.current = nowEnabled;
    setAlwaysOn(nowEnabled);

    if (nowEnabled) {
      startDormant();
    } else {
      if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
      try { recognitionRef.current?.abort(); } catch (_) { /* ignore */ }
      setState('off');
    }
  }, [startDormant]);

  // ───────── Manuální spuštění (klik na orb) ─────────
  const startListening = useCallback(() => {
    if (state === 'dormant') {
      awakeRef.current = true;
      setState('listening');
      return;
    }

    if (state !== 'off') return;

    const SpeechRecognition = getSpeechRecognition();
    if (!SpeechRecognition) {
      setErrorMsg('Rozpoznávání řeči není podporováno (zkus Chrome)');
      return;
    }

    try { recognitionRef.current?.abort(); } catch (_) { /* ignore */ }
    const r = new SpeechRecognition();
    recognitionRef.current = r;
    r.lang = 'cs-CZ';
    r.continuous = false;
    r.interimResults = false;
    r.maxAlternatives = 1;

    r.onstart = () => {
      setState('listening');
      setTranscript('');
      setResponse('');
      setErrorMsg('');
    };

    r.onerror = (e: any) => {
      const msg = RECOGNITION_ERRORS[e.error] ?? `Chyba rozpoznávání: ${e.error}`;
      console.warn(`[WakeWord] ${e.error}`);
      setErrorMsg(msg);
      setState('off');
    };

    r.onresult = (event: any) => {
      const text = event.results[0][0].transcript;
      handleCommand(text);
    };

    r.start();
  }, [state, handleCommand]);

  // ───────── Zrušení ─────────
  const cancel = useCallback(() => {
    window.speechSynthesis.cancel();
    if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
    try { recognitionRef.current?.abort(); } catch (_) { /* ignore */ }
    processingRef.current = false;
    setErrorMsg('');

    if (enabledRef.current) {
      setTimeout(() => {
        setState('dormant');
        startDormant();
      }, 300);
    } else {
      setState('off');
    }
  }, [startDormant]);

  // Cleanup při unmountu
  useEffect(() => {
    return () => {
      enabledRef.current = false;
      if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
      try { recognitionRef.current?.abort(); } catch (_) { /* ignore */ }
      window.speechSynthesis.cancel();
    };
  }, []);

  const clearConversation = useCallback(() => {
    setTranscript('');
    setResponse('');
    setErrorMsg('');
  }, []);

  return { state, alwaysOn, transcript, response, errorMsg, toggleAlwaysOn, startListening, cancel, clearConversation };
};
