// src/tuya/components/TuyaDeviceList.tsx
import React, { useState, useMemo } from 'react';
import { useTuya } from '../hooks/useTuya';
import TuyaDeviceCard from './TuyaDeviceCard';
import './TuyaDeviceList.css';

type FilterType = 'all' | 'online' | 'offline';
type CategoryFilter = 'all' | 'switch' | 'light' | 'sensor' | 'climate' | 'security' | 'cover' | 'garden' | 'other';

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
  } = useTuya();

  const [filter, setFilter] = useState<FilterType>('all');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Filtrování zařízení
  const filteredDevices = useMemo(() => {
    let result = [...devices];

    // Filtr podle online/offline
    if (filter === 'online') {
      result = result.filter((d) => d.online);
    } else if (filter === 'offline') {
      result = result.filter((d) => !d.online);
    }

    // Filtr podle kategorie
    if (categoryFilter !== 'all') {
      result = result.filter((d) => d.category === categoryFilter);
    }

    // Vyhledávání
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
  }, [devices, filter, categoryFilter, searchQuery]);

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
      </div>

      {/* Filters */}
      <div className="tuya-filters">
        {/* Search */}
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

        {/* Status Filter */}
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

        {/* Category Filter */}
        <div className="category-filter">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as CategoryFilter)}
            className="category-select"
          >
            <option value="all">Všechny kategorie ({deviceCount})</option>
            {categoryCounts.switch && (
              <option value="switch">🔌 Spínače ({categoryCounts.switch})</option>
            )}
            {categoryCounts.light && (
              <option value="light">💡 Osvětlení ({categoryCounts.light})</option>
            )}
            {categoryCounts.sensor && (
              <option value="sensor">📡 Senzory ({categoryCounts.sensor})</option>
            )}
            {categoryCounts.climate && (
              <option value="climate">❄️ Klimatizace ({categoryCounts.climate})</option>
            )}
            {categoryCounts.security && (
              <option value="security">🔒 Zabezpečení ({categoryCounts.security})</option>
            )}
            {categoryCounts.cover && (
              <option value="cover">🪟 Žaluzie ({categoryCounts.cover})</option>
            )}
            {categoryCounts.garden && (
              <option value="garden">🌱 Zahrada ({categoryCounts.garden})</option>
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
          <div className="tuya-device-grid">
            {filteredDevices.map((device) => (
              <TuyaDeviceCard
                key={device.id}
                device={device}
                onToggle={toggleDevice}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default TuyaDeviceList;