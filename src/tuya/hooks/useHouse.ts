// src/hooks/useHouse.ts
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { houseService } from '../services/houseService';
import type { House, Floor, Room } from '../../types/visualization';

export const useHouse = () => {
  const { currentUser } = useAuth();
  const [house, setHouse] = useState<House | null>(null);
  const [floors, setFloors] = useState<Floor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * 📡 Subscribe k domu
   */
  useEffect(() => {
    if (!currentUser) {
      setHouse(null);
      setFloors([]);
      setIsLoading(false);
      return;
    }

    console.log('🏠 Připojuji k domu...');
    setIsLoading(true);

    const unsubscribe = houseService.subscribeToHouse(
      currentUser.uid,
      async (loadedHouse) => {
        if (loadedHouse) {
          setHouse(loadedHouse);
          setError(null);

          // Načti patra
          try {
            const loadedFloors: Floor[] = [];
            for (const floorId of loadedHouse.floors) {
              const floor = await houseService.getFloor(floorId);
              if (floor) {
                loadedFloors.push(floor);
              }
            }
            setFloors(loadedFloors);
            console.log(`✅ Načteno ${loadedFloors.length} pater`);
          } catch (err: any) {
            console.error('❌ Chyba při načítání pater:', err);
            setError(err.message || 'Nepodařilo se načíst patra');
          }
        } else {
          setHouse(null);
          setFloors([]);
        }
        setIsLoading(false);
      }
    );

    return () => {
      console.log('🏠 Odpojuji od domu');
      unsubscribe();
    };
  }, [currentUser]);

  /**
   * 🏗️ Vytvoř dům pro uživatele
   */
  const initializeHouse = useCallback(async () => {
    if (!currentUser) {
      throw new Error('Uživatel není přihlášen');
    }

    try {
      setIsLoading(true);
      setError(null);
      console.log('🏗️ Vytvářím nový dům...');

      await houseService.createDefaultHouse(currentUser.uid);

      console.log('✅ Dům vytvořen');
    } catch (err: any) {
      console.error('❌ Chyba při vytváření domu:', err);
      setError(err.message || 'Nepodařilo se vytvořit dům');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [currentUser]);

  /**
   * 📌 Umístí zařízení do místnosti
   */
  const placeDevice = useCallback(
    async (deviceId: string, roomId: string, position: { x: number; y: number }) => {
      if (!currentUser) {
        throw new Error('Uživatel není přihlášen');
      }

      try {
        await houseService.placeDeviceInRoom(
          currentUser.uid,
          deviceId,
          roomId,
          position
        );
      } catch (err: any) {
        console.error('❌ Chyba při umísťování zařízení:', err);
        throw err;
      }
    },
    [currentUser]
  );

  /**
   * 🗑️ Odstraní zařízení z místnosti
   */
  const removeDevice = useCallback(
    async (deviceId: string) => {
      if (!currentUser) {
        throw new Error('Uživatel není přihlášen');
      }

      try {
        await houseService.removeDeviceFromRoom(currentUser.uid, deviceId);
      } catch (err: any) {
        console.error('❌ Chyba při odstraňování zařízení:', err);
        throw err;
      }
    },
    [currentUser]
  );

  /**
   * 📝 Přejmenuje místnost
   */
  const renameRoom = useCallback(async (roomId: string, newName: string) => {
    try {
      await houseService.renameRoom(roomId, newName);
    } catch (err: any) {
      console.error('❌ Chyba při přejmenování místnosti:', err);
      throw err;
    }
  }, []);

  /**
   * 🔍 Najdi místnost podle ID
   */
  const getRoom = useCallback(
    async (roomId: string): Promise<Room | null> => {
      try {
        return await houseService.getRoom(roomId);
      } catch (err: any) {
        console.error('❌ Chyba při načítání místnosti:', err);
        return null;
      }
    },
    []
  );

  /**
   * 🏢 Najdi patro podle ID
   */
  const getFloor = useCallback(
    (floorId: string): Floor | undefined => {
      return floors.find((f) => f.id === floorId);
    },
    [floors]
  );

  return {
    // Data
    house,
    floors,

    // States
    isLoading,
    error,

    // Methods
    initializeHouse,
    placeDevice,
    removeDevice,
    renameRoom,
    getRoom,
    getFloor,
  };
};
