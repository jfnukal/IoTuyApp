// src/tuya/components/cards/TempSensorCard.tsx
import React from 'react';
import type { DeviceCardProps } from '../../../types';
import { getTemperature, getHumidity, getBattery } from '../../utils/deviceHelpers';
import { useRooms } from '../../hooks/useRooms';
import DebugSection from './DebugSection';
import './TempSensorCard.css';

const TempSensorCard: React.FC<DeviceCardProps & { isDebugVisible?: boolean }> = ({ device, isDebugVisible = false, onHeaderClick }) => {

// 🆕 Sestavení názvu podle nastavení
const getDisplayName = (): string | null => {
  const showName = device.cardSettings?.showName !== false;
  const showCustomName = device.cardSettings?.showCustomName !== false;
  
  const parts: string[] = [];
  
  // Přidej customName, pokud existuje a má se zobrazit
  if (showCustomName && device.customName) {
    parts.push(device.customName);
  }
  
  // Přidej originální název, pokud se má zobrazit
  if (showName && device.name) {
    // Nepřidávej duplicitu
    if (!parts.includes(device.name)) {
      parts.push(device.name);
    }
  }
  
  // Pokud není co zobrazit, vrať null
  if (parts.length === 0) {
    return null;
  }
  
  return parts.join(' | ');
};

    // 🏠 Načti místnosti pro zobrazení názvu
    const { rooms } = useRooms();
    const room = rooms.find(r => r.id === device.roomId);
    
// Získej hodnoty z status (univerzální - podporuje všechny varianty názvů)
const temperature = getTemperature(device.status);
const humidity = getHumidity(device.status);
const battery = getBattery(device.status);

// Zjisti nastavení karty
// 🎨 Zjisti nastavení karty - TempSensor má výchozí COMPACT
const cardSize = device.cardSettings?.size || 'small';      // ✅ Změna: small místo medium
const cardLayout = device.cardSettings?.layout || 'compact'; // ✅ Změna: compact místo default

return (
  <div
    className={`tuya-device-card temp-sensor ${
      device.online ? 'online' : 'offline'
    } size-${cardSize} layout-${cardLayout}`}
  >
{/* Header - klikatelný pro otevření modalu */}
<div 
        className="tuya-card-header clickable-header" 
        onClick={onHeaderClick}
        style={{ cursor: onHeaderClick ? 'pointer' : 'default' }}
      >
        <div className="device-info">
          <span className="device-icon">🌡️</span>
          <div className={`device-names ${!getDisplayName() ? 'no-title' : ''}`}>
            {getDisplayName() && (
              <h3 className="device-name">{getDisplayName()}</h3>
            )}
            <div className="device-subtitle">
              <span className="device-category">Teplotní senzor</span>
              {room && (
                <>
                  <span className="subtitle-separator">•</span>
                  <span className="device-room">{room.icon} {room.name}</span>
                </>
              )}
            </div>
          </div>
          </div>

        <div className="device-status-indicator">
          <div className="status-badges">
            {device.sub && (
              <span className="zigbee-badge" title="Zigbee zařízení">
                Z
              </span>
            )}
            <span
              className={`status-dot ${device.online ? 'online' : 'offline'}`}
            ></span>
          </div>
          {device.lastUpdated && (
            <div className="last-updated-header">
              {new Date(device.lastUpdated).toLocaleTimeString('cs-CZ', {
                hour: '2-digit',
                minute: '2-digit'
              })}
            </div>
          )}
        </div>
      </div>

      {/* Body - Hlavní hodnoty */}
      <div className="tuya-card-body temp-sensor-body">
        {temperature !== undefined ? (
          <div className="main-value">
            <div className="temperature-display">
              <span className="temp-value">{temperature.toFixed(1)}</span>
              <span className="temp-unit">°C</span>
            </div>
          </div>
        ) : (
          <div className="no-data">Žádná data</div>
        )}

        {/* Sekundární hodnoty */}
        <div className="secondary-values">
          {humidity !== undefined && (
            <div className="sensor-stat">
              <span className="stat-icon">💧</span>
              <span className="stat-value">{humidity}%</span>
            </div>
          )}
          {battery !== undefined && (
            <div className="sensor-stat">
              <span className="stat-icon">🔋</span>
              <span className="stat-value">{battery}%</span>
            </div>
          )}
        </div>
      </div>
      {/* Debug Section */}
      <DebugSection device={device} isVisible={isDebugVisible} />
    </div>
  );
};

export default TempSensorCard;
