// src/tuya/components/rooms/RoomManager.tsx
import React, { useState } from 'react';
import { useRooms } from '../../hooks/useRooms';
import { useTuya } from '../../hooks/useTuya';
import RoomModal from './RoomModal';
import RoomCard from './RoomCard';
import type { Room } from '../../../types';
import './RoomManager.css';

const RoomManager: React.FC = () => {
  const { rooms, isLoading, error, deleteRoom } = useRooms();
  const { devices } = useTuya();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Filtrování místností podle hledání
  const filteredRooms = rooms.filter(
    (room) =>
      room.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      room.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Získej zařízení pro místnost
  const getDevicesForRoom = (roomId: string) => {
    return devices.filter((device) => device.roomId === roomId);
  };

  const handleCreateRoom = () => {
    setEditingRoom(null);
    setIsModalOpen(true);
  };

  const handleEditRoom = (room: Room) => {
    setEditingRoom(room);
    setIsModalOpen(true);
  };

  const handleDeleteRoom = async (room: Room) => {
    if (room.isDefault) {
      alert('Nelze smazat výchozí místnost!');
      return;
    }

    const deviceCount = room.devices.length;
    const confirmMessage =
      deviceCount > 0
        ? `Opravdu chcete smazat místnost "${room.name}"?\n\nObsahuje ${deviceCount} zařízení, která budou odebrána z místnosti.`
        : `Opravdu chcete smazat místnost "${room.name}"?`;

    if (window.confirm(confirmMessage)) {
      try {
        await deleteRoom(room.id);
        console.log('✅ Místnost smazána');
      } catch (err) {
        alert('Nepodařilo se smazat místnost');
      }
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingRoom(null);
  };

  if (isLoading) {
    return (
      <div className="room-manager loading">
        <div className="loading-state">
          <p>Načítám místnosti...</p>
        </div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="room-manager error">
        <div className="error-state">
          <div className="error-icon">⚠️</div>
          <h3>Chyba při načítání místností</h3>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="room-manager">
      {/* Header */}
      <div className="room-manager-header">
        <div className="header-left">
          <h2>🏠 Místnosti</h2>
          <span className="room-count">{rooms.length} místností</span>
        </div>

        <button className="create-room-btn" onClick={handleCreateRoom}>
          ➕ Přidat místnost
        </button>
      </div>

      {/* Vyhledávání */}
      <div className="room-search">
        <input
          type="text"
          placeholder="🔍 Hledat místnost..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="search-input"
        />
      </div>

      {/* Seznam místností */}
      <div className="rooms-grid">
        {filteredRooms.length === 0 ? (
          <div className="no-rooms">
            <div className="no-rooms-icon">🏠</div>
            <h3>
              {searchQuery
                ? 'Žádné místnosti nenalezeny'
                : 'Zatím nemáte žádné místnosti'}
            </h3>
            <p>
              {searchQuery
                ? 'Zkuste změnit hledaný výraz'
                : 'Vytvořte svou první místnost pro lepší organizaci zařízení'}
            </p>
            {!searchQuery && (
              <button
                className="create-room-btn-large"
                onClick={handleCreateRoom}
              >
                ➕ Vytvořit místnost
              </button>
            )}
          </div>
        ) : (
          filteredRooms.map((room) => (
            <RoomCard
              key={room.id}
              room={room}
              devices={getDevicesForRoom(room.id)}
              onEdit={() => handleEditRoom(room)}
              onDelete={() => handleDeleteRoom(room)}
            />
          ))
        )}
      </div>

      {/* Modální okno pro vytvoření/editaci */}
      {isModalOpen && (
        <RoomModal room={editingRoom} onClose={handleCloseModal} />
      )}
    </div>
  );
};

export default RoomManager;
