// src/tuya/hooks/useRooms.ts
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { firestoreService } from '../../services/firestoreService';
import type { Room } from '../../types';

export const useRooms = () => {
  const { currentUser } = useAuth();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Real-time subscribe k místnostem
  useEffect(() => {
    if (!currentUser) {
      setRooms([]);
      setIsLoading(false);
      return;
    }

    console.log('🏠 Rooms: Připojuji k Firestore...');
    let unsubscribe: (() => void) | null = null;

    const setupSubscription = async () => {
      try {
        setIsLoading(true);
        setError(null);

        unsubscribe = await firestoreService.subscribeToUserRooms(
          currentUser.uid,
          (roomsFromDB) => {
            console.log(`✅ Rooms: Načteno ${roomsFromDB.length} místností z DB`);
            setRooms(roomsFromDB);
            setIsLoading(false);
          }
        );
      } catch (err: any) {
        console.error('❌ Rooms: Chyba při připojení:', err);
        setError(err.message || 'Nepodařilo se načíst místnosti');
        setIsLoading(false);
      }
    };

    setupSubscription();

    return () => {
      if (unsubscribe) {
        console.log('🏠 Rooms: Odpojuji od Firestore');
        unsubscribe();
      }
    };
  }, [currentUser]);

  /**
   * Vytvoř novou místnost
   */
  const createRoom = useCallback(
    async (roomData: Omit<Room, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => {
      if (!currentUser) throw new Error('Uživatel není přihlášen');

      try {
        setError(null);
        console.log('🏠 Vytvářím místnost:', roomData.name);
        const roomId = await firestoreService.createRoom(currentUser.uid, roomData);
        console.log('✅ Místnost vytvořena:', roomId);
        return roomId;
      } catch (err: any) {
        console.error('❌ Chyba při vytváření místnosti:', err);
        setError(err.message || 'Nepodařilo se vytvořit místnost');
        throw err;
      }
    },
    [currentUser]
  );

  /**
   * Aktualizuj místnost
   */
  const updateRoom = useCallback(
    async (roomId: string, updates: Partial<Room>) => {
      try {
        setError(null);
        console.log('🏠 Aktualizuji místnost:', roomId);
        await firestoreService.updateRoom(roomId, updates);
        console.log('✅ Místnost aktualizována');
      } catch (err: any) {
        console.error('❌ Chyba při aktualizaci místnosti:', err);
        setError(err.message || 'Nepodařilo se aktualizovat místnost');
        throw err;
      }
    },
    []
  );

  /**
   * Smaž místnost
   */
  const deleteRoom = useCallback(
    async (roomId: string) => {
      try {
        setError(null);
        console.log('🏠 Mažu místnost:', roomId);
        await firestoreService.deleteRoom(roomId);
        console.log('✅ Místnost smazána');
      } catch (err: any) {
        console.error('❌ Chyba při mazání místnosti:', err);
        setError(err.message || 'Nepodařilo se smazat místnost');
        throw err;
      }
    },
    []
  );

  /**
   * Přidej zařízení do místnosti
   */
  const addDeviceToRoom = useCallback(
    async (roomId: string, deviceId: string) => {
      try {
        setError(null);
        console.log('🏠 Přidávám zařízení do místnosti:', deviceId, '→', roomId);
        await firestoreService.addDeviceToRoom(roomId, deviceId);
        
        // Aktualizuj i device v DB aby mělo roomId
        await firestoreService.updateDevice(deviceId, { roomId });
        
        console.log('✅ Zařízení přidáno do místnosti');
      } catch (err: any) {
        console.error('❌ Chyba při přidávání zařízení:', err);
        setError(err.message || 'Nepodařilo se přidat zařízení');
        throw err;
      }
    },
    []
  );

  /**
   * Odeber zařízení z místnosti
   */
  const removeDeviceFromRoom = useCallback(
    async (roomId: string, deviceId: string) => {
      try {
        setError(null);
        console.log('🏠 Odebírám zařízení z místnosti:', deviceId);
        await firestoreService.removeDeviceFromRoom(roomId, deviceId);
        
        // Odstraň roomId z device
        await firestoreService.updateDevice(deviceId, { roomId: undefined });
        
        console.log('✅ Zařízení odebráno z místnosti');
      } catch (err: any) {
        console.error('❌ Chyba při odebírání zařízení:', err);
        setError(err.message || 'Nepodařilo se odebrat zařízení');
        throw err;
      }
    },
    []
  );

  /**
   * Získej místnost podle ID
   */
  const getRoom = useCallback(
    (roomId: string): Room | undefined => {
      return rooms.find((r) => r.id === roomId);
    },
    [rooms]
  );

  /**
   * Získej zařízení v místnosti
   */
  const getRoomDevices = useCallback(
    (roomId: string): string[] => {
      const room = rooms.find((r) => r.id === roomId);
      return room?.devices || [];
    },
    [rooms]
  );

  return {
    // Data
    rooms,
    roomCount: rooms.length,

    // States
    isLoading,
    error,

    // Methods
    createRoom,
    updateRoom,
    deleteRoom,
    addDeviceToRoom,
    removeDeviceFromRoom,
    getRoom,
    getRoomDevices,
  };
};