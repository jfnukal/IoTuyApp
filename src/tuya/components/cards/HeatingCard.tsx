// src/tuya/components/cards/HeatingCard.tsx
import React, { useState, useRef } from 'react';
import type { DeviceCardProps } from '../../../types';
import { getTemperature, getStatusValue } from '../../utils/deviceHelpers';
import DebugSection from './DebugSection';
import './HeatingCard.css';

const HeatingCard: React.FC<DeviceCardProps & { isDebugVisible?: boolean }> = ({
  device,
  onControl,
  isDebugVisible = false,
  onHeaderClick,
}) => {
  const [isAdjusting, setIsAdjusting] = useState(false);

  // 🆕 Lokální state pro slider - umožní plynulý pohyb bez čekání na API
  const [localTempSet, setLocalTempSet] = useState<number | null>(null);
  const isDragging = useRef(false);

  // 🎨 Zjisti nastavení karty
  const cardSize = device.cardSettings?.size || 'medium';
  const cardLayout = device.cardSettings?.layout || 'default';

  // Získej hodnoty z status
  const tempCurrent = getTemperature(device.status);
  const tempSetRaw = getStatusValue(device.status, 'temp_set');
  const tempSet = tempSetRaw !== undefined ? tempSetRaw / 10 : 20;
  const mode = getStatusValue(device.status, 'mode') || 'auto';
  const valve = getStatusValue(device.status, 'valve'); // 🆕 Stav ventilu

  // 🆕 Zobrazovaná teplota - buď lokální (při táhnutí) nebo z API
  const displayTempSet = localTempSet !== null ? localTempSet : tempSet;

  // 🆕 Handler pro pohyb sliderem (jen lokální změna)
  const handleSliderChange = (newTemp: number) => {
    isDragging.current = true;
    setLocalTempSet(newTemp);
  };

  // 🆕 Handler pro puštění slideru (odeslání do API)
  const handleSliderRelease = async () => {
    if (!onControl || !device.online || localTempSet === null) {
      setLocalTempSet(null);
      isDragging.current = false;
      return;
    }

    setIsAdjusting(true);
    try {
      // Pošli teplotu A změň režim na manual
      await onControl(device.id, [
        { code: 'temp_set', value: Math.round(localTempSet * 10) },
        { code: 'mode', value: 'manual' },
      ]);
      console.log(
        '🌡️ Teplota nastavena na',
        localTempSet,
        '+ režim změněn na manual'
      );
    } catch (error) {
      console.error('Chyba při nastavení teploty:', error);
    } finally {
      setIsAdjusting(false);
      setLocalTempSet(null);
      isDragging.current = false;
    }
  };

  const handleModeChange = async (newMode: string) => {
    if (!onControl || !device.online) return;

    try {
      await onControl(device.id, [{ code: 'mode', value: newMode }]);
    } catch (error) {
      console.error('❌ HEATING: Chyba při změně režimu:', error);
    }
  };

  const getModeLabel = (mode: string) => {
    const modes: Record<string, string> = {
      comfort: 'Komfort',
      auto: 'Program',
      holiday: 'Dovolená',
      eco: 'ECO',
      manual: 'Ruční',
      BOOST: 'BOOST',
      temp_auto: 'Dočasná',
      comfortable: 'Komfort',
    };
    return modes[mode] || mode;
  };

  // 🆕 Ikona podle režimu
  const getModeIcon = (mode: string) => {
    const icons: Record<string, string> = {
      comfort: '😊',
      auto: '📅',
      holiday: '🏖️',
      eco: '🌿',
      manual: '✋',
      BOOST: '🚀',
      temp_auto: '⏱️',
    };
    return icons[mode] || '🔄';
  };

  return (
    <div
      className={`tuya-device-card heating ${
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
          <span className="device-icon">🔥</span>
          <div className="device-names">
            <h3 className="device-name">{device.customName || device.name}</h3>
            <span className="device-category">Topení</span>
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
                minute: '2-digit',
              })}
            </div>
          )}
        </div>
      </div>

      {/* Body - Kompaktní layout s vertikálním posuvníkem */}
      <div className="tuya-card-body heating-body-compact">
        {tempCurrent !== undefined ? (
          <div className="heating-compact-layout">
            {/* Levá strana - Vertikální posuvník */}
            <div className="vertical-temp-control">
              <div className="temp-value-display">
                {displayTempSet.toFixed(1)}°C
                {localTempSet !== null && (
                  <span style={{ fontSize: '0.6em', opacity: 0.7 }}> ⏳</span>
                )}
              </div>

              <input
                type="range"
                min="5"
                max="30"
                step="0.5"
                value={displayTempSet}
                onChange={(e) => handleSliderChange(parseFloat(e.target.value))}
                onMouseUp={handleSliderRelease}
                onTouchEnd={handleSliderRelease}
                disabled={!device.online}
                className="vertical-slider"
                style={{ cursor: device.online ? 'grab' : 'not-allowed' }}
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
                Cíl: <strong>{displayTempSet.toFixed(1)}°C</strong>
                {valve !== undefined && (
                  <span
                    style={{
                      marginLeft: '8px',
                      fontSize: '0.85em',
                      opacity: 0.8,
                    }}
                  >
                    | Ventil: {valve}%
                  </span>
                )}
              </div>

              {/* SVG Kruhový ukazatel */}
              <svg className="thermometer-svg-compact" viewBox="0 0 160 160">
                {/* Pozadí kruhu */}
                <circle
                  cx="80"
                  cy="80"
                  r="65"
                  fill="none"
                  stroke="rgba(255, 255, 255, 0.1)"
                  strokeWidth="12"
                />

                {/* Aktivní oblouk (aktuální teplota) */}
                <circle
                  cx="80"
                  cy="80"
                  r="65"
                  fill="none"
                  stroke="#ff6b6b"
                  strokeWidth="12"
                  strokeLinecap="round"
                  strokeDasharray={`${((tempCurrent - 5) / 25) * 408} 408`}
                  transform="rotate(-90 80 80)"
                  style={{
                    filter: 'drop-shadow(0 0 8px rgba(255, 107, 107, 0.5))',
                    transition: 'stroke-dasharray 0.5s ease',
                  }}
                />

                {/* Cílová teplota značka (žlutá čárka) */}
                <line
                  x1="80"
                  y1="15"
                  x2="80"
                  y2="30"
                  stroke="#ffc107"
                  strokeWidth="4"
                  strokeLinecap="round"
                  transform={`rotate(${
                    ((displayTempSet - 5) / 25) * 360
                  } 80 80)`}
                  style={{
                    filter: 'drop-shadow(0 0 6px rgba(255, 193, 7, 0.8))',
                  }}
                />

                {/* Prostřední text - aktuální teplota */}
                <text
                  x="80"
                  y="85"
                  textAnchor="middle"
                  fontSize="36"
                  fontWeight="700"
                  fill="#ff6b6b"
                >
                  {tempCurrent.toFixed(1)}
                </text>
                <text
                  x="80"
                  y="105"
                  textAnchor="middle"
                  fontSize="16"
                  fill="#888"
                >
                  °C
                </text>
              </svg>

              {/* Režim pod budíkem - KLIKATELNÝ */}
              <button 
                className="mode-compact clickable"
                onClick={() => {
                  const modes = [
                    'comfort',
                    'auto',
                    'holiday',
                    'eco',
                    'manual',
                    'BOOST',
                  ];
                  const currentIndex = modes.indexOf(mode);
                  const nextIndex =
                    currentIndex === -1 ? 0 : (currentIndex + 1) % modes.length;
                  const nextMode = modes[nextIndex];
                  console.log('🔥 Měním režim z', mode, 'na', nextMode);
                  handleModeChange(nextMode);
                }}
                disabled={!device.online || isAdjusting}
                title="Klikni pro změnu režimu"
              >
                <span className="mode-icon">{getModeIcon(mode)}</span>
                <span className="mode-text">{getModeLabel(mode)}</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="no-data">Žádná data</div>
        )}
      </div>

      {/* Debug Section */}
      <DebugSection device={device} isVisible={isDebugVisible} />
    </div>
  );
};

export default HeatingCard;

