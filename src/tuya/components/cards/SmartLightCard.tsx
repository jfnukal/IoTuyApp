// src/tuya/components/cards/SmartLightCard.tsx
import React, { useState } from 'react';
import type { DeviceCardProps } from '../../../types';      // ← ven z cards → ven z components → ven z tuya → do types
import { formatBrightness, getStatusValue } from '../../utils/deviceHelpers';
import { useRooms } from '../../hooks/useRooms';
import DebugSection from './DebugSection';

const SmartLightCard: React.FC<DeviceCardProps & { isDebugVisible?: boolean }> = ({ device, onControl, isDebugVisible = false, onHeaderClick }) => {
  const [isAdjusting, setIsAdjusting] = useState(false);

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

  // Získej hodnoty z status
  const switchLed = getStatusValue(device.status, 'switch_led');
  const workMode = getStatusValue(device.status, 'work_mode') || 'white';
  const brightValueRaw = getStatusValue(device.status, 'bright_value_v2');
  const tempValueRaw = getStatusValue(device.status, 'temp_value_v2');

  // Formátuj jas (0-1000 → 0-100%)
  const brightness = brightValueRaw !== undefined ? formatBrightness(brightValueRaw) : 100;
  const colorTemp = tempValueRaw !== undefined ? Math.round((tempValueRaw / 1000) * 100) : 50;

  const handleToggle = async () => {
    if (!onControl || !device.online) return;
    
    setIsAdjusting(true);
    try {
      await onControl(device.id, [
        { code: 'switch_led', value: !switchLed }
      ]);
    } catch (error) {
      console.error('Chyba při přepínání světla:', error);
    } finally {
      setIsAdjusting(false);
    }
  };

  const handleBrightnessChange = async (newBrightness: number) => {
    if (!onControl || !device.online || !switchLed) return;
    
    setIsAdjusting(true);
    try {
      // Převod 0-100% → 0-1000
      const tuyaValue = Math.round((newBrightness / 100) * 1000);
      await onControl(device.id, [
        { code: 'bright_value_v2', value: tuyaValue }
      ]);
    } catch (error) {
      console.error('Chyba při nastavení jasu:', error);
    } finally {
      setIsAdjusting(false);
    }
  };

  const handleColorTempChange = async (newTemp: number) => {
    if (!onControl || !device.online || !switchLed) return;
    
    setIsAdjusting(true);
    try {
      // Převod 0-100% → 0-1000
      const tuyaValue = Math.round((newTemp / 100) * 1000);
      await onControl(device.id, [
        { code: 'temp_value_v2', value: tuyaValue }
      ]);
    } catch (error) {
      console.error('Chyba při nastavení teploty barvy:', error);
    } finally {
      setIsAdjusting(false);
    }
  };

  const getModeLabel = (mode: string) => {
    const modes: Record<string, string> = {
      'white': '⚪ Bílá',
      'colour': '🌈 Barevná',
      'scene': '🎨 Scéna'
    };
    return modes[mode] || mode;
  };

  return (
    <div className={`tuya-device-card smart-light ${device.online ? 'online' : 'offline'} ${switchLed ? 'active' : ''} size-${cardSize} layout-${cardLayout}`}>
{/* Header - klikatelný pro otevření modalu */}
<div 
        className="tuya-card-header clickable-header" 
        onClick={onHeaderClick}
        style={{ cursor: onHeaderClick ? 'pointer' : 'default' }}
      >
        <div className="device-info">
          <span className="device-icon">💡</span>
          <div className={`device-names ${!getDisplayName() ? 'no-title' : ''}`}>
            {getDisplayName() && (
              <h3 className="device-name">{getDisplayName()}</h3>
            )}
            <div className="device-subtitle">
            <span className="device-category">Smart Light</span>
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

      {/* Body - Status a hodnoty */}
      <div className="tuya-card-body smart-light-body">
        <div className="light-status">
          <div className="status-indicator">
            <span className={`status-text ${switchLed ? 'on' : 'off'}`}>
              {switchLed ? '🟢 Zapnuto' : '⚫ Vypnuto'}
            </span>
            <span className="mode-badge">{getModeLabel(workMode)}</span>
          </div>
          
          {switchLed && (
            <div className="light-values">
              <div className="value-item">
                <span className="value-icon">🔆</span>
                <span className="value-text">{brightness}%</span>
              </div>
              <div className="value-item">
                <span className="value-icon">🌡️</span>
                <span className="value-text">{colorTemp > 50 ? 'Studená' : 'Teplá'}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer - Ovládání */}
      <div className="tuya-card-footer smart-light-footer">
        {device.online ? (
          <div className="light-controls">
            {/* Hlavní toggle */}
            <div className="main-toggle">
              <span className="control-label">
                {switchLed ? '🟢 Zapnuto' : '⚫ Vypnuto'}
              </span>
              <label className="device-toggle-switch">
                <input
                  type="checkbox"
                  checked={switchLed}
                  onChange={handleToggle}
                  disabled={!device.online || isAdjusting}
                />
                <span className="device-toggle-slider">
                  {isAdjusting && <span className="loading-spinner-small">⏳</span>}
                </span>
              </label>
            </div>

            {/* Ovládání jasu */}
            {switchLed && (
              <>
                <div className="brightness-control">
                  <label className="slider-label">
                    🔆 Jas: {brightness}%
                  </label>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    step="5"
                    value={brightness}
                    onChange={(e) => handleBrightnessChange(parseInt(e.target.value))}
                    disabled={!device.online || isAdjusting || !switchLed}
                    className="brightness-slider"
                  />
                </div>

                <div className="color-temp-control">
                  <label className="slider-label">
                    🌡️ Teplota: {colorTemp > 50 ? 'Studená' : 'Teplá'}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="10"
                    value={colorTemp}
                    onChange={(e) => handleColorTempChange(parseInt(e.target.value))}
                    disabled={!device.online || isAdjusting || !switchLed}
                    className="color-temp-slider"
                  />
                  <div className="slider-marks">
                    <span>🔥 Teplá</span>
                    <span>❄️ Studená</span>
                  </div>
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="offline-message">Zařízení offline</div>
        )}
      </div>
      {/* Debug Section */}
      <DebugSection device={device} isVisible={isDebugVisible} />
    </div>
  );
};

export default React.memo(SmartLightCard);