// src/tuya/components/cards/PTZCameraCard.tsx
import React, { useState } from 'react';
import './PTZCameraCard.css';
import type { DeviceCardProps } from '../../../types';
import { getStatusValue } from '../../utils/deviceHelpers';
import DebugSection from './DebugSection';

const PTZCameraCard: React.FC<DeviceCardProps & { isDebugVisible?: boolean }> = ({ 
  device, 
  onControl,
  isDebugVisible = false 
}) => {
  const [isPtzActive, setIsPtzActive] = useState(false);

  // 🎨 Zjisti nastavení karty
  const cardSize = device.cardSettings?.size || 'medium';
  const cardLayout = device.cardSettings?.layout || 'default';

  // Získej status hodnoty
  const motionTracking = getStatusValue(device.status, 'motion_tracking');
  const nightvisionMode = getStatusValue(device.status, 'nightvision_mode');
  const floodlightSwitch = getStatusValue(device.status, 'floodlight_switch');
  const sirenSwitch = getStatusValue(device.status, 'siren_switch');
  const recordSwitch = getStatusValue(device.status, 'record_switch');
  const motionSwitch = getStatusValue(device.status, 'motion_switch');
  const sdStorage = getStatusValue(device.status, 'sd_storge');

  // PTZ kontrolní kódy
  const PTZ_COMMANDS = {
    UP: '0',
    DOWN: '1',
    LEFT: '2',
    RIGHT: '3',
    UP_LEFT: '4',
    UP_RIGHT: '5',
    DOWN_LEFT: '6',
    DOWN_RIGHT: '7',
  };

  // Funkce pro PTZ ovládání
  const handlePTZ = async (direction: string) => {
    if (!onControl || !device.online) return;

    setIsPtzActive(true);
    try {
      await onControl(device.id, [
        { code: 'ptz_control', value: direction }
      ]);
    } catch (error) {
      console.error('❌ Chyba při PTZ ovládání:', error);
    } finally {
      // Automaticky zastav po 500ms
      setTimeout(() => {
        if (onControl) {
          onControl(device.id, [{ code: 'ptz_stop', value: true }]);
        }
        setIsPtzActive(false);
      }, 500);
    }
  };

  // Funkce pro přepínání funkcí
  const handleToggle = async (code: string, currentValue: boolean) => {
    if (!onControl || !device.online) return;

    try {
      await onControl(device.id, [
        { code: code, value: !currentValue }
      ]);
    } catch (error) {
      console.error(`❌ Chyba při přepínání ${code}:`, error);
    }
  };

  // Parsování SD storage (format: "total|used|free")
  const getStorageInfo = () => {
    if (!sdStorage) return null;
    const parts = sdStorage.split('|');
    if (parts.length !== 3) return null;
    
    const total = parseInt(parts[0]);
    const used = parseInt(parts[1]);
    
    if (total === 0) return null;
    
    const usedPercent = Math.round((used / total) * 100);
    const totalGB = (total / 1024).toFixed(1);
    
    return { total: totalGB, used: usedPercent };
  };

  const storageInfo = getStorageInfo();

  return (
    <div
      className={`tuya-device-card ptz-camera ${
        device.online ? 'online' : 'offline'
      } size-${cardSize} layout-${cardLayout}`}
    >
      {/* Header */}
      <div className="tuya-card-header">
        <div className="device-info">
          <span className="device-icon">📹</span>
          <div className="device-names">
            <h3 className="device-name">{device.customName || device.name}</h3>
            <span className="device-category">PTZ Kamera</span>
          </div>
        </div>

        <div className="device-status-indicator">
          <div className="status-badges">
            {recordSwitch && (
              <span className="recording-badge" title="Nahrávání aktivní">
                🔴 REC
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

      {/* Body */}
      <div className="tuya-card-body ptz-camera-body">
        {/* Camera Preview Placeholder */}
        <div className="camera-preview-wrapper">
          <div className="camera-placeholder">
            <span className="placeholder-icon">📹</span>
            <span className="placeholder-text">Live stream není dostupný</span>
            <span className="placeholder-hint">
              Vyžaduje Tuya Video API předplatné
            </span>
          </div>

          {/* Status overlay */}
          {motionTracking && (
            <div className="tracking-badge">
              <span className="tracking-icon">👁️</span>
              <span className="tracking-text">Auto-tracking</span>
            </div>
          )}
        </div>

        {/* PTZ Controls */}
        <div className="ptz-controls-section">
          <div className="section-title">🎮 PTZ Ovládání</div>
          
          <div className="ptz-joystick">
            {/* Horní tlačítka */}
            <button
              className="ptz-btn ptz-up-left"
              onClick={() => handlePTZ(PTZ_COMMANDS.UP_LEFT)}
              disabled={!device.online || isPtzActive}
              title="Nahoru vlevo"
            >
              ↖️
            </button>
            <button
              className="ptz-btn ptz-up"
              onClick={() => handlePTZ(PTZ_COMMANDS.UP)}
              disabled={!device.online || isPtzActive}
              title="Nahoru"
            >
              ⬆️
            </button>
            <button
              className="ptz-btn ptz-up-right"
              onClick={() => handlePTZ(PTZ_COMMANDS.UP_RIGHT)}
              disabled={!device.online || isPtzActive}
              title="Nahoru vpravo"
            >
              ↗️
            </button>

            {/* Střední tlačítka */}
            <button
              className="ptz-btn ptz-left"
              onClick={() => handlePTZ(PTZ_COMMANDS.LEFT)}
              disabled={!device.online || isPtzActive}
              title="Doleva"
            >
              ⬅️
            </button>
            <div className="ptz-center">
              {isPtzActive ? '🎯' : '📹'}
            </div>
            <button
              className="ptz-btn ptz-right"
              onClick={() => handlePTZ(PTZ_COMMANDS.RIGHT)}
              disabled={!device.online || isPtzActive}
              title="Doprava"
            >
              ➡️
            </button>

            {/* Dolní tlačítka */}
            <button
              className="ptz-btn ptz-down-left"
              onClick={() => handlePTZ(PTZ_COMMANDS.DOWN_LEFT)}
              disabled={!device.online || isPtzActive}
              title="Dolů vlevo"
            >
              ↙️
            </button>
            <button
              className="ptz-btn ptz-down"
              onClick={() => handlePTZ(PTZ_COMMANDS.DOWN)}
              disabled={!device.online || isPtzActive}
              title="Dolů"
            >
              ⬇️
            </button>
            <button
              className="ptz-btn ptz-down-right"
              onClick={() => handlePTZ(PTZ_COMMANDS.DOWN_RIGHT)}
              disabled={!device.online || isPtzActive}
              title="Dolů vpravo"
            >
              ↘️
            </button>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="quick-actions-section">
          <div className="section-title">⚡ Rychlé akce</div>
          
          <div className="action-buttons">
            {/* Reflektor */}
            <button
              className={`action-btn ${floodlightSwitch ? 'active' : ''}`}
              onClick={() => handleToggle('floodlight_switch', floodlightSwitch)}
              disabled={!device.online}
              title="Reflektor"
            >
              <span className="action-icon">💡</span>
              <span className="action-label">Světlo</span>
            </button>

            {/* Siréna */}
            <button
              className={`action-btn ${sirenSwitch ? 'active' : ''}`}
              onClick={() => handleToggle('siren_switch', sirenSwitch)}
              disabled={!device.online}
              title="Siréna"
            >
              <span className="action-icon">🚨</span>
              <span className="action-label">Siréna</span>
            </button>

            {/* Noční vidění - zobrazí jako info, ne tlačítko */}
            <div className="action-info" title={`Noční vidění: ${nightvisionMode}`}>
              <span className="action-icon">🌙</span>
              <span className="action-label">
                {nightvisionMode === 'auto' ? 'Auto' : nightvisionMode === 'on' ? 'Zapnuto' : 'Vypnuto'}
              </span>
            </div>
          </div>
        </div>

        {/* Status Info */}
        <div className="camera-info-section">
          {/* Motion Detection */}
          <div className="info-row">
            <span className="info-label">Detekce pohybu:</span>
            <span className={`info-value ${motionSwitch ? 'active-text' : ''}`}>
              {motionSwitch ? '✅ Aktivní' : '❌ Vypnuto'}
            </span>
          </div>

          {/* SD Card Storage */}
          {storageInfo && (
            <div className="info-row">
              <span className="info-label">SD karta:</span>
              <span className="info-value">
                {storageInfo.used}% ({storageInfo.total} GB)
              </span>
            </div>
          )}

          {/* Recording Status */}
          <div className="info-row">
            <span className="info-label">Nahrávání:</span>
            <span className={`info-value ${recordSwitch ? 'recording-text' : ''}`}>
              {recordSwitch ? '🔴 Aktivní' : '⚪ Vypnuto'}
            </span>
          </div>

          {/* Info poznámka */}
          <div className="info-row note">
            <span className="note-icon">ℹ️</span>
            <span className="note-text">
              Live stream a snímky vyžadují Tuya Video API předplatné
            </span>
          </div>
        </div>
      </div>

      {/* Debug Section */}
      <DebugSection device={device} isVisible={isDebugVisible} />
    </div>
  );
};

export default PTZCameraCard;
