// src/contexts/RoomsContext.tsx
import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { roomService } from '../services/roomService';
import type { Room } from '../types';

interface RoomsContextType {
  rooms: Room[];
  roomCount: number;
  isLoading: boolean;
  error: string | null;
  createRoom: (roomData: Omit<Room, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  updateRoom: (roomId: string, updates: Partial<Room>) => Promise<void>;
  deleteRoom: (roomId: string) => Promise<void>;
  assignDeviceToRoom: (deviceId: string, newRoomId: string | null | undefined, oldRoomId: string | null | undefined) => Promise<void>;
  getRoom: (roomId: string) => Room | undefined;
  getRoomDevices: (roomId: string) => string[];
}

const RoomsContext = createContext<RoomsContextType | null>(null);

export const RoomsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Real-time subscribe k místnostem - JEN JEDNOU
  useEffect(() => {
    if (!currentUser) {
      setRooms([]);
      setIsLoading(false);
      return;
    }

    console.log('🏠 RoomsProvider: Připojuji k Firestore (jednou)');
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
        console.error('❌ RoomsProvider: Chyba:', err);
        setError(err.message || 'Nepodařilo se načíst místnosti');
        setIsLoading(false);
      }
    };

    setupSubscription();

    return () => {
      if (unsubscribe) {
        console.log('🏠 RoomsProvider: Odpojuji od Firestore');
        unsubscribe();
      }
    };
  }, [currentUser]);

  const createRoom = useCallback(
    async (roomData: Omit<Room, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => {
      if (!currentUser) throw new Error('Uživatel není přihlášen');
      try {
        setError(null);
        return await roomService.createRoom(currentUser.uid, roomData);
      } catch (err: any) {
        setError(err.message || 'Nepodařilo se vytvořit místnost');
        throw err;
      }
    },
    [currentUser]
  );

  const updateRoom = useCallback(async (roomId: string, updates: Partial<Room>) => {
    try {
      setError(null);
      await roomService.updateRoom(roomId, updates);
    } catch (err: any) {
      setError(err.message || 'Nepodařilo se aktualizovat místnost');
      throw err;
    }
  }, []);

  const deleteRoom = useCallback(async (roomId: string) => {
    try {
      setError(null);
      await roomService.deleteRoom(roomId);
    } catch (err: any) {
      setError(err.message || 'Nepodařilo se smazat místnost');
      throw err;
    }
  }, []);

  const assignDeviceToRoom = useCallback(
    async (deviceId: string, newRoomId: string | null | undefined, oldRoomId: string | null | undefined) => {
      if (newRoomId === oldRoomId) return;
      try {
        setError(null);
        await roomService.assignDeviceToRoom(deviceId, newRoomId, oldRoomId);
      } catch (err: any) {
        setError(err.message || 'Nepodařilo se přesunout zařízení');
        throw err;
      }
    },
    []
  );

  const getRoom = useCallback((roomId: string): Room | undefined => {
    return rooms.find((r) => r.id === roomId);
  }, [rooms]);

  const getRoomDevices = useCallback((roomId: string): string[] => {
    const room = rooms.find((r) => r.id === roomId);
    return room?.devices || [];
  }, [rooms]);

  return (
    <RoomsContext.Provider
      value={{
        rooms,
        roomCount: rooms.length,
        isLoading,
        error,
        createRoom,
        updateRoom,
        deleteRoom,
        assignDeviceToRoom,
        getRoom,
        getRoomDevices,
      }}
    >
      {children}
    </RoomsContext.Provider>
  );
};

// Hook pro použití v komponentách
export const useRooms = (): RoomsContextType => {
  const context = useContext(RoomsContext);
  if (!context) {
    throw new Error('useRooms musí být použit uvnitř RoomsProvider');
  }
  return context;
};