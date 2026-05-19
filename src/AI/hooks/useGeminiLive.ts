// src/AI/hooks/useGeminiLive.ts
// Gemini HomeMade 2.0 — React hook
// Stejné rozhraní jako useWakeWord, takže AiWidget.tsx vyžaduje minimální změny.

import { useCallback, useEffect, useRef, useState } from 'react';
import { GeminiLiveService } from '../services/geminiLiveService';
import type { LiveState } from '../services/geminiLiveService';
import { aiLog } from '../services/aiLogger';

const STORAGE_KEY = 'wakeWord.alwaysOn';   // stejný klíč pro zachování nastavení

// ==================== HOOK ====================

export function useGeminiLive() {
  const [state, setState] = useState<LiveState>('off');
  const [alwaysOn, setAlwaysOn] = useState<boolean>(() => {
    try { return localStorage.getItem(STORAGE_KEY) === 'true'; } catch { return false; }
  });
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Ref na instanci služby — přetrvává přes re-rendery
  const svcRef = useRef<GeminiLiveService | null>(null);

  // ─── Továrna na callbacks ───
  const makeCallbacks = useCallback(() => ({
    onStateChange: (s: LiveState) => {
      setState(s);
      // Při návratu do dormant vymažeme přepis uživatele
      if (s === 'dormant' || s === 'off') {
        setTranscript('');
        // response necháme — zmizí po DISMISS_DELAY v AiWidget
      }
    },
    onTranscript:  (t: string) => setTranscript(t),
    onResponse:    (r: string) => setResponse(r),
    onError:       (msg: string) => {
      setErrorMsg(msg);
      aiLog('ERR', `useGeminiLive onError: ${msg}`);
    },
  }), []);

  // ─── Spustíme / zastavíme session podle alwaysOn ───
  useEffect(() => {
    if (alwaysOn) {
      aiLog('INFO', 'useGeminiLive: spouštím GeminiLiveService');
      const svc = new GeminiLiveService(makeCallbacks());
      svcRef.current = svc;
      svc.start().catch(e => aiLog('ERR', `GeminiLive start chyba: ${String(e)}`));
    } else {
      if (svcRef.current) {
        aiLog('INFO', 'useGeminiLive: zastavuji GeminiLiveService');
        svcRef.current.stop();
        svcRef.current = null;
        setState('off');
        setTranscript('');
        setResponse('');
        setErrorMsg('');
      }
    }

    // Cleanup při unmount nebo změně alwaysOn
    return () => {
      if (svcRef.current) {
        svcRef.current.destroy();
        svcRef.current = null;
      }
    };
  }, [alwaysOn, makeCallbacks]);

  // ─── Toggle always-on ───
  const toggleAlwaysOn = useCallback(() => {
    setAlwaysOn(prev => {
      const next = !prev;
      try { localStorage.setItem(STORAGE_KEY, String(next)); } catch { /* ignore */ }
      aiLog('INFO', `alwaysOn → ${next}`);
      return next;
    });
  }, []);

  // ─── Manuální spuštění (klik na orb) ───
  const startListening = useCallback(() => {
    const svc = svcRef.current;
    if (!svc) {
      // alwaysOn vypnuto — spustíme jednorázovou session
      aiLog('INFO', 'useGeminiLive: jednorázový start (alwaysOn=false)');
      const newSvc = new GeminiLiveService(makeCallbacks());
      svcRef.current = newSvc;
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
    // Pokud bylo alwaysOn vypnuto a šlo o jednorázovou session, zastavíme ji
    if (!alwaysOn && svcRef.current) {
      svcRef.current.stop();
      svcRef.current = null;
      setState('off');
    }
  }, [alwaysOn]);

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
