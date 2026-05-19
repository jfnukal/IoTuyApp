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
//   - continuous:true session se ukončuje ihned po finálním výsledku (!)
//     → po detekci wake wordu MUSÍME spustit novou dedicated command session
//   - interimResults:true posílá výsledky s conf:0.00 a isFinal:true (fake interim)
//     → filtrujeme conf === 0 pro wake word detekci
//   - cs-CZ confidence bývá 0.4–0.9, fallback threshold snížen na 0.5
//
// Fix #1: alwaysOn persistováno do localStorage → přežije page reload
// Fix #2: recognitionRef = null v onend → startListening detekuje mrtvou session
// Fix #3: browserTts timeout 12s → nezůstane viset na Androidu
// Fix #4: startCommandListening() — dedicated session pro příkaz po wake wordu
//         Android ukončí continuous session OKAMŽITĚ po "hej gemini",
//         takže příkaz se musí zachytit v nové jednorázové session.

import { useState, useCallback, useEffect, useRef } from 'react';
import { sendToGemini } from '../services/geminiApi';
import { playGeminiVoice } from '../services/geminiTts';
import { aiLog } from '../services/aiLogger';

export type WakeState = 'off' | 'dormant' | 'listening' | 'processing' | 'speaking';

const WAKE_PHRASES = [
  'hej gemini', 'hey gemini',
  'hej džemíni', 'hey džemíni',
  'hej džemini', 'hey džemini',
  'hej jemini',  'hey jemini',
  'ahoj gemini',
  // Android kontrakce — slova splývají dohromady
  'hegemi', 'hejgemini', 'hejgemi', 'heygemi', 'heygemini',
  'ajgemini', 'ajgemi',
];

// Fallback: samotné "gemini" a varianty — detekujeme jako substring (includes)
// → zachytí i "hegemi" pokud by bylo vepsáno jinak
const WAKE_FALLBACK = [
  'gemini', 'džemíni', 'džemini', 'jemini', 'gimini',
  'dżemini', 'gemíni', 'žemini',
  'gемini',  // cyrilice g — některé klávesnice
];

const FALLBACK_MIN_CONFIDENCE = 0.5;
const RESTART_DELAY_MS = 1200;
// Kolik sekund čekáme na příkaz po wake wordu (pak zpět do dormant)
const COMMAND_TIMEOUT_MS = 8000;

const RECOGNITION_ERRORS: Record<string, string> = {
  'not-allowed':            'Mikrofon není povolen — povol přístup v prohlížeči',
  'audio-capture':          'Mikrofon nenalezen nebo je obsazený',
  'network':                'Chyba služby rozpoznávání řeči — zkus to znovu',
  'language-not-supported': 'Čeština není podporována v tomto prohlížeči',
};

const STORAGE_KEY = 'wakeWord.alwaysOn';

