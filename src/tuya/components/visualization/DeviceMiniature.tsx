// src/tuya/components/visualization/DeviceMiniature.tsx
import React from 'react';
import type { TuyaDevice } from '../../../types';
// PŘIDÁN import pro getDeviceCardType
import { getCardIcon, getDeviceCardType } from '../../utils/deviceHelpers';
import './DeviceMiniature.css';

interface DeviceMiniatureProps {
  device: TuyaDevice;
  onClick: (device: TuyaDevice) => void;
}

const DeviceMiniature: React.FC<DeviceMiniatureProps> = ({
  device,
  onClick,
}) => {
  // ❌ Lokální funkce getCategoryIcon byla odstraněna, používáme centrální z deviceHelpers

  // Získáme typ karty (např. 'wk' -> 'heating')
  const cardType = getDeviceCardType(device.category);
  // Získáme ikonu pro daný typ
  const icon = device.customIcon || getCardIcon(cardType);

  return (
    <div
      className={`device-miniature ${device.online ? 'online' : 'offline'} ${
        device.position ? 'placed' : 'unplaced'
      }`}
      draggable={true}
      onDragStart={(e) => {
        e.dataTransfer.setData('deviceId', device.id);
        e.dataTransfer.setData('deviceName', device.customName || device.name);
        e.dataTransfer.effectAllowed = 'move';
      }}
      onClick={() => onClick(device)}
      title={`${device.customName || device.name} - ${
        device.online ? 'Online' : 'Offline'
      }`}
    >
      {/* Ikona zařízení */}
      <div className="miniature-icon">
        {icon}
      </div>

      {/* Status indikátor */}
      <div
        className={`miniature-status ${device.online ? 'online' : 'offline'}`}
      >
        <span className="status-dot"></span>
      </div>

      {/* Název zařízení */}
      <div className="miniature-name">{device.customName || device.name}</div>

      {/* Indikátor umístění */}
      {device.position && (
        <div
          className="miniature-placed-indicator"
          title="Umístěno na půdorysu"
        >
          ✓
        </div>
      )}
    </div>
  );
};

export default DeviceMiniature;