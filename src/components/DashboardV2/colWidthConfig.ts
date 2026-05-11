// src/components/DashboardV2/colWidthConfig.ts
// Konfigurace šířek widgetů — každý widget má colStart a colEnd
// v rámci 20-sloupcového gridu (každý sloupec = 5 % šířky).

import type { SlotKey } from './gridConfig';

export const TOTAL_COLS = 31;
export const TOTAL_ROWS = 21; // grid lines 1–22, buňky 1–21

export interface WidgetColBounds {
  colStart: number; // 1–31
  colEnd:   number; // 2–32 (CSS grid end je exkluzivní)
}

export type ColWidthConfig = Record<SlotKey, WidgetColBounds>;

// Výchozí rozložení odpovídá původnímu 1fr : 2fr : 1fr
//   Levý  ( 8 sloupců z 31) → 1–9
//   Střed (15 sloupců z 31) → 9–24
//   Pravý ( 8 sloupců z 31) → 24–32
export const DEFAULT_COL_WIDTHS: ColWidthConfig = {
  greeting:   { colStart: 1,  colEnd: 9  },
  shopping:   { colStart: 1,  colEnd: 9  },
  recipes:    { colStart: 1,  colEnd: 9  },
  calendar:   { colStart: 9,  colEnd: 24 },
  weather:    { colStart: 24, colEnd: 32 },
  schedule:   { colStart: 24, colEnd: 32 },
  dishwasher: { colStart: 24, colEnd: 32 },
  controls:   { colStart: 24, colEnd: 32 },
};

const LS_KEY = 'v2-col-widths';

export function loadColWidths(): ColWidthConfig {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return { ...DEFAULT_COL_WIDTHS, ...JSON.parse(raw) };
  } catch {}
  return { ...DEFAULT_COL_WIDTHS };
}

export function saveColWidths(cfg: ColWidthConfig): void {
  localStorage.setItem(LS_KEY, JSON.stringify(cfg));
}

export function applyColWidths(cfg: ColWidthConfig): void {
  const root = document.documentElement.style;
  for (const [key, bounds] of Object.entries(cfg) as [SlotKey, WidgetColBounds][]) {
    root.setProperty(`--grid-${key}-col-start`, String(bounds.colStart));
    root.setProperty(`--grid-${key}-col-end`,   String(bounds.colEnd));
  }
}
