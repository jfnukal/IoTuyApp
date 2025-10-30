// src/tuya/components/TuyaDeviceCard.tsx
import React, { useState } from 'react';
import type { TuyaDevice } from '../../types';
import './TuyaDeviceCard.css';

interface TuyaDeviceCardProps {
  device: TuyaDevice;
  onToggle: (deviceId: string) => Promise<void>;
  onControl?: (deviceId: string, commands: { code: string; value: any }[]) => Promise<void>;
}

const TuyaDeviceCard: React.FC<TuyaDeviceCardProps> = ({
  device,
  onToggle,
  onControl: _onControl,
}) => {
  const [isLoading, setIsLoading] = useState(false);

  // Najdi switch_1 status (zapnuto/vypnuto)
  const switchStatus = device.status?.find((s) => s.code === 'switch_1');
  const isOn = switchStatus?.value === true;

  // Najdi další užitečné statusy
  const powerStatus = device.status?.find((s) => s.code === 'cur_power');
  const currentPower = powerStatus?.value;

  const brightStatus = device.status?.find((s) => s.code === 'bright_value');
  const brightness = brightStatus?.value;

  const tempStatus = device.status?.find((s) => s.code === 'temp_current');
  const temperature = tempStatus?.value;

  const humidityStatus = device.status?.find((s) => s.code === 'humidity_value');
  const humidity = humidityStatus?.value;

  // Ikony podle kategorie
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'switch':
        return '🔌';
      case 'light':
        return '💡';
      case 'sensor':
        return '📡';
      case 'climate':
        return '❄️';
      case 'security':
        return '🔒';
      case 'cover':
        return '🪟';
      case 'garden':
        return '🌱';
      default:
        return '⚙️';
    }
  };

  // Barvy podle kategorie
  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'switch':
        return '#007bff';
      case 'light':
        return '#ffc107';
      case 'sensor':
        return '#28a745';
      case 'climate':
        return '#17a2b8';
      case 'security':
        return '#dc3545';
      case 'cover':
        return '#6f42c1';
      case 'garden':
        return '#20c997';
      default:
        return '#6c757d';
    }
  };

  const handleToggle = async () => {
    try {
      setIsLoading(true);
      await onToggle(device.id);
    } catch (error) {
      console.error('Chyba při přepínání:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div 
        className={`tuya-device-card ${device.online ? 'online' : 'offline'} ${isOn ? 'active' : ''}`}
        style={{ '--category-color': getCategoryColor(device.category), cursor: 'grab' } as React.CSSProperties}
        draggable={true}
        onDragStart={(e) => {
          e.dataTransfer.setData('deviceId', device.id);
          e.dataTransfer.setData('deviceName', device.name);
          e.dataTransfer.effectAllowed = 'move';
          console.log('🎯 Začínám táhnout:', device.name);
        }}
        onDragEnd={(e) => {
          console.log('🎯 Ukončuji tažení');
          e.currentTarget.style.cursor = 'grab';
        }}
      >
      {/* Header */}
      <div className="tuya-card-header">
        <div className="device-info">
          <span className="device-icon">{getCategoryIcon(device.category)}</span>
          <div className="device-names">
            <h3 className="device-name">
              {device.customName || device.name}
            </h3>
            <span className="device-category">{device.category}</span>
          </div>
        </div>
        
        <div className="device-status-indicator">
          <span className={`status-dot ${device.online ? 'online' : 'offline'}`}></span>
          <span className="status-text">{device.online ? 'Online' : 'Offline'}</span>
        </div>
      </div>

      {/* Body - Detaily podle typu zařízení */}
      <div className="tuya-card-body">
        {/* Power consumption */}
        {currentPower !== undefined && (
          <div className="device-stat">
            <span className="stat-icon">⚡</span>
            <span className="stat-label">Spotřeba:</span>
            <span className="stat-value">{currentPower}W</span>
          </div>
        )}

        {/* Brightness */}
        {brightness !== undefined && (
          <div className="device-stat">
            <span className="stat-icon">🔆</span>
            <span className="stat-label">Jas:</span>
            <span className="stat-value">{brightness}%</span>
          </div>
        )}

        {/* Temperature */}
        {temperature !== undefined && (
          <div className="device-stat">
            <span className="stat-icon">🌡️</span>
            <span className="stat-label">Teplota:</span>
            <span className="stat-value">{temperature}°C</span>
          </div>
        )}

        {/* Humidity */}
        {humidity !== undefined && (
          <div className="device-stat">
            <span className="stat-icon">💧</span>
            <span className="stat-label">Vlhkost:</span>
            <span className="stat-value">{humidity}%</span>
          </div>
        )}

        {/* Pokud nemá žádné speciální statusy */}
        {!currentPower && !brightness && !temperature && !humidity && (
          <div className="device-stat-placeholder">
            <span className="placeholder-text">Základní zařízení</span>
          </div>
        )}
      </div>

{/* Footer - Ovládání */}
<div className="tuya-card-footer">
        <div className="device-control">
          <div className="control-info">
            <span className="control-label">
              {isOn ? '🟢 Zapnuto' : '⚫ Vypnuto'}
            </span>
            {device.lastUpdated && (
              <span className="last-updated">
                {new Date(device.lastUpdated).toLocaleTimeString('cs-CZ')}
              </span>
            )}
          </div>
          
          <label className="device-toggle-switch">
            <input
              type="checkbox"
              checked={isOn}
              onChange={handleToggle}
              disabled={!device.online || isLoading}
            />
            <span className="device-toggle-slider">
              {isLoading && <span className="loading-spinner-small">⏳</span>}
            </span>
          </label>
        </div>
      </div>
    </div>
  );
};

export default TuyaDeviceCard;
