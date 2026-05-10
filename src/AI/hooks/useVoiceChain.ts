// src/AI/hooks/useVoiceChain.ts
import { useState, useCallback, useEffect, useRef } from 'react';
import { sendToGemini } from '../services/geminiApi';
import { playGeminiVoice } from '../services/geminiTts';

export type VoiceState = 'idle' | 'listening' | 'processing' | 'speaking';

const RECOGNITION_ERRORS: Record<string, string> = {
  'not-allowed':            'Mikrofon není povolen — povol přístup v prohlížeči',
  'no-speech':              'Nic jsem neslyšel, zkus to znovu',
  'audio-capture':          'Mikrofon nenalezen nebo je obsazený',
  'network':                'Chyba služby rozpoznávání řeči — zkus to znovu',
  'aborted':                'Poslouchání zrušeno',
  'service-not-allowed':    'Služba rozpoznávání řeči není povolena',
  'language-not-supported': 'Čeština není podporována v tomto prohlížeči',
};

export const useVoiceChain = () => {
  const [state, setState] = useState<VoiceState>('idle');
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
      recognitionRef.current?.abort();
    };
  }, []);

  const speak = useCallback(async (text: string) => {
    setState('speaking');
    await playGeminiVoice(text);
    setState('idle');
  }, []);

  const processText = useCallback(async (text: string) => {
    setState('processing');
    setErrorMsg('');
    const aiReply = await sendToGemini(text);
    setResponse(aiReply);
    await speak(aiReply);
  }, [speak]);

  const startListening = useCallback(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setErrorMsg('Rozpoznávání řeči není podporováno v tomto prohlížeči (zkus Chrome)');
      return;
    }

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.lang = 'cs-CZ';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setState('listening');
      setTranscript('');
      setResponse('');
      setErrorMsg('');
    };

    recognition.onerror = (e: any) => {
      const msg = RECOGNITION_ERRORS[e.error] ?? `Chyba rozpoznávání: ${e.error}`;
      console.warn(`[VoiceChain] ${e.error} — ${msg}`);
      setErrorMsg(msg);
      setState('idle');
    };

    recognition.onresult = (event: any) => {
      const text = event.results[0][0].transcript;
      setTranscript(text);
      processText(text);
    };

    recognition.start();
  }, [processText]);

  const cancel = useCallback(() => {
    window.speechSynthesis.cancel();
    recognitionRef.current?.abort();
    setState('idle');
    setErrorMsg('');
  }, []);

  return { state, transcript, response, errorMsg, startListening, cancel };
};
