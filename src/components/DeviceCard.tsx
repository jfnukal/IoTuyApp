// import React from 'react';
import type { TuyaDevice } from '../types';
import { firestoreService } from '../services/firestoreService';
import type { Room } from '../types';

interface DeviceCardProps {
  device: TuyaDevice;
  isControlling: boolean;
  onControl: (deviceId: string, commands: any[]) => void;
  onToggleSwitch: (deviceId: string, switchCode: string, currentValue: boolean) => Promise<void>;
  className?: string;
  rooms?: Room[];
  onRoomChange?: (deviceId: string, roomId: string | null) => Promise<void>;
}

export const DeviceCard: React.FC<DeviceCardProps> = ({
  device,
  isControlling,
  onControl,
  className = '',
  rooms,
  onRoomChange
}) => {
  // Získej kategorii zařízení
  const categories = firestoreService.getDeviceCategories();
  const deviceCategory = categories.find(cat => 
    cat.name === device.category || cat.id === device.category
  ) || categories.find(cat => cat.id === 'other')!;

  // Získej hlavní switch status
  const mainSwitchStatus = device.status?.find(s => 
    s.code === 'switch_1' || s.code === 'switch' || s.code === 'switch_led'
  );

  // Získej teplotní a vlhkostní data
  const tempStatus = device.status?.find(s => s.code === 'temp_current');
  const humidityStatus = device.status?.find(s => s.code === 'humidity_value');

  // Získej rozšířené informace
  const brightnessStatus = device.status?.find(s => s.code === 'bright_value');

  const handleMainSwitchToggle = () => {
    if (mainSwitchStatus) {
      onControl(device.id, [{
        code: mainSwitchStatus.code,
        value: !mainSwitchStatus.value
      }]);
    }
  };

  const getDeviceDisplayName = () => {
    return device.customName || device.name || 'Neznámé zařízení';
  };

  // const getStatusColor = () => {
  //   if (!device.online) return '#dc3545'; // Červená pro offline
  //   if (mainSwitchStatus?.value) return deviceCategory.color; // Barva kategorie pro zapnuto
  //   return '#6c757d'; // Šedá pro vypnuto
  // };

  return (
        <article 
          className={`device-modern-card ${className} ${!device.online ? 'offline' : ''} ${mainSwitchStatus?.value ? 'active' : 'inactive'}`}
          data-device-id={device.id}
        >
      {/* Modern Header */}
      <header className="device-modern-header">
        <div className="device-category-badge" style={{ backgroundColor: `${deviceCategory.color}15` }}>
          <span className="category-icon" style={{ color: deviceCategory.color }}>
            {device.customIcon || deviceCategory.icon}
          </span>
          <span className="category-label">{deviceCategory.displayName}</span>
        </div>
        
        <div className="device-status-indicator">
          <div className={`status-dot ${device.online ? 'online' : 'offline'}`}></div>
          <span className="status-text">
            {device.online ? 'Online' : 'Offline'}
          </span>
        </div>
      </header>
  
      {/* Device Title */}
      <div className="device-title-section">
        <h3 className="device-title" title={device.name}>
          {getDeviceDisplayName()}
        </h3>
        {device.customName && (
          <p className="device-original-name" title={`Původní název: ${device.name}`}>
            {device.name}
          </p>
        )}
      </div>
  
      {/* Room Assignment */}
      <div className="device-room-assignment">
        <label className="room-label">Místnost:</label>
        <select
          value={device.roomId || ''}
          onChange={(e) => onRoomChange?.(device.id, e.target.value || null)}
          className="room-select modern-select"
        >
          <option value="">Nepřiřazeno</option>
          {rooms?.map(room => (
            <option key={room.id} value={room.id}>
              {room.icon} {room.name}
            </option>
          ))}
        </select>
      </div>
  
      {/* Main Control */}
      {mainSwitchStatus && (
        <div className="device-main-control">
          <button
            onClick={handleMainSwitchToggle}
            disabled={isControlling || !device.online}
            className={`main-control-button ${mainSwitchStatus.value ? 'on' : 'off'}`}
            style={{
              background: mainSwitchStatus.value 
                ? `linear-gradient(135deg, ${deviceCategory.color}, ${deviceCategory.color}dd)`
                : 'linear-gradient(135deg, #e9ecef, #dee2e6)'
            }}
          >
            {isControlling ? (
              <div className="control-loading">
                <span className="loading-spinner"></span>
                <span>Ovládám...</span>
              </div>
            ) : (
              <div className="control-content">
                <span className="control-icon">
                  {mainSwitchStatus.value ? '🔛' : '⚫'}
                </span>
                <span className="control-text">
                  {mainSwitchStatus.value ? 'ZAPNUTO' : 'VYPNUTO'}
                </span>
              </div>
            )}
          </button>
        </div>
      )}
  
      {/* Sensor Data */}
      {(tempStatus || humidityStatus || brightnessStatus) && (
        <div className="device-sensor-data">
          {tempStatus && (
            <div className="sensor-item temperature">
              <span className="sensor-icon">🌡️</span>
              <div className="sensor-info">
                <span className="sensor-value">{tempStatus.value}°C</span>
                <span className="sensor-label">Teplota</span>
              </div>
            </div>
          )}
          
          {humidityStatus && (
            <div className="sensor-item humidity">
              <span className="sensor-icon">💧</span>
              <div className="sensor-info">
                <span className="sensor-value">{humidityStatus.value}%</span>
                <span className="sensor-label">Vlhkost</span>
              </div>
            </div>
          )}
          
          {brightnessStatus && (
            <div className="sensor-item brightness">
              <span className="sensor-icon">☀️</span>
              <div className="sensor-info">
                <span className="sensor-value">{brightnessStatus.value}%</span>
                <span className="sensor-label">Jas</span>
              </div>
            </div>
          )}
        </div>
      )}
  
      {/* Additional States */}
      {device.status && device.status.length > 0 && (
        <details className="device-additional-states">
          <summary className="states-toggle">
            <span>Další stavy</span>
            <span className="states-count">
              {device.status.filter(status => 
                !['switch_1', 'switch', 'switch_led', 'temp_current', 'humidity_value', 'bright_value'].includes(status.code)
              ).length}
            </span>
          </summary>
          <div className="states-list">
            {device.status
              .filter(status => 
                !['switch_1', 'switch', 'switch_led', 'temp_current', 'humidity_value', 'bright_value'].includes(status.code)
              )
              .slice(0, 3)
              .map((status) => (
                <div key={status.code} className="state-item" title={`${status.code}: ${status.value}`}>
                  <span className="state-code">{status.code}</span>
                  <span className="state-value">
                    {typeof status.value === 'boolean' 
                      ? (status.value ? '✓' : '✗')
                      : String(status.value)}
                  </span>
                </div>
              ))}
          </div>
        </details>
      )}
  
      {/* Footer */}
      <footer className="device-footer">
        <div className="device-meta">
          <span className="device-id" title={`ID: ${device.id}`}>
            {device.id.slice(0, 8)}...
          </span>
          {device.lastUpdated && (
            <time className="last-updated" title="Poslední aktualizace">
              {new Date(device.lastUpdated).toLocaleTimeString('cs-CZ')}
            </time>
          )}
        </div>
        
        {device.notes && (
          <div className="device-notes" title={device.notes}>
            📝 {device.notes.slice(0, 30)}...
          </div>
        )}
      </footer>
    </article>
  );
};

export default DeviceCard;