// src/tuya/hooks/useTuya.ts
import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { deviceService } from '../../services/deviceService';
import { tuyaService } from '../services/tuyaService';
import { settingsService, type TuyaSyncSettings } from '../../services/settingsService';
import type { TuyaDevice } from '../../types';

export const useTuya = () => {
  const { currentUser } = useAuth();
  const [devices, setDevices] = useState<TuyaDevice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 🆕 Refs pro intervaly (aby se daly čistit)
  const criticalIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const standardIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const passiveIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const discoveryIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const syncSettingsRef = useRef<TuyaSyncSettings | null>(null);

  // Aktuální zařízení pro sync intervaly — ref, aby smyčky vždy viděly
  // čerstvý stav (online/offline, kategorie) a ne snímek z doby spuštění
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

  // 🆕 Auto-sync logika
  useEffect(() => {
    if (!currentUser || devices.length === 0) {
      return;
    }

    const setupAutoSync = async () => {
      try {
        const settings = await settingsService.loadSettings();
        const tuyaSync = settings.systemSettings.tuyaSync;
        syncSettingsRef.current = tuyaSync;

        // Vyčisti předchozí intervaly
        clearAllIntervals();

        if (!tuyaSync?.enabled) {
          console.log('⏸️ Tuya auto-sync je vypnutý');
          return;
        }

        // Pomocná funkce pro výpočet intervalu (s nočním režimem)
        const getInterval = (baseMinutes: number): number => {
          if (tuyaSync.nightModeEnabled) {
            const hour = new Date().getHours();
            const isNight = tuyaSync.nightModeStart > tuyaSync.nightModeEnd
              ? (hour >= tuyaSync.nightModeStart || hour < tuyaSync.nightModeEnd)
              : (hour >= tuyaSync.nightModeStart && hour < tuyaSync.nightModeEnd);
            
            if (isNight) {
              return baseMinutes * 2 * 60 * 1000;
            }
          }
          return baseMinutes * 60 * 1000;
        };

        // Data pro sync se čtou z ref až v okamžiku každého ticku
        const getDevicesForSync = () =>
          devicesRef.current.map(d => ({
            id: d.id,
            category: d.category,
            online: d.online,
          }));

        // Pasivní kategorie = vše co není critical ani standard
        const getPassiveCategories = () =>
          [...new Set(devicesRef.current.map(d => d.category))]
            .filter(cat =>
              !tuyaSync.criticalCategories.includes(cat) &&
              !tuyaSync.standardCategories.includes(cat)
            );

        // 🔴 Critical interval
        if (tuyaSync.criticalCategories.length > 0) {
          const criticalMs = getInterval(tuyaSync.intervals.critical);
          
          criticalIntervalRef.current = setInterval(async () => {
            await tuyaService.syncDevicesByCategory(
              getDevicesForSync(),
              tuyaSync.criticalCategories,
              tuyaSync.syncOnlyOnline
            );
          }, criticalMs);
        }

        // 🟡 Standard interval
        if (tuyaSync.standardCategories.length > 0) {
          const standardMs = getInterval(tuyaSync.intervals.standard);
          
          standardIntervalRef.current = setInterval(async () => {
            await tuyaService.syncDevicesByCategory(
              getDevicesForSync(),
              tuyaSync.standardCategories,
              tuyaSync.syncOnlyOnline
            );
          }, standardMs);
        }

        // 🟢 Passive interval
        if (getPassiveCategories().length > 0) {
          const passiveMs = getInterval(tuyaSync.intervals.passive);

          passiveIntervalRef.current = setInterval(async () => {
            await tuyaService.syncDevicesByCategory(
              getDevicesForSync(),
              getPassiveCategories(),
              tuyaSync.syncOnlyOnline
            );
          }, passiveMs);
        }

        // 🔍 Discovery interval (plná synchronizace - hledání nových zařízení)
        if (tuyaSync.intervals.discovery && tuyaSync.intervals.discovery > 0) {
          const discoveryMs = tuyaSync.intervals.discovery * 60 * 1000;
          
          discoveryIntervalRef.current = setInterval(async () => {
            try {
              await tuyaService.syncToFirestore(currentUser.uid);
            } catch (err) {
              console.error('❌ Discovery sync selhal:', err);
            }
          }, discoveryMs);
        }

      } catch (err) {
        console.error('❌ Chyba při nastavení auto-sync:', err);
      }
    };

    // Spusť setup po krátkém zpoždění (aby se načetly devices)
    const timeoutId = setTimeout(setupAutoSync, 2000);

    return () => {
      clearTimeout(timeoutId);
      clearAllIntervals();
    };
  }, [currentUser, devices.length]); // Spustí se znovu když se změní počet zařízení

  // 🧹 Pomocná funkce pro vyčištění intervalů
  const clearAllIntervals = () => {
    if (criticalIntervalRef.current) {
      clearInterval(criticalIntervalRef.current);
      criticalIntervalRef.current = null;
    }
    if (standardIntervalRef.current) {
      clearInterval(standardIntervalRef.current);
      standardIntervalRef.current = null;
    }
    if (passiveIntervalRef.current) {
      clearInterval(passiveIntervalRef.current);
      passiveIntervalRef.current = null;
    }
    if (discoveryIntervalRef.current) {
      clearInterval(discoveryIntervalRef.current);
      discoveryIntervalRef.current = null;
    }
  };

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
   * 🆕 Manuální sync konkrétní kategorie
   */
  const syncCategory = useCallback(
    async (categories: string[]) => {
      if (!currentUser || devices.length === 0) return 0;

      const devicesForSync = devices.map(d => ({
        id: d.id,
        category: d.category,
        online: d.online,
      }));

      const syncOnlyOnline = syncSettingsRef.current?.syncOnlyOnline ?? true;

      return tuyaService.syncDevicesByCategory(
        devicesForSync,
        categories,
        syncOnlyOnline
      );
    },
    [currentUser, devices]
  );

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
    syncCategory, // 🆕
  };
};