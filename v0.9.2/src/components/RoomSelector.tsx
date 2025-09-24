import React, { useState } from 'react';
import { useRooms } from '../hooks/useRooms';
import type { Room } from '../types';

interface RoomSelectorProps {
  onCreateRoom?: () => void;
}

export const RoomSelector: React.FC<RoomSelectorProps> = ({ onCreateRoom }) => {
  const {
    rooms,
    selectedRoomId,
    setSelectedRoomId,
    loading,
    error,
    createRoom,
    deleteRoom,
  } = useRooms();

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const handleCreateRoom = async () => {
    if (!newRoomName.trim()) return;

    try {
      setIsCreating(true);
      const roomData: Omit<Room, 'id' | 'owner' | 'createdAt' | 'updatedAt'> = {
        name: newRoomName.trim(),
        description: '',
        devices: [],
        color: '#007bff',
        icon: '🏠',
        isDefault: false,
      };

      await createRoom(roomData);

      setNewRoomName('');
      setShowCreateForm(false);
      onCreateRoom?.();
    } catch (err) {
      console.error('Error creating room:', err);
    } finally {
      setIsCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="room-selector loading">
        <span>Načítám místnosti...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="room-selector error">
        <span>Chyba: {error}</span>
      </div>
    );
  }

  return (
    <div className="room-tabs-container">
      <div className="room-tabs">
        {rooms.map((room) => (
          <button
            key={room.id}
            className={`room-tab ${selectedRoomId === room.id ? 'active' : ''}`}
            onClick={() => setSelectedRoomId(room.id)}
            title={room.description || room.name}
          >
            <span className="room-tab-icon">{room.icon || '🏠'}</span>
            <span className="room-tab-name">{room.name}</span>
            {room.devices && room.devices.length > 0 && (
              <span className="room-device-count">{room.devices.length}</span>
            )}
          </button>
        ))}

        {/* Tlačítko pro mazání aktuální místnosti */}
        {selectedRoomId && rooms.length > 1 && (
          <button
            className="room-tab delete-room"
            onClick={() => setShowDeleteModal(true)}
            title="Smazat aktuální místnost"
          >
            <div className="room-info">
              <span className="room-icon-modern danger">🗑️</span>
              <div className="room-details">
                <span className="room-name-modern">Smazat místnost</span>
                <span className="room-description">Aktuální místnost</span>
              </div>
            </div>
          </button>
        )}

        {/* Tlačítko pro vytvoření nové místnosti */}
        {!showCreateForm ? (
          <button
            className="room-tab create-room"
            onClick={() => setShowCreateForm(true)}
            title="Vytvořit novou místnost"
          >
            <div className="room-info">
              <span className="room-icon-modern create">➕</span>
              <div className="room-details">
                <span className="room-name-modern">Nová místnost</span>
                <span className="room-description">Klikněte pro vytvoření</span>
              </div>
            </div>
          </button>
        ) : (
          <div className="create-room-form-modern">
            <div className="form-header">
              <span className="form-icon">✨</span>
              <span className="form-title">Vytvořit místnost</span>
            </div>
            <div className="form-input-group">
              <input
                type="text"
                value={newRoomName}
                onChange={(e) => setNewRoomName(e.target.value)}
                placeholder="Název místnosti..."
                className="room-input-modern"
                disabled={isCreating}
                onKeyPress={(e) => e.key === 'Enter' && handleCreateRoom()}
              />
            </div>
            <div className="form-actions">
              <button
                onClick={() => {
                  setShowCreateForm(false);
                  setNewRoomName('');
                }}
                className="btn-form-cancel"
                disabled={isCreating}
              >
                Zrušit
              </button>
              <button
                onClick={handleCreateRoom}
                className="btn-form-create"
                disabled={isCreating || !newRoomName.trim()}
              >
                {isCreating ? (
                  <>
                    <span className="btn-loading-spinner"></span>
                    Vytvářím...
                  </>
                ) : (
                  <>
                    <span className="btn-icon">✓</span>
                    Vytvořit
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal pro mazání místnosti */}
      {showDeleteModal && (
        <div className="modal-overlay-modern">
          <div className="modal-modern">
            <div className="modal-header-modern">
              <h4 className="modal-title">
                <span className="modal-icon">⚠️</span>
                Smazat místnost
              </h4>
            </div>
            <div className="modal-body-modern">
              <p>
                Opravdu chcete smazat místnost "
                {rooms.find((r) => r.id === selectedRoomId)?.name}"?
              </p>
              <p className="modal-warning">
                Tato akce je nevratná. Všechna zařízení v této místnosti budou
                přesunuta do kategorie "Nepřiřazeno".
              </p>
            </div>
            <div className="modal-footer-modern">
              <button
                type="button"
                className="btn-modal-cancel"
                onClick={() => setShowDeleteModal(false)}
              >
                Zrušit
              </button>
              <button
                type="button"
                className="btn-modal-delete"
                onClick={async () => {
                  try {
                    await deleteRoom(selectedRoomId);
                    setShowDeleteModal(false);
                  } catch (error) {
                    console.error('Error deleting room:', error);
                  }
                }}
              >
                <span className="btn-icon">🗑️</span>
                Smazat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoomSelector;
