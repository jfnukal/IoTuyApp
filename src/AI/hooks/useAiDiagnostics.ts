// src/AI/hooks/useAiDiagnostics.ts
// Ladicí ikony pod AI koulí (🗣️ výběr hlasu, 📋 log) — běžně schované, zapínají se
// v Nastavení → Systém. Každé zařízení si to pamatuje zvlášť (localStorage), stejně
// jako ostatní volby koule (stálé poslouchání, hlas).

import { useSyncExternalStore } from 'react';

const STORAGE_KEY = 'ai.showDiagnostics';
// Změna ve stejné záložce — událost 'storage' chodí jen z jiných záložek
const CHANGE_EVENT = 'ai-diagnostics-change';

function isVisible(): boolean {
  try { return localStorage.getItem(STORAGE_KEY) === 'true'; } catch { return false; }
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener('storage', onChange);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener('storage', onChange);
  };
}

/** true = ladicí ikony pod koulí se mají zobrazit */
export function useAiDiagnosticsVisible(): boolean {
  return useSyncExternalStore(subscribe, isVisible);
}

export function setAiDiagnosticsVisible(visible: boolean): void {
  try { localStorage.setItem(STORAGE_KEY, String(visible)); } catch { /* ignore */ }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}
