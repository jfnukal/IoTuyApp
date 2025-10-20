import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { firestoreService } from '../services/firestoreService';
import type { TuyaDevice, UserSettings, FamilyMember } from '../types/index';

export const useFirestore = () => {
  const { currentUser } = useAuth();
  const [devices, setDevices] = useState<TuyaDevice[]>([]);
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]); 
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!currentUser) {
      setDevices([]);
      setUserSettings(null);
      setFamilyMembers([]); 
      setLoading(false);
      return;
    }

    let devicesUnsubscribe: (() => void) | null = null;
    let familyUnsubscribe: (() => void) | null = null;

    const loadUserData = async () => {
      try {
        setLoading(true);
        setError(null);

        const settings = await firestoreService.getUserSettings(
          currentUser.uid
        );
        setUserSettings(settings);

        devicesUnsubscribe = await firestoreService.subscribeToUserDevices(
          currentUser.uid,
          setDevices
        );

        familyUnsubscribe = await firestoreService.subscribeToFamilyMembers(
          (membersFromDB) => {
            setFamilyMembers(membersFromDB);
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
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  return {
    devices,
    userSettings,
    familyMembers,
    loading,
    error,
    updateSettings,
    syncDevices,
  };
};

export const useUserData = useFirestore;
