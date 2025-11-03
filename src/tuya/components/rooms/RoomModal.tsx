// src/tuya/components/rooms/RoomModal.tsx
import React, { useState } from 'react';
import { useRooms } from '../../hooks/useRooms';
import { useHouse } from '../../hooks/useHouse';
import { ROOM_CONFIGS } from '../../../types';
import type { Room, RoomType } from '../../../types';
import './RoomModal.css';

interface RoomModalProps {
  room?: Room | null; // Pokud je null = vytváříme novou místnost
  onClose: () => void;
}

const RoomModal: React.FC<RoomModalProps> = ({ room, onClose }) => {
  const { createRoom, updateRoom } = useRooms();
  const { floors, isLoading: floorsLoading } = useHouse();
  const isEditing = !!room;

  // Form state
  const [name, setName] = useState(room?.name || '');
  const [type, setType] = useState<RoomType>(room?.type || 'other');
  const [floorId, setFloorId] = useState(room?.floorId || '');
  const [description, setDescription] = useState(room?.description || '');
  const [icon, setIcon] = useState(room?.icon || '🏠');
  const [color, setColor] = useState(room?.color || '#667EEA');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Při změně typu místnosti, aktualizuj ikonu a barvu (pokud nejsou custom)
  const handleTypeChange = (newType: RoomType) => {
    setType(newType);

    // Aktualizuj ikonu a barvu jen pokud nevytváříme novou nebo editujeme a nebylo změněno
    if (
      !isEditing ||
      (room && room.icon === ROOM_CONFIGS[room.type || 'other'].defaultIcon)
    ) {
      setIcon(ROOM_CONFIGS[newType].defaultIcon);
    }
    if (
      !isEditing ||
      (room && room.color === ROOM_CONFIGS[room.type || 'other'].defaultColor)
    ) {
      setColor(ROOM_CONFIGS[newType].defaultColor);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setError('Název místnosti je povinný');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      if (isEditing && room) {
        // Editace existující místnosti - sestavíme objekt bez undefined hodnot
        const updates: any = {
          name: name.trim(),
          type,
          icon,
          color,
        };

        // Přidej jen pokud má hodnotu
        if (floorId) updates.floorId = floorId;
        if (description.trim()) updates.description = description.trim();

        await updateRoom(room.id, updates);
        console.log('✅ Místnost aktualizována');
      } else {
        // Vytvoření nové místnosti - sestavíme objekt bez undefined hodnot
        const newRoom: any = {
          name: name.trim(),
          type,
          icon,
          color,
          devices: [],
        };

        // Přidej jen pokud má hodnotu
        if (floorId) newRoom.floorId = floorId;
        if (description.trim()) newRoom.description = description.trim();

        await createRoom(newRoom);
        console.log('✅ Místnost vytvořena');
      }

      onClose();
    } catch (err: any) {
      console.error('❌ Chyba při ukládání místnosti:', err);
      setError(err.message || 'Nepodařilo se uložit místnost');
      setIsSaving(false);
    }
  };

  // Emoji picker (jednoduché řešení)
  const commonEmojis = [
    '🏠',
    '🛋️',
    '🛏️',
    '🍳',
    '🚿',
    '🚪',
    '🚽',
    '🚗',
    '📦',
    '🌳',
    '💼',
    '🧸',
    '🏚️',
    '🏡',
    '🪵',
    '🧖',
    '🔥',
    '❄️',
    '💡',
    '📺',
    '🖥️',
    '📱',
    '🎮',
    '📚',
    '🎨',
    '🎵',
    '🏋️',
  ];

  return (
    <div className="room-modal-overlay" onClick={onClose}>
      <div className="room-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="room-modal-header">
          <h2>{isEditing ? '✏️ Upravit místnost' : '➕ Nová místnost'}</h2>
          <button className="close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="room-form">
          {error && <div className="error-message">⚠️ {error}</div>}

          {/* Název */}
          <div className="form-group">
            <label htmlFor="room-name">Název místnosti *</label>
            <input
              id="room-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="např. Šopa, Vejminek, Garáž..."
              maxLength={50}
              required
              autoFocus
            />
          </div>

          {/* Typ místnosti */}
          <div className="form-group">
            <label htmlFor="room-type">Typ místnosti</label>
            <select
              id="room-type"
              value={type}
              onChange={(e) => handleTypeChange(e.target.value as RoomType)}
            >
              {Object.entries(ROOM_CONFIGS).map(([key, config]) => (
                <option key={key} value={key}>
                  {config.defaultIcon} {config.defaultName}
                </option>
              ))}
            </select>
            <small className="form-hint">
              {ROOM_CONFIGS[type].description}
            </small>
          </div>

          {/* Patro */}
          <div className="form-group">
            <label htmlFor="room-floor">Patro</label>
            <select
              id="room-floor"
              value={floorId}
              onChange={(e) => setFloorId(e.target.value)}
              disabled={floorsLoading || floors.length === 0}
            >
              <option value="">-- Bez patra --</option>
              {floors
                .sort((a, b) => b.level - a.level) // Sestupně (nejvyšší patro nahoře)
                .map((floor) => (
                  <option key={floor.id} value={floor.id}>
                    {floor.level === -1
                      ? '⬇️'
                      : floor.level === 0
                      ? '🏠'
                      : '⬆️'}{' '}
                    {floor.name}
                  </option>
                ))}
            </select>
            <small className="form-hint">
              {floors.length === 0
                ? 'Zatím nemáte žádná patra (vytvořte dům ve vizualizaci)'
                : 'Vyberte patro, kde se místnost nachází'}
            </small>
          </div>

          {/* Popis */}
          <div className="form-group">
            <label htmlFor="room-description">Popis (nepovinné)</label>
            <textarea
              id="room-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="např. Sauna, kuchyň a dřevník"
              rows={3}
              maxLength={200}
            />
            <small className="form-hint">{description.length}/200 znaků</small>
          </div>

          {/* Ikona a barva */}
          <div className="form-row">
            {/* Ikona */}
            <div className="form-group">
              <label htmlFor="room-icon">Ikona</label>
              <div className="icon-picker">
                <input
                  id="room-icon"
                  type="text"
                  value={icon}
                  onChange={(e) => setIcon(e.target.value)}
                  maxLength={2}
                  className="icon-input"
                />
                <div className="emoji-grid">
                  {commonEmojis.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      className={`emoji-btn ${icon === emoji ? 'active' : ''}`}
                      onClick={() => setIcon(emoji)}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Barva */}
            <div className="form-group">
              <label htmlFor="room-color">Barva</label>
              <div className="color-picker">
                <input
                  id="room-color"
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                />
                <div
                  className="color-preview"
                  style={{ backgroundColor: color }}
                >
                  <span className="color-value">{color}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Preview */}
          <div className="room-preview">
            <div className="preview-label">Náhled:</div>
            <div
              className="preview-card"
              style={{ '--room-color': color } as React.CSSProperties}
            >
              <span className="preview-icon">{icon}</span>
              <span className="preview-name">{name || 'Název místnosti'}</span>
            </div>
          </div>

          {/* Buttons */}
          <div className="form-actions">
            <button
              type="button"
              className="btn-secondary"
              onClick={onClose}
              disabled={isSaving}
            >
              Zrušit
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={isSaving || !name.trim()}
            >
              {isSaving
                ? '💾 Ukládám...'
                : isEditing
                ? '💾 Uložit změny'
                : '➕ Vytvořit místnost'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RoomModal;
