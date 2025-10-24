// src/hooks/useHeaderConfig.ts
import { useState, useEffect } from 'react';
import { firestoreService } from '../services/firestoreService';
import type { HeaderSlotConfig } from '../types';

export const useHeaderConfig = () => {
  const [headerConfig, setHeaderConfig] = useState<HeaderSlotConfig>({
    left: 'greeting',
    center: 'upcoming',
    right: 'weather',
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    const loadConfig = async () => {
      try {
        setLoading(true);
        
        // Načteme konfiguraci
        const config = await firestoreService.getHeaderConfig();
        setHeaderConfig(config);

        // Nastavíme real-time listener
        unsubscribe = firestoreService.subscribeToHeaderConfig((newConfig) => {
          setHeaderConfig(newConfig);
        });

        setError(null);
      } catch (err) {
        console.error('❌ Chyba při načítání header config:', err);
        setError('Nepodařilo se načíst konfiguraci hlavičky');
      } finally {
        setLoading(false);
      }
    };

    loadConfig();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  const updateSlot = async (
    slot: 'left' | 'center' | 'right',
    widgetType: HeaderSlotConfig[keyof HeaderSlotConfig]
  ) => {
    try {
      const newConfig = {
        ...headerConfig,
        [slot]: widgetType,
      };
      
      await firestoreService.updateHeaderConfig(newConfig);
      setHeaderConfig(newConfig);
      setError(null);
    } catch (err) {
      console.error('❌ Chyba při aktualizaci slotu:', err);
      setError('Nepodařilo se aktualizovat konfiguraci');
      throw err;
    }
  };

  return {
    headerConfig,
    loading,
    error,
    updateSlot,
  };
};