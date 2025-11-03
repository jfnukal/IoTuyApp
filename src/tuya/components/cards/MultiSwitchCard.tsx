// src/tuya/components/cards/MultiSwitchCard.tsx
import React, { useState } from 'react';
import type { DeviceCardProps } from '../../../types';
import { getStatusValue } from '../../utils/deviceHelpers';
import DebugSection from './DebugSection';

const MultiSwitchCard: React.FC<DeviceCardProps & { isDebugVisible?: boolean }> = ({ 
  device, 
  onControl,
  isDebugVisible = false 
}) => {
  const [loadingSwitch, setLoadingSwitch] = useState<string | null>(null);

  // Získej status všech přepínačů
  const switch1 = getStatusValue(device.status, 'switch_1');
  const switch2 = getStatusValue(device.status, 'switch_2');

  const handleToggle = async (switchCode: string, currentValue: boolean) => {
    if (!onControl || !device.online) return;
    
    setLoadingSwitch(switchCode);
    try {
      await onControl(device.id, [
        { code: switchCode, value: !currentValue }
      ]);
    } catch (error) {
      console.error(`Chyba při přepínání ${switchCode}:`, error);
    } finally {
      setLoadingSwitch(null);
    }
  };

  return (
    <div className={`tuya-device-card glass-switch ${device.online ? 'online' : 'offline'}`}>
      {/* Header */}
      <div className="tuya-card-header">
        <div className="device-info">
          <span className="device-icon">💡</span>
          <div className="device-names">
            <h3 className="device-name">
              {device.customName || device.name}
            </h3>
            <span className="device-category">Touch Switch</span>
          </div>
        </div>
        
        <div className="device-status-indicator">
          {device.sub && <span className="zigbee-badge" title="Zigbee zařízení">Z</span>}
          <span className={`status-dot ${device.online ? 'online' : 'offline'}`}></span>
        </div>
      </div>

      {/* Body - Skleněný panel s tlačítky */}
      <div className="tuya-card-body glass-panel-body">
        <div className="glass-panel">
          {/* WiFi symbol nahoře */}
          <div className="wifi-indicator">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 12.55a11 11 0 0 1 14.08 0"></path>
              <path d="M1.42 9a16 16 0 0 1 21.16 0"></path>
              <path d="M8.53 16.11a6 6 0 0 1 6.95 0"></path>
              <line x1="12" y1="20" x2="12.01" y2="20"></line>
            </svg>
          </div>

          {/* Touch tlačítka */}
          <div className="touch-buttons">
            {/* Tlačítko 1 */}
            {switch1 !== undefined && (
              <button
                className={`touch-button ${switch1 ? 'active' : ''} ${loadingSwitch === 'switch_1' ? 'loading' : ''}`}
                onClick={() => handleToggle('switch_1', switch1)}
                disabled={!device.online || loadingSwitch === 'switch_1'}
              >
                <div className="touch-circle">
                  <svg className="power-icon" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18.36 6.64a9 9 0 1 1-12.73 0"></path>
                    <line x1="12" y1="2" x2="12" y2="12"></line>
                  </svg>
                  {loadingSwitch === 'switch_1' && (
                    <div className="loading-ring"></div>
                  )}
                </div>
                <span className="button-label">Světlo 1</span>
              </button>
            )}

            {/* Tlačítko 2 */}
            {switch2 !== undefined && (
              <button
                className={`touch-button ${switch2 ? 'active' : ''} ${loadingSwitch === 'switch_2' ? 'loading' : ''}`}
                onClick={() => handleToggle('switch_2', switch2)}
                disabled={!device.online || loadingSwitch === 'switch_2'}
              >
                <div className="touch-circle">
                  <svg className="power-icon" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18.36 6.64a9 9 0 1 1-12.73 0"></path>
                    <line x1="12" y1="2" x2="12" y2="12"></line>
                  </svg>
                  {loadingSwitch === 'switch_2' && (
                    <div className="loading-ring"></div>
                  )}
                </div>
                <span className="button-label">Světlo 2</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="tuya-card-footer">
        <div className="device-control-info">
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

export default MultiSwitchCard;