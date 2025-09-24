import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { firestoreService } from '../services/firestoreService';
import type { Room, TuyaDevice } from '../types';

export const useRooms = () => {
  const { currentUser } = useAuth();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

// Načítání místností s real-time aktualizacemi
useEffect(() => {
  if (!currentUser) {
    setRooms([]);
    setSelectedRoomId(null);
    return;
  }

  setLoading(true);
  setError(null);

  let unsubscribe: (() => void) | null = null;

  const setupSubscription = async () => {
    try {
      unsubscribe = await firestoreService.subscribeToUserRooms(
        currentUser.uid,
        (updatedRooms) => {
          setRooms(updatedRooms);
          
          // Nastav první místnost jako vybranou, pokud žádná není vybrána
          setSelectedRoomId(prevId => {
            if (!prevId && updatedRooms.length > 0) {
              const defaultRoom = updatedRooms.find(room => room.isDefault) || updatedRooms[0];
              return defaultRoom.id;
            }
            return prevId;
          });
          
          setLoading(false);
        }
      );
    } catch (err) {
      console.error('Error setting up rooms subscription:', err);
      setError('Nepodařilo se načíst místnosti');
      setLoading(false);
    }
  };

  setupSubscription();

  // Cleanup funkce
  return () => {
    if (unsubscribe) {
      unsubscribe();
    }
  };
}, [currentUser]); 

  // Vytvoření nové místnosti
  const createRoom = useCallback(async (roomData: Omit<Room, 'id' | 'owner' | 'createdAt' | 'updatedAt'>) => {
    if (!currentUser) throw new Error('Uživatel není přihlášen');
  
    try {
      setError(null);
      const newRoomId = await firestoreService.createRoom(currentUser.uid, {
        ...roomData,
        owner: currentUser.uid,
        devices: roomData.devices || [],
        createdAt: Date.now(),
        updatedAt: Date.now()
      });
      
      console.log('Room created successfully:', newRoomId);
      return newRoomId;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Nepodařilo se vytvořit místnost';
      setError(errorMessage);
      throw err;
    }
  }, [currentUser]);

  // Aktualizace místnosti
  const updateRoom = useCallback(async (roomId: string, updates: Partial<Room>) => {
    if (!currentUser) throw new Error('Uživatel není přihlášen');

    try {
      setError(null);
      await firestoreService.updateRoom(currentUser.uid, roomId, {
        ...updates,
        updatedAt: Date.now()
      });
      
      console.log('Room updated successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Nepodařilo se aktualizovat místnost';
      setError(errorMessage);
      throw err;
    }
  }, [currentUser]);

  // Smazání místnosti
  const deleteRoom = useCallback(async (roomId: string) => {
    if (!currentUser) throw new Error('Uživatel není přihlášen');
    
    try {
      setError(null);
      await firestoreService.deleteRoom(currentUser.uid, roomId);
      
      // Pokud byla smazána aktuálně vybraná místnost, vyber jinou
      if (selectedRoomId === roomId) {
        const remainingRooms = rooms.filter(room => room.id !== roomId);
        setSelectedRoomId(remainingRooms.length > 0 ? remainingRooms[0].id : null);
      }
      
      console.log('Room deleted successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Nepodařilo se smazat místnost';
      setError(errorMessage);
      throw err;
    }
  }, [currentUser, selectedRoomId, rooms]);

  // Přidání zařízení do místnosti
  const addDeviceToRoom = useCallback(async (roomId: string, deviceId: string) => {
    if (!currentUser) throw new Error('Uživatel není přihlášen');

    try {
      setError(null);
      await firestoreService.addDeviceToRoom(currentUser.uid, roomId, deviceId);
      console.log('Device added to room successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Nepodařilo se přidat zařízení do místnosti';
      setError(errorMessage);
      throw err;
    }
  }, [currentUser]);

  // Odebrání zařízení z místnosti
  const removeDeviceFromRoom = useCallback(async (roomId: string, deviceId: string) => {
    if (!currentUser) throw new Error('Uživatel není přihlášen');

    try {
      setError(null);
      await firestoreService.removeDeviceFromRoom(currentUser.uid, roomId, deviceId);
      console.log('Device removed from room successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Nepodařilo se odebrat zařízení z místnosti';
      setError(errorMessage);
      throw err;
    }
  }, [currentUser]);

  // Přesun zařízení mezi místnostmi
  const moveDeviceBetweenRooms = useCallback(async (deviceId: string, fromRoomId: string | null, toRoomId: string) => {
    if (!currentUser) throw new Error('Uživatel není přihlášen');

    try {
      setError(null);
      
      // Odeber z původní místnosti (pokud existuje)
      if (fromRoomId) {
        await removeDeviceFromRoom(fromRoomId, deviceId);
      }
      
      // Přidej do nové místnosti
      await addDeviceToRoom(toRoomId, deviceId);
      
      // Aktualizuj roomId u zařízení
      await firestoreService.updateDevicePosition(currentUser.uid, deviceId, { x: 0, y: 0 }, toRoomId);
      
      console.log('Device moved between rooms successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Nepodařilo se přesunout zařízení';
      setError(errorMessage);
      throw err;
    }
  }, [currentUser, addDeviceToRoom, removeDeviceFromRoom]);

  // Pomocné funkce
  const selectedRoom = rooms.find(room => room.id === selectedRoomId) || null;
  
  const getRoomDevices = useCallback((roomId: string, allDevices: TuyaDevice[]) => {
    const room = rooms.find(r => r.id === roomId);
    if (!room) return [];
    
    return allDevices.filter(device => 
      room.devices.includes(device.id) || device.roomId === roomId
    );
  }, [rooms]);

  const getUnassignedDevices = useCallback((allDevices: TuyaDevice[]) => {
    const allAssignedDeviceIds = rooms.flatMap(room => room.devices);
    return allDevices.filter(device => 
      !allAssignedDeviceIds.includes(device.id) && !device.roomId
    );
  }, [rooms]);

  return {
    // State
    rooms,
    selectedRoomId,
    selectedRoom,
    loading,
    error,
    
    // Actions
    setSelectedRoomId,
    createRoom,
    updateRoom,
    deleteRoom,
    addDeviceToRoom,
    removeDeviceFromRoom,
    moveDeviceBetweenRooms,
    
    // Helpers
    getRoomDevices,
    getUnassignedDevices,
    
    // Computed values
    roomsCount: rooms.length,
    hasRooms: rooms.length > 0
  };
};