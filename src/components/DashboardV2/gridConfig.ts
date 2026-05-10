// src/components/DashboardV2/gridConfig.ts

export type SlotKey =
  | 'greeting' | 'shopping' | 'recipes'
  | 'calendar'
  | 'weather' | 'schedule' | 'dishwasher' | 'controls';

export interface SlotConfig {
  label: string;
  col: number;
  rowStart: number;
  rowEnd: number;
}

export const DEFAULT_GRID: Record<SlotKey, SlotConfig> = {
  greeting:   { label: '🏠 Pozdrav',   col: 1, rowStart: 1,  rowEnd: 7  },
  shopping:   { label: '🛒 Nákup',     col: 1, rowStart: 7,  rowEnd: 15 },
  recipes:    { label: '📖 Recepty',   col: 1, rowStart: 15, rowEnd: 21 },
  calendar:   { label: '📅 Kalendář',  col: 2, rowStart: 1,  rowEnd: 21 },
  weather:    { label: '🌤️ Počasí',    col: 3, rowStart: 1,  rowEnd: 6  },
  schedule:   { label: '🎒 Rozvrh',    col: 3, rowStart: 6,  rowEnd: 13 },
  dishwasher: { label: '🍽️ Myčka',    col: 3, rowStart: 13, rowEnd: 19 },
  controls:   { label: '🎛️ Ovládání',  col: 3, rowStart: 19, rowEnd: 21 },
};

const LS_KEY = 'v2-grid-config';

export function loadGridConfig(): Record<SlotKey, SlotConfig> {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return { ...DEFAULT_GRID, ...JSON.parse(raw) };
  } catch {}
  return { ...DEFAULT_GRID };
}

export function saveGridConfig(cfg: Record<SlotKey, SlotConfig>): void {
  localStorage.setItem(LS_KEY, JSON.stringify(cfg));
}

export function applyGridConfig(cfg: Record<SlotKey, SlotConfig>): void {
  const root = document.documentElement.style;
  for (const [key, slot] of Object.entries(cfg) as [SlotKey, SlotConfig][]) {
    root.setProperty(`--grid-${key}-col`,   String(slot.col));
    root.setProperty(`--grid-${key}-start`, String(slot.rowStart));
    root.setProperty(`--grid-${key}-end`,   String(slot.rowEnd));
  }
}
