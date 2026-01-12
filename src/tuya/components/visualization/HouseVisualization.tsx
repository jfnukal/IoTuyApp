// src/tuya/components/visualization/HouseVisualization.tsx
import React, { useState, useEffect } from 'react';
import FloorPlan from './FloorPlan';
import { useHouse } from '../../hooks/useHouse';
import { useTuya } from '../../hooks/useTuya';
import type { Room } from '../../../types/index';
import './HouseVisualization.css';

const HouseVisualization: React.FC = () => {

  const {
    house,
    floors,
    isLoading: houseLoading,
    error: houseError,
    initializeHouse,
    placeDevice, 
  } = useHouse();

  const { devices } = useTuya();

  const [selectedFloorId, setSelectedFloorId] = useState<string | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);

  const handleDeviceDrop = async (deviceId: string, roomId: string) => {
    try {
      console.log('💾 Ukládám zařízení do místnosti...');
      await placeDevice(deviceId, roomId, { x: 50, y: 50 });
      console.log('✅ Zařízení uloženo!');
    } catch (error) {
      console.error('❌ Chyba při ukládání:', error);
    }
  };

  // 🔍 DEBUG - data changes
  useEffect(() => {
    console.log('📊 House data changed:', {
      house,
      floorsCount: floors.length,
      devicesCount: devices.length,
      loading: houseLoading,
      error: houseError,
    });
  }, [house, floors, devices, houseLoading, houseError]);

  // Inicializuj dům, pokud neexistuje
  useEffect(() => {
    if (!houseLoading && !house && !houseError) {
      console.log('🏗️ Dům neexistuje, vytvářím...');
      initializeHouse();
    }
  }, [house, houseLoading, houseError, initializeHouse]);

  // Automaticky vyber přízemí
  useEffect(() => {
    if (floors.length > 0 && !selectedFloorId) {
      const groundFloor = floors.find((f) => f.level === 0);
      const floorToSelect = groundFloor?.id || floors[0].id;
      console.log('🏢 Automaticky vybírám patro:', floorToSelect);
      setSelectedFloorId(floorToSelect);
    }
  }, [floors, selectedFloorId]);

  const currentFloor = floors.find((f) => f.id === selectedFloorId);

  const handleRoomClick = (room: Room) => {
    setSelectedRoom(room);
  };

  const handleDeviceClick = (_deviceId: string) => {
  };

  console.log('🎨 Rendering state:', {
    isLoading: houseLoading,
    hasError: !!houseError,
    hasHouse: !!house,
    floorsCount: floors.length,
    selectedFloorId,
    currentFloor: currentFloor?.name,
  });

  if (houseLoading) {
    return (
      <div className="house-visualization loading">
        <div className="loading-state">
          <div className="loading-spinner-large">🏗️</div>
          <p>Načítám dům...</p>
        </div>
      </div>
    );
  }

  if (houseError) {
    console.error('❌ Zobrazuji error state:', houseError);
    return (
      <div className="house-visualization error">
        <div className="error-state">
          <div className="error-icon">⚠️</div>
          <h3>Chyba při načítání domu</h3>
          <p>{houseError}</p>
          <button onClick={initializeHouse} className="retry-button">
            🔄 Zkusit znovu
          </button>
        </div>
      </div>
    );
  }

  if (!house) {
    return (
      <div className="house-visualization empty">
        <div className="empty-state">
          <div className="empty-icon">🏠</div>
          <h3>Nemáte žádný dům</h3>
          <p>Vytvořte si svůj první dům a začněte organizovat zařízení!</p>
          <button onClick={initializeHouse} className="create-button">
            ➕ Vytvořit dům
          </button>
        </div>
      </div>
    );
  }

  console.log('✅ Zobrazuji hlavní obsah domu');

  return (
    <div className="house-visualization">
      {/* Header */}
      <div className="house-header">
        <div className="house-info">
          <h2 className="house-name">🏠 {house.name}</h2>
          <p className="house-description">
            {floors.length} pater · {devices.length} zařízení
          </p>
        </div>

        {/* Výběr patra */}
        <div className="floor-selector">
          {floors
            .sort((a, b) => b.level - a.level)
            .map((floor) => (
              <button
                key={floor.id}
                className={`floor-tab ${
                  floor.id === selectedFloorId ? 'active' : ''
                }`}
                onClick={() => {
                  console.log('🏢 Přepínám na patro:', floor.name);
                  setSelectedFloorId(floor.id);
                }}
                style={{ '--floor-color': floor.color } as React.CSSProperties}
              >
                <span className="floor-tab-icon">
                  {floor.level === -1 ? '⬇️' : floor.level === 0 ? '🏠' : '⬆️'}
                </span>
                <span className="floor-tab-name">{floor.name}</span>
              </button>
            ))}
        </div>
      </div>

      {/* Půdorys aktuálního patra */}
      {currentFloor ? (
        <>
          {console.log('🏢 Zobrazuji patro:', currentFloor.name)}
          <FloorPlan
            floor={currentFloor}
            allDevices={devices}
            onRoomClick={handleRoomClick}
            onDeviceClick={handleDeviceClick}
            onDeviceDrop={handleDeviceDrop}
            selectedRoomId={selectedRoom?.id}
          />
        </>
      ) : (
        <div className="no-floor-selected">
          <p>Vyberte patro pro zobrazení půdorysu</p>
        </div>
      )}

      {/* Detail vybrané místnosti */}
      {selectedRoom && (
        <div className="room-detail">
          <div className="room-detail-header">
            <h3>
              {selectedRoom.icon} {selectedRoom.name}
            </h3>
            <button
              className="close-button"
              onClick={() => setSelectedRoom(null)}
            >
              ✕
            </button>
          </div>
          <div className="room-detail-content">
            <p>
              <strong>Typ:</strong> {selectedRoom.type}
            </p>
            <p>
              <strong>Zařízení:</strong> {selectedRoom.devices.length}
            </p>
            {selectedRoom.devices.length > 0 && (
              <div className="room-devices-list">
                <h4>Zařízení v místnosti:</h4>
                <ul>
                  {selectedRoom.devices.map((deviceId) => {
                    const device = devices.find((d) => d.id === deviceId);
                    return device ? (
                      <li key={deviceId}>
                        {device.name} ({device.online ? '🟢' : '🔴'})
                      </li>
                    ) : null;
                  })}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default HouseVisualization;
