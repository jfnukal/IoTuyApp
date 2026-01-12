// src/tuya/components/cards/MultiSwitchCard.tsx
import React, { useState } from 'react';
import type { DeviceCardProps } from '../../../types';
import { getStatusValue } from '../../utils/deviceHelpers';
import { useRooms } from '../../hooks/useRooms';
import DebugSection from './DebugSection';

const MultiSwitchCard: React.FC<DeviceCardProps & { isDebugVisible?: boolean }> = ({ 
  device, 
  onControl,
  isDebugVisible = false,
  onHeaderClick 
}) => {
  const [loadingSwitch, setLoadingSwitch] = useState<string | null>(null);

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

  // 🎨 Zjisti nastavení karty
  const cardSize = device.cardSettings?.size || 'medium';
  const cardLayout = device.cardSettings?.layout || 'default';

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
    <div className={`tuya-device-card glass-switch ${device.online ? 'online' : 'offline'} size-${cardSize} layout-${cardLayout}`}>
{/* Header - klikatelný pro otevření modalu */}
<div 
        className="tuya-card-header clickable-header" 
        onClick={onHeaderClick}
        style={{ cursor: onHeaderClick ? 'pointer' : 'default' }}
      >
        <div className="device-info">
          <span className="device-icon">💡</span>
          <div className="device-names">
          <div className={`device-names ${!getDisplayName() ? 'no-title' : ''}`}>
            {getDisplayName() && (
              <h3 className="device-name">{getDisplayName()}</h3>
            )}
            <div className="device-subtitle">
            <span className="device-category">Touch Switch</span>
            {room && (
                <>
                  <span className="subtitle-separator">•</span>
                  <span className="device-room">{room.icon} {room.name}</span>
                </>
              )}
            </div>
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

      {/* Debug Section */}
      <DebugSection device={device} isVisible={isDebugVisible} />
    </div>
  );
};

export default React.memo(MultiSwitchCard);