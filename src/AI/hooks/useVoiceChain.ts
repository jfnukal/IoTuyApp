// src/AI/hooks/useVoiceChain.ts
import { useState, useCallback, useEffect } from 'react';
import { sendToGemini } from '../services/geminiApi';
import { playHumanVoice } from '../services/textToSpeech'; // <--- Import nové služby

export type VoiceState = 'idle' | 'listening' | 'processing' | 'speaking';

export const useVoiceChain = () => {
  const [state, setState] = useState<VoiceState>('idle');
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState('');

  // Cleanup
  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
    };
  }, []);

// --- 1. Syntéza řeči (NOVÁ - Human Voice) ---
const speak = useCallback(async (text: string) => {
  setState('speaking');
  
  // Zavoláme OpenAI a počkáme, dokud audio nedohraje
  await playHumanVoice(text);
  
  // Teprve až audio skončí, přepneme stav zpět na 'idle' (koule přestane svítit)
  setState('idle'); 
}, []);

  // --- 2. Zpracování s Gemini ---
  const processText = useCallback(async (text: string) => {
    setState('processing');
    const aiReply = await sendToGemini(text);
    setResponse(aiReply);
    
    // Tady musíme počkat na vygenerování zvuku, než to pustíme
    speak(aiReply);
  }, [speak]);

  // ... (ZBYTEK FUNKCE startListening ZŮSTÁVÁ STEJNÝ) ...
  
  // Kopíruj zbytek souboru useVoiceChain z minula...
  const startListening = useCallback(() => {
    if (!('webkitSpeechRecognition' in window)) {
       // ... atd
       return;
    }
    // ... atd (zkopíruj starý kód startListening)
    
    const recognition = new (window as any).webkitSpeechRecognition();
    recognition.lang = 'cs-CZ';
    // ...
    
    recognition.onstart = () => setState('listening');
    recognition.onresult = (event: any) => {
        const text = event.results[0][0].transcript;
        setTranscript(text);
        processText(text);
    };
    recognition.start();

  }, [processText]);

  return {
    state,
    transcript,
    response,
    startListening,
    cancel: () => {
        window.speechSynthesis.cancel();
        setState('idle');
    }
  };
};