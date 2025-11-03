// src/tuya/components/cards/TempSensorCard.tsx
import React from 'react';
import type { DeviceCardProps } from '../../../types';
import { getTemperature, getHumidity, getBattery } from '../../utils/deviceHelpers';
import DebugSection from './DebugSection';

const TempSensorCard: React.FC<DeviceCardProps & { isDebugVisible?: boolean }> = ({ device, isDebugVisible = false }) => {
  
// Získej hodnoty z status (univerzální - podporuje všechny varianty názvů)
const temperature = getTemperature(device.status);
const humidity = getHumidity(device.status);
const battery = getBattery(device.status);

  return (
    <div
      className={`tuya-device-card temp-sensor ${
        device.online ? 'online' : 'offline'
      }`}
    >
      {/* Header */}
      <div className="tuya-card-header">
        <div className="device-info">
          <span className="device-icon">🌡️</span>
          <div className="device-names">
            <h3 className="device-name">{device.customName || device.name}</h3>
            <span className="device-category">Teplotní senzor</span>
          </div>
        </div>

        <div className="device-status-indicator">
          {device.sub && (
            <span className="zigbee-badge" title="Zigbee zařízení">
              Z
            </span>
          )}
          <span
            className={`status-dot ${device.online ? 'online' : 'offline'}`}
          ></span>
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

      {/* Footer */}
      <div className="tuya-card-footer">
        <div className="read-only-indicator">
          <span className="info-text">📊 Pouze čtení</span>
          {device.lastUpdated && (
            <span className="last-updated">
              {new Date(device.lastUpdated).toLocaleTimeString('cs-CZ')}
            </span>
          )}
        </div>
      </div>
      {/* Debug Section */}
      <DebugSection device={device} isVisible={isDebugVisible} />
    </div>
  );
};

export default TempSensorCard;
