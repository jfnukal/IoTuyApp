// src/tuya/components/modals/DeviceDetailModal.tsx
import React, { useState } from 'react';
import { useRooms } from '../../hooks/useRooms';
import DeviceCardRenderer from '../cards/DeviceCardRenderer';
import { useTuya } from '../../hooks/useTuya';
import type { TuyaDevice } from '../../../types';
import {
  getCategoryLabel,
  getCardIcon,
  getDeviceCardType,
} from '../../utils/deviceHelpers';
import { deviceService } from '../../../services/deviceService';
import './DeviceDetailModal.css';
import DebugSection from '../cards/DebugSection';

// Dostupné ikony pro výběr - IoT zařízení
const AVAILABLE_ICONS = [
  // Světla
  '💡',
  '🔆',
  '🌟',
  '🕯️',
  '🔦',
  '💫',
  '☀️',
  '🌙',
  // Zásuvky a napájení
  '🔌',
  '⚡',
  '🔋',
  '🪫',
  '⏻',
  // Klima a topení
  '🌡️',
  '❄️',
  '🔥',
  '💨',
  '🌬️',
  '♨️',
  // Senzory
  '📡',
  '📶',
  '🎚️',
  '🔔',
  '🚨',
  // Bezpečnost
  '📹',
  '🔒',
  '🔓',
  '🚪',
  '🪟',
  '🛡️',
  // Spotřebiče
  '📺',
  '🖥️',
  '🧺',
  '🧊',
  '🚿',
  '🚰',
  // Venkovní
  '🌳',
  '🚗',
  '🏠',
  '⛽',
  '🔧',
  // Místnosti
  '🛏️',
  '🛋️',
  '🍳',
  '🚽',
  '🛁',
];

interface DeviceDetailModalProps {
  device: TuyaDevice;
  onClose: () => void;
}

type TabType = 'info' | 'settings' | 'debug';

