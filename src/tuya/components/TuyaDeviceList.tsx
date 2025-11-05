// src/tuya/components/TuyaDeviceList.tsx
import React, { useState, useMemo } from 'react';
import { useTuya } from '../hooks/useTuya';
import './TuyaDeviceList.css';
import { DeviceGrid } from './grid/DeviceGrid';
import DeviceDetailModal from './modals/DeviceDetailModal';
import type { TuyaDevice } from '../../types'; 

type FilterType = 'all' | 'online' | 'offline';
type CategoryFilter =
  | 'all'
  | 'switch'
  | 'light'
  | 'sensor'
  | 'climate'
  | 'security'
  | 'cover'
  | 'garden'
  | 'other';

const TuyaDeviceList: React.FC = () => {
  const {
    devices,
    onlineCount,
    deviceCount,
    isLoading,
    isSyncing,
    error,
    syncDevices,
    toggleDevice,
    controlDevice,
  } = useTuya();

  const [showDebugInfo, setShowDebugInfo] = useState(false);
  const [filter, setFilter] = useState<FilterType>('all');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showOffline, setShowOffline] = useState(false);

  // Stav pro "Režim úprav"
  const [isLayoutEditMode, setIsLayoutEditMode] = useState(false);
  // Stav pro sledování, které zařízení jsme otevřeli (celý OBJEKT, ne jen ID)
  const [selectedDevice, setSelectedDevice] = useState<TuyaDevice | null>(null);

  // Handler pro kliknutí na kartu (přijímá celý objekt)
  const handleCardClick = (device: TuyaDevice) => {
    if (!isLayoutEditMode) {
      console.log('Otevírám modal pro zařízení:', device.name);
      setSelectedDevice(device); // Ukládáme celý objekt
    } else {
      console.log('Režim úprav je aktivní, kliknutí ignorováno.');
    }
  };

  // Filtrování zařízení
  const filteredDevices = useMemo(() => {
    let result = [...devices];
    if (!showOffline) {
      result = result.filter((d) => d.online);
    }
    if (filter === 'online') {
      result = result.filter((d) => d.online);
    } else if (filter === 'offline') {
      result = result.filter((d) => !d.online);
    }
    if (categoryFilter !== 'all') {
      result = result.filter((d) => d.category === categoryFilter);
    }
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (d) =>
          d.name.toLowerCase().includes(query) ||
          d.customName?.toLowerCase().includes(query) ||
          d.category.toLowerCase().includes(query)
      );
    }
    return result;
  }, [devices, filter, categoryFilter, searchQuery, showOffline]);

  // Počet zařízení podle kategorií
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    devices.forEach((device) => {
      counts[device.category] = (counts[device.category] || 0) + 1;
    });
    return counts;
  }, [devices]);

  const handleSync = async () => {
    try {
      await syncDevices();
    } catch (error) {
      console.error('Chyba při synchronizaci:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="tuya-device-list">
        <div className="loading-state">
          <div className="loading-spinner-large">🔄</div>
          <p>Načítám Tuya zařízení...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="tuya-device-list">
        <div className="error-state">
          <div className="error-icon">⚠️</div>
          <h3>Chyba při načítání zařízení</h3>
          <p>{error}</p>
          <button className="retry-button" onClick={handleSync}>
            🔄 Zkusit znovu
          </button>
        </div>
      </div>
    );
  }

  return (
    // Použijeme Fragment (<>), abychom mohli vrátit seznam I modal
    <>
      <div className="tuya-device-list">
        {/* Header */}
        <div className="tuya-list-header">
          <div className="header-info">
            <h2 className="list-title">🔌 Tuya Zařízení</h2>
            <div className="device-counts">
              <span className="count-badge total">
                Celkem: <strong>{deviceCount}</strong>
              </span>
              <span className="count-badge online">
                Online: <strong>{onlineCount}</strong>
              </span>
              <span className="count-badge offline">
                Offline: <strong>{deviceCount - onlineCount}</strong>
              </span>
            </div>
          </div>

          <button
            className="sync-button"
            onClick={handleSync}
            disabled={isSyncing}
            title="Synchronizovat ze serveru"
          >
            <span className={`sync-icon ${isSyncing ? 'spinning' : ''}`}>🔄</span>
            <span>{isSyncing ? 'Synchronizuji...' : 'Synchronizovat'}</span>
          </button>
          <label
            className="show-offline-toggle"
            title="Zobrazit i offline zařízení"
          >
            <input
              type="checkbox"
              checked={showOffline}
              onChange={(e) => setShowOffline(e.target.checked)}
            />
            <span>Zobrazit offline ({deviceCount - onlineCount})</span>
          </label>

          <label className="show-debug-toggle" title="Zobrazit debug informace">
            <input
              type="checkbox"
              checked={showDebugInfo}
              onChange={(e) => setShowDebugInfo(e.target.checked)}
            />
            <span>🔍 Debug režim</span>
          </label>

          <button
            className={`filter-button ${isLayoutEditMode ? 'active' : ''}`}
            onClick={() => setIsLayoutEditMode((prev) => !prev)}
            title="Přepnout režim úprav rozložení"
          >
            {isLayoutEditMode ? '✅ Uložit rozložení' : '✏️ Upravit rozložení'}
          </button>
        </div>

        {/* Filters */}
        <div className="tuya-filters">
           <div className="search-box">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="Hledat zařízení..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
            {searchQuery && (
              <button
                className="clear-search"
                onClick={() => setSearchQuery('')}
                title="Vymazat"
              >
                ✕
              </button>
            )}
          </div>
          <div className="filter-group">
            <button
              className={`filter-button ${filter === 'all' ? 'active' : ''}`}
              onClick={() => setFilter('all')}
            >
              Vše ({deviceCount})
            </button>
            <button
              className={`filter-button ${filter === 'online' ? 'active' : ''}`}
              onClick={() => setFilter('online')}
            >
              🟢 Online ({onlineCount})
            </button>
            <button
              className={`filter-button ${filter === 'offline' ? 'active' : ''}`}
              onClick={() => setFilter('offline')}
            >
              ⚫ Offline ({deviceCount - onlineCount})
            </button>
          </div>
          <div className="category-filter">
            <select
              value={categoryFilter}
              onChange={(e) =>
                setCategoryFilter(e.target.value as CategoryFilter)
              }
              className="category-select"
            >
              <option value="all">Všechny kategorie ({deviceCount})</option>
              {categoryCounts.switch && (
                <option value="switch">
                  🔌 Spínače ({categoryCounts.switch})
                </option>
              )}
              {categoryCounts.light && (
                <option value="light">
                  💡 Osvětlení ({categoryCounts.light})
                </option>
              )}
              {categoryCounts.sensor && (
                <option value="sensor">
                  📡 Senzory ({categoryCounts.sensor})
                </option>
              )}
              {categoryCounts.climate && (
                <option value="climate">
                  ❄️ Klimatizace ({categoryCounts.climate})
                </option>
              )}
              {categoryCounts.security && (
                <option value="security">
                  🔒 Zabezpečení ({categoryCounts.security})
                </option>
              )}
              {categoryCounts.cover && (
                <option value="cover">🪟 Žaluzie ({categoryCounts.cover})</option>
              )}
              {categoryCounts.garden && (
                <option value="garden">
                  🌱 Zahrada ({categoryCounts.garden})
                </option>
              )}
              {categoryCounts.other && (
                <option value="other">⚙️ Ostatní ({categoryCounts.other})</option>
              )}
            </select>
          </div>
        </div>

        {/* Device Grid */}
        {filteredDevices.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🔍</div>
            <h3>Žádná zařízení</h3>
            <p>
              {searchQuery
                ? `Nenalezena žádná zařízení odpovídající "${searchQuery}"`
                : filter === 'online'
                ? 'Žádná zařízení nejsou momentálně online'
                : filter === 'offline'
                ? 'Všechna zařízení jsou online'
                : 'Zatím nemáte žádná Tuya zařízení'}
            </p>
            {devices.length === 0 && (
              <button className="sync-button-large" onClick={handleSync}>
                🔄 Synchronizovat zařízení
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="results-info">
              Zobrazeno {filteredDevices.length} z {deviceCount} zařízení
            </div>
            {/* Před DeviceGrid */}
              {isLayoutEditMode && (
                <div className="edit-mode-banner">
                  <span className="edit-mode-icon">✏️</span>
                  <div className="edit-mode-text">
                    <strong>Režim úprav aktivní</strong>
                    <p>Přetáhněte karty na požadované místo. Změny se ukládají automaticky.</p>
                  </div>
                </div>
              )}
            <div className="tuya-device-grid-container">
              <DeviceGrid
                devices={filteredDevices}
                onToggle={toggleDevice}
                onControl={controlDevice}
                isDebugVisible={showDebugInfo}
                onCardClick={handleCardClick}
                isLayoutEditMode={isLayoutEditMode}
              />
            </div>
          </>
        )}
      </div>

      {selectedDevice && (
        <DeviceDetailModal
          device={selectedDevice}
          onClose={() => setSelectedDevice(null)}
        />
      )}
    </>
  );
};

export default TuyaDeviceList;