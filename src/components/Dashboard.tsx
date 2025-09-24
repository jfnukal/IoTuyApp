import React from 'react';
import type { TuyaDevice, Room } from '../types';

interface DashboardProps {
  devices: TuyaDevice[];
  rooms: Room[];
  onSyncDevices: () => void;
  onViewChange: (view: 'all' | 'room' | 'unassigned' | '2d-view' | '3d-view') => void;
  selectedRoom: Room | null;
  isLoading: boolean;
}

const getDeviceIcon = (device: TuyaDevice): string => {
  const categoryIcons: Record<string, string> = {
    switch: '🔌',
    light: '💡', 
    sensor: '📱',
    garden: '🌱',
    thermostat: '🌡️',
    camera: '📷',
    assistant: '🏠',
    default: '📱',
  };

  return categoryIcons[device.category] || categoryIcons.default;
};

const Dashboard: React.FC<DashboardProps> = ({
  devices,
  rooms,
  onSyncDevices,
  onViewChange,
  selectedRoom,
  isLoading
}) => {
  const onlineDevices = devices.filter(d => d.online);
  
  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Smart Home Dashboard</h1>
          <p className="dashboard-subtitle">Ovládejte svůj chytrý domov</p>
        </div>
        <div className="dashboard-quick-actions">
          <button 
            className="quick-action-btn" 
            onClick={onSyncDevices}
            disabled={isLoading}
          >
            <span>🔄</span>
            {isLoading ? 'Synchronizuji...' : 'Synchronizovat'}
          </button>
          <button 
            className="quick-action-btn" 
            onClick={() => onViewChange('2d-view')}
            disabled={!selectedRoom}
            title={!selectedRoom ? 'Vyberte místnost' : '2D pohled'}
          >
            <span>🗺️</span>
            2D Pohled
          </button>
          <button 
            className="quick-action-btn"
            onClick={() => onViewChange('3d-view')}
            disabled={!selectedRoom}
            title={!selectedRoom ? 'Vyberte místnost' : '3D pohled'}
          >
            <span>🎯</span>
            3D Pohled
          </button>
        </div>
      </div>

      <div className="dashboard-grid">
        {/* Přehled zařízení */}
        <div className="dashboard-card">
          <div className="card-header">
            <h3 className="card-title">Přehled zařízení</h3>
            <span className="card-icon">📊</span>
          </div>
          <div className="device-stats">
            <div className="stat-item">
              <span className="stat-value">{devices.length}</span>
              <span className="stat-label">Celkem</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">{onlineDevices.length}</span>
              <span className="stat-label">Online</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">{rooms.length}</span>
              <span className="stat-label">Místnosti</span>
            </div>
          </div>
        </div>

        {/* Rychlé ovládání nejdůležitějších zařízení */}
        <div className="dashboard-card">
          <div className="card-header">
            <h3 className="card-title">Rychlé ovládání</h3>
            <span className="card-icon">⚡</span>
          </div>
          <div className="device-tiles">
            {devices.slice(0, 6).map(device => (
              <div 
                key={device.id} 
                className={`device-tile ${device.online ? 'active' : 'offline'}`}
                onClick={() => console.log('Quick control:', device.name)}
              >
                <span className="device-tile-icon">{getDeviceIcon(device)}</span>
                <h4 className="device-tile-name">{device.customName || device.name}</h4>
                <p className="device-tile-status">{device.online ? 'Online' : 'Offline'}</p>
              </div>
            ))}
          </div>
          {devices.length > 6 && (
            <button 
              className="view-all-btn"
              onClick={() => onViewChange('all')}
            >
              Zobrazit všechna zařízení ({devices.length})
            </button>
          )}
        </div>

        {/* Počasí - placeholder */}
        <div className="dashboard-card weather-card">
          <div className="card-header">
            <h3 className="card-title">Počasí</h3>
            <span className="weather-icon">☀️</span>
          </div>
          <div className="weather-info">
            <div>
              <h2 className="weather-temp">22°C</h2>
              <p className="weather-desc">Slunečno</p>
            </div>
          </div>
          <p className="weather-note">
            {/* TODO: Napojení na OpenWeather API */}
            Aktuální počasí ve Vídni
          </p>
        </div>

        {/* Rodinné události - placeholder */}
        <div className="dashboard-card family-card">
          <div className="card-header">
            <h3 className="card-title">Rodinné události</h3>
            <span className="card-icon">👨‍👩‍👧‍👦</span>
          </div>
          <div className="family-events">
            {/* TODO: Napojení na Google kalendář */}
            <div className="family-event">
              <div className="event-info">
                <h4>Narozeniny - Jana</h4>
                <p>Zítra</p>
              </div>
            </div>
            <div className="family-event">
              <div className="event-info">
                <h4>Schůzka u lékaře</h4>
                <p>Pátek 14:00</p>
              </div>
            </div>
          </div>
          <p className="family-note">
            Připojte Google kalendář pro více událostí
          </p>
        </div>

        {/* Kamery - placeholder */}
        <div className="dashboard-card">
          <div className="card-header">
            <h3 className="card-title">Bezpečnostní kamery</h3>
            <span className="card-icon">📹</span>
          </div>
          <div className="cameras-grid">
            <div className="camera-preview">
              <div className="camera-placeholder">
                📷
              </div>
              <p>Hlavní vchod</p>
            </div>
            <div className="camera-preview">
              <div className="camera-placeholder">
                📷
              </div>
              <p>Zahrada</p>
            </div>
          </div>
          <p className="camera-note">
            {/* TODO: Napojení na IP kamery */}
            Připojte bezpečnostní kamery
          </p>
        </div>

        {/* Energetika - placeholder */}
        <div className="dashboard-card energy-card">
          <div className="card-header">
            <h3 className="card-title">Spotřeba energie</h3>
            <span className="card-icon">⚡</span>
          </div>
          <div className="energy-info">
            <div className="energy-stat">
              <span className="energy-value">2.4 kW</span>
              <span className="energy-label">Aktuální spotřeba</span>
            </div>
            <div className="energy-stat">
              <span className="energy-value">48 kWh</span>
              <span className="energy-label">Dnes celkem</span>
            </div>
          </div>
          <p className="energy-note">
            {/* TODO: Napojení na smart metry */}
            Připojte chytré elektroměry pro přesná data
          </p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;