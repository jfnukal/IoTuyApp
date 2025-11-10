// src/tuya/components/cards/DoorbellCard.tsx
import React, { useState } from 'react';
import './DoorbellCard.css';
import type { DeviceCardProps } from '../../../types';
import { getStatusValue } from '../../utils/deviceHelpers';
import DebugSection from './DebugSection';

const DoorbellCard: React.FC<DeviceCardProps & { isDebugVisible?: boolean }> = ({ 
  device, 
  onControl: _onControl, 
  isDebugVisible = false 
}) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<number>(Date.now());

  // 🎨 Zjisti nastavení karty
  const cardSize = device.cardSettings?.size || 'medium';
  const cardLayout = device.cardSettings?.layout || 'default';

  // Získej status hodnoty
  const doorbell_active = getStatusValue(device.status, 'doorbell_active');
  const battery = getStatusValue(device.status, 'battery_percentage');
  const snapshot_url = getStatusValue(device.status, 'snapshot_url');

  // Funkce pro obnovení snímku
  const handleRefreshSnapshot = async () => {
    if (!device.online) return;

    setIsRefreshing(true);
    try {
      // Simulace načítání (v reálu by se volalo API pro nový snapshot)
      await new Promise(resolve => setTimeout(resolve, 1000));
      setLastRefresh(Date.now());
      console.log('✅ Snapshot obnoven');
    } catch (error) {
      console.error('❌ Chyba při obnovení snapshotu:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div
      className={`tuya-device-card doorbell ${
        device.online ? 'online' : 'offline'
      } size-${cardSize} layout-${cardLayout}`}
    >
      {/* Header */}
      <div className="tuya-card-header">
        <div className="device-info">
          <span className="device-icon">🔔</span>
          <div className="device-names">
            <h3 className="device-name">{device.customName || device.name}</h3>
            <span className="device-category">Video Zvonek</span>
          </div>
        </div>

        <div className="device-status-indicator">
          <div className="status-badges">
            {battery !== undefined && (
              <span className="battery-badge" title={`Baterie: ${battery}%`}>
                🔋 {battery}%
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
      <div className="tuya-card-body doorbell-body">
        {/* Snapshot Preview */}
        <div className="doorbell-preview">
          {snapshot_url ? (
            <img 
              src={`${snapshot_url}?t=${lastRefresh}`}
              alt="Poslední snímek" 
              className="doorbell-snapshot"
            />
          ) : (
            <div className="doorbell-placeholder">
              <span className="placeholder-icon">📷</span>
              <span className="placeholder-text">Žádný snímek</span>
              <span className="placeholder-hint">
                Snímek se vytvoří při zazvonění
              </span>
            </div>
          )}
          
          {/* Overlay s tlačítky */}
          <div className="doorbell-overlay">
            <button
              className="refresh-button"
              onClick={handleRefreshSnapshot}
              disabled={!device.online || isRefreshing}
              title="Obnovit snímek"
            >
              {isRefreshing ? (
                <>
                  <span className="loading-spinner"></span>
                  <span>Načítám...</span>
                </>
              ) : (
                <>
                  <span className="button-icon">🔄</span>
                  <span>Obnovit snímek</span>
                </>
              )}
            </button>
            
            {/* Info badge - Live stream není dostupný */}
            <div className="stream-info-badge">
              <span className="info-icon">ℹ️</span>
              <span className="info-text">
                Live stream vyžaduje Tuya Video API předplatné
              </span>
            </div>
          </div>
        </div>

        {/* Status indikátory */}
        <div className="doorbell-status">
          {doorbell_active && (
            <div className="status-item active">
              <span className="status-icon">🔔</span>
              <span className="status-text">Zvoní!</span>
            </div>
          )}
          
          {!device.online && (
            <div className="status-item offline">
              <span className="status-icon">⚠️</span>
              <span className="status-text">Offline</span>
            </div>
          )}

          {snapshot_url && (
            <div className="status-item info">
              <span className="status-icon">📸</span>
              <span className="status-text">
                Poslední snímek: {new Date(lastRefresh).toLocaleTimeString('cs-CZ')}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Debug Section */}
      <DebugSection device={device} isVisible={isDebugVisible} />
    </div>
  );
};

export default DoorbellCard;
