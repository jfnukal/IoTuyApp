import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { firestoreService } from '../services/firestoreService';
import type { TuyaDevice, UserSettings } from '../types';

export const useFirestore = () => {
  const { currentUser } = useAuth();
  const [devices, setDevices] = useState<TuyaDevice[]>([]);
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!currentUser) {
      setDevices([]);
      setUserSettings(null);
      setLoading(false);
      return;
    }

    let devicesUnsubscribe: (() => void) | null = null;

    const loadUserData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Načti uživatelská nastavení
        let settings = await firestoreService.getUserSettings(currentUser.uid);
        if (!settings) {
          settings = await firestoreService.createDefaultUserSettings(
            currentUser.uid,
          );
        }
        setUserSettings(settings);

        // Nastav real-time listener pro devices
        devicesUnsubscribe = await firestoreService.subscribeToUserDevices(
          currentUser.uid,
          setDevices
        );

        setLoading(false);
      } catch (err: any) {
        console.error('Error loading user data:', err);
        setError(err.message || 'Nepodařilo se načíst data');
        setLoading(false);
      }
    };

    loadUserData();

    // Cleanup funkce
    return () => {
      devicesUnsubscribe?.();
    };
  }, [currentUser]);

  const updateSettings = async (updates: Partial<UserSettings>) => {
    if (!currentUser || !userSettings) return;

    try {
      await firestoreService.updateUserSettings(currentUser.uid, updates);
      setUserSettings({ ...userSettings, ...updates, updatedAt: Date.now() });
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  const syncDevices = async (newDevices: TuyaDevice[]) => {
    if (!currentUser) throw new Error('Not authenticated');

    try {
      await firestoreService.saveUserDevices(currentUser.uid, newDevices);
      // Devices se aktualizují automaticky přes listener
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  return {
    devices,
    userSettings,
    loading,
    error,
    updateSettings,
    syncDevices,
  };
};

// Export také jako useUserData pro zpětnou kompatibilitu
export const useUserData = useFirestore;