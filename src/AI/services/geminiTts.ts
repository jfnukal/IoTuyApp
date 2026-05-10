// src/AI/services/geminiTts.ts
// Gemini TTS (gemini-2.5-flash-preview-tts, hlas Aoede)
// Fallback: browser SpeechSynthesis cs-CZ

import { configService } from '../../services/configService';

let cachedKey: string | null = null;
const getKey = async () => {
  if (!cachedKey) cachedKey = await configService.getApiKey('gemini');
  return cachedKey || '';
};

function pcm16ToWav(base64: string, sampleRate = 24000): Blob {
  const binary = atob(base64);
  const pcm = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) pcm[i] = binary.charCodeAt(i);

  const buf = new ArrayBuffer(44 + pcm.length);
  const v = new DataView(buf);
  const str = (o: number, s: string) => {
    for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i));
  };

  str(0, 'RIFF'); v.setUint32(4, 36 + pcm.length, true);
  str(8, 'WAVE'); str(12, 'fmt ');
  v.setUint32(16, 16, true); v.setUint16(20, 1, true);
  v.setUint16(22, 1, true);
  v.setUint32(24, sampleRate, true);
  v.setUint32(28, sampleRate * 2, true);
  v.setUint16(32, 2, true); v.setUint16(34, 16, true);
  str(36, 'data'); v.setUint32(40, pcm.length, true);
  new Uint8Array(buf, 44).set(pcm);

  return new Blob([buf], { type: 'audio/wav' });
}

export const playGeminiVoice = async (text: string): Promise<void> => {
  const key = await getKey();

  if (key) {
    // Pokus 1: gemini-2.5-flash-preview-tts přes v1alpha
    for (const apiVersion of ['v1alpha', 'v1beta']) {
      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/${apiVersion}/models/gemini-2.5-flash-preview-tts:generateContent?key=${key}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ role: 'user', parts: [{ text }] }],
              generationConfig: {
                responseModalities: ['AUDIO'],
                speechConfig: {
                  voiceConfig: {
                    prebuiltVoiceConfig: { voiceName: 'Aoede' },
                  },
                },
              },
            }),
          }
        );

        if (res.ok) {
          const data = await res.json();
          const audioPart = data?.candidates?.[0]?.content?.parts?.[0]?.inlineData;
          if (audioPart?.data) {
            const wav = pcm16ToWav(audioPart.data);
            const url = URL.createObjectURL(wav);
            const audio = new Audio(url);
            audio.playbackRate = 1.3; // Aoede mluví přirozeně rychleji
            return new Promise((resolve) => {
              audio.onended = () => { URL.revokeObjectURL(url); resolve(); };
              audio.onerror = () => { URL.revokeObjectURL(url); resolve(); };
              audio.play().catch(() => resolve());
            });
          }
        } else if (res.status === 404) {
          continue; // zkus další API verzi
        }
      } catch {
        // zkus další
      }
    }
  }

  // Fallback: browser SpeechSynthesis
  return browserTts(text);
};

function browserTts(text: string): Promise<void> {
  return new Promise((resolve) => {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'cs-CZ';
    const czVoice = window.speechSynthesis.getVoices().find(v => v.lang.startsWith('cs')) ?? null;
    if (czVoice) u.voice = czVoice;
    u.rate = 1.2;
    u.onend = () => resolve();
    u.onerror = () => resolve();
    window.speechSynthesis.speak(u);
  });
}
