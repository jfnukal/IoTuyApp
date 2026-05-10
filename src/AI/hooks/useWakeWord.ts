// src/AI/hooks/useWakeWord.ts
// Rozšíření voice chain o "always-on" режим s wake word detekcí.
//
// Stavy:
//   off       — always-on vypnutý, jen manuální spuštění
//   dormant   — tiše poslouchá na pozadí, čeká na wake word
//   listening — wake word zachycen (nebo manuální klik), čeká na příkaz
//   processing — odesílá dotaz na Gemini
//   speaking  — přehrává TTS odpověď
//
// Wake word: "gemini" (+ zkrácené varianty)
// Po odpovědi se automaticky vrátí do dormant.

import { useState, useCallback, useEffect, useRef } from 'react';
import { sendToGemini } from '../services/geminiApi';
import { playGeminiVoice } from '../services/geminiTts';

export type WakeState = 'off' | 'dormant' | 'listening' | 'processing' | 'speaking';

// Wake FRÁZE — vyžadujeme celou frázi, ne jen jedno slovo (méně falešných triggerů)
// Primární: "hej gemini" a varianty. Fallback: samotné "gemini" s vyšší jistotou.
const WAKE_PHRASES = [
  'hej gemini', 'hey gemini',
  'hej džemíni', 'hey džemíni',
  'hej džemini', 'hey džemini',
  'hej jemini',
];
const WAKE_FALLBACK = ['gemini', 'džemíni', 'džemini', 'jemini', 'gimini'];

// Minimální confidence pro fallback (samotné "gemini")
const FALLBACK_MIN_CONFIDENCE = 0.75;

// Po kolika ms ticha se Chrome ukončí continuous recognition → auto-restart
// Delší delay = méně pipů při restartech
const RESTART_DELAY_MS = 800;

const RECOGNITION_ERRORS: Record<string, string> = {
  'not-allowed':            'Mikrofon není povolen — povol přístup v prohlížeči',
  'audio-capture':          'Mikrofon nenalezen nebo je obsazený',
  'network':                'Chyba služby rozpoznávání řeči — zkus to znovu',
  'language-not-supported': 'Čeština není podporována v tomto prohlížeči',
};

const getSpeechRecognition = () =>
  (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition || null;

export const useWakeWord = () => {
  const [state, setState]           = useState<WakeState>('off');
  const [alwaysOn, setAlwaysOn]     = useState(false);
  const [transcript, setTranscript] = useState('');
  const [response, setResponse]     = useState('');
  const [errorMsg, setErrorMsg]     = useState('');

  const recognitionRef  = useRef<any>(null);
  const enabledRef      = useRef(false);   // je always-on zapnutý?
  const awakeRef        = useRef(false);   // prošli jsme wake wordem?
  const processingRef   = useRef(false);   // zpracováváme příkaz?

  // ───────── Spuštění dormant poslechu ─────────
  const startDormant = useCallback(() => {
    if (!enabledRef.current || processingRef.current) return;

    const SpeechRecognition = getSpeechRecognition();
    if (!SpeechRecognition) return;

    recognitionRef.current?.abort();

    const r = new SpeechRecognition();
    recognitionRef.current = r;
    r.lang = 'cs-CZ';
    r.continuous = true;
    r.interimResults = false; // jen finální výsledky — méně false triggerů, méně CPU
    r.maxAlternatives = 1;
    awakeRef.current = false;

    r.onstart = () => {
      if (!awakeRef.current && enabledRef.current) {
        setState('dormant');
      }
    };

    r.onresult = (event: any) => {
      const last = event.results[event.results.length - 1];
      if (!last.isFinal) return; // jen finální výsledky

      const text = last[0].transcript.toLowerCase().trim();
      const confidence: number = last[0].confidence ?? 1;

      if (!awakeRef.current) {
        // Debug log — sleduj co tablet přepíše
        console.log('[WakeWord] slyším:', JSON.stringify(text), 'confidence:', confidence.toFixed(2));

        // Hledáme wake FRÁZI (celá fráze = méně false pozitiv)
        const phraseMatch = WAKE_PHRASES.some(w => text.includes(w));
        // Fallback: samotné "gemini" jen s vysokou jistotou
        const fallbackMatch = confidence >= FALLBACK_MIN_CONFIDENCE &&
          WAKE_FALLBACK.some(w => text === w || text.startsWith(w + ' '));

        if (!phraseMatch && !fallbackMatch) return;

        awakeRef.current = true;
        setState('listening');
        setTranscript('');
        setResponse('');
        setErrorMsg('');

        // Příkaz ve stejné promluvě — po wake frází
        const allPhrases = [...WAKE_PHRASES, ...WAKE_FALLBACK];
        let cmd = text;
        for (const w of allPhrases) {
          const idx = cmd.indexOf(w);
          if (idx !== -1) { cmd = cmd.slice(idx + w.length).trim(); break; }
        }
        if (cmd.length > 3) {
          handleCommand(cmd);
        }
        // jinak čekáme na samostatný příkaz (viz else větev níže)

      } else if (!processingRef.current) {
        // Jsme probuzení — toto je příkaz
        const cmd = last[0].transcript.trim();
        if (cmd.length > 1) handleCommand(cmd);
      }
    };

    r.onerror = (e: any) => {
      if (e.error === 'no-speech' || e.error === 'aborted') {
        // Normální — tiše restartuj
        if (enabledRef.current && !processingRef.current) {
          setTimeout(startDormant, RESTART_DELAY_MS);
        }
        return;
      }
      console.warn('[WakeWord] recognition error:', e.error);
      const msg = RECOGNITION_ERRORS[e.error] ?? `Chyba rozpoznávání: ${e.error}`;
      setErrorMsg(msg);
      if (enabledRef.current) setTimeout(startDormant, 2000);
    };

    r.onend = () => {
      // Chrome ukončil continuous session → auto-restart
      if (enabledRef.current && !processingRef.current) {
        setTimeout(startDormant, RESTART_DELAY_MS);
      }
    };

    try {
      r.start();
    } catch (err) {
      console.warn('[WakeWord] start error:', err);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ───────── Zpracování příkazu ─────────
  const handleCommand = useCallback(async (text: string) => {
    processingRef.current = true;
    recognitionRef.current?.stop();

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
      // Krátká pauza aby TTS doznila, pak zpět do dormant
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
      recognitionRef.current?.abort();
      setState('off');
    }
  }, [startDormant]);

  // ───────── Manuální spuštění (klik na orb) ─────────
  // Pokud jsme dormant → přeskočíme wake word
  // Pokud jsme off → jednorázový poslech (klasický mód)
  const startListening = useCallback(() => {
    if (state === 'dormant') {
      // Přeskočíme wake word, rovnou posloucháme příkaz
      awakeRef.current = true;
      setState('listening');
      return;
    }

    if (state !== 'off') return;

    // Jednorázový mód bez always-on
    const SpeechRecognition = getSpeechRecognition();
    if (!SpeechRecognition) {
      setErrorMsg('Rozpoznávání řeči není podporováno (zkus Chrome)');
      return;
    }

    recognitionRef.current?.abort();
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
    recognitionRef.current?.abort();
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
      recognitionRef.current?.abort();
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
