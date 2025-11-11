// src/tuya/components/cards/DoorbellCard.tsx
import React from 'react';
import './DoorbellCard.css';
import type { DeviceCardProps } from '../../../types';
import { getStatusValue, getDoorbellSnapshotUrl } from '../../utils/deviceHelpers';
import DebugSection from './DebugSection';
import { tuyaService } from '../../services/tuyaService';

const DoorbellCard: React.FC<DeviceCardProps & { isDebugVisible?: boolean }> = ({ 
  device, 
  onControl: _onControl, 
  isDebugVisible = false 
}) => {
  // 🎨 Zjisti nastavení karty
  const cardSize = device.cardSettings?.size || 'medium';
  const cardLayout = device.cardSettings?.layout || 'default';

// Získej status hodnoty
const doorbell_active = getStatusValue(device.status, 'doorbell_active');
const battery = getStatusValue(device.status, 'battery_percentage') || 
                getStatusValue(device.status, 'wireless_electricity'); // Fallback na wireless_electricity
const rawSnapshotUrl = getDoorbellSnapshotUrl(device.status);
const snapshot_url = rawSnapshotUrl ? tuyaService.getProxiedImageUrl(rawSnapshotUrl) : undefined;
const last_ring_time = getStatusValue(device.status, 'doorbell_ring');

  // 🔍 DEBUG - vypíšeme všechna data ze zvonku
  React.useEffect(() => {
    console.log('🔔 DOORBELL DEBUG:', {
      deviceId: device.id,
      deviceName: device.name,
      category: device.category,
      productId: device.product_id,
      hasStatus: !!device.status,
      statusLength: device.status?.length || 0,
      status: device.status,
      snapshot_url: snapshot_url,
      battery: battery,
      doorbell_active: doorbell_active,
      last_ring_time: last_ring_time,
    });
    // Extra debug pro snapshot
    if (snapshot_url) {
      console.log('✅ SNAPSHOT NALEZEN:', snapshot_url);
    } else {
      console.warn('⚠️ SNAPSHOT NENALEZEN - zkontroluj movement_detect_pic');
    }
  }, [device.status, snapshot_url]);

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
        <div className="doorbell-preview-wrapper">
          {snapshot_url ? (
            <img 
              src={snapshot_url}
              alt="Poslední snímek ze zvonku" 
              className="doorbell-snapshot"
            />
          ) : (
            <div className="doorbell-placeholder">
              <span className="placeholder-icon">📷</span>
              <span className="placeholder-text">Čekám na první zvonění</span>
              <span className="placeholder-hint">
                Snímek se vytvoří automaticky při zazvonění
              </span>
            </div>
          )}
          
          {/* Badge - pouze informační */}
          {doorbell_active && (
            <div className="ringing-badge">
              <span className="ring-icon">🔔</span>
              <span className="ring-text">Zvoní!</span>
            </div>
          )}
        </div>

        {/* Status sekce */}
        <div className="doorbell-info-section">
          {/* Online/Offline status */}
          <div className="info-row">
            <span className="info-label">Stav:</span>
            <span className={`info-value ${device.online ? 'online-text' : 'offline-text'}`}>
              {device.online ? '✅ Online' : '⚠️ Offline'}
            </span>
          </div>

          {/* Poslední zvonění */}
          {last_ring_time && (
            <div className="info-row">
              <span className="info-label">Poslední zvonění:</span>
              <span className="info-value">
                {new Date(last_ring_time).toLocaleString('cs-CZ')}
              </span>
            </div>
          )}

          {/* Live stream upozornění */}
          <div className="info-row note">
            <span className="note-icon">ℹ️</span>
            <span className="note-text">
              Live stream vyžaduje Tuya Video API předplatné
            </span>
          </div>
        </div>
      </div>

      {/* Debug Section */}
      <DebugSection device={device} isVisible={isDebugVisible} />
    </div>
  );
};

export default DoorbellCard;
