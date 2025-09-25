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

  useEffect(() => {
    if (!currentUser) {
      setRooms([]);
      setSelectedRoomId(null);
      return;
    }

    let unsubscribe: (() => void) | null = null;

    const setupSubscription = async () => {
      setLoading(true);
      setError(null);

      try {
        unsubscribe = await firestoreService.subscribeToUserRooms(
          currentUser.uid,
          (updatedRooms) => {
            setRooms(updatedRooms);

            setSelectedRoomId((prevId) => {
              const roomExists = updatedRooms.some(
                (room) => room.id === prevId
              );
              if (prevId && roomExists) {
                return prevId;
              }
              if (updatedRooms.length > 0) {
                const defaultRoom =
                  updatedRooms.find((room) => room.isDefault) ||
                  updatedRooms[0];
                return defaultRoom.id;
              }
              return null;
            });

            setLoading(false);
          }
        );
      } catch (err) {
        if (err instanceof Error) {
          console.error('Error in rooms subscription:', err);
          setError('Nepodařilo se načíst místnosti: ' + err.message);
        } else {
          setError('Nepodařilo se načíst místnosti');
        }
        setLoading(false);
      }
    };

    setupSubscription();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [currentUser]);

  const createRoom = useCallback(
    async (
      roomData: Omit<Room, 'id' | 'owner' | 'createdAt' | 'updatedAt'>
    ) => {
      if (!currentUser) throw new Error('Uživatel není přihlášen');

      try {
        setError(null);
        const newRoomId = await firestoreService.createRoom(currentUser.uid, {
          ...roomData,
          owner: currentUser.uid,
          devices: roomData.devices || [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        console.log('Room created successfully:', newRoomId);
        return newRoomId;
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : 'Nepodařilo se vytvořit místnost';
        setError(errorMessage);
        throw err;
      }
    },
    [currentUser]
  );

  const updateRoom = useCallback(
    async (roomId: string, updates: Partial<Room>) => {
      if (!currentUser) throw new Error('Uživatel není přihlášen');

      try {
        setError(null);
        const roomPath = `users/${currentUser.uid}/rooms`;
        await firestoreService.updateDocument(roomPath, roomId, updates);
        console.log('Room updated successfully');
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : 'Nepodařilo se aktualizovat místnost';
        setError(errorMessage);
        throw err;
      }
    },
    [currentUser]
  );

  const deleteRoom = useCallback(
    async (roomId: string) => {
      if (!currentUser) throw new Error('Uživatel není přihlášen');

      try {
        setError(null);
        await firestoreService.deleteRoom(currentUser.uid, roomId);

        // Fix: Use functional update to avoid stale closure
        setSelectedRoomId((currentSelectedId) => {
          if (currentSelectedId === roomId) {
            // We need to get fresh rooms data, but we can't access it here
            // So we'll set to null and let the effect handle it
            return null;
          }
          return currentSelectedId;
        });

        console.log('Room deleted successfully');
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Nepodařilo se smazat místnost';
        setError(errorMessage);
        throw err;
      }
    },
    [currentUser] // Removed rooms and selectedRoomId dependencies
  );

  const addDeviceToRoom = useCallback(
    async (roomId: string, deviceId: string) => {
      if (!currentUser) throw new Error('Uživatel není přihlášen');

      try {
        setError(null);
        await firestoreService.addDeviceToRoom(
          currentUser.uid,
          roomId,
          deviceId
        );
        console.log('Device added to room successfully');
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : 'Nepodařilo se přidat zařízení do místnosti';
        setError(errorMessage);
        throw err;
      }
    },
    [currentUser]
  );

  const removeDeviceFromRoom = useCallback(
    async (roomId: string, deviceId: string) => {
      if (!currentUser) throw new Error('Uživatel není přihlášen');

      try {
        setError(null);
        await firestoreService.removeDeviceFromRoom(
          currentUser.uid,
          roomId,
          deviceId
        );
        console.log('Device removed from room successfully');
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : 'Nepodařilo se odebrat zařízení z místnosti';
        setError(errorMessage);
        throw err;
      }
    },
    [currentUser]
  );

  const moveDeviceBetweenRooms = useCallback(
    async (deviceId: string, fromRoomId: string | null, toRoomId: string) => {
      if (!currentUser) throw new Error('Uživatel není přihlášen');

      try {
        setError(null);

        if (fromRoomId) {
          await firestoreService.removeDeviceFromRoom(
            currentUser.uid,
            fromRoomId,
            deviceId
          );
        }

        await firestoreService.addDeviceToRoom(
          currentUser.uid,
          toRoomId,
          deviceId
        );

        await firestoreService.updateDevice(currentUser.uid, deviceId, {
          roomId: toRoomId,
        });

        console.log('Device moved between rooms successfully');
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : 'Nepodařilo se přesunout zařízení';
        setError(errorMessage);
        throw err;
      }
    },
    [currentUser] // Removed addDeviceToRoom and removeDeviceFromRoom dependencies
  );

  // Helper functions - these should be stable
  const selectedRoom = rooms.find((room) => room.id === selectedRoomId) || null;

  const getRoomDevices = useCallback(
    (roomId: string, allDevices: TuyaDevice[]) => {
      const room = rooms.find((r) => r.id === roomId);
      if (!room) return [];

      return allDevices.filter(
        (device) => room.devices.includes(device.id) || device.roomId === roomId
      );
    },
    [rooms]
  );

  const getUnassignedDevices = useCallback(
    (allDevices: TuyaDevice[]) => {
      const allAssignedDeviceIds = rooms.flatMap((room) => room.devices);
      return allDevices.filter(
        (device) => !allAssignedDeviceIds.includes(device.id) && !device.roomId
      );
    },
    [rooms]
  );

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
    hasRooms: rooms.length > 0,
  };
};