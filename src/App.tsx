import React, { useState, useEffect } from 'react';
import './styles/index.css';
import { useAuth } from './contexts/AuthContext';
import { useFirestore } from './hooks/useFirestore';
import { useRooms } from './hooks/useRooms';
import Login from './components/Login';
import RoomSelector from './components/RoomSelector';
import DeviceCard from './components/DeviceCard';
import { firestoreService } from './services/firestoreService';
import type { TuyaDevice } from './types';
import RoomVisualization2D from './components/RoomVisualization2D';
import RoomVisualization3D from './components/RoomVisualization3D';
import CalendarMiniWidget from './components/Calendar/CalendarMiniWidget';
import CalendarProvider from './components/Calendar/CalendarProvider';

// Přidej tuto funkci zde
const getDeviceIcon = (device: TuyaDevice): string => {
  const categoryIcons: Record<string, string> = {
    switch: '🔌',
    light: '💡', 
    sensor: '📱',
    garden: '🌱',
    thermostat: '🌡️',
    camera: '📷',
    assistant: '🏠',
    default: '📱',
  };

  return categoryIcons[device.category] || categoryIcons.default;
};

declare global {
  interface Window {
    lastPositionUpdate?: string | null;
  }
}

function App() {
  // VŠECHNY HOOKY MUSÍ BÝT NA ZAČÁTKU - PŘED JAKÝMKOLIV RETURN!
  
  // Auth hooks
  const { currentUser, logout } = useAuth();

  // Firestore hooks
  const {
    devices,
    loading: firebaseLoading,
    error: firebaseError,
    syncDevices,
  } = useFirestore();

  // Room management hooks
  const {
    rooms,
    selectedRoomId,
    selectedRoom,
    getRoomDevices,
    getUnassignedDevices,
    addDeviceToRoom,
    removeDeviceFromRoom,
    loading: roomsLoading,
  } = useRooms();

  // Local state - VŠECHNY useState HOOKY
  const [devicesData, setDevicesData] = useState<TuyaDevice[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isControlling, setIsControlling] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<
    'all' | 'room' | 'unassigned' | '2d-view' | '3d-view'
  >('all');
  const [notification, setNotification] = useState<string | null>(null);
  const [showNotification, setShowNotification] = useState(false);

  // Theme initialization - useEffect
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      document.documentElement.classList.add('dark-theme');
    }
  }, []);

  // useEffect pro Firebase integrace
  useEffect(() => {
    if (!currentUser) return;

    if (devices && devices.length > 0) {
      setDevicesData(devices);
      setIsLoading(false);
    }
  }, [currentUser, devices, firebaseLoading]);

  // Handler pro aktualizaci pozice zařízení - useCallback
  const handleDevicePositionChange = React.useCallback(
    async (deviceId: string, position: { x: number; y: number }) => {
      if (!currentUser) {
        console.error('No current user for position update');
        return;
      }

      console.log('=== POSITION UPDATE START ===');
      console.log('Device ID:', deviceId);
      console.log('New position:', position);
      console.log('Current user:', currentUser.uid);

      const updateKey = `${deviceId}-${position.x}-${position.y}`;
      if (window.lastPositionUpdate === updateKey) {
        console.log('Duplicate position update prevented');
        return;
      }
      window.lastPositionUpdate = updateKey;

      try {
        await firestoreService.updateDevicePosition(
          currentUser.uid,
          deviceId,
          position
        );
        console.log('Firebase update successful');

        setDevicesData((prevDevices) => {
          const updated = prevDevices.map((device) =>
            device.id === deviceId ? { ...device, position } : device
          );
          console.log(
            'Local state updated:',
            updated.find((d) => d.id === deviceId)?.position
          );
          return updated;
        });

        console.log('=== POSITION UPDATE SUCCESS ===');

        setTimeout(() => {
          if (window.lastPositionUpdate === updateKey) {
            window.lastPositionUpdate = null;
          }
        }, 1000);
      } catch (error) {
        console.error('=== POSITION UPDATE ERROR ===');
        console.error('Error details:', error);
        window.lastPositionUpdate = null;
        alert(`Chyba při ukládání pozice: ${error}`);
      }
    },
    [currentUser]
  );

  // TEPRVE TEĎKA MŮŽEME DĚLAT PODMÍNĚNÉ RETURN
  
  // Přihlášení required - TENTO RETURN JE AŽ PO VŠECH HOOKECH!
  if (!currentUser) {
    return <Login />;
  }

  // Mock Tuya API - později nahradit skutečným
  const fetchTuyaDevices = async (): Promise<TuyaDevice[]> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const mockDevices: TuyaDevice[] = [
          {
            id: 'bf631b96e11e658088nljp',
            name: 'Chytrá zásuvka - Obývák',
            local_key: 'mock_key_1',
            category: 'switch',
            product_id: 'mock_product_1',
            product_name: 'Smart Socket',
            sub: false,
            uuid: 'mock_uuid_1',
            owner_id: 'mock_owner_1',
            online: true,
            status: [
              { code: 'switch_1', value: Math.random() > 0.5 },
              { code: 'cur_power', value: Math.round(Math.random() * 100) },
            ],
            lastUpdated: Date.now(),
            isVisible: true,
            customName: 'Zásuvka u TV',
            customColor: '#007bff',
          },
          {
            id: 'bf631b96e11e658088nljq',
            name: 'LED pásek - Kuchyň',
            local_key: 'mock_key_2',
            category: 'light',
            product_id: 'mock_product_2',
            product_name: 'LED Strip',
            sub: false,
            uuid: 'mock_uuid_2',
            owner_id: 'mock_owner_2',
            online: Math.random() > 0.2,
            status: [
              { code: 'switch_led', value: Math.random() > 0.3 },
              { code: 'bright_value', value: Math.round(Math.random() * 100) },
              { code: 'colour_data', value: '#ff6600' },
            ],
            lastUpdated: Date.now(),
            isVisible: true,
          },
          {
            id: 'bf631b96e11e658088nljr',
            name: 'Teplotní senzor - Ložnice',
            local_key: 'mock_key_3',
            category: 'sensor',
            product_id: 'mock_product_3',
            product_name: 'Temperature Sensor',
            sub: false,
            uuid: 'mock_uuid_3',
            owner_id: 'mock_owner_3',
            online: true,
            status: [
              {
                code: 'temp_current',
                value: Math.round(Math.random() * 10 + 20),
              },
              {
                code: 'humidity_value',
                value: Math.round(Math.random() * 40 + 40),
              },
            ],
            lastUpdated: Date.now(),
            isVisible: true,
            customName: 'Senzor u postele',
          },
          {
            id: 'bf631b96e11e658088nljs',
            name: 'Chytrý vypínač - Zahrada',
            local_key: 'mock_key_4',
            category: 'garden',
            product_id: 'mock_product_4',
            product_name: 'Garden Switch',
            sub: false,
            uuid: 'mock_uuid_4',
            owner_id: 'mock_owner_4',
            online: Math.random() > 0.1,
            status: [
              { code: 'switch_1', value: Math.random() > 0.6 },
              { code: 'timer_1', value: '08:00' },
            ],
            lastUpdated: Date.now(),
            isVisible: true,
            notes: 'Ovládá zahradní osvětlení',
          },
        ];
        resolve(mockDevices);
      }, 1000);
    });
  };

  const syncTuyaWithFirebase = async () => {
    if (!currentUser) return;

    try {
      setIsLoading(true);
      setError(null);

      setNotification('Synchronizuji zařízení...');
      setShowNotification(true);

      console.log('Synchronizing with Tuya API...');
      const tuyaDevices = await fetchTuyaDevices();

      console.log('Saving to Firebase...');
      await syncDevices(tuyaDevices);

      setNotification('✓ Synchronizace dokončena');

      setTimeout(() => {
        setShowNotification(false);
        setTimeout(() => setNotification(null), 300);
      }, 3000);
    } catch (err: any) {
      console.error('Sync error:', err);
      setError(err.message || 'Nepodařilo se synchronizovat data');
      setNotification('✗ Chyba při synchronizaci');
      setTimeout(() => setShowNotification(false), 5000);
    } finally {
      setIsLoading(false);
    }
  };

  // Ovládání zařízení s Firebase aktualizací
  const controlDevice = async (deviceId: string, commands: any[]) => {
    if (!currentUser) return;

    setIsControlling(deviceId);
    try {
      console.log('Controlling device:', deviceId, 'Commands:', commands);

      await new Promise((resolve) => setTimeout(resolve, 1000));

      const updatedDevices = devices.map((device) => {
        if (device.id === deviceId) {
          const updatedStatus =
            device.status?.map((status) => {
              const command = commands.find((cmd) => cmd.code === status.code);
              return command ? { ...status, value: command.value } : status;
            }) || null;

          return {
            ...device,
            status: updatedStatus,
            lastUpdated: Date.now(),
          };
        }
        return device;
      });

      await firestoreService.saveUserDevices(currentUser.uid, updatedDevices);

      const deviceElement = document.querySelector(
        `[data-device-id="${deviceId}"]`
      );
      if (deviceElement) {
        deviceElement.classList.add('action-success');
        setTimeout(() => deviceElement.classList.remove('action-success'), 600);
      }

      console.log('Device controlled successfully');
    } catch (error) {
      console.error('Error controlling device:', error);
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      alert(`Chyba při ovládání zařízení: ${errorMessage}`);
    } finally {
      setIsControlling(null);
    }
  };

  // Funkce pro přepnutí switch
  const toggleSwitch = async (
    deviceId: string,
    switchCode: string,
    currentValue: boolean
  ) => {
    const commands = [
      {
        code: switchCode,
        value: !currentValue,
      },
    ];
    await controlDevice(deviceId, commands);
  };

  const handleRoomChange = async (deviceId: string, roomId: string | null) => {
    try {
      const device = devicesData.find((d) => d.id === deviceId);
      if (device?.roomId) {
        await removeDeviceFromRoom(device.roomId, deviceId);
      }

      if (roomId) {
        await addDeviceToRoom(roomId, deviceId);
      }

      const updatedDevices = devicesData.map((d) =>
        d.id === deviceId ? { ...d, roomId: roomId || undefined } : d
      );
      setDevicesData(updatedDevices);

      console.log('Device room changed successfully');
    } catch (error) {
      console.error('Error changing device room:', error);
      alert('Chyba při změně místnosti');
    }
  };

  if (roomsLoading) {
    return (
      <div className="app-layout">
        <div className="modern-loading-state">
          <div className="loading-animation">
            <div className="loading-spinner-large"></div>
            <div className="loading-dots">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
          <h2 className="loading-title">Načítám místnosti...</h2>
          <p className="loading-description">
            Připravujeme váš smart home dashboard
          </p>
        </div>
      </div>
    );
  }

  if (error || firebaseError) {
    return (
      <div className="app-layout">
        <div className="modern-error-state">
          <div className="error-animation">
            <div className="error-icon">⚠️</div>
            <div className="error-pulse"></div>
          </div>
          <h2 className="error-title">Něco se pokazilo</h2>
          <p className="error-description">
            Nepodařilo se načíst data: {error || firebaseError}
          </p>
          <div className="error-actions">
            <button
              onClick={syncTuyaWithFirebase}
              className="btn btn-modern btn-primary error-retry-btn"
            >
              <span className="btn-icon">🔄</span>
              Zkusit znovu
            </button>
            <button
              onClick={() => window.location.reload()}
              className="btn btn-modern btn-outline-secondary"
            >
              <span className="btn-icon">↻</span>
              Obnovit stránku
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Získej zařízení podle aktuálního zobrazení
  const getDisplayedDevices = (): TuyaDevice[] => {
    switch (currentView) {
      case 'all':
        return devicesData;
      case 'room':
      case '2d-view':
        if (!selectedRoomId) return [];
        return getRoomDevices(selectedRoomId, devicesData);
      case 'unassigned':
        return getUnassignedDevices(devicesData);
      default:
        return devicesData;
    }
  };

  const displayedDevices = getDisplayedDevices();

  return (
    <div className="app-layout">
      <header className="app-header modern-header">
        <div className="header-brand">
          <div className="brand-logo">
            <span className="logo-icon">🏠</span>
            <h1 className="brand-title">IoTuyApp</h1>
          </div>
          <p className="brand-subtitle">Smart Home Dashboard</p>
        </div>

        <div className="header-actions">
          <div className="user-info">
            <div className="user-avatar">
              <span className="avatar-icon">👤</span>
            </div>
            <div className="user-details">
              <span className="user-name">
                {currentUser.displayName || 'Uživatel'}
              </span>
              <span className="user-email">{currentUser.email}</span>
            </div>
          </div>

          <button
            onClick={() => {
              document.documentElement.classList.toggle('dark-theme');
              const isDark =
                document.documentElement.classList.contains('dark-theme');
              localStorage.setItem('theme', isDark ? 'dark' : 'light');
            }}
            className="btn btn-modern btn-theme-toggle"
            title="Přepnout tmavý/světlý režim"
          >
            <span className="btn-icon">🌙</span>
          </button>

          <button onClick={logout} className="btn btn-modern btn-logout">
            <span className="btn-icon">↗</span>
            Odhlásit
          </button>
        </div>
      </header>

      {/* Dashboard Header */}
      <div className="dashboard-container">
        <div className="dashboard-header">
          <div>
            <h1 className="dashboard-title">Smart Home Dashboard</h1>
            <p className="dashboard-subtitle">Ovládejte svůj chytrý domov</p>
          </div>
          <div className="dashboard-quick-actions">
            <button className="quick-action-btn" title="Přidat zařízení">
              <span>➕</span>
              Přidat zařízení
            </button>
            <button className="quick-action-btn" title="Synchronizovat">
              <span>🔄</span>
              Synchronizovat
            </button>
          </div>
        </div>
        
        <RoomSelector onCreateRoom={() => console.log('create room')} />

        <div className="dashboard-grid">
          {/* Weather card */}
          <div className="dashboard-card weather-card">
            <div className="card-header">
              <h3 className="card-title">Počasí</h3>
              <span className="weather-icon">☀️</span>
            </div>
            <div className="weather-info">
              <div>
                <h2 className="weather-temp">22°C</h2>
                <p className="weather-desc">Slunečno</p>
              </div>
            </div>
          </div>

          {/* Devices card */}
          <div className="dashboard-card">
            <div className="card-header">
              <h3 className="card-title">Zařízení v místnosti</h3>
              <span className="card-icon">🏠</span>
            </div>
            <div className="device-tiles">
              {devices.map(device => (
                <div key={device.id} className={`device-tile ${device.online ? 'active' : ''}`}>
                  <span className="device-tile-icon">{getDeviceIcon(device)}</span>
                  <h4 className="device-tile-name">{device.name}</h4>
                  <p className="device-tile-status">{device.online ? 'Online' : 'Offline'}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Family info card */}
          <div className="dashboard-card family-card">
            <div className="card-header">
              <h3 className="card-title">Rodinné události</h3>
              <span className="card-icon">👨‍👩‍👧‍👦</span>
            </div>
            <div className="family-event">
              <div className="event-info">
                <h4>Narozeniny - Jana</h4>
                <p>Zítra</p>
              </div>
            </div>
          </div>

          {/* Kalendář Widget */}
          <CalendarProvider>
            <div className="calendar-section">
              <CalendarMiniWidget 
                familyMembers={[
                  { id: '1', name: 'Mamka', color: '#ff6b6b', icon: '❤️' },
                  { id: '2', name: 'Taťka', color: '#4ecdc4', icon: '🦸‍♂️' },
                  { id: '3', name: 'Johanka', color: '#45b7d1', icon: '🎨' },
                  { id: '4', name: 'Jareček', color: '#96ceb4', icon: '📱' }
                ]}
              />
            </div>
          </CalendarProvider>

          {/* Cameras card */}
          <div className="dashboard-card">
            <div className="card-header">
              <h3 className="card-title">Kamery</h3>
              <span className="card-icon">📹</span>
            </div>
            <div className="cameras-grid">
              <div className="camera-preview">
                Hlavní vchod
              </div>
              <div className="camera-preview">
                Zahrada
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Kompaktní navigace */}
      <div className="compact-navigation">
        <div className="nav-quick-tabs">
          <button
            onClick={() => setCurrentView('all')}
            className={`nav-quick-tab ${currentView === 'all' ? 'active' : ''}`}
          >
            <span>📋</span>
            Všechna zařízení
            <span className="nav-badge">{devicesData.length}</span>
          </button>

          <button
            onClick={() => setCurrentView('unassigned')}
            className={`nav-quick-tab ${
              currentView === 'unassigned' ? 'active' : ''
            }`}
          >
            <span>📦</span>
            Nepřiřazená
            <span className="nav-badge">
              {getUnassignedDevices(devicesData).length}
            </span>
          </button>

          {selectedRoom && (
            <button
              onClick={() => setCurrentView('room')}
              className={`nav-quick-tab ${
                currentView === 'room' ? 'active' : ''
              }`}
            >
              <span>🏠</span>
              {selectedRoom.name}
              <span className="nav-badge">
                {getRoomDevices(selectedRoom.id, devicesData).length}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Content Container */}
      <div className="devices-container">
        {currentView === '2d-view' ? (
          selectedRoom ? (
            <RoomVisualization2D
              room={selectedRoom}
              devices={devicesData}
              onDevicePositionChange={handleDevicePositionChange}
              onDeviceSelect={(device: TuyaDevice | null) => {
                console.log('Device selected:', device);
              }}
            />
          ) : (
            <div className="no-devices">
              <h3>Vyberte místnost pro 2D pohled</h3>
              <p>
                Pro zobrazení 2D vizualizace vyberte místnost v levém panelu.
              </p>
            </div>
          )
        ) : currentView === '3d-view' ? (
          selectedRoom ? (
            <>
              {console.log('=== 3D VIEW DEBUG ===', {
                selectedRoom: selectedRoom,
                allDevices: devicesData.length,
                roomDevices: getRoomDevices(selectedRoom.id, devicesData),
                devicesWithRoomId: devicesData.filter(
                  (d) => d.roomId === selectedRoom.id
                ),
              })}
              <RoomVisualization3D
                room={selectedRoom}
                devices={devicesData}
                onDevicePositionChange={(deviceId, position) =>
                  handleDevicePositionChange(deviceId, {
                    x: position.x,
                    y: position.z,
                  })
                }
                onDeviceSelect={(device: TuyaDevice | null) => {
                  console.log('3D Device selected:', device);
                }}
              />
            </>
          ) : (
            <div className="no-devices">
              <h3>Vyberte místnost pro 3D pohled</h3>
              <p>
                Pro zobrazení 3D vizualizace vyberte místnost v levém panelu.
              </p>
            </div>
          )
        ) : displayedDevices.length === 0 ? (
          <main className="content-area">
            <div className="empty-state">
              <div className="empty-state-icon">
                {currentView === 'room' && selectedRoom
                  ? selectedRoom.icon || '🏠'
                  : currentView === 'unassigned'
                  ? '📦'
                  : '📋'}
              </div>
              <h3 className="empty-state-title">
                {currentView === 'room' && selectedRoom
                  ? 'Místnost je prázdná'
                  : currentView === 'unassigned'
                  ? 'Vše je organizované'
                  : 'Žádná zařízení'}
              </h3>
              <p className="empty-state-description">
                {currentView === 'room' && selectedRoom
                  ? `V místnosti "${selectedRoom.name}" nejsou žádná zařízení. Přidejte zařízení pomocí správy místností.`
                  : currentView === 'unassigned'
                  ? 'Všechna zařízení jsou přiřazená do místností. Skvělá práce s organizací!'
                  : 'Proveďte synchronizaci nebo zkontrolujte připojení k Tuya Cloud.'}
              </p>
              <div className="empty-state-actions">
                {currentView === 'room' ? (
                  <button
                    onClick={() => setCurrentView('all')}
                    className="btn btn-modern btn-primary"
                  >
                    <span className="btn-icon">📋</span>
                    Zobrazit všechna zařízení
                  </button>
                ) : (
                  <button
                    onClick={syncTuyaWithFirebase}
                    className="btn btn-modern btn-primary"
                  >
                    <span className="btn-icon">🔄</span>
                    Synchronizovat
                  </button>
                )}
              </div>
            </div>
          </main>
        ) : (
          <main className="content-area">
            <div className="content-header">
              <h2 className="content-title">
                {currentView === 'room' && selectedRoom
                  ? `${selectedRoom.icon} ${selectedRoom.name}`
                  : currentView === 'unassigned'
                  ? '📦 Nepřiřazená zařízení'
                  : currentView === 'all'
                  ? '📋 Všechna zařízení'
                  : 'Zařízení'}
              </h2>
              <div className="content-stats">
                <span className="stats-item">
                  <span className="stats-value">{displayedDevices.length}</span>
                  <span className="stats-label">zařízení</span>
                </span>
                <span className="stats-item">
                  <span className="stats-value">
                    {displayedDevices.filter((d) => d.online).length}
                  </span>
                  <span className="stats-label">online</span>
                </span>
              </div>
            </div>

            <div className="devices-modern-grid">
              {isLoading
                ? Array.from({ length: 4 }).map((_, index) => (
                    <div key={`skeleton-${index}`} className="device-skeleton">
                      <div className="skeleton-header">
                        <div className="skeleton-badge"></div>
                        <div className="skeleton-status"></div>
                      </div>
                      <div className="skeleton-title"></div>
                      <div className="skeleton-select"></div>
                      <div className="skeleton-button"></div>
                      <div className="skeleton-footer"></div>
                    </div>
                  ))
                : displayedDevices.map((device) => (
                    <DeviceCard
                      key={device.id}
                      device={device}
                      isControlling={isControlling === device.id}
                      onControl={controlDevice}
                      onToggleSwitch={toggleSwitch}
                      className="device-modern-card"
                      rooms={rooms}
                      onRoomChange={handleRoomChange}
                    />
                  ))}
            </div>
          </main>
        )}
      </div>

      {/* Modern Notification */}
      {notification && (
        <div
          className={`modern-notification ${showNotification ? 'show' : ''}`}
        >
          <div className="notification-content">
            <span className="notification-icon">✓</span>
            <span className="notification-text">{notification}</span>
          </div>
          <div className="notification-progress"></div>
        </div>
      )}
    </div>
  );
}

export default App;
