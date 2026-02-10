// src/AI/components/AiWidget.tsx
import React from 'react';
import { useVoiceChain } from '../hooks/useVoiceChain';
import './AiWidget.css';

export const AiWidget: React.FC = () => {
  const { state, transcript, response, startListening, cancel } = useVoiceChain();

  const handleClick = () => {
      if (state === 'idle') {
          startListening();
      } else {
          cancel();
      }
  };

  return (
    <div className={`ai-widget-container ${state}`}>
      
      {/* Bublina s textem */}
      {(transcript || response) && state !== 'idle' && (
        <div className="ai-chat-bubble">
          {state === 'listening' && <div className="hint">Poslouchám...</div>}
          {transcript && state !== 'listening' && <div className="user-msg">"{transcript}"</div>}
          {response && <div className="ai-msg">{response}</div>}
        </div>
      )}

      {/* Hlavní ORB - Nyní prázdný, čistá energie */}
      <button 
        className="ai-orb" 
        onClick={handleClick}
        title={state === 'idle' ? "Klikni a mluv" : "Zrušit"}
      >
        {/* Žádný icon div uvnitř! */}
      </button>
    </div>
  );
};