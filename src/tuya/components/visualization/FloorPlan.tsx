// src/components/visualization/FloorPlan.tsx
import React, { useState, useEffect } from 'react';
import RoomCard2D from './RoomCard2D';
import type { Room } from '../../../types/index';
import type { Floor } from '../../../types/visualization';
import type { TuyaDevice } from '../../../types';
import { houseService } from '../../services/houseService';
// import FloorPlan1NP from '../visualization/FloorPlan1NP';
import './FloorPlan.css';

interface FloorPlanProps {
  floor: Floor;
  allDevices: TuyaDevice[];
  onRoomClick?: (room: Room) => void;
  onDeviceClick?: (deviceId: string) => void;
  onDeviceDrop?: (deviceId: string, roomId: string) => void;
  selectedRoomId?: string;
}

const FloorPlan: React.FC<FloorPlanProps> = ({
  floor,
  allDevices,
  onRoomClick,
  onDeviceClick,
  onDeviceDrop,
  selectedRoomId,
}) => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Načti místnosti patra
  useEffect(() => {
    const loadRooms = async () => {
      try {
        setIsLoading(true);
        const loadedRooms: Room[] = [];

        for (const roomId of floor.rooms) {
          const room = await houseService.getRoom(roomId);
          if (room) {
            loadedRooms.push(room);
          }
        }

        setRooms(loadedRooms);
      } catch (error) {
        console.error('❌ Chyba při načítání místností:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadRooms();
  }, [floor]);

  // Získej zařízení pro konkrétní místnost
  const getDevicesForRoom = (room: Room): TuyaDevice[] => {
    return allDevices.filter((device) => room.devices.includes(device.id));
  };

  if (isLoading) {
    return (
<div className="floor-plan loading">
  <div className="spinner-mini"></div>
  <p>Načítám patro...</p>
</div>
    );
  }

  return (
    <div
      className="floor-plan"
      style={{ '--floor-color': floor.color } as React.CSSProperties}
    >
      {/* Header patra */}
      <div className="floor-header">
        <h3 className="floor-name">
          <span className="floor-icon">
            {floor.level === -1 ? '⬇️' : floor.level === 0 ? '🏠' : '⬆️'}
          </span>
          {floor.name}
        </h3>
        <div className="floor-stats">
          <span className="stat-badge">🚪 {rooms.length} místností</span>
          <span className="stat-badge">📱 {allDevices.length} zařízení</span>
        </div>
      </div>

      {/* Půdorys */}
      <div className="floor-canvas">
        {rooms.length === 0 ? (
          <div className="empty-floor">
            <span className="empty-icon">📦</span>
            <p>Toto patro nemá žádné místnosti</p>
          </div>
        ) : (
          rooms.map((room) => (
            <RoomCard2D
              key={room.id}
              room={room}
              devices={getDevicesForRoom(room)}
              onClick={() => onRoomClick?.(room)}
              onDeviceClick={onDeviceClick}
              onDeviceDrop={onDeviceDrop}
              isSelected={room.id === selectedRoomId}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default FloorPlan;
