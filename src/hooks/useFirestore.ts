//src/hooks/useFirestore.ts

import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { firestoreService } from '../services/firestoreService';
import { deviceService } from '../services/deviceService';
import type {
  TuyaDevice,
  UserSettings,
  FamilyMember,
  CalendarEventData,
} from '../types/index';

export const useFirestore = () => {
  const { currentUser } = useAuth();
  const [devices, setDevices] = useState<TuyaDevice[]>([]);
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [events, setEvents] = useState<CalendarEventData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!currentUser) {
      setDevices([]);
      setUserSettings(null);
      setFamilyMembers([]);
      setEvents([]);
      setLoading(false);
      return;
    }

    let devicesUnsubscribe: (() => void) | null = null;
    let familyUnsubscribe: (() => void) | null = null;
    let eventsUnsubscribe: (() => void) | null = null;

    const loadUserData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Načíst settings
        const settings = await firestoreService.getUserSettings(
          currentUser.uid
        );
        setUserSettings(settings);

        // Subscribe to devices (Tuya)
        devicesUnsubscribe = await deviceService.subscribeToUserDevices(
          currentUser.uid,
          setDevices
        );

        // Subscribe to family members
        familyUnsubscribe = await firestoreService.subscribeToFamilyMembers(
          (membersFromDB) => {
            setFamilyMembers(membersFromDB);
          }
        );

        // Subscribe to calendar events
        eventsUnsubscribe = await firestoreService.subscribeToEvents(
          currentUser.uid,
          (eventsFromDB) => {
            setEvents(eventsFromDB);
          }
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
      familyUnsubscribe?.();
      eventsUnsubscribe?.();
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
      await deviceService.saveUserDevices(currentUser.uid, newDevices);
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  return {
    devices,
    userSettings,
    familyMembers,
    events,
    loading,
    error,
    updateSettings,
    syncDevices,
  };
};

export const useUserData = useFirestore;
