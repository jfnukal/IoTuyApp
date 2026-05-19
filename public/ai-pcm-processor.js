// public/ai-pcm-processor.js
// AudioWorklet procesor: Float32 → Int16 PCM, posílá chunky do main threadu.
// Běží na audio threadu — ŽÁDNÉ importy, ŽÁDNÉ console.log.

class PcmProcessor extends AudioWorkletProcessor {
  process(inputs) {
    const ch = inputs[0]?.[0];
    if (!ch || ch.length === 0) return true;

    const int16 = new Int16Array(ch.length);
    for (let i = 0; i < ch.length; i++) {
      // Clamp + scale Float32 [-1, 1] → Int16 [-32768, 32767]
      const s = Math.max(-1, Math.min(1, ch[i]));
      int16[i] = s < 0 ? s * 32768 : s * 32767;
    }

    // Přeneseme buffer (zero-copy) do main threadu
    this.port.postMessage(int16.buffer, [int16.buffer]);
    return true;
  }
}

registerProcessor('ai-pcm-processor', PcmProcessor);
