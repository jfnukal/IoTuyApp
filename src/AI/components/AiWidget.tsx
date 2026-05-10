// src/AI/components/AiWidget.tsx
import React from 'react';
import { useWakeWord } from '../hooks/useWakeWord';
import './AiWidget.css';

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
  } = useWakeWord();

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

    </div>
  );
};
