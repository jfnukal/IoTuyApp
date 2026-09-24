// src/AI/hooks/useGeminiLive.ts
// Gemini HomeMade 2.0 — React hook
// Stejné rozhraní jako useWakeWord, takže AiWidget.tsx vyžaduje minimální změny.

import { useCallback, useEffect, useRef, useState } from 'react';
import { GeminiLiveService, isQuietHours, msUntilQuietHoursEnd } from '../services/geminiLiveService';
import type { LiveState } from '../services/geminiLiveService';
import { aiLog } from '../services/aiLogger';

const STORAGE_KEY = 'wakeWord.alwaysOn';   // stejný klíč pro zachování nastavení

// ==================== TICHÉ HODINY ====================

/**
 * Zavolá onEnd (jednou), až skončí tiché hodiny a svítí displej.
 * Vrací funkci, která čekání zruší.
 */
function waitForQuietHoursEnd(onEnd: () => void): () => void {
  let timer: ReturnType<typeof setTimeout>;

  function schedule() {
    // +1 s rezerva, ať v tu chvíli tiché hodiny už určitě neplatí
    timer = setTimeout(() => {
      if (isQuietHours()) schedule();   // hodiny tabletu se mezitím posunuly → čekáme dál
      else check();
    }, msUntilQuietHoursEnd() + 1000);
  }

  function check() {
    if (isQuietHours() || document.hidden) return;   // zhasnutý displej → počkáme na rozsvícení
    cancel();
    onEnd();
  }

  function cancel() {
    clearTimeout(timer);
    document.removeEventListener('visibilitychange', check);
  }

  schedule();
  // Uspaný tablet časovač pozdrží — po rozsvícení displeje se proto kontroluje znovu
  document.addEventListener('visibilitychange', check);
  return cancel;
}

// ==================== HOOK ====================

