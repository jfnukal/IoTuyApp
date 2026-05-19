// src/AI/services/aiLogger.ts
// Centrální log pro AI widget — zachytí SpeechRecognition + TTS události.
// Přežije bez DevTools: výpisy jsou vidět v log panelu přímo v UI.

const MAX_ENTRIES = 100;

export type LogLevel = 'INFO' | 'WARN' | 'ERR';

export interface LogEntry {
  time: string;   // HH:MM:SS
  level: LogLevel;
  msg: string;
}

const entries: LogEntry[] = [];
const listeners = new Set<() => void>();

function timestamp(): string {
  return new Date().toLocaleTimeString('cs-CZ', {
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  });
}

export function aiLog(level: LogLevel, msg: string): void {
  const entry: LogEntry = { time: timestamp(), level, msg };
  entries.push(entry);
  if (entries.length > MAX_ENTRIES) entries.shift();
  listeners.forEach(fn => fn());
}

export function getLogs(): LogEntry[] {
  return [...entries];
}

/** Přihlásí callback k notifikaci při novém záznamu. Vrátí unsubscribe funkci. */
export function subscribeToLogs(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function clearLogs(): void {
  entries.length = 0;
  listeners.forEach(fn => fn());
}

// ── Globální zachycení neošetřených chyb ────────────────────────────────────
if (typeof window !== 'undefined') {
  window.addEventListener('error', (e) => {
    aiLog('ERR', `window.onerror: ${e.message} @ ${e.filename}:${e.lineno}`);
  });
  window.addEventListener('unhandledrejection', (e) => {
    aiLog('ERR', `unhandledRejection: ${String(e.reason)}`);
  });
}
