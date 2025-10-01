import React, { useState, useEffect } from 'react';
import './styles/index.css';
import { useAuth } from './contexts/AuthContext';
import { useFirestore } from './hooks/useFirestore';
import { useRooms } from './hooks/useRooms';
import Login from './components/Login';
// import RoomSelector from './components/RoomSelector';
import DeviceCard from './components/DeviceCard';
import { firestoreService } from './services/firestoreService';
import type { TuyaDevice } from './types';
import RoomVisualization2D from './components/RoomVisualization2D';
import RoomVisualization3D from './components/RoomVisualization3D';
// import CalendarMiniWidget from './components/Widgets/Calendar/CalendarMiniWidget';
import CalendarProvider from './components/Widgets/Calendar/CalendarProvider';
// import WeatherMiniWidget from './components/Widgets/Weather/WeatherMiniWidget';
import DashboardLayout from './components/Dashboard/DashboardLayout';

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

  // TEST BAKALÁŘI API
useEffect(() => {
  const testBakalari = async () => {
    console.log('🔍 Testování Bakaláři API...');
    
    try {
      const { bakalariAPI } = await import('./api/bakalariAPI');
      
      const timetable = await bakalariAPI.getTimetable();
      console.log('✅ Rozvrh:', timetable);
      
      const lunch = await bakalariAPI.getLunchMenu();
      console.log('✅ Obědy:', lunch);
    } catch (error) {
      console.error('❌ Bakaláři API Chyba:', error);
    }
  };
  
  testBakalari();
}, []); // Spustí se jen jednou při načtení

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

      <CalendarProvider>
        <DashboardLayout 
          onNavigateToSettings={() => {
            console.log('Navigate to settings...');
            // TODO: Přidáme navigaci na settings později
          }}
        />
      </CalendarProvider>

      <div id="modal-root"></div>

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
