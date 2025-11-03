// src/tuya/components/rooms/RoomCard.tsx
import React from 'react';
import type { Room, TuyaDevice } from '../../../types';
import './RoomCard.css';

interface RoomCardProps {
  room: Room;
  devices: TuyaDevice[];
  onEdit: () => void;
  onDelete: () => void;
}

const RoomCard: React.FC<RoomCardProps> = ({
  room,
  devices,
  onEdit,
  onDelete,
}) => {
  const deviceCount = devices.length;
  const onlineCount = devices.filter(d => d.online).length;

  return (
    <div className="room-card" style={{ '--room-color': room.color } as React.CSSProperties}>
      {/* Header */}
      <div className="room-card-header">
        <div className="room-icon-name">
          <span className="room-icon-large">{room.icon || '🏠'}</span>
          <div className="room-info">
            <h3 className="room-name">{room.name}</h3>
            {room.type && (
              <span className="room-type-badge">{getRoomTypeLabel(room.type)}</span>
            )}
          </div>
        </div>

        {room.isDefault && (
          <span className="default-badge" title="Výchozí místnost">⭐</span>
        )}
      </div>

      {/* Popis */}
      {room.description && (
        <p className="room-description">{room.description}</p>
      )}

      {/* Statistiky */}
      <div className="room-stats">
        <div className="stat">
          <span className="stat-icon">📱</span>
          <span className="stat-label">Zařízení:</span>
          <span className="stat-value">{deviceCount}</span>
        </div>
        <div className="stat">
          <span className="stat-icon">🟢</span>
          <span className="stat-label">Online:</span>
          <span className="stat-value">{onlineCount}/{deviceCount}</span>
        </div>
      </div>

      {/* Zařízení preview */}
      {deviceCount > 0 && (
        <div className="room-devices-preview">
          {devices.slice(0, 3).map(device => (
            <div key={device.id} className="device-preview-item" title={device.name}>
              <span className={`device-status-dot ${device.online ? 'online' : 'offline'}`}></span>
              <span className="device-preview-name">{device.customName || device.name}</span>
            </div>
          ))}
          {deviceCount > 3 && (
            <div className="device-preview-more">+{deviceCount - 3} dalších</div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="room-card-actions">
        <button className="action-btn edit-btn" onClick={onEdit} title="Upravit">
          ✏️ Upravit
        </button>
        {!room.isDefault && (
          <button className="action-btn delete-btn" onClick={onDelete} title="Smazat">
            🗑️ Smazat
          </button>
        )}
      </div>
    </div>
  );
};

// Helper funkce pro popisky typů
function getRoomTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    'living-room': 'Obývák',
    'bedroom': 'Ložnice',
    'kitchen': 'Kuchyň',
    'bathroom': 'Koupelna',
    'hallway': 'Chodba',
    'toilet': 'WC',
    'garage': 'Garáž',
    'cellar': 'Sklep',
    'garden': 'Zahrada',
    'office': 'Pracovna',
    'kids-room': 'Dětský pokoj',
    'storage': 'Komora',
    'other': 'Ostatní',
  };
  return labels[type] || type;
}

export default RoomCard;