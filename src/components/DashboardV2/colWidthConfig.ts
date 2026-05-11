// src/components/DashboardV2/colWidthConfig.ts
// Konfigurace šířek widgetů — každý widget má colStart a colEnd
// v rámci 20-sloupcového gridu (každý sloupec = 5 % šířky).

import type { SlotKey } from './gridConfig';

export const TOTAL_COLS = 20;

export interface WidgetColBounds {
  colStart: number; // 1–20
  colEnd:   number; // 2–21 (CSS grid end je exkluzivní)
}

export type ColWidthConfig = Record<SlotKey, WidgetColBounds>;

// Výchozí rozložení odpovídá původnímu 1fr : 2fr : 1fr
//   Levý  (1fr  = 25 %) → sloupce 1–6   (5 sloupců)
//   Střed (2fr  = 50 %) → sloupce 6–16  (10 sloupců)
//   Pravý (1fr  = 25 %) → sloupce 16–21 (5 sloupců)
export const DEFAULT_COL_WIDTHS: ColWidthConfig = {
  greeting:   { colStart: 1,  colEnd: 6  },
  shopping:   { colStart: 1,  colEnd: 6  },
  recipes:    { colStart: 1,  colEnd: 6  },
  calendar:   { colStart: 6,  colEnd: 16 },
  weather:    { colStart: 16, colEnd: 21 },
  schedule:   { colStart: 16, colEnd: 21 },
  dishwasher: { colStart: 16, colEnd: 21 },
  controls:   { colStart: 16, colEnd: 21 },
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
