// src/AI/components/LogPanel.tsx
// Renderuje se přes createPortal přímo do document.body →
// unikne pointer-events:none rodiče (.ai-widget-container).

import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { getLogs, subscribeToLogs, clearLogs } from '../services/aiLogger';
import type { LogEntry } from '../services/aiLogger';

const LEVEL_COLOR: Record<LogEntry['level'], string> = {
  INFO: '#94a3b8',
  WARN: '#fbbf24',
  ERR:  '#f87171',
};

export const LogPanel: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [logs, setLogs] = useState<LogEntry[]>(() => getLogs());
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const unsub = subscribeToLogs(() => setLogs(getLogs()));
    return unsub;
  }, []);

  const handleCopy = useCallback(() => {
    const text = logs
      .map(e => `[${e.time}] ${e.level.padEnd(4)} ${e.msg}`)
      .join('\n');
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  }, [logs]);

  const handleClear = useCallback(() => {
    clearLogs();
    setCopied(false);
  }, []);

  const panel = (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.panel} onClick={e => e.stopPropagation()}>

        {/* Hlavička */}
        <div style={styles.header}>
          <span style={styles.title}>📋 AI Log ({logs.length})</span>
          <div style={styles.headerBtns}>
            <button style={styles.btn} onClick={handleCopy}>
              {copied ? '✅ Zkopírováno!' : '📄 Kopírovat vše'}
            </button>
            <button style={{ ...styles.btn, ...styles.btnRed }} onClick={handleClear}>
              🗑
            </button>
            <button style={{ ...styles.btn, ...styles.btnClose }} onClick={onClose}>
              ✕
            </button>
          </div>
        </div>

        {/* Záznamy — nejnovější dole */}
        <div style={styles.logList}>
          {logs.length === 0 && (
            <div style={styles.empty}>
              Žádné záznamy. Zapni stálé naslouchání 🎙️
            </div>
          )}
          {logs.map((e, i) => (
            <div key={i} style={styles.row}>
              <span style={styles.time}>{e.time}</span>
              <span style={{ ...styles.level, color: LEVEL_COLOR[e.level] }}>{e.level}</span>
              <span style={styles.msg}>{e.msg}</span>
            </div>
          ))}
        </div>

      </div>
    </div>
  );

  // createPortal → renderuje mimo .ai-widget-container, takže pointer-events fungují
  return createPortal(panel, document.body);
};

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.65)',
    zIndex: 9500,          // nad vším (modaly jsou 9000)
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'center',
    padding: '0 8px 24px',
    pointerEvents: 'auto', // explicitně — jistota při dědění z rodiče
    touchAction: 'auto',
  },
  panel: {
    width: '96vw',         // skoro celá šířka obrazovky na tabletu
    maxWidth: 720,
    maxHeight: '78vh',
    background: 'rgba(8,12,22,0.98)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 20,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    fontFamily: 'monospace',
    fontSize: '0.78rem',
    pointerEvents: 'auto',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 18px',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
    gap: 10,
    flexShrink: 0,
  },
  title: {
    color: '#e2e8f0',
    fontFamily: '-apple-system, sans-serif',
    fontSize: '1rem',
    fontWeight: 700,
    flexShrink: 0,
  },
  headerBtns: {
    display: 'flex',
    gap: 10,
    flexShrink: 0,
  },
  btn: {
    // min 48px výška pro pohodlné klepnutí na tabletu
    minHeight: 48,
    padding: '0 18px',
    borderRadius: 12,
    border: '1px solid rgba(255,255,255,0.18)',
    background: 'rgba(139,92,246,0.3)',
    color: '#e2e8f0',
    cursor: 'pointer',
    fontSize: '0.88rem',
    fontFamily: '-apple-system, sans-serif',
    whiteSpace: 'nowrap',
    display: 'flex',
    alignItems: 'center',
    pointerEvents: 'auto',
  },
  btnRed: {
    background: 'rgba(239,68,68,0.25)',
    padding: '0 16px',
  },
  btnClose: {
    background: 'rgba(255,255,255,0.08)',
    padding: '0 16px',
    fontWeight: 700,
  },
  logList: {
    overflowY: 'auto',
    flex: 1,
    padding: '6px 0',
    WebkitOverflowScrolling: 'touch', // plynulý scroll na iOS/Android
  },
  empty: {
    color: '#64748b',
    padding: '28px 20px',
    textAlign: 'center',
    fontFamily: '-apple-system, sans-serif',
  },
  row: {
    display: 'flex',
    gap: 8,
    padding: '4px 16px',
    borderBottom: '1px solid rgba(255,255,255,0.04)',
    alignItems: 'baseline',
    lineHeight: 1.65,
  },
  time: {
    color: '#475569',
    flexShrink: 0,
    fontSize: '0.72rem',
  },
  level: {
    flexShrink: 0,
    fontWeight: 700,
    fontSize: '0.72rem',
    width: 36,
  },
  msg: {
    color: '#cbd5e1',
    wordBreak: 'break-all',
    flex: 1,
  },
};
