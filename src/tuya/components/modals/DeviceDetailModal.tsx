// src/tuya/components/modals/DeviceDetailModal.tsx
import React, { useState } from 'react';
import { useRooms } from '../../hooks/useRooms';
// import { useTuya } from '../../hooks/useTuya'; // <-- SMAZÁNO
import type { TuyaDevice } from '../../../types';
import './DeviceDetailModal.css';
import { firestoreService } from '../../../services/firestoreService';

interface DeviceDetailModalProps {
  device: TuyaDevice; // <-- ZMĚNA: Přijímáme celý objekt
  onClose: () => void;
}

const DeviceDetailModal: React.FC<DeviceDetailModalProps> = ({
  device,
  onClose,
}) => {
  // useRooms zde necháme, seznam místností potřebujeme
  const { rooms, isLoading: roomsLoading } = useRooms();

  // Funkce, které budeme implementovat v dalším kroku
  const { assignDeviceToRoom } = useRooms();

  // Stavy jsou nyní jednoduché
  const [selectedRoomId, setSelectedRoomId] = useState<string>(
    device.roomId || ''
  );
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // useEffect pro načítání zařízení je SMAZÁN, už ho máme v props.

  // 1. Handler pro uložení
  const handleSave = async () => {
    const oldRoomId = device.roomId;
    const newRoomId = selectedRoomId;

    if (oldRoomId === newRoomId) {
      onClose();
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      await assignDeviceToRoom(device.id, newRoomId, oldRoomId);
      onClose();
    } catch (err: any) {
      console.error(err);
      setError('Nepodařilo se uložit změny.');
    } finally {
      setIsSaving(false);
    }
  };

  // 2. Handler pro odebrání
  const handleRemove = async () => {
    if (!device.roomId) return;

    setIsSaving(true);
    setError(null);

    try {
      // Odebrání je jen "přiřazení" do místnosti 'null'
      await assignDeviceToRoom(device.id, null, device.roomId);
      onClose();
    } catch (err: any) {
      // TADY BYLA CHYBA (chyběly složené závorky)
      console.error(err);
      setError('Nepodařilo se odebrat zařízení z místnosti.');
    } finally {
      setIsSaving(false);
    }
  };

  // Bloky pro isLoading a error jsou pryč, protože device máme hned.

  return (
    <div className="device-modal-overlay" onClick={onClose}>
      <div className="device-modal" onClick={(e) => e.stopPropagation()}>
        <div className="device-modal-header">
          <h2>Přiřadit zařízení</h2>
          <button className="close-btn" onClick={onClose} disabled={isSaving}>
            ✕
          </button>
        </div>

        <div className="device-modal-body">
          {error && <div className="error-message">{error}</div>}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSave();
            }}
          >
            <div className="device-info-header">
              <span className="device-icon">🔌</span>{' '}
              {/* TODO: Ikona kategorie */}
              <div className="device-names">
                <h3>{device.customName || device.name}</h3>
                <p>{device.category}</p>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="room-select">Přiřadit do místnosti:</label>
              <select
                id="room-select"
                value={selectedRoomId}
                onChange={(e) => setSelectedRoomId(e.target.value)}
                disabled={isSaving}
              >
                <option value="">-- Nezařazeno --</option>
                {roomsLoading && <option disabled>Načítám místnosti...</option>}
                {!roomsLoading && rooms.length === 0 && (
                  <option disabled>Žádné místnosti nebyly nalezeny...</option>
                )}
                {rooms.map((room) => (
                  <option key={room.id} value={room.id}>
                    {room.icon} {room.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-actions">
              <button
                type="submit"
                className="btn-primary"
                disabled={isSaving || (device.roomId || '') === selectedRoomId}
              >
                {isSaving ? 'Ukládám...' : '💾 Uložit'}
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={onClose}
                disabled={isSaving}
              >
                Zrušit
              </button>
            </div>
          </form>

          {(device.roomId || device.position) && (
  <div className="form-actions-danger">
    {device.roomId && (
      <button
        type="button"
        className="btn-danger"
        onClick={handleRemove}
        disabled={isSaving}
      >
        🗑️ Odebrat z místnosti
      </button>
    )}
    {device.position && (
      <button
        type="button"
        className="btn-danger"
        onClick={async () => {
          if (window.confirm('Odebrat zařízení z půdorysu?')) {
            setIsSaving(true);
            try {
              await firestoreService.updateDevicePosition(device.id, null as any);
              onClose();
            } catch (err) {
              console.error('Chyba při odebírání pozice:', err);
              setError('Nepodařilo se odebrat zařízení z půdorysu');
            } finally {
              setIsSaving(false);
            }
          }
        }}
        disabled={isSaving}
      >
        📍 Odebrat z půdorysu
      </button>
    )}
  </div>
)}
        </div>
      </div>
    </div>
  );
};

export default DeviceDetailModal;
