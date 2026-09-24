// src/components/DashboardV2/DevicesPage.tsx
// Tuya zařízení — /devices
//
// Navigace: floating side handle → rozkládací panel (touch-friendly, tablet)
// Desktop: scroll uvnitř 100dvh (viz DashboardV2.css)
// Mobil/tablet: swipe gesty z V2Shell + side panel

import React, { lazy, Suspense, useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTuya } from '../../tuya/hooks/useTuya';
import './DashboardV2.css';

const TuyaDeviceList = lazy(() =>
  import('../../tuya').then(m => ({ default: m.TuyaDeviceList }))
);

// „Pračka, Bojler, Sauna…" — pár názvů do hlášení
const shortList = (names: string[]) =>
  names.slice(0, 3).join(', ') + (names.length > 3 ? '…' : '');

const DevicesPage: React.FC = () => {
  const navigate = useNavigate();
  const [panelOpen, setPanelOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const { syncDevices, isSyncing, onlineCount, deviceCount } = useTuya();
  const panelRef = useRef<HTMLDivElement>(null);

  // Zavři panel Escape klávesou
  useEffect(() => {
    if (!panelOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setPanelOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [panelOpen]);

  // Výsledek ruční synchronizace — chvíli ukázat nahoře (dřív nebylo vidět
  // nic, ani když se nepovedla)
  const [syncNote, setSyncNote] = useState<{ text: string; warn: boolean } | null>(null);
  useEffect(() => {
    if (!syncNote) return;
    const t = setTimeout(() => setSyncNote(null), syncNote.warn ? 15000 : 6000);
    return () => clearTimeout(t);
  }, [syncNote]);

  const handleSync = async () => {
    try {
      const { saved, deleted, keptMissing } = await syncDevices();
      if (keptMissing.length > 0) {
        setSyncNote({
          warn: true,
          text: `⚠️ V seznamu z Tuya teď chybí ${keptMissing.length} zařízení (${shortList(keptMissing)}) — pro jistotu jsem je nesmazal. Nejspíš jde o výpadek Tuya, zkus to později.`,
        });
      } else {
        setSyncNote({
          warn: false,
          text:
            `✅ Načteno ${saved} zařízení z Tuya` +
            (deleted.length > 0
              ? ` · odebráno ${deleted.length} už neexistujících (${shortList(deleted)})`
              : ''),
        });
      }
    } catch (err) {
      setSyncNote({
        warn: true,
        text: `⚠️ Synchronizace se nepovedla, nic se nezměnilo: ${err instanceof Error ? err.message : err}`,
      });
    } finally {
      setPanelOpen(false);
    }
  };

  return (
    <div className="v2-devices-layout">

      {/* Edit mode banner */}
      {editMode && (
        <div className="v2-devices-edit-banner">
          ✏️ Přetahuj karty myší · měň velikost za pravý dolní roh
        </div>
      )}

      {/* Výsledek synchronizace (klepnutím zmizí) */}
      {syncNote && (
        <div
          className={`v2-devices-edit-banner ${syncNote.warn ? 'v2-devices-edit-banner--warn' : ''}`}
          onClick={() => setSyncNote(null)}
          role="status"
        >
          {syncNote.text}
        </div>
      )}

      {/* Grid zařízení */}
      <div className="v2-devices-content">
        <Suspense fallback={
          <div className="v2-devices-loading">
            <div className="v2-spinner" />
            <span>Načítám zařízení…</span>
          </div>
        }>
          <TuyaDeviceList isLayoutEditMode={editMode} />
        </Suspense>
      </div>

      {/* ── SIDE HANDLE — vždy viditelný, otevírá panel ── */}
      <button
        className={`v2-side-handle ${panelOpen ? 'v2-side-handle--open' : ''}`}
        onClick={() => setPanelOpen(o => !o)}
        title="Navigace a akce"
        aria-label="Otevřít navigaci"
      >
        <span className="v2-side-handle__icon">{panelOpen ? '✕' : '≡'}</span>
        {!panelOpen && (
          <span className="v2-side-handle__count">
            {onlineCount}<span className="v2-side-handle__sep">/</span>{deviceCount}
          </span>
        )}
      </button>

      {/* ── BACKDROP ── */}
      {panelOpen && (
        <div
          className="v2-side-backdrop"
          onClick={() => setPanelOpen(false)}
        />
      )}

      {/* ── SIDE PANEL ── */}
      <div
        ref={panelRef}
        className={`v2-side-panel ${panelOpen ? 'v2-side-panel--open' : ''}`}
        aria-hidden={!panelOpen}
      >
        {/* Hlavička panelu */}
        <div className="v2-side-panel__header">
          <span className="v2-side-panel__title">📱 Zařízení</span>
          <span className="v2-side-panel__stats">
            <span style={{ color: '#4ade80' }}>●</span> {onlineCount}/{deviceCount}
          </span>
        </div>

        <div className="v2-side-panel__divider" />

        {/* Akce */}
        <nav className="v2-side-panel__nav">

          <button
            className="v2-side-action v2-side-action--primary"
            onClick={() => { navigate('/'); setPanelOpen(false); }}
          >
            <span className="v2-side-action__icon">🏠</span>
            <span className="v2-side-action__label">Dashboard</span>
          </button>

          <button
            className={`v2-side-action ${editMode ? 'v2-side-action--active' : ''}`}
            onClick={() => { setEditMode(e => !e); setPanelOpen(false); }}
          >
            <span className="v2-side-action__icon">{editMode ? '✅' : '✏️'}</span>
            <span className="v2-side-action__label">
              {editMode ? 'Hotovo' : 'Upravit grid'}
            </span>
          </button>

          <button
            className="v2-side-action"
            onClick={handleSync}
            disabled={isSyncing}
          >
            <span className="v2-side-action__icon">{isSyncing ? '⏳' : '🔄'}</span>
            <span className="v2-side-action__label">
              {isSyncing ? 'Načítám…' : 'Synchronizovat'}
            </span>
          </button>

          <button
            className="v2-side-action"
            onClick={() => { navigate('/floorplan'); setPanelOpen(false); }}
          >
            <span className="v2-side-action__icon">🗺️</span>
            <span className="v2-side-action__label">Půdorys domu</span>
          </button>

          <button
            className="v2-side-action"
            onClick={() => { navigate('/settings'); setPanelOpen(false); }}
          >
            <span className="v2-side-action__icon">⚙️</span>
            <span className="v2-side-action__label">Nastavení</span>
          </button>

          <button
            className="v2-side-action"
            onClick={() => { navigate('/more'); setPanelOpen(false); }}
          >
            <span className="v2-side-action__icon">🗂️</span>
            <span className="v2-side-action__label">Widgety</span>
          </button>

        </nav>
      </div>

    </div>
  );
};

export default DevicesPage;
