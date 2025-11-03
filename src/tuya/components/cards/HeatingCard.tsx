// src/tuya/components/cards/HeatingCard.tsx
import React, { useState } from 'react';
import type { DeviceCardProps } from '../../../types';
import { getTemperature, getStatusValue } from '../../utils/deviceHelpers';
import DebugSection from './DebugSection';

const HeatingCard: React.FC<DeviceCardProps & { isDebugVisible?: boolean }> = ({ 
  device, 
  onControl, 
  isDebugVisible = false 
}) => {
  const [isAdjusting, setIsAdjusting] = useState(false);

  // Získej hodnoty z status (univerzální)
  const tempCurrent = getTemperature(device.status);
  const tempSetRaw = getStatusValue(device.status, 'temp_set');
  const tempSet = tempSetRaw !== undefined ? tempSetRaw / 10 : 20;
  const mode = getStatusValue(device.status, 'mode') || 'auto';
  const childLock = getStatusValue(device.status, 'child_lock') || false;

  const handleTemperatureChange = async (newTemp: number) => {
    if (!onControl || !device.online) return;
    
    setIsAdjusting(true);
    try {
      // Tuya očekává teplotu * 10 (23.5 → 235)
      await onControl(device.id, [
        { code: 'temp_set', value: Math.round(newTemp * 10) }
      ]);
    } catch (error) {
      console.error('Chyba při nastavení teploty:', error);
    } finally {
      setIsAdjusting(false);
    }
  };

  const handleModeChange = async (newMode: string) => {
    if (!onControl || !device.online) return;
    
    try {
      await onControl(device.id, [
        { code: 'mode', value: newMode }
      ]);
    } catch (error) {
      console.error('Chyba při změně režimu:', error);
    }
  };

  const getModeLabel = (mode: string) => {
    const modes: Record<string, string> = {
      'auto': 'Auto',
      'manual': 'Manuál',
      'off': 'Vypnuto'
    };
    return modes[mode] || mode;
  };

  return (
    <div className={`tuya-device-card heating ${device.online ? 'online' : 'offline'}`}>
      {/* Header */}
      <div className="tuya-card-header">
        <div className="device-info">
          <span className="device-icon">🔥</span>
          <div className="device-names">
            <h3 className="device-name">
              {device.customName || device.name}
            </h3>
            <span className="device-category">Topení</span>
          </div>
        </div>
        
        <div className="device-status-indicator">
          {device.sub && <span className="zigbee-badge" title="Zigbee zařízení">Z</span>}
          {childLock && <span className="lock-badge" title="Dětský zámek">🔒</span>}
          <span className={`status-dot ${device.online ? 'online' : 'offline'}`}></span>
        </div>
      </div>

      {/* Body - Kompaktní layout s vertikálním posuvníkem */}
      <div className="tuya-card-body heating-body-compact">
        {tempCurrent !== undefined ? (
          <div className="heating-compact-layout">
            {/* Levá strana - Vertikální posuvník */}
            <div className="vertical-temp-control">
              <div className="temp-value-display">
                {tempSet.toFixed(1)}°C
              </div>
              
              <input
                type="range"
                min="5"
                max="30"
                step="0.5"
                value={tempSet}
                onChange={(e) => handleTemperatureChange(parseFloat(e.target.value))}
                disabled={!device.online || isAdjusting}
                className="vertical-slider"
                orient="vertical"
              />
              
              <div className="slider-labels">
                <div className="label-top">
                  <span className="emoji">🔥</span>
                  <span>30°C</span>
                </div>
                <div className="label-bottom">
                  <span className="emoji">🧊</span>
                  <span>5°C</span>
                </div>
              </div>
            </div>

            {/* Pravá strana - Budík */}
            <div className="thermometer-compact">
              {/* Cíl v rohu */}
              <div className="target-badge-compact">
                Cíl: <strong>{tempSet.toFixed(1)}°C</strong>
              </div>

              {/* SVG Kruhový ukazatel */}
              <svg className="thermometer-svg-compact" viewBox="0 0 140 160">
                {/* Pozadí kruhu */}
                <circle
                  cx="70"
                  cy="70"
                  r="60"
                  fill="none"
                  stroke="rgba(255, 255, 255, 0.1)"
                  strokeWidth="10"
                />
                
                {/* Aktivní oblouk */}
                <circle
                  cx="70"
                  cy="70"
                  r="60"
                  fill="none"
                  stroke="#ff6b6b"
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray={`${((tempCurrent - 5) / 25) * 377} 377`}
                  transform="rotate(-90 70 70)"
                  style={{
                    filter: 'drop-shadow(0 0 8px rgba(255, 107, 107, 0.5))',
                    transition: 'stroke-dasharray 0.5s ease'
                  }}
                />
                
                {/* Cílová teplota značka */}
                <line
                  x1="70"
                  y1="20"
                  x2="70"
                  y2="30"
                  stroke="#ffc107"
                  strokeWidth="3"
                  strokeLinecap="round"
                  transform={`rotate(${((tempSet - 5) / 25) * 360} 80 80)`}
                  style={{
                    filter: 'drop-shadow(0 0 6px rgba(255, 193, 7, 0.8))'
                  }}
                />
                
                {/* Prostřední text */}
                <text
                  x="80"
                  y="75"
                  textAnchor="middle"
                  fontSize="32"
                  fontWeight="700"
                  fill="#ff6b6b"
                >
                  {tempCurrent.toFixed(1)}
                </text>
                <text
                  x="80"
                  y="92"
                  textAnchor="middle"
                  fontSize="14"
                  fill="#888"
                >
                  °C
                </text>
              </svg>

              {/* Režim pod budíkem - KLIKATELNÝ */}
              <button 
                className="mode-compact clickable"
                onClick={() => {
                  const modes = ['auto', 'manual', 'off'];
                  const currentIndex = modes.indexOf(mode);
                  const nextMode = modes[(currentIndex + 1) % modes.length];
                  handleModeChange(nextMode);
                }}
                disabled={!device.online}
                title="Klikni pro změnu režimu"
              >
                <span className="mode-icon">🔄</span>
                <span className="mode-text">{getModeLabel(mode)}</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="no-data">Žádná data</div>
        )}
      </div>

      {/* Footer */}
      <div className="tuya-card-footer">
        {device.lastUpdated && (
          <span className="last-updated">
            {new Date(device.lastUpdated).toLocaleTimeString('cs-CZ')}
          </span>
        )}
      </div>

      {/* Debug Section */}
      <DebugSection device={device} isVisible={isDebugVisible} />
    </div>
  );
};

export default HeatingCard;