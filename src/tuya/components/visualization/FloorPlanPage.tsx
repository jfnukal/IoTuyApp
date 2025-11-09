// src/tuya/components/Visualization/FloorPlanPage.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTuya } from '../../hooks/useTuya';
import { firestoreService } from '../../../services/firestoreService'; // ← PŘIDEJ
import FloorPlan1NP from '../visualization/FloorPlan1NP';
import DeviceMiniatures from '../visualization/DeviceMiniatures'; // ← PŘIDEJ
import DeviceDetailModal from '../modals/DeviceDetailModal';
import type { TuyaDevice } from '../../../types';
import './FloorPlanPage.css';

const FloorPlanPage: React.FC = () => {
  const navigate = useNavigate();
  const { devices, isLoading, error } = useTuya();
  const [selectedDevice, setSelectedDevice] = useState<TuyaDevice | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Handler pro kliknutí na zařízení v půdorysu
  const handleDeviceClick = (device: TuyaDevice) => {
    console.log('🎯 FloorPlanPage handleDeviceClick volán!', device);
    console.log('🎯 Device data:', device.name, device.id);
    console.log('🎯 Nastavuji selectedDevice...');
    setSelectedDevice(device);
    console.log('🎯 selectedDevice nastaven!');
  };

  // 📍 Handler pro drop zařízení na půdorys
  const handleDeviceDrop = async (deviceId: string, x: number, y: number) => {
    try {
      console.log(`💾 Ukládám pozici zařízení ${deviceId}:`, { x, y });

      await firestoreService.updateDevicePosition(deviceId, { x, y });

      console.log('✅ Pozice zařízení uložena!');
    } catch (error) {
      console.error('❌ Chyba při ukládání pozice:', error);
      alert('Nepodařilo se uložit pozici zařízení');
    }
  };

  if (isLoading) {
    return (
      <div className="floorplan-page">
        <div className="loading-state">
          <div className="loading-spinner-large">🔄</div>
          <p>Načítám zařízení...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="floorplan-page">
        <div className="error-state">
          <div className="error-icon">⚠️</div>
          <h3>Chyba při načítání zařízení</h3>
          <p>{error}</p>
          <button
            className="back-button"
            onClick={() => navigate('/tuya')}
            title="Zpět na seznam zařízení"
          >
            ← Zpět
          </button>

          <button
            className="sidebar-toggle-btn"
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            title={isSidebarCollapsed ? 'Zobrazit panel' : 'Schovat panel'}
          >
            {isSidebarCollapsed ? '▶ Zobrazit panel' : '◀ Schovat panel'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="floorplan-page">
        {/* Header s tlačítkem zpět */}
        <div className="floorplan-header">
          <button
            className="back-button"
            onClick={() => navigate('/tuya')}
            title="Zpět na seznam zařízení"
          >
            ← Zpět
          </button>
          <div className="header-info">
            <h1>🏠 Půdorys 1. Nadzemního Podlaží</h1>
            <p className="header-subtitle">
              Testovací režim - Kontrola zobrazení místností a prvků
            </p>
          </div>
        </div>

        {/* Info panel */}
        <div className="floorplan-info-banner">
          <div className="info-section">
            <span className="info-icon">📊</span>
            <div className="info-content">
              <strong>Statistika zařízení:</strong>
              <div className="device-stats">
                <span>Celkem: {devices.length}</span>
                <span className="separator">|</span>
                <span>
                  S pozicí: {devices.filter((d) => d.position).length}
                </span>
                <span className="separator">|</span>
                <span>Online: {devices.filter((d) => d.online).length}</span>
              </div>
            </div>
          </div>

          <div className="info-section">
            <span className="info-icon">ℹ️</span>
            <div className="info-content">
              <strong>Testovací funkce:</strong>
              <p>Zobrazení základního půdorysu s místnostmi</p>
            </div>
          </div>

          <button
            className="sidebar-toggle-btn"
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          >
            {isSidebarCollapsed ? '▶ Zobrazit panel' : '◀ Schovat panel'}
          </button>
        </div>

        {/* Hlavní layout - Panel + Půdorys */}
        <div className="floorplan-content">
          {/* Levý panel s miniaturami */}
          <aside
            className={`miniatures-sidebar ${
              isSidebarCollapsed ? 'collapsed' : ''
            }`}
          >
            {!isSidebarCollapsed && (
              <DeviceMiniatures
                devices={devices}
                onDeviceClick={handleDeviceClick}
              />
            )}
          </aside>

          {/* Pravá strana - Půdorys */}
          <main className="floorplan-main">
            <FloorPlan1NP
              devices={devices}
              onDeviceClick={handleDeviceClick}
              onDeviceDrop={handleDeviceDrop}
            />
          </main>
        </div>

        {/* Debug informace */}
        <div className="debug-info">
          <details>
            <summary>🔍 Debug informace</summary>
            <div className="debug-content">
              <h4>Zařízení s pozicí:</h4>
              {devices.filter((d) => d.position).length > 0 ? (
                <ul>
                  {devices
                    .filter((d) => d.position)
                    .map((d) => (
                      <li key={d.id}>
                        <strong>{d.customName || d.name}</strong> - x=
                        {d.position?.x}, y={d.position?.y}
                      </li>
                    ))}
                </ul>
              ) : (
                <p>Zatím žádná zařízení.</p>
              )}
            </div>
          </details>
        </div>
      </div>

      {/* Modal pro detail zařízení */}
      {selectedDevice && (
        <DeviceDetailModal
          device={selectedDevice}
          onClose={() => setSelectedDevice(null)}
        />
      )}
    </>
  );
};

export default FloorPlanPage;
