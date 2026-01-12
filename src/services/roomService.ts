// src/services/roomService.ts
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  arrayUnion,
  arrayRemove,
  deleteField,
  collection,
  addDoc,
  query,
  orderBy,
  getDocs,
  onSnapshot,
  where,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { deviceService } from './deviceService';
import type { Room } from '../types/index';

class RoomService {
  // ==================== ROOMS ====================

  /**
   * ⚛️ Atomicky přiřadí zařízení k místnosti (nebo ho odebere)
   * Aktualizuje dokument zařízení AŽ dva dokumenty místností.
   */
  async assignDeviceToRoom(
    deviceId: string,
    newRoomId: string | null | undefined,
    oldRoomId: string | null | undefined
  ) {
    try {
      const batch = deviceService.getWriteBatch();
      const deviceRef = doc(db, 'devices', deviceId);

      // Krok 1: Aktualizuj samotné zařízení
      if (newRoomId) {
        batch.update(deviceRef, { roomId: newRoomId, lastUpdated: Date.now() });
      } else {
        batch.update(deviceRef, {
          roomId: deleteField(),
          lastUpdated: Date.now(),
        });
      }

      // Krok 2: Odeber ID zařízení ze staré místnosti (pokud existovala)
      if (oldRoomId) {
        const oldRoomRef = doc(db, 'rooms', oldRoomId);
        batch.update(oldRoomRef, {
          devices: arrayRemove(deviceId),
          updatedAt: Date.now(),
        });
      }

      // Krok 3: Přidej ID zařízení do nové místnosti (pokud existuje)
      if (newRoomId) {
        const newRoomRef = doc(db, 'rooms', newRoomId);
        batch.update(newRoomRef, {
          devices: arrayUnion(deviceId),
          updatedAt: Date.now(),
        });
      }

      // Krok 4: Spusť všechny operace najednou
      await batch.commit();

      console.log(
        `✅ Atomicky přesunuto zařízení ${deviceId} (Odebráno z: ${oldRoomId}, Přidáno do: ${newRoomId})`
      );
    } catch (error) {
      console.error('❌ Chyba při atomickém přiřazení zařízení:', error);
      throw new Error('Nepodařilo se přiřadit zařízení');
    }
  }

  async subscribeToUserRooms(
    uid: string,
    callback: (rooms: Room[]) => void
  ): Promise<Unsubscribe> {
    try {
      const roomsCollection = collection(db, 'rooms');
      const q = query(
        roomsCollection,
        where('userId', '==', uid),
        orderBy('createdAt', 'desc')
      );
      return onSnapshot(q, (snapshot) => {
        const rooms = snapshot.docs.map(
          (doc) => ({ id: doc.id, ...doc.data() } as Room)
        );
        callback(rooms);
      });
    } catch (error) {
      console.error('Error subscribing to rooms:', error);
      throw error;
    }
  }

  async getUserRooms(uid: string): Promise<Room[]> {
    try {
      const roomsRef = collection(db, 'rooms');
      const q = query(
        roomsRef,
        where('userId', '==', uid),
        orderBy('createdAt', 'desc')
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(
        (doc) => ({ id: doc.id, ...doc.data() } as Room)
      );
    } catch (error) {
      console.error('Error getting user rooms:', error);
      throw new Error('Nepodařilo se načíst místnosti');
    }
  }

  async createRoom(
    uid: string,
    roomData: Omit<Room, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
  ): Promise<string> {
    try {
      const roomsRef = collection(db, 'rooms');
      const docRef = await addDoc(roomsRef, {
        ...roomData,
        userId: uid,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      return docRef.id;
    } catch (error) {
      console.error('Error creating room:', error);
      throw new Error('Nepodařilo se vytvořit místnost');
    }
  }

  async updateRoom(roomId: string, updates: Partial<Room>): Promise<void> {
    try {
      const docRef = doc(db, 'rooms', roomId);
      await updateDoc(docRef, {
        ...updates,
        updatedAt: Date.now(),
      });
    } catch (error) {
      console.error(`Error updating room:`, error);
      throw new Error(`Nepodařilo se aktualizovat místnost`);
    }
  }

  async deleteRoom(roomId: string): Promise<void> {
    try {
      const roomRef = doc(db, 'rooms', roomId);
      const roomDoc = await getDoc(roomRef);
      if (roomDoc.exists() && roomDoc.data().isDefault) {
        throw new Error('Nelze smazat výchozí místnost');
      }
      await deleteDoc(roomRef);
    } catch (error) {
      console.error('Error deleting room:', error);
      throw error instanceof Error
        ? error
        : new Error('Nepodařilo se smazat místnost');
    }
  }

  async addDeviceToRoom(roomId: string, deviceId: string): Promise<void> {
    try {
      const roomRef = doc(db, 'rooms', roomId);
      const roomDoc = await getDoc(roomRef);
      if (!roomDoc.exists()) throw new Error('Místnost neexistuje');

      const room = roomDoc.data() as Room;
      const updatedDevices = [...(room.devices || [])];
      if (!updatedDevices.includes(deviceId)) {
        updatedDevices.push(deviceId);
        await updateDoc(roomRef, {
          devices: updatedDevices,
          updatedAt: Date.now(),
        });
      }
    } catch (error) {
      console.error('Error adding device to room:', error);
      throw new Error('Nepodařilo se přidat zařízení do místnosti');
    }
  }

  async removeDeviceFromRoom(roomId: string, deviceId: string): Promise<void> {
    try {
      const roomRef = doc(db, 'rooms', roomId);
      const roomDoc = await getDoc(roomRef);
      if (!roomDoc.exists()) throw new Error('Místnost neexistuje');

      const room = roomDoc.data() as Room;
      const updatedDevices = (room.devices || []).filter(
        (id) => id !== deviceId
      );
      await updateDoc(roomRef, {
        devices: updatedDevices,
        updatedAt: Date.now(),
      });
    } catch (error) {
      console.error('Error removing device from room:', error);
      throw new Error('Nepodařilo se odebrat zařízení z místnosti');
    }
  }

  // ==================== FLOORS (PŮDORYSY) ====================

  /**
   * Získá layout půdorysu (pozice místností)
   */
  async getFloorLayout(floorId: string): Promise<any | null> {
    try {
      const docRef = doc(db, 'floors', floorId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return docSnap.data();
      }
      return null;
    } catch (error) {
      console.error('Error getting floor layout:', error);
      throw new Error('Nepodařilo se načíst půdorys');
    }
  }

  /**
   * Uloží layout půdorysu (pozice místností)
   */
  async saveFloorLayout(floorId: string, rooms: any[]): Promise<void> {
    try {
      const docRef = doc(db, 'floors', floorId);
      await setDoc(
        docRef,
        {
          rooms: rooms,
          updatedAt: Date.now(),
        },
        { merge: true }
      );
      console.log(`✅ Floor layout "${floorId}" uložen`);
    } catch (error) {
      console.error('Error saving floor layout:', error);
      throw new Error('Nepodařilo se uložit půdorys');
    }
  }

  /**
   * Subscribe k real-time změnám layoutu
   */
  subscribeToFloorLayout(
    floorId: string,
    callback: (rooms: any[]) => void
  ): Unsubscribe {
    const docRef = doc(db, 'floors', floorId);
    return onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        callback(data.rooms || []);
      } else {
        callback([]);
      }
    });
  }
}

export const roomService = new RoomService();