// src/tuya/components/cards/MultiSocketCard.tsx
import React, { useState, useRef } from 'react';
import type { DeviceCardProps } from '../../../types';
import { getStatusValue } from '../../utils/deviceHelpers';
import { useRooms } from '../../hooks/useRooms';
import { useCardSize } from '../../hooks/useCardSize';
import DebugSection from './DebugSection';
import './MultiSocketCard.css';

interface MultiSocketCardProps extends DeviceCardProps {
  isDebugVisible?: boolean;
}

const MultiSocketCard: React.FC<MultiSocketCardProps> = ({
  device,
  onControl,
  isDebugVisible = false,
  onHeaderClick,
}) => {
  const [loadingSwitch, setLoadingSwitch] = useState<string | null>(null);

  // Hook pro měření velikosti karty
  const cardRef = useRef<HTMLDivElement>(null);
  const { rules } = useCardSize(cardRef);

  // Sestavení názvu podle nastavení
  const getDisplayName = (): string | null => {
    const showName = device.cardSettings?.showName !== false;
    const showCustomName = device.cardSettings?.showCustomName !== false;

    const parts: string[] = [];
    if (showCustomName && device.customName) {
      parts.push(device.customName);
    }
    if (showName && device.name) {
      if (!parts.includes(device.name)) {
        parts.push(device.name);
      }
    }
    return parts.length === 0 ? null : parts.join(' | ');
  };

  // Místnosti
  const { rooms } = useRooms();
  const room = rooms.find((r) => r.id === device.roomId);

  // Status všech výstupů
  const switch1 =
    getStatusValue(device.status, 'switch_1') ??
    getStatusValue(device.status, 'switch');
  const switch2 = getStatusValue(device.status, 'switch_2');
  const switchUsb1 = getStatusValue(device.status, 'switch_usb1');

  // Data o spotřebě
  const curPower = getStatusValue(device.status, 'cur_power');
  const curCurrent = getStatusValue(device.status, 'cur_current');
  const curVoltage = getStatusValue(device.status, 'cur_voltage');

  const handleToggle = async (switchCode: string, currentValue: boolean) => {
    if (!onControl || !device.online) return;
    setLoadingSwitch(switchCode);
    try {
      await onControl(device.id, [{ code: switchCode, value: !currentValue }]);
    } catch (error) {
      console.error(`Chyba při přepínání ${switchCode}:`, error);
    } finally {
      setLoadingSwitch(null);
    }
  };

  // Definice switchů
  const switches = [
    { code: 'switch_1', value: switch1, label: 'Zásuvka 1', type: 'socket' },
    { code: 'switch_2', value: switch2, label: 'Zásuvka 2', type: 'socket' },
    { code: 'switch_usb1', value: switchUsb1, label: 'USB', type: 'usb' },
  ].filter((s) => s.value !== undefined);

  const displayName = getDisplayName();

  return (
    <div
      ref={cardRef}
      className={`tuya-device-card glass-socket ${
        device.online ? 'online' : 'offline'
      } layout-${rules.layout} font-${rules.fontSize}`}
    >
      {/* ==================== HEADER ==================== */}
      {rules.showHeader && (
        <div
          className="tuya-card-header clickable-header"
          onClick={onHeaderClick}
          style={{ cursor: onHeaderClick ? 'pointer' : 'default' }}
        >
          <div className="device-info">
            <span className="device-icon">🔌</span>
            <div className={`device-names ${!displayName ? 'no-title' : ''}`}>
              {rules.showTitle && displayName && (
                <h3 className="device-name">{displayName}</h3>
              )}
              {rules.showSubtitle && (
                <div className="device-subtitle">
                  <span className="device-category">Smart Socket</span>
                  {room && (
                    <>
                      <span className="subtitle-separator">•</span>
                      <span className="device-room">
                        {room.icon} {room.name}
                      </span>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="device-status-indicator">
            {rules.showStatusBadges && (
              <div className="status-badges">
                {device.sub && (
                  <span className="zigbee-badge" title="Zigbee zařízení">
                    Z
                  </span>
                )}
                {!device.sub && rules.showWifiIndicator && (
                  <span className="wifi-badge" title="WiFi zařízení">
                    📶
                  </span>
                )}
                <span
                  className={`status-dot ${
                    device.online ? 'online' : 'offline'
                  }`}
                ></span>
              </div>
            )}
            {!rules.showStatusBadges && rules.showStatusDot && (
              <span
                className={`status-dot ${device.online ? 'online' : 'offline'}`}
              ></span>
            )}
            {rules.showTime && device.lastUpdated && (
              <div className="last-updated-header">
                {new Date(device.lastUpdated).toLocaleTimeString('cs-CZ', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </div>
            )}
          </div>
        </div>
      )}

{/* ==================== BODY ==================== */}
<div className={`tuya-card-body socket-body ${rules.horizontalStats ? 'horizontal-layout' : ''}`}>
        
        {/* Horizontální layout: tlačítka + statistiky vedle sebe */}
        {rules.horizontalStats ? (
          <div className="socket-horizontal">
            {/* Levá strana - tlačítka */}
            <div className="socket-buttons-side">
              {switches.map((sw) => (
                <button
                  key={sw.code}
                  className={`socket-btn ${sw.value ? 'active' : ''} ${sw.type} ${loadingSwitch === sw.code ? 'loading' : ''}`}
                  onClick={() => handleToggle(sw.code, sw.value as boolean)}
                  disabled={!device.online || loadingSwitch === sw.code}
                  style={{ '--btn-size': `${rules.buttonSize}px` } as React.CSSProperties}
                >
                  <div className="socket-btn-circle">
                    {sw.type === 'usb' ? (
                      <svg className="socket-btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="10" cy="7" r="1"></circle>
                        <circle cx="4" cy="20" r="1"></circle>
                        <path d="M4.7 19.3 19 5"></path>
                        <path d="m21 3-3 1 2 2Z"></path>
                      </svg>
                    ) : (
                      <svg className="socket-btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="5" y="2" width="14" height="20" rx="2"></rect>
                        <line x1="9" y1="9" x2="9" y2="9.01"></line>
                        <line x1="15" y1="9" x2="15" y2="9.01"></line>
                        <line x1="9" y1="13" x2="15" y2="13"></line>
                      </svg>
                    )}
                    {loadingSwitch === sw.code && <div className="loading-ring-small"></div>}
                  </div>
                  <span className="socket-btn-label">{sw.label}</span>
                </button>
              ))}
            </div>

            {/* Pravá strana - statistiky */}
            {rules.showStats && (curPower !== undefined || curVoltage !== undefined) && (
              <div className="socket-stats-side">
                {curPower !== undefined && (
                  <div className="stat-row">
                    <span className="stat-icon">⚡</span>
                    {rules.showLabels && <span className="stat-label">Spotřeba:</span>}
                    <span className="stat-value">{(curPower / 10).toFixed(1)} W</span>
                  </div>
                )}
                {rules.showAllStats && curVoltage !== undefined && (
                  <div className="stat-row">
                    <span className="stat-icon">🔌</span>
                    {rules.showLabels && <span className="stat-label">Napětí:</span>}
                    <span className="stat-value">{(curVoltage / 10).toFixed(0)} V</span>
                  </div>
                )}
                {rules.showAllStats && curCurrent !== undefined && (
                  <div className="stat-row">
                    <span className="stat-icon">💧</span>
                    {rules.showLabels && <span className="stat-label">Proud:</span>}
                    <span className="stat-value">{(curCurrent / 1000).toFixed(2)} A</span>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          /* Vertikální layout: tlačítka nahoře, statistiky dole */
          <>
            <div className="socket-buttons-adaptive">
              {switches.map((sw) => (
                <button
                  key={sw.code}
                  className={`socket-btn ${sw.value ? 'active' : ''} ${sw.type} ${loadingSwitch === sw.code ? 'loading' : ''}`}
                  onClick={() => handleToggle(sw.code, sw.value as boolean)}
                  disabled={!device.online || loadingSwitch === sw.code}
                  style={{ '--btn-size': `${rules.buttonSize}px` } as React.CSSProperties}
                >
                  <div className="socket-btn-circle">
                    {sw.type === 'usb' ? (
                      <svg className="socket-btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="10" cy="7" r="1"></circle>
                        <circle cx="4" cy="20" r="1"></circle>
                        <path d="M4.7 19.3 19 5"></path>
                        <path d="m21 3-3 1 2 2Z"></path>
                      </svg>
                    ) : (
                      <svg className="socket-btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="5" y="2" width="14" height="20" rx="2"></rect>
                        <line x1="9" y1="9" x2="9" y2="9.01"></line>
                        <line x1="15" y1="9" x2="15" y2="9.01"></line>
                        <line x1="9" y1="13" x2="15" y2="13"></line>
                      </svg>
                    )}
                    {loadingSwitch === sw.code && <div className="loading-ring-small"></div>}
                  </div>
                  {rules.layout !== 'micro' && (
                    <span className="socket-btn-label">{sw.label}</span>
                  )}
                </button>
              ))}

              {switches.length === 0 && (
                <div className="no-switches-mini">⚠️</div>
              )}
            </div>

            {rules.showStats && (curPower !== undefined || curVoltage !== undefined) && (
              <div className="socket-stats-adaptive">
                {curPower !== undefined && (
                  <div className="stat-row">
                    <span className="stat-icon">⚡</span>
                    {rules.showLabels && <span className="stat-label">Spotřeba:</span>}
                    <span className="stat-value">{(curPower / 10).toFixed(1)} W</span>
                  </div>
                )}
                {rules.showAllStats && curVoltage !== undefined && (
                  <div className="stat-row">
                    <span className="stat-icon">🔌</span>
                    {rules.showLabels && <span className="stat-label">Napětí:</span>}
                    <span className="stat-value">{(curVoltage / 10).toFixed(0)} V</span>
                  </div>
                )}
                {rules.showAllStats && curCurrent !== undefined && (
                  <div className="stat-row">
                    <span className="stat-icon">💧</span>
                    {rules.showLabels && <span className="stat-label">Proud:</span>}
                    <span className="stat-value">{(curCurrent / 1000).toFixed(2)} A</span>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Debug */}
      <DebugSection device={device} isVisible={isDebugVisible} />
    </div>
  );
};

export default React.memo(MultiSocketCard);
