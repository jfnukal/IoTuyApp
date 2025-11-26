// src/hooks/useTuya.ts
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { firestoreService } from '../../services/firestoreService';
import { tuyaService } from '../services/tuyaService';
import type { TuyaDevice } from '../../types';

export const useTuya = () => {
  const { currentUser } = useAuth();
  const [devices, setDevices] = useState<TuyaDevice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 📡 Real-time subscribe k Firestore
  useEffect(() => {
    if (!currentUser) {
      setDevices([]);
      setIsLoading(false);
      return;
    }

    let unsubscribe: (() => void) | null = null;

    const setupSubscription = async () => {
      try {
        setIsLoading(true);
        setError(null);

        unsubscribe = await firestoreService.subscribeToUserDevices(
          currentUser.uid,
          (devicesFromDB) => {
            setDevices(devicesFromDB);
            setIsLoading(false);
          }
        );
      } catch (err: any) {
        console.error('❌ Tuya: Chyba při připojení:', err);
        setError(err.message || 'Nepodařilo se načíst zařízení');
        setIsLoading(false);
      }
    };

    setupSubscription();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [currentUser]);

  /**
   * 🔄 Synchronizace: Tuya Cloud → Firestore → UI
   */
  const syncDevices = useCallback(async () => {
    if (!currentUser) {
      throw new Error('Uživatel není přihlášen');
    }

    try {
      setIsSyncing(true);
      setError(null);

      await tuyaService.syncToFirestore(currentUser.uid);

    } catch (err: any) {
      console.error('❌ Tuya: Chyba při synchronizaci:', err);
      setError(err.message || 'Nepodařilo se synchronizovat zařízení');
      throw err;
    } finally {
      setIsSyncing(false);
    }
  }, [currentUser]);

  /**
   * 🎮 Ovládání zařízení (obecné)
   */
const controlDevice = useCallback(
    async (deviceId: string, commands: { code: string; value: any }[]) => {
      try {
        setError(null);
        await tuyaService.controlDevice(deviceId, commands);
        // ✅ ODSTRANĚNO: Plná synchronizace po každé akci
        // Firestore se aktualizuje automaticky přes real-time listener
        // Pokud chceš refresh, použij manuálně syncDevices()
      } catch (err: any) {
        console.error('❌ Tuya: Chyba při ovládání:', err);
        setError(err.message || 'Nepodařilo se ovládat zařízení');
        throw err;
      }
    },
    []
  );

  /**
   * 💡 Zapnout zařízení
   */
  const turnOn = useCallback(
    async (deviceId: string) => {
      return controlDevice(deviceId, [{ code: 'switch_1', value: true }]);
    },
    [controlDevice]
  );

  /**
   * 🌑 Vypnout zařízení
   */
  const turnOff = useCallback(
    async (deviceId: string) => {
      return controlDevice(deviceId, [{ code: 'switch_1', value: false }]);
    },
    [controlDevice]
  );

  /**
   * 🔄 Přepnout stav (toggle)
   */
  const toggleDevice = useCallback(
    async (deviceId: string) => {
      const device = devices.find((d) => d.id === deviceId);
      if (!device) {
        throw new Error('Zařízení nenalezeno');
      }

      // Najdi switch_1 status
      const switchStatus = device.status?.find((s) => s.code === 'switch_1');
      const currentState = switchStatus?.value === true;

      return currentState ? turnOff(deviceId) : turnOn(deviceId);
    },
    [devices, turnOn, turnOff]
  );

  /**
   * 🔍 Získat jedno zařízení podle ID
   */
  const getDevice = useCallback(
    (deviceId: string): TuyaDevice | undefined => {
      return devices.find((d) => d.id === deviceId);
    },
    [devices]
  );

  /**
   * 📊 Získat zařízení podle kategorie
   */
  const getDevicesByCategory = useCallback(
    (category: string): TuyaDevice[] => {
      return devices.filter((d) => d.category === category);
    },
    [devices]
  );

  /**
   * 🟢 Získat pouze online zařízení
   */
  const getOnlineDevices = useCallback((): TuyaDevice[] => {
    return devices.filter((d) => d.online);
  }, [devices]);

  return {
    // Data
    devices,
    onlineDevices: getOnlineDevices(),
    deviceCount: devices.length,
    onlineCount: getOnlineDevices().length,

    // States
    isLoading,
    isSyncing,
    error,

    // Methods
    syncDevices,
    controlDevice,
    turnOn,
    turnOff,
    toggleDevice,
    getDevice,
    getDevicesByCategory,
  };

};
