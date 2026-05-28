// src/tuya/components/visualization/FloorPlanPage.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTuya } from '../../hooks/useTuya';
import { useHouse } from '../../hooks/useHouse';
import { deviceService } from '../../../services/deviceService';
import FloorPlan1NP from './FloorPlan1NP';
import DeviceMiniatures from './DeviceMiniatures';
import DeviceDetailModal from '../modals/DeviceDetailModal';
import type { TuyaDevice } from '../../../types';
import './FloorPlanPage.css';

const FloorPlanPage: React.FC = () => {
  const navigate = useNavigate();
  const { devices, isLoading: devicesLoading, error: devicesError } = useTuya();
  const { floors, isLoading: houseLoading } = useHouse();

  const [selectedDevice, setSelectedDevice] = useState<TuyaDevice | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [selectedFloorId, setSelectedFloorId] = useState<string | null>(null);

  // Automaticky vyber první patro (přízemí preferovaně)
  useEffect(() => {
    if (floors.length > 0 && !selectedFloorId) {
      const groundFloor = floors.find((f) => f.level === 0);
      setSelectedFloorId(groundFloor?.id || floors[0].id);
    }
  }, [floors, selectedFloorId]);

  // Aktuální patro
  const currentFloor = floors.find((f) => f.id === selectedFloorId);

  // Handler pro kliknutí na zařízení
  const handleDeviceClick = (device: TuyaDevice) => {
    setSelectedDevice(device);
  };

  // Handler pro drop zařízení na půdorys
  const handleDeviceDrop = async (deviceId: string, x: number, y: number) => {
    try {
      await deviceService.updateDevicePosition(deviceId, { x, y });
    } catch (error) {
      console.error('❌ Chyba při ukládání pozice:', error);
    }
  };

  // Statistiky
  const stats = {
    total: devices.length,
    online: devices.filter((d) => d.online).length,
    placed: devices.filter((d) => d.position).length,
  };

  // Loading state
  if (devicesLoading || houseLoading) {
    return (
      <div className="floorplan-page">
      <div className="floorplan-loading">
        <div className="spinner-global"></div>
        <p>Načítám data...</p>
      </div>
    </div>
    );
  }

  // Error state
  if (devicesError) {
    return (
      <div className="floorplan-page">
        <div className="floorplan-error">
          <span className="error-icon">⚠️</span>
          <h3>Chyba při načítání</h3>
          <p>{devicesError}</p>
          <button onClick={() => navigate('/devices')}>← Zpět</button>
        </div>
      </div>
    );
  }

  return (
    <div className="floorplan-page">
      {/* ===== KOMPAKTNÍ HEADER ===== */}
      <header className="floorplan-header">
        {/* Levá část - Zpět + Název */}
        <div className="header-left">
          <button
            className="btn-back"
            onClick={() => navigate('/devices')}
            title="Zpět na dashboard"
          >
            ←
          </button>
          <h1 className="header-title">{currentFloor?.name || 'Půdorys'}</h1>
        </div>

        {/* Střed - Přepínač pater */}
        <nav className="floor-tabs">
          {floors
            .sort((a, b) => a.level - b.level)
            .map((floor) => (
              <button
                key={floor.id}
                className={`floor-tab ${
                  floor.id === selectedFloorId ? 'active' : ''
                }`}
                onClick={() => setSelectedFloorId(floor.id)}
                style={{ '--floor-color': floor.color } as React.CSSProperties}
              >
                <span className="floor-tab-icon">
                  {getFloorIcon(floor.level)}
                </span>
                <span className="floor-tab-label">{floor.name}</span>
              </button>
            ))}
        </nav>

        {/* Pravá část - Statistiky + Toggle */}
        <div className="header-right">
          <div className="header-stats">
            <span className="stat" title="Celkem zařízení">
              📱 {stats.total}
            </span>
            <span className="stat" title="Online">
              🟢 {stats.online}
            </span>
            <span className="stat" title="Umístěno">
              📍 {stats.placed}
            </span>
          </div>
          <button
            className="btn-toggle-sidebar"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            title={isSidebarOpen ? 'Schovat panel' : 'Zobrazit panel'}
          >
            {isSidebarOpen ? '✕' : '☰'}
          </button>
        </div>
      </header>

      {/* ===== HLAVNÍ OBSAH ===== */}
      <div className="floorplan-content">
        {/* Sidebar se zařízeními */}
        <aside
          className={`floorplan-sidebar ${isSidebarOpen ? 'open' : 'closed'}`}
        >
          <DeviceMiniatures
            devices={devices}
            onDeviceClick={handleDeviceClick}
          />
        </aside>

        {/* Půdorys */}
        <main className="floorplan-main">
          {currentFloor ? (
            <FloorPlan1NP
              devices={devices}
              onDeviceClick={handleDeviceClick}
              onDeviceDrop={handleDeviceDrop}
            />
          ) : (
            <div className="floorplan-empty">
              <span>🏠</span>
              <p>Vyberte patro pro zobrazení půdorysu</p>
            </div>
          )}
        </main>
      </div>

      {/* Modal pro detail zařízení */}
      {selectedDevice && (
        <DeviceDetailModal
          device={selectedDevice}
          onClose={() => setSelectedDevice(null)}
        />
      )}
    </div>
  );
};

// Helper - ikona pro patro
function getFloorIcon(level: number): string {
  switch (level) {
    case -1:
      return '⬇️';
    case 0:
      return '🏠';
    case 1:
      return '⬆️';
    default:
      return level < 0 ? '⬇️' : '⬆️';
  }
}

export default FloorPlanPage;
