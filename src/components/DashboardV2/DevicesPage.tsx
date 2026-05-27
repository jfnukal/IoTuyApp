// src/components/DashboardV2/DevicesPage.tsx
// Tuya zařízení — /devices
// Desktop: scrollovatelná stránka s toolbarem nahoře
// Mobil: swipe gesty z V2Shell

import React, { lazy, Suspense, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTuya } from '../../tuya/hooks/useTuya';
import GridConfigPanel from './GridConfigPanel';
import './DashboardV2.css';

const TuyaDeviceList = lazy(() =>
  import('../../tuya').then(m => ({ default: m.TuyaDeviceList }))
);

const DevicesPage: React.FC = () => {
  const navigate = useNavigate();
  const [editMode, setEditMode] = useState(false);
  const { syncDevices, isSyncing, onlineCount, deviceCount } = useTuya();

  return (
    <div className="v2-devices-layout">

      {/* ── TOOLBAR — viditelný na desktopu i mobilu ── */}
      <div className="v2-devices-toolbar">

        {/* Levá část — zpět + název */}
        <div className="v2-devices-toolbar__left">
          <button
            className="v2-devices-btn v2-devices-btn--back"
            onClick={() => navigate('/')}
            title="Zpět na dashboard"
          >
            ← Dashboard
          </button>
          <span className="v2-devices-toolbar__title">
            📱 Zařízení
            <span className="v2-devices-toolbar__count">
              {onlineCount}/{deviceCount} online
            </span>
          </span>
        </div>

        {/* Pravá část — akce */}
        <div className="v2-devices-toolbar__right">

          {/* Sync */}
          <button
            className="v2-devices-btn"
            onClick={() => syncDevices()}
            disabled={isSyncing}
            title="Synchronizovat ze serveru"
          >
            {isSyncing ? '⏳' : '🔄'}
          </button>

          {/* Půdorys */}
          <button
            className="v2-devices-btn"
            onClick={() => navigate('/floorplan')}
            title="Půdorys domu"
          >
            🗺️
          </button>

          {/* Edit mode */}
          <button
            className={`v2-devices-btn ${editMode ? 'v2-devices-btn--active' : ''}`}
            onClick={() => setEditMode(e => !e)}
            title={editMode ? 'Ukončit úpravy' : 'Upravit rozmístění karet'}
          >
            {editMode ? '✅ Hotovo' : '✏️ Upravit'}
          </button>

          {/* Nastavení (GridConfigPanel — ⚙️ FAB) */}
          <GridConfigPanel />

        </div>
      </div>

      {/* Edit mode info banner */}
      {editMode && (
        <div className="v2-devices-edit-banner">
          ✏️ Režim úprav — přetahuj karty myší, měň velikost tažením za pravý dolní roh
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

      {/* Swipe hint — jen na mobilu (touch) */}
      <div className="v2-swipe-hint v2-swipe-hint--top v2-swipe-hint--touch-only">
        ↑ přejeď dolů pro návrat
      </div>

    </div>
  );
};

export default DevicesPage;
