// src/hooks/useWidgetSettings.ts
import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import { settingsService, type AppSettings } from '../services/settingsService';

export const useWidgetSettings = () => {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Real-time listener na Firebase dokument
    const docRef = doc(db, 'appSettings', 'main');

    const unsubscribe = onSnapshot(
      docRef,
      async (docSnap) => {
        try {
          if (docSnap.exists()) {
            const data = docSnap.data() as AppSettings;
            setSettings(data);
          } else {
            // Pokud dokument neexistuje, vytvoř výchozí nastavení
            const defaultSettings = await settingsService.loadSettings();
            setSettings(defaultSettings);
          }
        } catch (error) {
          console.error('Chyba při zpracování nastavení:', error);
        } finally {
          setIsLoading(false);
        }
      },
      (error) => {
        console.error('❌ Real-time listener error:', error);
        setIsLoading(false);
      }
    );

    // Cleanup - odpojit listener při unmount
    return () => unsubscribe();
  }, []);

  const reload = async () => {
    try {
      const loadedSettings = await settingsService.loadSettings();
      setSettings(loadedSettings);
    } catch (error) {
      console.error('Chyba při načítání nastavení:', error);
    }
  };

  return {
    settings,
    isLoading,
    reload,
  };
};