export function useGeminiLive() {
  const [state, setState] = useState<LiveState>('off');
  const [alwaysOn, setAlwaysOn] = useState<boolean>(() => {
    try { return localStorage.getItem(STORAGE_KEY) === 'true'; } catch { return false; }
  });
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  // Zvýší se po konci tichých hodin → efekt níže proběhne znovu a spustí session
  const [quietEndTick, setQuietEndTick] = useState(0);

  // Ref na instanci služby — přetrvává přes re-rendery
  const svcRef = useRef<GeminiLiveService | null>(null);
  // true = svcRef drží jednorázovou session z kliku na orb (stálé poslouchání neběží)
  const oneShotRef = useRef(false);

  // ─── Továrna na callbacks ───
  const makeCallbacks = useCallback(() => ({
    onStateChange: (s: LiveState) => {
      setState(s);
      if (s === 'dormant' || s === 'off') {
        setTranscript('');
      }
    },
    onTranscript:  (t: string) => setTranscript(t),
    onResponse:    (r: string) => setResponse(r),
    onError:       (msg: string) => {
      setErrorMsg(msg);
      aiLog('ERR', `useGeminiLive onError: ${msg}`);
    },
    onAutoOff: (reason: string) => {
      // Auto-vypnutí po nečinnosti — aktualizujeme stav a localStorage.
      // Jednorázová session (klik na orb, třeba v tichých hodinách) nastavení
      // stálého poslouchání nemění — to ráno naběhne samo.
      aiLog('INFO', `useGeminiLive onAutoOff: ${reason}`);
      if (!oneShotRef.current) {
        setAlwaysOn(false);
        try { localStorage.setItem(STORAGE_KEY, 'false'); } catch { /* ignore */ }
      }
      setErrorMsg(`🔕 ${reason}`);
      svcRef.current = null;
      setState('off');
    },
  }), []);

  // ─── Spustíme / zastavíme session podle alwaysOn ───
  useEffect(() => {
    let stopWaiting: (() => void) | undefined;

    if (alwaysOn) {
      // Tiché hodiny — nespouštíme, jen zobrazíme info a počkáme na jejich konec.
      // Nastavení alwaysOn se tu NEMĚNÍ: dashboard se obnovuje i v noci (5:00,
      // po probuzení tabletu, heartbeat) a každá obnova by ho jinak natrvalo vypnula.
      if (isQuietHours()) {
        const h = new Date().getHours();
        const msg = `🌙 Tiché hodiny (${h}:00) — Gemini se spustí ráno od 7:00.`;
        aiLog('INFO', `useGeminiLive: ${msg}`);
        setErrorMsg(msg);
        stopWaiting = waitForQuietHoursEnd(() => {
          aiLog('INFO', 'useGeminiLive: tiché hodiny skončily');
          setQuietEndTick(t => t + 1);
        });
      } else {
        aiLog('INFO', 'useGeminiLive: spouštím GeminiLiveService');
        const svc = new GeminiLiveService(makeCallbacks());
        svcRef.current = svc;
        oneShotRef.current = false;
        svc.start().catch(e => aiLog('ERR', `GeminiLive start chyba: ${String(e)}`));
      }
    }
    // alwaysOn=false: nic nespouštíme. Běžící session (i jednorázovou) už zastavil
    // cleanup předchozího běhu níže, bublinu po ručním vypnutí uklízí toggleAlwaysOn.

    // Cleanup při unmount, změně alwaysOn nebo po konci tichých hodin
    return () => {
      stopWaiting?.();
      if (svcRef.current) {
        aiLog('INFO', 'useGeminiLive: zastavuji GeminiLiveService');
        svcRef.current.destroy();
        svcRef.current = null;
        // destroy() změnu stavu nehlásí → bez toho by koule zůstala třeba na 'dormant'
        setState('off');
      }
    };
  }, [alwaysOn, quietEndTick, makeCallbacks]);

  // ─── Toggle always-on ───
  const toggleAlwaysOn = useCallback(() => {
    const next = !alwaysOn;
    setAlwaysOn(next);
    try { localStorage.setItem(STORAGE_KEY, String(next)); } catch { /* ignore */ }
    aiLog('INFO', `alwaysOn → ${next}`);
    if (!next) {
      // Ruční vypnutí — session zastaví cleanup efektu výše, tady uklidíme bublinu
      // (i hlášku o tichých hodinách, která by už neplatila). Auto-vypnutí (onAutoOff)
      // tudy nevede, takže jeho hláška 🔕 zůstane vidět.
      setTranscript('');
      setResponse('');
      setErrorMsg('');
    }
  }, [alwaysOn]);

  // ─── Manuální spuštění (klik na orb) ───
  const startListening = useCallback(() => {
    const svc = svcRef.current;
    if (!svc) {
      // Stálé poslouchání neběží (vypnuté nebo tiché hodiny) — spustíme jednorázovou session
      aiLog('INFO', 'useGeminiLive: jednorázový start (stálé poslouchání neběží)');
      const newSvc = new GeminiLiveService(makeCallbacks());
      svcRef.current = newSvc;
      oneShotRef.current = true;
      newSvc.start().then(() => {
        newSvc.activateManually();
      }).catch(e => aiLog('ERR', `Jednorázový start chyba: ${String(e)}`));
    } else {
      svc.activateManually();
    }
  }, [makeCallbacks]);

  // ─── Zrušení / přerušení ───
  const cancel = useCallback(() => {
    svcRef.current?.cancel();
    // Jednorázovou session (stálé poslouchání vypnuté nebo čeká na konec tichých hodin) zastavíme
    if (oneShotRef.current && svcRef.current) {
      svcRef.current.stop();
      svcRef.current = null;
      setState('off');
    }
  }, []);

  // ─── Vymazání konverzace (po dismiss timeoutu) ───
  const clearConversation = useCallback(() => {
    setTranscript('');
    setResponse('');
    setErrorMsg('');
  }, []);

  // ─── Stub: kandidát (self-learning) — v Live verzi nepotřebujeme ───
  // Gemini 3.1 transkribuje spolehlivě, takže wake word kandidáti nejsou potřeba.
  const candidate = null;
  const confirmCandidate = useCallback((_phrase: string) => {}, []);
  const rejectCandidate = useCallback(() => {}, []);

  return {
    state,
    alwaysOn,
    transcript,
    response,
    errorMsg,
    candidate,
    toggleAlwaysOn,
    startListening,
    cancel,
    clearConversation,
    confirmCandidate,
    rejectCandidate,
  };
}
