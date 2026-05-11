// src/components/DashboardV2/ColWidthModal.tsx
// Sjednocený editor velikosti widgetů — šířka (sloupce) i výška (řádky).
// Grid: 31 sloupců × 21 řádků. Klikni na widget → uprav.

import React, { useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  TOTAL_COLS, TOTAL_ROWS,
  DEFAULT_COL_WIDTHS,
  loadColWidths, saveColWidths, applyColWidths,
  type ColWidthConfig, type WidgetColBounds,
} from './colWidthConfig';
import {
  loadGridConfig, saveGridConfig, applyGridConfig, DEFAULT_GRID,
  type SlotKey, type SlotConfig,
} from './gridConfig';
import './ColWidthModal.css';

// ── Metadata ────────────────────────────────────────────────────

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

// ── Komponenta ───────────────────────────────────────────────────

interface Props { onClose: () => void; }

const ColWidthModal: React.FC<Props> = ({ onClose }) => {
  const [colCfg, setColCfg] = useState<ColWidthConfig>(() => loadColWidths());
  const [rowCfg, setRowCfg] = useState<Record<SlotKey, SlotConfig>>(() => loadGridConfig());
  const [selected, setSelected] = useState<SlotKey | null>(null);

  const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

  const updateCol = useCallback((key: SlotKey, field: keyof WidgetColBounds, delta: number) => {
    setColCfg(prev => {
      const c = { ...prev[key] };
      if (field === 'colStart') c.colStart = clamp(c.colStart + delta, 1, c.colEnd - 1);
      else                      c.colEnd   = clamp(c.colEnd   + delta, c.colStart + 1, TOTAL_COLS + 1);
      return { ...prev, [key]: c };
    });
  }, []);

  const updateRow = useCallback((key: SlotKey, field: 'rowStart' | 'rowEnd', delta: number) => {
    setRowCfg(prev => {
      const r = { ...prev[key] };
      if (field === 'rowStart') r.rowStart = clamp(r.rowStart + delta, 1, r.rowEnd - 1);
      else                      r.rowEnd   = clamp(r.rowEnd   + delta, r.rowStart + 1, TOTAL_ROWS + 1);
      return { ...prev, [key]: r };
    });
  }, []);

  const handleSave = () => {
    saveColWidths(colCfg);  applyColWidths(colCfg);
    saveGridConfig(rowCfg); applyGridConfig(rowCfg);
    onClose();
  };

  const handleReset = () => {
    setColCfg({ ...DEFAULT_COL_WIDTHS });
    setRowCfg({ ...DEFAULT_GRID });
  };

  const selCol = selected ? colCfg[selected] : null;
  const selRow = selected ? rowCfg[selected] : null;

  return createPortal(
    <div className="cwm-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="cwm-modal">

        {/* Záhlaví */}
        <div className="cwm-header">
          <span className="cwm-title">⤢ Změna velikosti</span>
          <div className="cwm-header-actions">
            <button className="cwm-btn cwm-btn--reset" onClick={handleReset}>↺ Reset</button>
            <button className="cwm-btn cwm-btn--close" onClick={onClose}>✕</button>
          </div>
        </div>

        <p className="cwm-hint">Klikni na widget v náhledu → uprav šířku a výšku</p>

        {/* Vizuální náhled */}
        <div className="cwm-preview-wrap">
          {/* Čísla sloupců */}
          <div className="cwm-col-nums">
            {[1, 5, 10, 15, 20, 25, 31].map(n => (
              <div key={n} className="cwm-col-num"
                style={{ left: `${((n - 1) / TOTAL_COLS) * 100}%` }}>
                {n}
              </div>
            ))}
          </div>

          {/* Mřížka */}
          <div className="cwm-grid">
            {/* Vodítka sloupců */}
            {Array.from({ length: TOTAL_COLS - 1 }, (_, i) => (
              <div key={`v${i}`} className={`cwm-line cwm-line--v ${(i + 1) % 5 === 0 ? 'cwm-line--major' : ''}`}
                style={{ left: `${((i + 1) / TOTAL_COLS) * 100}%` }} />
            ))}
            {/* Vodítka řádků */}
            {Array.from({ length: TOTAL_ROWS - 1 }, (_, i) => (
              <div key={`h${i}`} className={`cwm-line cwm-line--h ${(i + 1) % 5 === 0 ? 'cwm-line--major' : ''}`}
                style={{ top: `${((i + 1) / TOTAL_ROWS) * 100}%` }} />
            ))}

            {/* Widgety */}
            {SLOT_KEYS.map(key => {
              const col = colCfg[key];
              const row = rowCfg[key];
              const isSel = selected === key;
              return (
                <div key={key}
                  className={`cwm-widget${isSel ? ' cwm-widget--sel' : ''}`}
                  style={{
                    left:        `${((col.colStart - 1) / TOTAL_COLS) * 100}%`,
                    width:       `${((col.colEnd - col.colStart) / TOTAL_COLS) * 100}%`,
                    top:         `${((row.rowStart - 1) / TOTAL_ROWS) * 100}%`,
                    height:      `${((row.rowEnd - row.rowStart) / TOTAL_ROWS) * 100}%`,
                    background:  WIDGET_COLORS[key],
                    borderColor: isSel ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.15)',
                  }}
                  onClick={() => setSelected(key)}
                >
                  <span className="cwm-widget-label">{WIDGET_LABELS[key]}</span>
                  <span className="cwm-widget-meta">
                    ↔{col.colStart}–{col.colEnd} ↕{row.rowStart}–{row.rowEnd}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Ovládání vybraného widgetu */}
        <div className="cwm-controls">
          {selected && selCol && selRow ? (
            <>
              <div className="cwm-sel-title">
                <span className="cwm-sel-dot" style={{ background: WIDGET_COLORS[selected] }} />
                {WIDGET_LABELS[selected]}
              </div>

              <div className="cwm-ctrl-grid">
                {/* Šířka */}
                <span className="cwm-ctrl-lbl">Sloupec od</span>
                <button className="cwm-step" onClick={() => updateCol(selected, 'colStart', -1)}>◄</button>
                <span className="cwm-val">{selCol.colStart}</span>
                <button className="cwm-step" onClick={() => updateCol(selected, 'colStart', +1)}>►</button>

                <span className="cwm-ctrl-lbl">Sloupec do</span>
                <button className="cwm-step" onClick={() => updateCol(selected, 'colEnd', -1)}>◄</button>
                <span className="cwm-val">{selCol.colEnd}</span>
                <button className="cwm-step" onClick={() => updateCol(selected, 'colEnd', +1)}>►</button>

                <span className="cwm-ctrl-hint">
                  {selCol.colEnd - selCol.colStart} / {TOTAL_COLS} = {Math.round((selCol.colEnd - selCol.colStart) / TOTAL_COLS * 100)} %
                </span>

                {/* Výška */}
                <span className="cwm-ctrl-lbl">Řádek od</span>
                <button className="cwm-step" onClick={() => updateRow(selected, 'rowStart', -1)}>▲</button>
                <span className="cwm-val">{selRow.rowStart}</span>
                <button className="cwm-step" onClick={() => updateRow(selected, 'rowStart', +1)}>▼</button>

                <span className="cwm-ctrl-lbl">Řádek do</span>
                <button className="cwm-step" onClick={() => updateRow(selected, 'rowEnd', -1)}>▲</button>
                <span className="cwm-val">{selRow.rowEnd}</span>
                <button className="cwm-step" onClick={() => updateRow(selected, 'rowEnd', +1)}>▼</button>

                <span className="cwm-ctrl-hint">
                  {selRow.rowEnd - selRow.rowStart} / {TOTAL_ROWS} = {Math.round((selRow.rowEnd - selRow.rowStart) / TOTAL_ROWS * 100)} %
                </span>
              </div>
            </>
          ) : (
            <span className="cwm-empty">← Klikni na widget v náhledu</span>
          )}
        </div>

        {/* Patička */}
        <div className="cwm-footer">
          <button className="cwm-btn cwm-btn--save" onClick={handleSave}>💾 Uložit</button>
        </div>

      </div>
    </div>,
    document.getElementById('modal-root') ?? document.body,
  );
};

export default ColWidthModal;
