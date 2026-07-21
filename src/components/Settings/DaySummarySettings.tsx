// src/components/Settings/DaySummarySettings.tsx
// Self-contained nastavení „Souhrnu dne" — per-člen (userSettings/{authUid}.daySummary).
// Vlastní načítání i ukládání, žádné props od rodiče.

import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { firestoreService } from '../../services/firestoreService';
import ToggleSwitch from './ToggleSwitch';

const DaySummarySettings: React.FC = () => {
  const { currentUser } = useAuth();
  const [enabled, setEnabled] = useState(false);
  const [time, setTime] = useState('07:00');
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!currentUser) return;
    let active = true;
    (async () => {
      try {
        const cfg = await firestoreService.getDaySummaryConfig(currentUser.uid);
        if (active && cfg) {
          setEnabled(cfg.enabled ?? false);
          setTime(cfg.time || '07:00');
        }
      } catch (e) {
        console.error('[DaySummary] load error:', e);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [currentUser]);

  const persist = async (next: { enabled: boolean; time: string }) => {
    if (!currentUser) return;
    try {
      await firestoreService.saveDaySummaryConfig(currentUser.uid, next);
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } catch (e) {
      console.error('[DaySummary] save error:', e);
    }
  };

  const handleToggle = (val: boolean) => {
    setEnabled(val);
    persist({ enabled: val, time });
  };

  const handleTime = (val: string) => {
    setTime(val);
    if (val) persist({ enabled, time: val });
  };

  if (loading) return null;

  return (
    <div className="widget-group">
      <h3>☀️ Souhrn dne</h3>
      <ToggleSwitch
        label="Posílat mi Souhrn dne"
        checked={enabled}
        onChange={handleToggle}
      />

      {enabled && (
        <div
          style={{
            marginTop: 12,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            flexWrap: 'wrap',
          }}
        >
          <label htmlFor="daySummaryTime">Čas doručení:</label>
          <input
            id="daySummaryTime"
            type="time"
            value={time}
            onChange={(e) => handleTime(e.target.value)}
            style={{
              padding: '6px 10px',
              borderRadius: 8,
              border: '1px solid #ccc',
            }}
          />
          {saved && <span style={{ color: '#2ecc71' }}>✅ Uloženo</span>}
        </div>
      )}

      <p className="setting-description">
        📝 Ve zvolený čas ti přijde push s tím, co tě dnes čeká: označené svátky,
        narozeniny v rodině, dnešní události z kalendáře a tvoje úkoly z nástěnky.
        Nastavení platí jen pro tebe a je potřeba mít povolené notifikace.
      </p>
    </div>
  );
};

export default DaySummarySettings;
