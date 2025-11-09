// src/tuya/components/visualization/DeviceMiniatures.tsx
import React, { useMemo, useState } from 'react';
import type { TuyaDevice } from '../../../types';
import DeviceMiniature from './DeviceMiniature';
import './DeviceMiniatures.css';

interface DeviceMiniaturesProps {
  devices: TuyaDevice[];
  onDeviceClick: (device: TuyaDevice) => void;
}

const DeviceMiniatures: React.FC<DeviceMiniaturesProps> = ({
  devices,
  onDeviceClick,
}) => {
  const [filterMode, setFilterMode] = useState<'all' | 'placed' | 'unplaced'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Filtrování a třídění zařízení
  const filteredDevices = useMemo(() => {
    // ✅ Filtrujeme jen validní zařízení
    let filtered = devices.filter(d => d && d.id);

    // Filtr podle umístění
    if (filterMode === 'placed') {
      filtered = filtered.filter(d => d.position);
    } else if (filterMode === 'unplaced') {
      filtered = filtered.filter(d => !d.position);
    }

    // Filtr podle vyhledávání
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(d =>
        (d.customName || d.name).toLowerCase().includes(query)
      );
    }

    // Seřazení: online první, pak podle názvu
    filtered.sort((a, b) => {
      if (a.online !== b.online) {
        return a.online ? -1 : 1;
      }
      const nameA = (a.customName || a.name).toLowerCase();
      const nameB = (b.customName || b.name).toLowerCase();
      return nameA.localeCompare(nameB);
    });

    return filtered;
  }, [devices, filterMode, searchQuery]);

  // Statistiky
  const stats = useMemo(() => {
    return {
      total: devices.length,
      placed: devices.filter(d => d.position).length,
      unplaced: devices.filter(d => !d.position).length,
      online: devices.filter(d => d.online).length,
    };
  }, [devices]);

  return (
    <div className="device-miniatures-panel">
      {/* Header */}
      <div className="miniatures-header">
        <h3>🏠 Zařízení</h3>
        <div className="miniatures-stats">
          <span className="stat" title="Celkem zařízení">
            📊 {stats.total}
          </span>
          <span className="stat" title="Online zařízení">
            🟢 {stats.online}
          </span>
          <span className="stat" title="Umístěno na půdorysu">
            ✓ {stats.placed}
          </span>
        </div>
      </div>

      {/* Vyhledávání */}
      <div className="miniatures-search">
        <input
          type="text"
          placeholder="🔍 Hledat zařízení..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="search-input"
        />
      </div>

      {/* Filtry */}
      <div className="miniatures-filters">
        <button
          className={`filter-btn ${filterMode === 'all' ? 'active' : ''}`}
          onClick={() => setFilterMode('all')}
        >
          Všechny ({stats.total})
        </button>
        <button
          className={`filter-btn ${filterMode === 'unplaced' ? 'active' : ''}`}
          onClick={() => setFilterMode('unplaced')}
        >
          Neumístěné ({stats.unplaced})
        </button>
        <button
          className={`filter-btn ${filterMode === 'placed' ? 'active' : ''}`}
          onClick={() => setFilterMode('placed')}
        >
          Umístěné ({stats.placed})
        </button>
      </div>

      {/* Nápověda */}
      <div className="miniatures-hint">
        💡 Přetáhněte zařízení na půdorys nebo klikněte pro detail
      </div>

      {/* Seznam miniatur */}
      <div className="miniatures-grid">
        {filteredDevices.length === 0 ? (
          <div className="no-devices">
            {searchQuery ? '🔍 Žádná zařízení nenalezena' : '📭 Žádná zařízení'}
          </div>
        ) : (
          filteredDevices
            .filter(device => device && device.id) // ✅ Další kontrola
            .map(device => (
            <DeviceMiniature
              key={device.id}
              device={device}
              onClick={onDeviceClick}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default DeviceMiniatures;