const getSpeechRecognition = () =>
  (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition || null;

const containsWakeWord = (text: string): boolean =>
  WAKE_PHRASES.some(w => text.includes(w));

const containsFallback = (text: string, confidence: number): boolean => {
  if (confidence < FALLBACK_MIN_CONFIDENCE) return false;
  // includes → zachytí varianty i uprostřed věty nebo srostlé s dalším slovem
  return WAKE_FALLBACK.some(w => text.includes(w));
};

const stripWakeWord = (text: string): string => {
  const allPhrases = [...WAKE_PHRASES, ...WAKE_FALLBACK];
  for (const w of allPhrases) {
    const idx = text.indexOf(w);
    if (idx !== -1) return text.slice(idx + w.length).trim();
  }
  return text.trim();
};

export const useWakeWord = () => {
  const [state, setState]           = useState<WakeState>('off');
  const [alwaysOn, setAlwaysOn]     = useState(() => localStorage.getItem(STORAGE_KEY) === 'true');
  const [transcript, setTranscript] = useState('');
  const [response, setResponse]     = useState('');
  const [errorMsg, setErrorMsg]     = useState('');

  const recognitionRef  = useRef<any>(null);
  const enabledRef      = useRef(localStorage.getItem(STORAGE_KEY) === 'true');
  const awakeRef        = useRef(false);
  const processingRef   = useRef(false);
  const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ─── scheduleRestart ────────────────────────────────────────────────────────
  const scheduleRestart = useCallback((delay = RESTART_DELAY_MS) => {
    if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
    restartTimerRef.current = setTimeout(() => startDormant(), delay);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── startDormant — continuous session, čeká jen na wake word ───────────────
  const startDormant = useCallback(() => {
    if (!enabledRef.current || processingRef.current) return;

    const SpeechRecognition = getSpeechRecognition();
    if (!SpeechRecognition) return;

    try { recognitionRef.current?.abort(); } catch (_) { /* ignore */ }

    const r = new SpeechRecognition();
    recognitionRef.current = r;
    r.lang           = 'cs-CZ';
    r.continuous     = true;
    r.interimResults = true;   // udržuje session živou na Androidu
    r.maxAlternatives = 3;
    awakeRef.current = false;

    r.onstart = () => {
      aiLog('INFO', `dormant START lang:${r.lang}`);
      if (!awakeRef.current && enabledRef.current) setState('dormant');
    };

    r.onresult = (event: any) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (!result.isFinal) continue;

        for (let alt = 0; alt < result.length; alt++) {
          const raw  = result[alt].transcript;
          const text = raw.toLowerCase().trim();
          const conf: number = result[alt].confidence ?? 0;

          // Android posílá "fake interim" jako isFinal:true s conf:0 → ignorujeme
          if (conf === 0) continue;

          aiLog('INFO', `dormant slyším: ${JSON.stringify(text)} conf:${conf.toFixed(2)}`);

          if (awakeRef.current) continue; // čekáme na command session, ignoruj

          const hit = containsWakeWord(text) || containsFallback(text, conf);
          if (!hit) continue;

          awakeRef.current = true;
          setState('listening');
          setTranscript('');
          setResponse('');
          setErrorMsg('');
          aiLog('INFO', `wake word detekován (alt:${alt} conf:${conf.toFixed(2)})`);

          // Příkaz ve stejné promluvě (např. "hej gemini co je dnes k obědu")
          const inlineCmd = stripWakeWord(text);
          if (inlineCmd.length > 3) {
            aiLog('INFO', `inline příkaz: "${inlineCmd}"`);
            handleCommand(inlineCmd);
          } else {
            // Fix #4: Android ukončí tuto session okamžitě po výsledku →
            // spustíme novou dedicated command session ještě PŘED onend
            startCommandListening();
          }
          return; // konec zpracování tohoto onresult
        }
      }
    };

    r.onerror = (e: any) => {
      aiLog('WARN', `dormant onerror: ${e.error}`);
      if (e.error === 'no-speech' || e.error === 'aborted') {
        if (enabledRef.current && !processingRef.current) scheduleRestart();
        return;
      }
      if (e.error === 'network') {
        if (enabledRef.current && !processingRef.current) scheduleRestart(3000);
        return;
      }
      aiLog('ERR', `dormant recognition error: ${e.error}`);
      setErrorMsg(RECOGNITION_ERRORS[e.error] ?? `Chyba rozpoznávání: ${e.error}`);
      if (enabledRef.current) scheduleRestart(2000);
    };

    r.onend = () => {
      aiLog('INFO', `dormant onend awake:${awakeRef.current} processing:${processingRef.current}`);
      if (recognitionRef.current === r) recognitionRef.current = null;
      if (!enabledRef.current || processingRef.current) return;
      // Pokud awakeRef je true, startCommandListening už běží (nebo brzy poběží)
      if (!awakeRef.current) scheduleRestart();
    };

    try {
      r.start();
      aiLog('INFO', 'dormant recognition.start() voláno');
    } catch (err) {
      aiLog('ERR', `dormant start error: ${String(err)}`);
      if (enabledRef.current) scheduleRestart(2000);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── startCommandListening — Fix #4 ─────────────────────────────────────────
  // Spouští se po detekci wake wordu. Android okamžitě ukončí continuous session,
  // takže příkaz MUSÍME zachytit v nové jednorázové session.
  const startCommandListening = useCallback(() => {
    if (!enabledRef.current) return;

    const SpeechRecognition = getSpeechRecognition();
    if (!SpeechRecognition) {
      awakeRef.current = false;
      if (enabledRef.current) scheduleRestart();
      return;
    }

    // Zruš případnou předchozí session (dormant mohla ještě žít)
    try { recognitionRef.current?.abort(); } catch (_) { /* ignore */ }

    aiLog('INFO', 'command-listen: spouštím (čekám na příkaz)...');

    const r = new SpeechRecognition();
    recognitionRef.current = r;
    r.lang            = 'cs-CZ';
    r.continuous      = false;  // jednorázové zachycení
    r.interimResults  = false;
    r.maxAlternatives = 1;

    // Záchranný timeout — pokud uživatel nic neřekne do COMMAND_TIMEOUT_MS
    const timeout = setTimeout(() => {
      aiLog('WARN', `command-listen timeout ${COMMAND_TIMEOUT_MS / 1000}s → zpět do dormant`);
      try { r.abort(); } catch (_) { /* ignore */ }
      awakeRef.current = false;
      if (enabledRef.current) startDormant();
    }, COMMAND_TIMEOUT_MS);

    r.onstart = () => {
      aiLog('INFO', 'command-listen START');
      setState('listening'); // UI zůstane v "Poslouchám…"
    };

    r.onresult = (event: any) => {
      clearTimeout(timeout);
      const text = event.results[0][0].transcript.trim();
      const conf  = event.results[0][0].confidence ?? 0;
      aiLog('INFO', `command-listen slyším: "${text}" conf:${conf.toFixed(2)}`);
      if (text.length > 1) {
        handleCommand(text);
      } else {
        awakeRef.current = false;
        if (enabledRef.current) startDormant();
      }
    };

    r.onerror = (e: any) => {
      clearTimeout(timeout);
      aiLog('WARN', `command-listen onerror: ${e.error}`);
      if (recognitionRef.current === r) recognitionRef.current = null;
      awakeRef.current = false;
      if (enabledRef.current && !processingRef.current) startDormant();
    };

    r.onend = () => {
      clearTimeout(timeout);
      aiLog('INFO', `command-listen onend processing:${processingRef.current}`);
      if (recognitionRef.current === r) recognitionRef.current = null;
      // Pokud handleCommand převzal kontrolu, nezasahujeme
      if (!processingRef.current && enabledRef.current) {
        awakeRef.current = false;
        startDormant();
      }
    };

    try {
      r.start();
      aiLog('INFO', 'command-listen recognition.start() voláno');
    } catch (err) {
      clearTimeout(timeout);
      aiLog('ERR', `command-listen start error: ${String(err)}`);
      awakeRef.current = false;
      if (enabledRef.current) startDormant();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── handleCommand ───────────────────────────────────────────────────────────
  const handleCommand = useCallback(async (text: string) => {
    aiLog('INFO', `příkaz: "${text}"`);
    processingRef.current = true;
    try { recognitionRef.current?.stop(); } catch (_) { /* ignore */ }

    setTranscript(text);
    setState('processing');
    setErrorMsg('');

    try {
      const reply = await sendToGemini(text);
      aiLog('INFO', `Gemini odpověď (${reply.length} znaků)`);
      setResponse(reply);
      setState('speaking');
      await playGeminiVoice(reply);
      aiLog('INFO', 'TTS dokončeno');
    } catch (err) {
      aiLog('ERR', `Gemini/TTS error: ${String(err)}`);
      setErrorMsg('Chyba komunikace s Gemini');
    }

    processingRef.current = false;
    awakeRef.current = false;

    if (enabledRef.current) {
      setTimeout(() => {
        setState('dormant');
        startDormant();
      }, 600);
    } else {
      setState('off');
    }
  }, [startDormant]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── toggleAlwaysOn ──────────────────────────────────────────────────────────
  const toggleAlwaysOn = useCallback(() => {
    const nowEnabled = !enabledRef.current;
    enabledRef.current = nowEnabled;
    setAlwaysOn(nowEnabled);
    if (nowEnabled) {
      localStorage.setItem(STORAGE_KEY, 'true');
      aiLog('INFO', 'always-on ZAPNUTO');
      startDormant();
    } else {
      localStorage.removeItem(STORAGE_KEY);
      aiLog('INFO', 'always-on VYPNUTO');
      if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
      try { recognitionRef.current?.abort(); } catch (_) { /* ignore */ }
      setState('off');
    }
  }, [startDormant]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fix #1: auto-start po mountu (reload přežil always-on)
  useEffect(() => {
    aiLog('INFO', `mount — alwaysOn z localStorage: ${enabledRef.current}`);
    if (enabledRef.current) {
      aiLog('INFO', 'auto-start dormant po reloadu');
      startDormant();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── startListening — manuální klik na orb ───────────────────────────────────
  const startListening = useCallback(() => {
    if (state === 'dormant' || state === 'off') {
      awakeRef.current = true;
      // Fix #4: rovnou command session — nečekáme na dormant session
      startCommandListening();
      return;
    }
  }, [state]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── cancel ──────────────────────────────────────────────────────────────────
  const cancel = useCallback(() => {
    window.speechSynthesis.cancel();
    if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
    try { recognitionRef.current?.abort(); } catch (_) { /* ignore */ }
    processingRef.current = false;
    awakeRef.current = false;
    setErrorMsg('');

    if (enabledRef.current) {
      setTimeout(() => {
        setState('dormant');
        startDormant();
      }, 300);
    } else {
      setState('off');
    }
  }, [startDormant]); // eslint-disable-line react-hooks/exhaustive-deps

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
