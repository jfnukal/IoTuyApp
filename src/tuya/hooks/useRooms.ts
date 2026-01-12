// src/tuya/hooks/useRooms.ts
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { roomService } from '../../services/roomService';
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

        unsubscribe = await roomService.subscribeToUserRooms(
          currentUser.uid,
          (roomsFromDB) => {
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
    async (
      roomData: Omit<Room, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
    ) => {
      if (!currentUser) throw new Error('Uživatel není přihlášen');

      try {
        setError(null);
        // console.log('🏠 Vytvářím místnost:', roomData.name);
        const roomId = await roomService.createRoom(
          currentUser.uid,
          roomData
        );
        // console.log('✅ Místnost vytvořena:', roomId);
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
        // console.log('🏠 Aktualizuji místnost:', roomId);
        await roomService.updateRoom(roomId, updates);
        // console.log('✅ Místnost aktualizována');
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
  const deleteRoom = useCallback(async (roomId: string) => {
    try {
      setError(null);
      // console.log('🏠 Mažu místnost:', roomId);
      await roomService.deleteRoom(roomId);
      // console.log('✅ Místnost smazána');
    } catch (err: any) {
      console.error('❌ Chyba při mazání místnosti:', err);
      setError(err.message || 'Nepodařilo se smazat místnost');
      throw err;
    }
  }, []);

  /**
   * ⚛️ Přiřadí zařízení k místnosti / přesune / odebere
   */
  const assignDeviceToRoom = useCallback(
    async (
      deviceId: string,
      newRoomId: string | null | undefined,
      oldRoomId: string | null | undefined
    ) => {
      // Pokud se nic nemění, nic nedělej
      if (newRoomId === oldRoomId) return;

      try {
        setError(null);

        // Zavoláme naši novou atomickou funkci
        await roomService.assignDeviceToRoom(
          deviceId,
          newRoomId,
          oldRoomId
        );

        // console.log('✅ Zařízení úspěšně přesunuto');
      } catch (err: any) {
        console.error('❌ Chyba při přesouvání zařízení:', err);
        setError(err.message || 'Nepodařilo se přesunout zařízení');
        throw err;
      }
    },
    [] // Tento hook nezávisí na ničem (currentUser nepotřebuje, řeší to pravidla DB)
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
    assignDeviceToRoom,
    deleteRoom,
    getRoom,
    getRoomDevices,
  };
};
