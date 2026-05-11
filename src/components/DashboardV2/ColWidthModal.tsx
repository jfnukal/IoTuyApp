// src/components/DashboardV2/ColWidthModal.tsx
// Vizuální editor šířek widgetů.
// Zobrazuje proporcionální náhled dashboardu (20 sloupců × 20 řádků).
// Kliknutím na widget ho vyberem a upravíme colStart / colEnd tlačítky.

import React, { useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  TOTAL_COLS,
  DEFAULT_COL_WIDTHS,
  loadColWidths, saveColWidths, applyColWidths,
  type ColWidthConfig, type WidgetColBounds,
} from './colWidthConfig';
import { loadGridConfig, type SlotKey } from './gridConfig';
import './ColWidthModal.css';

// ── Metadata widgetů ────────────────────────────────────────────

const WIDGET_LABELS: Record<SlotKey, string> = {
  greeting:   '🏠 Pozdrav',
  shopping:   '🛒 Nákup',
  recipes:    '📖 Recepty',
  calendar:   '📅 Kalendář',
  weather:    '🌤️ Počasí',
  schedule:   '🎒 Škola',
  dishwasher: '🍽️ Myčka',
  controls:   '🎛️ Ovládání',
};

const WIDGET_COLORS: Record<SlotKey, string> = {
  greeting:   '#8b5cf6',
  shopping:   '#14b8a6',
  recipes:    '#f59e0b',
  calendar:   '#3b82f6',
  weather:    '#0ea5e9',
  schedule:   '#22c55e',
  dishwasher: '#6366f1',
  controls:   '#94a3b8',
};

const SLOT_KEYS: SlotKey[] = [
  'greeting', 'shopping', 'recipes', 'calendar',
  'weather', 'schedule', 'dishwasher', 'controls',
];

const TOTAL_ROWS = 20;

// ── Komponenta ───────────────────────────────────────────────────

interface Props {
  onClose: () => void;
}

const ColWidthModal: React.FC<Props> = ({ onClose }) => {
  const [cfg, setCfg] = useState<ColWidthConfig>(() => loadColWidths());
  const [selected, setSelected] = useState<SlotKey | null>(null);

  // Aktuální řádkový layout — jen pro vizualizaci
  const rowCfg = loadGridConfig();

  const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

  const updateCol = useCallback((key: SlotKey, field: keyof WidgetColBounds, delta: number) => {
    setCfg(prev => {
      const cur = { ...prev[key] };
      if (field === 'colStart') {
        cur.colStart = clamp(cur.colStart + delta, 1, cur.colEnd - 1);
      } else {
        cur.colEnd = clamp(cur.colEnd + delta, cur.colStart + 1, TOTAL_COLS + 1);
      }
      return { ...prev, [key]: cur };
    });
  }, []);

  const handleSave = () => {
    saveColWidths(cfg);
    applyColWidths(cfg);
    onClose();
  };

  const handleReset = () => {
    setCfg({ ...DEFAULT_COL_WIDTHS });
  };

  const sel = selected ? cfg[selected] : null;

  const modalRoot = document.getElementById('modal-root') ?? document.body;

  return createPortal(
    <div className="cwm-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="cwm-modal">

        {/* ── Záhlaví ── */}
        <div className="cwm-header">
          <span className="cwm-title">↔ Šířky widgetů</span>
          <div className="cwm-header-actions">
            <button className="cwm-btn cwm-btn--reset" onClick={handleReset}>↺ Reset</button>
            <button className="cwm-btn cwm-btn--close" onClick={onClose}>✕</button>
          </div>
        </div>

        <p className="cwm-hint">Klikni na widget v náhledu → uprav sloupce níže</p>

        {/* ── Vizuální náhled ── */}
        <div className="cwm-preview-wrap">

          {/* Čísla sloupců nahoře */}
          <div className="cwm-col-nums">
            {[1, 5, 10, 15, 20].map(n => (
              <div
                key={n}
                className="cwm-col-num"
                style={{ left: `${((n - 1) / TOTAL_COLS) * 100}%` }}
              >
                {n}
              </div>
            ))}
          </div>

          {/* Mřížka s widgety */}
          <div className="cwm-grid">

            {/* Vertikální vodítka sloupců */}
            {Array.from({ length: TOTAL_COLS - 1 }, (_, i) => (
              <div
                key={i}
                className="cwm-grid-line cwm-grid-line--v"
                style={{ left: `${((i + 1) / TOTAL_COLS) * 100}%` }}
              />
            ))}

            {/* Widgety */}
            {SLOT_KEYS.map(key => {
              const col  = cfg[key];
              const row  = rowCfg[key];
              const isSelected = selected === key;

              return (
                <div
                  key={key}
                  className={`cwm-widget${isSelected ? ' cwm-widget--selected' : ''}`}
                  style={{
                    left:   `${((col.colStart - 1) / TOTAL_COLS) * 100}%`,
                    width:  `${((col.colEnd - col.colStart) / TOTAL_COLS) * 100}%`,
                    top:    `${((row.rowStart - 1) / TOTAL_ROWS) * 100}%`,
                    height: `${((row.rowEnd - row.rowStart) / TOTAL_ROWS) * 100}%`,
                    background: WIDGET_COLORS[key],
                    borderColor: isSelected ? '#fff' : 'rgba(255,255,255,0.2)',
                  }}
                  onClick={() => setSelected(key)}
                >
                  <span className="cwm-widget-label">{WIDGET_LABELS[key]}</span>
                  <span className="cwm-widget-cols">{col.colStart}–{col.colEnd}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Ovládání vybraného widgetu ── */}
        <div className="cwm-controls">
          {selected && sel ? (
            <>
              <div className="cwm-controls-title">
                <span
                  className="cwm-controls-dot"
                  style={{ background: WIDGET_COLORS[selected] }}
                />
                {WIDGET_LABELS[selected]}
              </div>

              <div className="cwm-controls-row">
                <label className="cwm-controls-label">Sloupec od</label>
                <button className="cwm-step" onClick={() => updateCol(selected, 'colStart', -1)}>◄</button>
                <span className="cwm-val">{sel.colStart}</span>
                <button className="cwm-step" onClick={() => updateCol(selected, 'colStart', +1)}>►</button>

                <label className="cwm-controls-label cwm-controls-label--gap">Sloupec do</label>
                <button className="cwm-step" onClick={() => updateCol(selected, 'colEnd', -1)}>◄</button>
                <span className="cwm-val">{sel.colEnd}</span>
                <button className="cwm-step" onClick={() => updateCol(selected, 'colEnd', +1)}>►</button>

                <span className="cwm-width-hint">
                  ({sel.colEnd - sel.colStart} / {TOTAL_COLS} = {Math.round((sel.colEnd - sel.colStart) / TOTAL_COLS * 100)} %)
                </span>
              </div>
            </>
          ) : (
            <span className="cwm-controls-empty">← Klikni na widget v náhledu</span>
          )}
        </div>

        {/* ── Patička ── */}
        <div className="cwm-footer">
          <button className="cwm-btn cwm-btn--save" onClick={handleSave}>💾 Uložit</button>
        </div>

      </div>
    </div>,
    modalRoot,
  );
};

export default ColWidthModal;
