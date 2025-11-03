// src/tuya/components/cards/BasicCard.tsx
import React, { useState } from 'react';
import type { DeviceCardProps } from '../../../types'; 
import { getStatusValue } from '../../utils/deviceHelpers';
import DebugSection from './DebugSection';

const BasicCard: React.FC<DeviceCardProps & { isDebugVisible?: boolean }> = ({ device, onToggle, isDebugVisible = false }) => {
  const [isLoading, setIsLoading] = useState(false);

  // Najdi switch_1 status (základní zapnuto/vypnuto)
  const switchStatus = getStatusValue(device.status, 'switch_1');
  const isOn = switchStatus === true;

  // Najdi další běžné statusy
  const currentPower = getStatusValue(device.status, 'cur_power');
  const brightness = getStatusValue(device.status, 'bright_value');
  const battery = getStatusValue(device.status, 'battery');

  const handleToggle = async () => {
    if (!device.online) return;

    setIsLoading(true);
    try {
      await onToggle(device.id);
    } catch (error) {
      console.error('Chyba při přepínání:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getCategoryIcon = (category: string) => {
    const icons: Record<string, string> = {
      switch: '🔌',
      light: '💡',
      sensor: '📡',
      climate: '❄️',
      security: '🔒',
      cover: '🪟',
      garden: '🌱',
    };
    return icons[category] || '⚙️';
  };

  return (
    <div
      className={`tuya-device-card basic ${
        device.online ? 'online' : 'offline'
      } ${isOn ? 'active' : ''}`}
    >
      {/* Header */}
      <div className="tuya-card-header">
        <div className="device-info">
          <span className="device-icon">
            {getCategoryIcon(device.category)}
          </span>
          <div className="device-names">
            <h3 className="device-name">{device.customName || device.name}</h3>
            <span className="device-category">{device.category}</span>
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

      {/* Body - Základní statusy */}
      <div className="tuya-card-body basic-body">
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

        {/* Battery */}
        {battery !== undefined && (
          <div className="device-stat">
            <span className="stat-icon">🔋</span>
            <span className="stat-label">Baterie:</span>
            <span className="stat-value">{battery}%</span>
          </div>
        )}

        {/* Pokud nemá žádné speciální statusy */}
        {!currentPower && !brightness && !battery && (
          <div className="device-stat-placeholder">
            <span className="placeholder-text">Základní zařízení</span>
            <span className="placeholder-hint">ID: {device.product_id}</span>
          </div>
        )}
      </div>

      {/* Footer - Ovládání */}
      <div className="tuya-card-footer">
        {switchStatus !== undefined ? (
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
        ) : (
          <div className="no-control">
            <span className="info-text">📊 Žádné ovládání</span>
            {device.lastUpdated && (
              <span className="last-updated">
                {new Date(device.lastUpdated).toLocaleTimeString('cs-CZ')}
              </span>
            )}
          </div>
        )}
      </div>
      {/* Debug Section */}
      <DebugSection device={device} isVisible={isDebugVisible} />
    </div>
  );
};

export default BasicCard;
