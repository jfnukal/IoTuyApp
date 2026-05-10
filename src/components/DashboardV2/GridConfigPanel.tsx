// src/components/DashboardV2/GridConfigPanel.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useNotificationContext } from '../Notifications/NotificationProvider';
import {
  loadGridConfig, saveGridConfig, applyGridConfig, DEFAULT_GRID,
  type SlotKey, type SlotConfig,
} from './gridConfig';
import './GridConfigPanel.css';

const ROWS = 20;
const COLS: Record<number, string> = { 1: 'Levý', 2: 'Střed', 3: 'Pravý' };

const GridConfigPanel: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [cfg, setCfg] = useState(() => loadGridConfig());
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { requestPermission, unreadCount } = useNotificationContext();

  useEffect(() => {
    applyGridConfig(cfg);
  }, [cfg]);

  const update = (key: SlotKey, field: keyof SlotConfig, delta: number) => {
    setCfg(prev => {
      const slot = { ...prev[key] };
      const val = (slot[field] as number) + delta;
      if (val < 1 || val > ROWS + 1) return prev;
      (slot[field] as number) = val;
      const next = { ...prev, [key]: slot };
      saveGridConfig(next);
      return next;
    });
  };

  const reset = () => {
    const fresh = { ...DEFAULT_GRID };
    setCfg(fresh);
    saveGridConfig(fresh);
  };

  const slotsByCol: Record<number, [SlotKey, SlotConfig][]> = { 1: [], 2: [], 3: [] };
  for (const [k, v] of Object.entries(cfg) as [SlotKey, SlotConfig][]) {
    slotsByCol[v.col].push([k, v]);
  }
  for (const col of [1, 2, 3]) {
    slotsByCol[col].sort((a, b) => a[1].rowStart - b[1].rowStart);
  }

  return (
    <>
      <button className="gcp-fab" onClick={() => setOpen(o => !o)} title="Grid editor">
        {open ? '✕' : '⚙️'}
      </button>

      {open && (
        <div className="gcp-panel">
          <div className="gcp-header">
            <span>Grid editor <small>(20 řádků)</small></span>
            <button className="gcp-reset" onClick={reset}>↺ Reset</button>
          </div>

          <div className="gcp-cols">
            {[1, 2, 3].map(col => (
              <div key={col} className="gcp-col">
                <div className="gcp-col-label">{COLS[col]}</div>
                {slotsByCol[col].map(([key, slot]) => (
                  <div key={key} className="gcp-slot">
                    <div className="gcp-slot-name">{slot.label}</div>
                    <div className="gcp-slot-row">
                      <span className="gcp-field-label">start</span>
                      <button onClick={() => update(key, 'rowStart', -1)}>−</button>
                      <span className="gcp-val">{slot.rowStart}</span>
                      <button onClick={() => update(key, 'rowStart', +1)}>+</button>
                    </div>
                    <div className="gcp-slot-row">
                      <span className="gcp-field-label">end</span>
                      <button onClick={() => update(key, 'rowEnd', -1)}>−</button>
                      <span className="gcp-val">{slot.rowEnd}</span>
                      <button onClick={() => update(key, 'rowEnd', +1)}>+</button>
                    </div>
                    <div className="gcp-bar" style={{
                      top:    `${((slot.rowStart - 1) / ROWS) * 100}%`,
                      height: `${((slot.rowEnd - slot.rowStart) / ROWS) * 100}%`,
                    }} />
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* ---- Navigace & Akce ---- */}
          <div className="gcp-actions">
            <button className="gcp-action-btn" onClick={() => { navigate('/devices'); setOpen(false); }}>
              <span>📱</span> Zařízení (Tuya)
            </button>
            <button className="gcp-action-btn" onClick={() => { navigate('/more'); setOpen(false); }}>
              <span>🗂️</span> Další widgety
            </button>
            <button className="gcp-action-btn" onClick={() => navigate('/v1')}>
              <span>🏠</span> Starý dashboard
            </button>
            <button className="gcp-action-btn" onClick={() => navigate('/settings')}>
              <span>🛠️</span> Nastavení
            </button>
            <button className="gcp-action-btn" onClick={requestPermission}>
              <span>🔔</span> Notifikace {unreadCount > 0 && <span className="gcp-badge">{unreadCount}</span>}
            </button>
            <button className="gcp-action-btn gcp-action-btn--logout" onClick={logout}>
              <span>🚪</span> Odhlásit
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default GridConfigPanel;
