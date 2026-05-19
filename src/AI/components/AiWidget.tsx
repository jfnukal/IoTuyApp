// src/AI/components/AiWidget.tsx
import React, { useEffect, useState } from 'react';
import { useWakeWord } from '../hooks/useWakeWord';
import { LogPanel } from './LogPanel';
import './AiWidget.css';

const DISMISS_DELAY_MS = 6000; // bublina zmizí 6s po konci odpovědi

export const AiWidget: React.FC = () => {
  const {
    state,
    alwaysOn,
    transcript,
    response,
    errorMsg,
    toggleAlwaysOn,
    startListening,
    cancel,
    clearConversation,
  } = useWakeWord();

  const [showLog, setShowLog] = useState(false);

  // Auto-dismiss bubliny po návratu do klidového stavu
  useEffect(() => {
    if (state !== 'dormant' && state !== 'off') return;
    const t = setTimeout(clearConversation, DISMISS_DELAY_MS);
    return () => clearTimeout(t);
  }, [state, clearConversation]);

  const handleOrbClick = () => {
    if (state === 'processing' || state === 'speaking') {
      cancel();
    } else {
      startListening();
    }
  };

  const orbTitle = () => {
    switch (state) {
      case 'dormant':    return 'Čekám na "Gemini…" — klikni pro okamžité aktivování';
      case 'listening':  return 'Poslouchám…';
      case 'processing': return 'Zpracovávám…';
      case 'speaking':   return 'Mluvím… (klikni pro přerušení)';
      default:           return alwaysOn ? 'Spouštím…' : 'Klikni a mluv';
    }
  };

  return (
    <div className={`ai-widget-container ${state}`}>

      {/* Bublina s textem */}
      {(transcript || response || errorMsg) && (
        <div className="ai-chat-bubble">
          {state === 'listening'  && <div className="hint">Poslouchám…</div>}
          {state === 'dormant'    && <div className="hint">Řekni "Gemini…"</div>}
          {transcript && state !== 'listening' && state !== 'dormant' && (
            <div className="user-msg">"{transcript}"</div>
          )}
          {response  && <div className="ai-msg">{response}</div>}
          {errorMsg  && <div className="ai-error">{errorMsg}</div>}
        </div>
      )}

      {/* Dormant wake-word hint (bez bubliny) */}
      {state === 'dormant' && !transcript && !response && !errorMsg && (
        <div className="ai-dormant-label">Řekni „Gemini…"</div>
      )}

      {/* Hlavní ORB */}
      <button
        className="ai-orb"
        onClick={handleOrbClick}
        title={orbTitle()}
        aria-label={orbTitle()}
      />

      {/* Toggle always-on — malé tlačítko pod orbem */}
      <button
        className={`ai-always-on-btn ${alwaysOn ? 'active' : ''}`}
        onClick={toggleAlwaysOn}
        title={alwaysOn ? 'Vypnout stálé poslouchání' : 'Zapnout stálé poslouchání (wake word: Gemini)'}
        aria-label="Toggle always-on"
      >
        {alwaysOn ? '🎙️' : '🎙'}
      </button>

      {/* Log tlačítko — diagnostika bez DevTools */}
      <button
        className="ai-log-btn"
        onClick={() => setShowLog(v => !v)}
        title="Zobrazit AI log (diagnostika)"
        aria-label="AI log"
      >
        📋
      </button>

      {/* Log panel */}
      {showLog && <LogPanel onClose={() => setShowLog(false)} />}

    </div>
  );
};
