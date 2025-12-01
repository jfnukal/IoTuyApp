// src/tuya/components/modals/DeviceDetailModal.tsx
import React, { useState } from 'react';
import { useRooms } from '../../hooks/useRooms';
import type { TuyaDevice } from '../../../types';
import { getCategoryLabel, getCardIcon } from '../../utils/deviceHelpers';
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

  // 🆕 Stavy pro nastavení karty
  const [showName, setShowName] = useState<boolean>(
    device.cardSettings?.showName ?? true
  );
  const [showCustomName, setShowCustomName] = useState<boolean>(
    device.cardSettings?.showCustomName ?? true
  );
  const [hiddenCard, setHiddenCard] = useState<boolean>(
    device.cardSettings?.hidden ?? false
  );

  // useEffect pro načítání zařízení je SMAZÁN, už ho máme v props.

  // 1. Handler pro uložení
  const handleSave = async () => {
    const oldRoomId = device.roomId;
    const newRoomId = selectedRoomId;

    setIsSaving(true);
    setError(null);

    try {
      // Ulož nastavení karty
      const newCardSettings = {
        ...device.cardSettings,
        showName,
        showCustomName,
        hidden: hiddenCard,
      };
      
      await firestoreService.updateDevice(device.id, {
        cardSettings: newCardSettings,
      });

      // Pokud se změnila místnost, aktualizuj ji
      if (oldRoomId !== newRoomId) {
        await assignDeviceToRoom(device.id, newRoomId, oldRoomId);
      }

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
              <span className="device-icon">{getCardIcon(device.category)}</span>
              <div className="device-names">
                <h3>{device.customName || device.name}</h3>
                <p className="device-category-label">{getCategoryLabel(device.category)}</p>
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

            {/* 🆕 Nastavení zobrazení */}
            <div className="form-group settings-group">
              <label className="settings-label">Nastavení zobrazení:</label>
              
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={showName}
                  onChange={(e) => setShowName(e.target.checked)}
                  disabled={isSaving}
                />
                <span>Zobrazovat název ({device.name})</span>
              </label>

              {device.customName && (
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={showCustomName}
                    onChange={(e) => setShowCustomName(e.target.checked)}
                    disabled={isSaving}
                  />
                  <span>Zobrazovat vlastní název ({device.customName})</span>
                </label>
              )}

              <label className="checkbox-label checkbox-danger">
                <input
                  type="checkbox"
                  checked={hiddenCard}
                  onChange={(e) => setHiddenCard(e.target.checked)}
                  disabled={isSaving}
                />
                <span>🙈 Skrýt kartu v gridu/listu</span>
              </label>
            </div>

            <div className="form-actions">
              <button
                type="submit"
                className="btn-primary"
                disabled={isSaving}
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
