// src/tuya/components/TuyaDeviceList.tsx
import React, { useState, useMemo } from 'react';
import { useTuya } from '../hooks/useTuya';
import './TuyaDeviceList.css';
import { DeviceGrid } from './grid/DeviceGrid';
import DeviceDetailModal from './modals/DeviceDetailModal';
import type { TuyaDevice } from '../../types';

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

  interface TuyaDeviceListProps {
    searchQuery?: string;
    filter?: 'all' | 'online' | 'offline';
    categoryFilter?: CategoryFilter; // Teď používáme ten definovaný typ výše
    showDebugInfo?: boolean;
    isLayoutEditMode?: boolean;
  }

  const TuyaDeviceList: React.FC<TuyaDeviceListProps> = ({
    searchQuery = '',
    filter = 'all',
    categoryFilter = 'all', // Teď je to v props, nikoli v useState
    showDebugInfo = false,
    isLayoutEditMode = false,
  }) => {
    const {
      devices,
      deviceCount,
      isLoading,
      error,
      syncDevices,
      toggleDevice,
      controlDevice,
    } = useTuya();
  
    // Zde už nesmí být: const [categoryFilter] = useState...
  // Stav pro sledování, které zařízení jsme otevřeli (celý OBJEKT, ne jen ID)
  const [selectedDevice, setSelectedDevice] = useState<TuyaDevice | null>(null);

  // Handler pro kliknutí na kartu (přijímá celý objekt)
  const handleCardClick = (device: TuyaDevice) => {
    if (!isLayoutEditMode) {
      setSelectedDevice(device); // Ukládáme celý objekt
    } else {
    }
  };

  // Filtrování zařízení
  const filteredDevices = useMemo(() => {
    let result = [...devices];

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
  }, [devices, filter, categoryFilter, searchQuery]);

  // Počet zařízení podle kategorií


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
          <div className="spinner-global"></div>
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
            Zkusit znovu
          </button>
        </div>
      </div>
    );
  }

  return (
    // Použijeme Fragment (<>), abychom mohli vrátit seznam I modal
    <>
        <div className="tuya-device-list">

 
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
                Synchronizovat zařízení
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
                  <p>
                    Přetáhněte karty na požadované místo. Změny se ukládají
                    automaticky.
                  </p>
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
