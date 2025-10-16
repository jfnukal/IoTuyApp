import { useState, useEffect } from 'react';
import './styles/index.css';
import { useAuth } from './contexts/AuthContext';
import { useFirestore } from './hooks/useFirestore';
// import { useRooms } from './hooks/useRooms';
import Login from './components/Login';
// import RoomSelector from './components/RoomSelector';
// import DeviceCard from './components/DeviceCard';
import { firestoreService } from './services/firestoreService';
import type { TuyaDevice } from './types';
// import RoomVisualization2D from './components/RoomVisualization2D';
// import RoomVisualization3D from './components/RoomVisualization3D';
import CalendarProvider from './components/Widgets/Calendar/CalendarProvider';
import DashboardLayout from './components/Dashboard/DashboardLayout';
import { NotificationProvider } from './components/Notifications/NotificationProvider';

declare global {
  interface Window {
    lastPositionUpdate?: string | null;
  }
}

function App() {
  // VŠECHNY HOOKY MUSÍ BÝT NA ZAČÁTKU - PŘED JAKÝMKOLIV RETURN!

  // Auth hooks
  const { currentUser } = useAuth();

  // Firestore hooks
  const {
    devices,
    loading: firebaseLoading,
    error: firebaseError,
    syncDevices,
  } = useFirestore();

  const [error, setError] = useState<string | null>(null);

  const [notification, setNotification] = useState<string | null>(null);
  const [showNotification, setShowNotification] = useState(false);
  const [familyMemberId, setFamilyMemberId] = useState<string | undefined>(
    undefined
  );

  // 🔐 Remote Config initialization - MUSÍ BÝT PRVNÍ!
  useEffect(() => {
    const initRemoteConfig = async () => {
      try {
        const { remoteConfigService } = await import(
          './services/remoteConfigService.ts'
        );
        await remoteConfigService.initialize();
        console.log('✅ Remote Config inicializován');
      } catch (error) {
        console.error('❌ Chyba při inicializaci Remote Config:', error);
      }
    };

    initRemoteConfig();
  }, []);

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
      } catch (error) {
        console.error('❌ Bakaláři API Chyba:', error);
      }
    };

    testBakalari();
  }, []); // Spustí se jen jednou při načtení

  // Automatické mazání starých zpráv - 1x denně
  useEffect(() => {
    if (!currentUser) return;

    const runDailyCleanup = async () => {
      try {
        const { familyMessagingService } = await import(
          './services/familyMessagingService'
        );

        // TODO: Toto bude konfigurovatelné v nastavení
        const daysToKeep = 7; // Zatím hardcoded, později z settings

        await familyMessagingService.runCleanup(daysToKeep);
      } catch (error) {
        console.error('Cleanup error:', error);
      }
    };

    // Spustit cleanup při startu
    runDailyCleanup();

    // Spustit každých 24 hodin
    const intervalId = setInterval(runDailyCleanup, 24 * 60 * 60 * 1000);

    return () => clearInterval(intervalId);
  }, [currentUser]);

  // useEffect pro načtení family member podle authUid
  useEffect(() => {
    if (!currentUser) {
      setFamilyMemberId(undefined);
      return;
    }

    const loadFamilyMember = async () => {
      // OKAMŽITĚ nastav výchozí hodnotu (opraví race condition s FCM)
      setFamilyMemberId('dad');

      try {
        console.log('🔍 Hledám family member pro UID:', currentUser.uid);

        // Najdi family member podle authUid
        const member = await firestoreService.getFamilyMemberByAuthUid(
          currentUser.uid
        );

        if (member) {
          setFamilyMemberId(member.id); // ← Tady se PŘEPÍŠE správnou hodnotou!
          console.log(`✅ Přihlášen jako: ${member.name} (${member.id})`);
        } else {
          // Fallback - 'dad' už je nastaveno výše
          console.warn(
            `⚠️ Nepodařilo se najít family member pro UID ${currentUser.uid}`
          );
          console.warn(
            '⚠️ Zkontroluj, že máš v Firestore přidané pole authUid'
          );
        }
      } catch (error) {
        console.error('❌ Chyba při načítání family member:', error);
        // 'dad' už je nastaveno výše jako fallback
      }
    };

    loadFamilyMember();

    if (devices && devices.length > 0) {
      // Zde můžeš přidat další logiku pokud potřebuješ
    }
  }, [currentUser, devices, firebaseLoading]);

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
      // setIsLoading(true);
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
    }
  };

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

  return (
    <div className="app-layout">
      <CalendarProvider>
        <NotificationProvider
          authUid={currentUser?.uid || null}
          familyMemberId={familyMemberId || null}
        >
          <DashboardLayout
            familyMemberId={familyMemberId}  // ← PŘIDEJ PROP
            onNavigateToSettings={() => {
              console.log('Navigate to settings...');
            }}
          />
        </NotificationProvider>
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