const DeviceDetailModal: React.FC<DeviceDetailModalProps> = ({
  device,
  onClose,
}) => {
  const { rooms, isLoading: roomsLoading } = useRooms();
  const { assignDeviceToRoom } = useRooms();
  const { controlDevice } = useTuya();

  // Aktivní tab
  const [activeTab, setActiveTab] = useState<TabType>('info');

  // Stavy pro nastavení
  const [selectedRoomId, setSelectedRoomId] = useState<string>(
    device.roomId || ''
  );
  const [customIcon, setCustomIcon] = useState<string>(device.customIcon || '');
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [showName, setShowName] = useState<boolean>(
    device.cardSettings?.showName ?? true
  );
  const [showCustomName, setShowCustomName] = useState<boolean>(
    device.cardSettings?.showCustomName ?? true
  );
  const [hiddenCard, setHiddenCard] = useState<boolean>(
    device.cardSettings?.hidden ?? false
  );

  // Stavy pro akce
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Ikona zařízení
  const deviceType = getDeviceCardType(device.category);
  const displayIcon =
    customIcon || device.customIcon || getCardIcon(deviceType);

  // Handler pro uložení nastavení
  const handleSave = async () => {
    setIsSaving(true);
    setError(null);

    try {
      // 🆕 Sestavíme objekt jen se změněnými hodnotami
      const updates: Partial<TuyaDevice> = {
        cardSettings: {
          ...device.cardSettings,
          showName,
          showCustomName,
          hidden: hiddenCard,
        },
      };

      if (customIcon !== device.customIcon) {
        updates.customIcon = customIcon;
      }

      await deviceService.updateDevice(device.id, updates);

      // Změna místnosti
      if (device.roomId !== selectedRoomId) {
        await assignDeviceToRoom(
          device.id,
          selectedRoomId || null,
          device.roomId || null
        );
      }

      onClose();
    } catch (err: any) {
      console.error(err);
      setError('Nepodařilo se uložit změny.');
    } finally {
      setIsSaving(false);
    }
  };

  // Handler pro odebrání z místnosti
  const handleRemoveFromRoom = async () => {
    if (!device.roomId) return;
    setIsSaving(true);
    try {
      await assignDeviceToRoom(device.id, null, device.roomId);
      onClose();
    } catch (err) {
      setError('Nepodařilo se odebrat z místnosti.');
    } finally {
      setIsSaving(false);
    }
  };

  // Handler pro odebrání z půdorysu
  const handleRemoveFromFloorplan = async () => {
    if (!device.position) return;
    if (!window.confirm('Odebrat zařízení z půdorysu?')) return;
    setIsSaving(true);
    try {
      await deviceService.updateDevicePosition(device.id, null as any);
      onClose();
    } catch (err) {
      setError('Nepodařilo se odebrat z půdorysu.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="device-modal-overlay" onClick={onClose}>
      <div className="device-modal" onClick={(e) => e.stopPropagation()}>
        {/* ===== HEADER ===== */}
        <div className="device-modal-header">
          <div className="header-device-info">
            <span className="header-icon">{displayIcon}</span>
            <div className="header-text">
              <h2>{device.customName || device.name}</h2>
              <span
                className={`status-badge ${
                  device.online ? 'online' : 'offline'
                }`}
              >
                {device.online ? '🟢 Online' : '🔴 Offline'}
              </span>
            </div>
          </div>
          <button className="close-btn" onClick={onClose} disabled={isSaving}>
            ✕
          </button>
        </div>

        {/* ===== TABS ===== */}
        <div className="modal-tabs">
          <button
            className={`tab-btn ${activeTab === 'info' ? 'active' : ''}`}
            onClick={() => setActiveTab('info')}
          >
            📊 Info
          </button>
          <button
            className={`tab-btn ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            ⚙️ Nastavení
          </button>
          <button
            className={`tab-btn ${activeTab === 'debug' ? 'active' : ''}`}
            onClick={() => setActiveTab('debug')}
          >
            🔧 Debug
          </button>
        </div>

        {/* ===== BODY ===== */}
        <div className="device-modal-body">
          {error && <div className="error-message">{error}</div>}

          {/* ===== TAB: INFO ===== */}
          {activeTab === 'info' && (
            <div className="tab-content tab-info">
              {/* Embedded karta s ovládáním */}
              <div className="embedded-device-card">
                <DeviceCardRenderer
                  device={device}
                  onToggle={async () => {}}
                  onControl={controlDevice}
                  isDebugVisible={false}
                />
              </div>

              {/* Všechny statusy */}
              {device.status && device.status.length > 0 && (
                <div className="status-section">
                  <h3>Stav zařízení</h3>
                  <div className="status-list">
                    {device.status.map((s) => (
                      <div key={s.code} className="status-item">
                        <span className="status-code">{s.code}</span>
                        <span className="status-value">
                          {typeof s.value === 'boolean'
                            ? s.value
                              ? '✅ Ano'
                              : '❌ Ne'
                            : String(s.value)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Základní info */}
              <div className="info-section">
                <h3>Základní informace</h3>
                <div className="info-grid">
                  <div className="info-row">
                    <span className="info-label">Kategorie:</span>
                    <span className="info-value">
                      {getCategoryLabel(device.category)}
                    </span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Místnost:</span>
                    <span className="info-value">
                      {rooms.find((r) => r.id === device.roomId)?.name ||
                        'Nepřiřazeno'}
                    </span>
                  </div>
                  {device.position && (
                    <div className="info-row">
                      <span className="info-label">Pozice:</span>
                      <span className="info-value">
                        X: {device.position.x}, Y: {device.position.y}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ===== TAB: NASTAVENÍ ===== */}
          {activeTab === 'settings' && (
            <div className="tab-content tab-settings">
              {/* Ikona */}
              <div className="settings-section">
                <h3>Ikona zařízení</h3>
                <div className="icon-selector">
                  <button
                    className="current-icon-btn"
                    onClick={() => setShowIconPicker(!showIconPicker)}
                  >
                    <span className="icon-preview">
                      {customIcon || displayIcon}
                    </span>
                    <span className="icon-change-text">
                      {showIconPicker ? 'Zavřít' : 'Změnit ikonu'}
                    </span>
                  </button>
                  {showIconPicker && (
                    <div className="device-modal-icon-picker">
                      <button
                        className={`device-modal-icon-option ${
                          !customIcon ? 'selected' : ''
                        }`}
                        onClick={() => {
                          setCustomIcon('');
                          setShowIconPicker(false);
                        }}
                        title="Výchozí"
                      >
                        {getCardIcon(deviceType)}
                      </button>
                      {AVAILABLE_ICONS.map((icon) => (
                        <button
                          key={icon}
                          className={`device-modal-icon-option ${
                            customIcon === icon ? 'selected' : ''
                          }`}
                          onClick={() => {
                            setCustomIcon(icon);
                            setShowIconPicker(false);
                          }}
                        >
                          {icon}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Místnost */}
              <div className="settings-section">
                <h3>Místnost</h3>
                <select
                  value={selectedRoomId}
                  onChange={(e) => setSelectedRoomId(e.target.value)}
                  disabled={isSaving}
                  className="room-select"
                >
                  <option value="">-- Nepřiřazeno --</option>
                  {roomsLoading && <option disabled>Načítám...</option>}
                  {rooms.map((room) => (
                    <option key={room.id} value={room.id}>
                      {room.icon} {room.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Zobrazení */}
              <div className="settings-section">
                <h3>Zobrazení v seznamu</h3>
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
                  <span>🙈 Skrýt kartu v seznamu</span>
                </label>
              </div>

              {/* Danger zone */}
              {(device.roomId || device.position) && (
                <div className="settings-section danger-zone">
                  <h3>⚠️ Nebezpečná zóna</h3>
                  <div className="danger-buttons">
                    {device.roomId && (
                      <button
                        className="btn-danger"
                        onClick={handleRemoveFromRoom}
                        disabled={isSaving}
                      >
                        🗑️ Odebrat z místnosti
                      </button>
                    )}
                    {device.position && (
                      <button
                        className="btn-danger"
                        onClick={handleRemoveFromFloorplan}
                        disabled={isSaving}
                      >
                        📍 Odebrat z půdorysu
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ===== TAB: DEBUG ===== */}
          {activeTab === 'debug' && (
            <div className="tab-content tab-debug">
              {/* Použijeme existující DebugSection s isVisible=true */}
              <div className="embedded-debug-section">
                <DebugSection device={device} isVisible={true} />
              </div>
            </div>
          )}
        </div>

        {/* ===== FOOTER ===== */}
        {activeTab === 'settings' && (
          <div className="device-modal-footer">
            <button
              className="btn-secondary"
              onClick={onClose}
              disabled={isSaving}
            >
              Zrušit
            </button>
            <button
              className="btn-primary"
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? 'Ukládám...' : '💾 Uložit'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default DeviceDetailModal;
