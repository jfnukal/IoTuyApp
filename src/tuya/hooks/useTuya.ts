// src/tuya/hooks/useTuya.ts
import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { deviceService } from '../../services/deviceService';
import { tuyaService } from '../services/tuyaService';
import { startTuyaAutoSync, type AutoSyncScope } from '../services/tuyaAutoSync';
import type { TuyaDevice } from '../../types';

interface UseTuyaOptions {
  /**
   * Která zařízení má automatická synchronizace držet čerstvá, dokud je
   * komponenta na obrazovce: 'all' (výchozí) = všechna, jinak jejich ID —
   * třeba widget počasí potřebuje jen venkovní teploměr
   */
  autoSync?: AutoSyncScope;
}

export const useTuya = ({ autoSync = 'all' }: UseTuyaOptions = {}) => {
  const { currentUser } = useAuth();
  const [devices, setDevices] = useState<TuyaDevice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Aktuální zařízení — ref, ať refreshDevices nemusí měnit identitu
  const devicesRef = useRef<TuyaDevice[]>([]);
  devicesRef.current = devices;

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

        unsubscribe = await deviceService.subscribeToUserDevices(
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

  // 🔄 Automatická synchronizace s Tuya — jedna na celou stránku, řízená
  // stářím dat a jen když je obrazovka zapnutá (viz tuyaAutoSync.ts)
  const autoSyncKey = autoSync === 'all' ? 'all' : autoSync.join(',');
  useEffect(() => {
    if (!currentUser) return;
    return startTuyaAutoSync(
      currentUser.uid,
      autoSyncKey === 'all' ? 'all' : autoSyncKey.split(',')
    );
  }, [currentUser, autoSyncKey]);

  /**
   * 🔄 Plná synchronizace: Tuya Cloud → Firestore → UI
   * (Discovery nových zařízení)
   */
  const syncDevices = useCallback(async () => {
    if (!currentUser) {
      throw new Error('Uživatel není přihlášen');
    }

    try {
      setIsSyncing(true);
      setError(null);

      await tuyaService.syncToFirestore(currentUser.uid);

      console.log('✅ Tuya: Plná synchronizace dokončena');
    } catch (err: any) {
      console.error('❌ Tuya: Chyba při synchronizaci:', err);
      setError(err.message || 'Nepodařilo se synchronizovat zařízení');
      throw err;
    } finally {
      setIsSyncing(false);
    }
  }, [currentUser]);

  /**
   * 🎮 Ovládání zařízení
   */
  const controlDevice = useCallback(
    async (deviceId: string, commands: { code: string; value: any }[]) => {
      try {
        setError(null);
        await tuyaService.controlDevice(deviceId, commands);
        
        // ✅ Optimistická aktualizace - aktualizuj status v Firestore okamžitě
        const device = devices.find(d => d.id === deviceId);
        if (device) {
          const updatedStatus = [...(device.status || [])];
          
          commands.forEach(cmd => {
            const statusIndex = updatedStatus.findIndex(s => s.code === cmd.code);
            if (statusIndex !== -1) {
              updatedStatus[statusIndex] = { ...updatedStatus[statusIndex], value: cmd.value };
            } else {
              updatedStatus.push({ code: cmd.code, value: cmd.value });
            }
          });
          
          await deviceService.updateDevice(deviceId, { status: updatedStatus });
        }
      } catch (err: any) {
        console.error('❌ Tuya: Chyba při ovládání:', err);
        setError(err.message || 'Nepodařilo se ovládat zařízení');
        throw err;
      }
    },
    [devices]
  );

  /**
   * ⚡ Zapnout zařízení
   */
  const turnOn = useCallback(
    async (deviceId: string) => {
      return controlDevice(deviceId, [{ code: 'switch_1', value: true }]);
    },
    [controlDevice]
  );

  /**
   * ⚡ Vypnout zařízení
   */
  const turnOff = useCallback(
    async (deviceId: string) => {
      return controlDevice(deviceId, [{ code: 'switch_1', value: false }]);
    },
    [controlDevice]
  );

  /**
   * 🔀 Přepnout stav (toggle)
   */
  const toggleDevice = useCallback(
    async (deviceId: string) => {
      const device = devices.find((d) => d.id === deviceId);
      if (!device) {
        throw new Error('Zařízení nenalezeno');
      }

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

  /**
   * 🆕 Ruční obnovení vybraných zařízení hned teď — i když jsou vedená jako
   * offline (příznak mohl být jen chvilkový). Vyhodí chybu, když se Tuya
   * nepodařilo zeptat.
   */
  const refreshDevices = useCallback(async (deviceIds: string[]) => {
    const toRefresh = devicesRef.current.filter((d) => deviceIds.includes(d.id));
    if (toRefresh.length === 0) return 0;

    setIsSyncing(true);
    try {
      return await tuyaService.syncDevicesStatus(toRefresh);
    } finally {
      setIsSyncing(false);
    }
  }, []);

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
    refreshDevices, // 🆕
  };
};