// src/AI/components/LogPanel.tsx
// Jednoduchý in-app log panel — zobrazí záznamy z aiLogger.
// Přístup: tlačítko 📋 v AiWidget. Funguje bez DevTools na tabletu.

import React, { useState, useEffect, useCallback } from 'react';
import { getLogs, subscribeToLogs, clearLogs, LogEntry } from '../services/aiLogger';

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
      setTimeout(() => setCopied(false), 2000);
    });
  }, [logs]);

  const handleClear = useCallback(() => {
    clearLogs();
    setCopied(false);
  }, []);

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.panel} onClick={e => e.stopPropagation()}>

        {/* Hlavička */}
        <div style={styles.header}>
          <span style={styles.title}>📋 AI Log ({logs.length} záznamů)</span>
          <div style={styles.headerBtns}>
            <button style={styles.btn} onClick={handleCopy}>
              {copied ? '✅ Zkopírováno' : '📄 Kopírovat'}
            </button>
            <button style={{ ...styles.btn, background: 'rgba(239,68,68,0.2)' }} onClick={handleClear}>
              🗑 Vymazat
            </button>
            <button style={{ ...styles.btn, background: 'rgba(255,255,255,0.1)' }} onClick={onClose}>
              ✕
            </button>
          </div>
        </div>

        {/* Záznamy */}
        <div style={styles.logList}>
          {logs.length === 0 && (
            <div style={{ color: '#64748b', padding: '20px', textAlign: 'center' }}>
              Žádné záznamy. Zapni stálé naslouchání.
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
};

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.6)',
    zIndex: 8000,
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'center',
    padding: '0 0 20px',
  },
  panel: {
    width: 'min(98vw, 700px)',
    maxHeight: '75vh',
    background: 'rgba(10,15,25,0.97)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '20px',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    fontFamily: 'monospace',
    fontSize: '0.78rem',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '14px 16px',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
    gap: 8,
    flexWrap: 'wrap',
  },
  title: {
    color: '#e2e8f0',
    fontFamily: '-apple-system, sans-serif',
    fontSize: '0.9rem',
    fontWeight: 600,
  },
  headerBtns: {
    display: 'flex',
    gap: 8,
  },
  btn: {
    padding: '8px 14px',
    borderRadius: 10,
    border: '1px solid rgba(255,255,255,0.15)',
    background: 'rgba(139,92,246,0.25)',
    color: '#e2e8f0',
    cursor: 'pointer',
    fontSize: '0.82rem',
    fontFamily: '-apple-system, sans-serif',
    whiteSpace: 'nowrap',
  },
  logList: {
    overflowY: 'auto',
    flex: 1,
    padding: '8px 0',
  },
  row: {
    display: 'flex',
    gap: 8,
    padding: '3px 14px',
    borderBottom: '1px solid rgba(255,255,255,0.04)',
    alignItems: 'baseline',
    lineHeight: 1.6,
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
    width: 34,
  },
  msg: {
    color: '#cbd5e1',
    wordBreak: 'break-all',
    flex: 1,
  },
};
