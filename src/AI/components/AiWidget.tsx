// src/AI/components/AiWidget.tsx
import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useWakeWord } from '../hooks/useWakeWord';
import { LogPanel } from './LogPanel';
import './AiWidget.css';

const DISMISS_DELAY_MS = 6000;

export const AiWidget: React.FC = () => {
  const {
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
  } = useWakeWord();

  const [showLog, setShowLog] = useState(false);

  // Auto-dismiss bubliny po návratu do klidového stavu
  useEffect(() => {
    if (state !== 'dormant' && state !== 'off') return;
    const t = setTimeout(clearConversation, DISMISS_DELAY_MS);
    return () => clearTimeout(t);
  }, [state, clearConversation]);

  // Auto-dismiss kandidáta po 12s (aby nebublina nezůstala navždy)
  useEffect(() => {
    if (!candidate) return;
    const t = setTimeout(rejectCandidate, 12000);
    return () => clearTimeout(t);
  }, [candidate, rejectCandidate]);

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

  // Potvrzovací bublina — renderována přes portal (mimo ai-widget-container)
  const candidateBubble = candidate ? createPortal(
    <div style={candidateStyles.overlay}>
      <div style={candidateStyles.bubble}>
        <div style={candidateStyles.label}>Slyšel jsem:</div>
        <div style={candidateStyles.phrase}>„{candidate}"</div>
        <div style={candidateStyles.question}>Myslel jsi <strong>„hej Gemini"</strong>?</div>
        <div style={candidateStyles.btns}>
          <button style={candidateStyles.btnYes} onClick={() => confirmCandidate(candidate)}>
            ✅ Ano, naučit se
          </button>
          <button style={candidateStyles.btnNo} onClick={rejectCandidate}>
            ✕ Ne
          </button>
        </div>
      </div>
    </div>,
    document.body
  ) : null;

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

      {/* Toggle always-on */}
      <button
        className={`ai-always-on-btn ${alwaysOn ? 'active' : ''}`}
        onClick={toggleAlwaysOn}
        title={alwaysOn ? 'Vypnout stálé poslouchání' : 'Zapnout stálé poslouchání (wake word: Gemini)'}
        aria-label="Toggle always-on"
      >
        {alwaysOn ? '🎙️' : '🎙'}
      </button>

      {/* Log tlačítko */}
      <button
        className="ai-log-btn"
        onClick={() => setShowLog(v => !v)}
        title="Zobrazit AI log (diagnostika)"
        aria-label="AI log"
      >
        📋
      </button>

      {/* Candidate bubble — portal mimo ai-widget-container */}
      {candidateBubble}

      {/* Log panel */}
      {showLog && <LogPanel onClose={() => setShowLog(false)} />}

    </div>
  );
};

// Styly pro potvrzovací bublinu — velká tlačítka pro tablet
const candidateStyles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    bottom: 160,
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 8500,
    pointerEvents: 'auto',
  },
  bubble: {
    background: 'rgba(10, 15, 30, 0.97)',
    border: '1px solid rgba(139, 92, 246, 0.5)',
    borderRadius: 20,
    padding: '18px 22px',
    maxWidth: 340,
    boxShadow: '0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(139,92,246,0.2)',
    fontFamily: '-apple-system, sans-serif',
    textAlign: 'center',
  },
  label: {
    color: '#94a3b8',
    fontSize: '0.78rem',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
  },
  phrase: {
    color: '#f1f5f9',
    fontSize: '1.15rem',
    fontWeight: 700,
    marginBottom: 10,
  },
  question: {
    color: '#cbd5e1',
    fontSize: '0.9rem',
    marginBottom: 16,
    lineHeight: 1.5,
  },
  btns: {
    display: 'flex',
    gap: 10,
    justifyContent: 'center',
  },
  btnYes: {
    minHeight: 48,
    padding: '0 20px',
    borderRadius: 12,
    border: '1px solid rgba(139,92,246,0.5)',
    background: 'rgba(139,92,246,0.35)',
    color: '#e2e8f0',
    fontSize: '0.9rem',
    cursor: 'pointer',
    fontFamily: '-apple-system, sans-serif',
    pointerEvents: 'auto',
  },
  btnNo: {
    minHeight: 48,
    padding: '0 20px',
    borderRadius: 12,
    border: '1px solid rgba(255,255,255,0.12)',
    background: 'rgba(255,255,255,0.07)',
    color: '#94a3b8',
    fontSize: '0.9rem',
    cursor: 'pointer',
    fontFamily: '-apple-system, sans-serif',
    pointerEvents: 'auto',
  },
};
