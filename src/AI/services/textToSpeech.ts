// src/AI/services/textToSpeech.ts
import { configService } from '../../services/configService';

let ELEVENLABS_API_KEY: string | null = null;
let OPENAI_API_KEY: string | null = null;

const getElevenLabsKey = async (): Promise<string> => {
  if (!ELEVENLABS_API_KEY) {
    ELEVENLABS_API_KEY = await configService.getApiKey('elevenlabs');
  }
  return ELEVENLABS_API_KEY || '';
};

const getOpenAIKey = async (): Promise<string> => {
  if (!OPENAI_API_KEY) {
    OPENAI_API_KEY = await configService.getApiKey('openai');
  }
  return OPENAI_API_KEY || '';
};

const ELEVENLABS_VOICE_ID = '7FpO7yFcBAfqM6vZJCg7'; 

// Funkce pro volání OpenAI (vytáhneme ji ven, ať ji můžeme zavolat z catch bloku)
const playOpenAIBackup = async (text: string): Promise<void> => {
    const openaiKey = await getOpenAIKey();
    if (!openaiKey) throw new Error("No OpenAI Key");
    
    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'tts-1-hd', 
        voice: 'alloy',
        input: text,
        speed: 1.0, 
      }),
    });
    if (!response.ok) throw new Error('OpenAI Error');
    const audioBlob = await response.blob();
    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);
    return new Promise((resolve) => { audio.onended = () => resolve(); audio.play(); });
};

export const playHumanVoice = async (text: string): Promise<void> => {
  // 1. POKUS: ELEVENLABS
  const elevenKey = await getElevenLabsKey();
  if (elevenKey) {
      try {
        const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}`, {
          method: 'POST',
          headers: { 'xi-api-key': elevenKey, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: text,
            model_id: "eleven_multilingual_v2",
            voice_settings: { stability: 0.5, similarity_boost: 0.75 }
          }),
        });
        if (!response.ok) throw new Error('ElevenLabs selhal (asi limit)');
        
        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        return new Promise((resolve) => { audio.onended = () => resolve(); audio.play(); });

      } catch (err) {
        console.warn("ElevenLabs selhal, přepínám na OpenAI zálohu...", err);
      }
  }

  // 2. POKUS: OPENAI (Záloha za 5 USD)
  try {
      await playOpenAIBackup(text);
      return;
  } catch (err) {
      console.warn("OpenAI taky selhalo, jdu na robota.", err);
  }

  // 3. POKUS: ROBOT (Zadarmo v prohlížeči)
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'cs-CZ';
  window.speechSynthesis.speak(u);
};
