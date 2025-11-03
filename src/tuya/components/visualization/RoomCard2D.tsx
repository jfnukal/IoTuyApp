// src/components/visualization/RoomCard2D.tsx
import React from 'react';
import type { Room } from '../../../types/index';
import type { TuyaDevice } from '../../../types';
import './RoomCard2D.css';

interface RoomCard2DProps {
  room: Room;
  devices: TuyaDevice[];
  onClick?: () => void;
  onDeviceClick?: (deviceId: string) => void;
  onDeviceDrop?: (deviceId: string, roomId: string) => void; 
  isSelected?: boolean;
}

const RoomCard2D: React.FC<RoomCard2DProps> = ({
  room,
  devices,
  onClick,
  onDeviceClick,
  onDeviceDrop,  
  isSelected = false,
}) => {
  // Spočítej statistiky
  const deviceCount = devices.length;
  const onlineCount = devices.filter((d) => d.online).length;
  const activeCount = devices.filter((d) => {
    const switchStatus = d.status?.find((s) => s.code === 'switch_1');
    return switchStatus?.value === true;
  }).length;

  // Ikona podle typu místnosti
  const getRoomIcon = () => {
    return room.icon || '🏠';
  };

  // Default hodnoty pro optional fields
  const position = room.position || { x: 0, y: 0 };
  const size = room.size || { width: 100, height: 100 };
  const color = room.color || '#667eea';

  return (
    <div
      className={`room-card-2d ${isSelected ? 'selected' : ''}`}
      style={{
        '--room-color': color,
        left: `${position.x}%`,
        top: `${position.y}%`,
        width: `${size.width}%`,
        height: `${size.height}%`,
  } as React.CSSProperties}
  onClick={onClick}
  onDragOver={(e) => {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.classList.add('drag-over');
  }}
  onDragLeave={(e) => {
    e.currentTarget.classList.remove('drag-over');
  }}
  onDrop={(e) => {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.classList.remove('drag-over');
    
    const deviceId = e.dataTransfer.getData('deviceId');
    const deviceName = e.dataTransfer.getData('deviceName');
    
    console.log('📦 Dropnuto:', deviceName, '(ID:', deviceId, ') do:', room.name);
    onDeviceDrop?.(deviceId, room.id); 
  }}
>
      {/* Header místnosti */}
      <div className="room-header">
        <span className="room-icon">{getRoomIcon()}</span>
        <span className="room-name">{room.name}</span>
      </div>

      {/* Zařízení v místnosti */}
      {deviceCount > 0 && (
        <div className="room-devices">
          {devices.slice(0, 4).map((device) => {
            const switchStatus = device.status?.find((s) => s.code === 'switch_1');
            const isOn = switchStatus?.value === true;

            return (
              <div
                key={device.id}
                className={`device-indicator ${isOn ? 'on' : 'off'} ${
                  device.online ? 'online' : 'offline'
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  onDeviceClick?.(device.id);
                }}
                title={device.name}
              >
                {getDeviceIcon(device.category)}
              </div>
            );
          })}
          {deviceCount > 4 && (
            <div className="device-indicator more">+{deviceCount - 4}</div>
          )}
        </div>
      )}

      {/* Statistiky */}
      <div className="room-stats">
        <div className="stat">
          <span className="stat-icon">📱</span>
          <span className="stat-value">{deviceCount}</span>
        </div>
        <div className="stat">
          <span className="stat-icon">🟢</span>
          <span className="stat-value">{onlineCount}</span>
        </div>
        {activeCount > 0 && (
          <div className="stat active">
            <span className="stat-icon">⚡</span>
            <span className="stat-value">{activeCount}</span>
          </div>
        )}
      </div>

      {/* Empty state */}
      {deviceCount === 0 && (
        <div className="room-empty">
          <span className="empty-icon">📦</span>
          <span className="empty-text">Žádná zařízení</span>
        </div>
      )}
    </div>
  );
};

// Helper funkce pro ikony zařízení
function getDeviceIcon(category: string): string {
  switch (category) {
    case 'switch':
      return '🔌';
    case 'light':
      return '💡';
    case 'sensor':
      return '📡';
    case 'climate':
      return '❄️';
    case 'security':
      return '🔒';
    case 'cover':
      return '🪟';
    case 'garden':
      return '🌱';
    default:
      return '⚙️';
  }
}

export default RoomCard2D;
