// src/tuya/components/cards/DoorbellCard.tsx
import React from 'react';
import './DoorbellCard.css';
import type { DeviceCardProps } from '../../../types';
import { getStatusValue } from '../../utils/deviceHelpers';
import DebugSection from './DebugSection';

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
  const battery = getStatusValue(device.status, 'battery_percentage');
  const snapshot_url = getStatusValue(device.status, 'snapshot_url');
  const last_ring_time = getStatusValue(device.status, 'doorbell_ring');

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
        {/* Snapshot Preview
