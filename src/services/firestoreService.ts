import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  addDoc,
  query,
  orderBy,
  getDocs,
  writeBatch,
  onSnapshot,
  where,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type {
  UserSettings,
  Room,
  TuyaDevice,
  DeviceCategory,
  CalendarEventData,
  FamilyMember,
} from '@/types/index';

class FirestoreService {
  // ==================== USER SETTINGS ====================
  async getUserSettings(uid: string): Promise<UserSettings | null> {
    try {
      const docRef = doc(db, 'userSettings', uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as UserSettings;
      }
      return null;
    } catch (error) {
      console.error('Error getting user settings:', error);
      throw new Error('Nepodařilo se načíst uživatelská nastavení');
    }
  }

  async createUserSettings(settings: UserSettings): Promise<void> {
    try {
      const docRef = doc(db, 'userSettings', settings.uid);
      await setDoc(docRef, settings);
    } catch (error) {
      console.error('Error creating user settings:', error);
      throw error;
    }
  }

  async updateUserSettings(
    uid: string,
    updates: Partial<UserSettings>
  ): Promise<void> {
    try {
      const docRef = doc(db, 'userSettings', uid);
      await updateDoc(docRef, {
        ...updates,
        updatedAt: Date.now(),
      });
    } catch (error) {
      console.error('Error updating user settings:', error);
      throw new Error('Nepodařilo se aktualizovat nastavení');
    }
  }

  // ==================== ROOMS ====================
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
    roomData: Omit<Room, 'id' | 'userId'>
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

  // ==================== DEVICES ====================

  async subscribeToUserDevices(
    uid: string,
    callback: (devices: TuyaDevice[]) => void
  ): Promise<Unsubscribe> {
    try {
      const devicesRef = collection(db, 'devices');
      const q = query(devicesRef, where('userId', '==', uid));
      return onSnapshot(q, (snapshot) => {
        const devices = snapshot.docs.map(
          (doc) => ({ id: doc.id, ...doc.data() } as TuyaDevice)
        );
        callback(devices);
      });
    } catch (error) {
      console.error('Error subscribing to user devices:', error);
      throw error;
    }
  }

  async getUserDevices(uid: string): Promise<TuyaDevice[]> {
    try {
      const devicesRef = collection(db, 'devices');
      const q = query(devicesRef, where('userId', '==', uid));
      const querySnapshot = await getDocs(q);
      const devices: TuyaDevice[] = [];
      querySnapshot.forEach((doc) => {
        devices.push({ id: doc.id, ...doc.data() } as TuyaDevice);
      });
      return devices;
    } catch (error) {
      console.error('Error getting user devices:', error);
      throw new Error('Nepodařilo se načíst zařízení');
    }
  }

  async saveUserDevices(uid: string, devices: TuyaDevice[]): Promise<void> {
    try {
      const batch = writeBatch(db);
      const devicesRef = collection(db, 'devices');

      const q = query(devicesRef, where('userId', '==', uid));
      const existingDevices = await getDocs(q);
      existingDevices.forEach((doc) => {
        batch.delete(doc.ref);
      });

      devices.forEach((device) => {
        const docRef = doc(devicesRef, device.id);
        batch.set(docRef, {
          ...device,
          userId: uid,
          lastUpdated: Date.now(),
        });
      });
      await batch.commit();
    } catch (error) {
      console.error('Error saving user devices:', error);
      throw new Error('Nepodařilo se uložit zařízení');
    }
  }

  async updateDevice(
    deviceId: string,
    updates: Partial<TuyaDevice>
  ): Promise<void> {
    try {
      const deviceRef = doc(db, 'devices', deviceId);
      await updateDoc(deviceRef, { ...updates, lastUpdated: Date.now() });
    } catch (error) {
      console.error('Error updating device:', error);
      throw new Error('Nepodařilo se aktualizovat zařízení');
    }
  }

  async updateDevicePosition(
    deviceId: string,
    position: { x: number; y: number }
  ): Promise<void> {
    try {
      const deviceRef = doc(db, 'devices', deviceId);
      await updateDoc(deviceRef, {
        position: position,
        updatedAt: Date.now(),
      });
    } catch (error) {
      console.error('FirestoreService error:', error);
      throw new Error('Failed to update device position.');
    }
  }

  async updateDeviceCustomization(
    uid: string,
    deviceId: string,
    customization: {
      customName?: string;
      customIcon?: string;
      customColor?: string;
      notes?: string;
    }
  ): Promise<void> {
    try {
      const deviceRef = doc(db, 'devices', deviceId);
      await updateDoc(deviceRef, {
        ...customization,
        lastUpdated: Date.now(),
      });
    } catch (error) {
      console.error('Error updating device customization:', error);
      throw new Error('Nepodařilo se aktualizovat vlastní nastavení zařízení');
    }
  }

  // ==================== DEVICE CATEGORIES ====================

  getDeviceCategories(): DeviceCategory[] {
    return [
      {
        id: 'switch',
        name: 'switch',
        displayName: 'Spínače a Zásuvky',
        icon: '🔌',
        color: '#007bff',
        description: 'Chytré spínače, zásuvky a relé',
        defaultCommands: ['switch_1', 'switch_led'],
      },
      {
        id: 'light',
        name: 'light',
        displayName: 'Osvětlení',
        icon: '💡',
        color: '#ffc107',
        description: 'LED žárovky, pásky a osvětlení',
        defaultCommands: ['switch_led', 'bright_value', 'colour_data'],
      },
      {
        id: 'sensor',
        name: 'sensor',
        displayName: 'Senzory',
        icon: '📡',
        color: '#28a745',
        description: 'Teplotní, vlhkostní a pohybové senzory',
        defaultCommands: ['temp_current', 'humidity_value'],
      },
      {
        id: 'climate',
        name: 'climate',
        displayName: 'Klimatizace',
        icon: '❄️',
        color: '#17a2b8',
        description: 'Klimatizace, ventilátory a topení',
        defaultCommands: ['switch', 'temp_set', 'mode'],
      },
      {
        id: 'security',
        name: 'security',
        displayName: 'Zabezpečení',
        icon: '🔒',
        color: '#dc3545',
        description: 'Kamery, alarmy a bezpečnostní senzory',
        defaultCommands: ['switch', 'alarm_switch'],
      },
      {
        id: 'cover',
        name: 'cover',
        displayName: 'Žaluzie a Rolety',
        icon: '🪟',
        color: '#6f42c1',
        description: 'Motorové žaluzie, rolety a markýzy',
        defaultCommands: ['control', 'position'],
      },
      {
        id: 'garden',
        name: 'garden',
        displayName: 'Zahrada',
        icon: '🌱',
        color: '#20c997',
        description: 'Zavlažování, čerpadla a zahradní technika',
        defaultCommands: ['switch_1', 'timer_1'],
      },
      {
        id: 'other',
        name: 'other',
        displayName: 'Ostatní',
        icon: '⚙️',
        color: '#6c757d',
        description: 'Ostatní chytrá zařízení',
        defaultCommands: ['switch'],
      },
    ];
  }

  // ==================== FAMILY MEMBERS (SPRÁVNĚ UVNITŘ TŘÍDY) ====================
  async subscribeToFamilyMembers(
    uid: string,
    callback: (members: FamilyMember[]) => void
  ): Promise<Unsubscribe> {
    try {
      const membersCollection = collection(db, 'familyMembers');
      const q = query(
        membersCollection,
        where('userId', '==', uid),
        orderBy('createdAt', 'asc')
      );
      return onSnapshot(q, (snapshot) => {
        const members = snapshot.docs.map(
          (doc) => ({ id: doc.id, ...doc.data() } as FamilyMember)
        );
        callback(members);
      });
    } catch (error) {
      console.error('Error subscribing to family members:', error);
      throw error;
    }
  }

  async addFamilyMember(
    uid: string,
    memberData: Omit<FamilyMember, 'id' | 'userId' | 'createdAt'>
  ): Promise<string> {
    try {
      const membersRef = collection(db, 'familyMembers');
      const docRef = await addDoc(membersRef, {
        ...memberData,
        userId: uid,
        createdAt: Date.now(),
      });
      return docRef.id;
    } catch (error) {
      console.error('Error creating family member:', error);
      throw new Error('Nepodařilo se vytvořit člena rodiny');
    }
  }

  async updateFamilyMember(
    memberId: string,
    updates: Partial<FamilyMember>
  ): Promise<void> {
    try {
      const docRef = doc(db, 'familyMembers', memberId);
      await updateDoc(docRef, updates);
    } catch (error) {
      console.error(`Error updating family member:`, error);
      throw new Error(`Nepodařilo se aktualizovat člena rodiny`);
    }
  }

  async deleteFamilyMember(memberId: string): Promise<void> {
    try {
      const docRef = doc(db, 'familyMembers', memberId);
      await deleteDoc(docRef);
    } catch (error) {
      console.error('Error deleting family member:', error);
      throw new Error('Nepodařilo se smazat člena rodiny');
    }
  }
}

export const firestoreService = new FirestoreService();

// ==================== CALENDAR EVENTS SERVICE ====================

export const calendarFirebaseService = {
  async subscribeToEvents(
    userId: string,
    callback: (events: CalendarEventData[]) => void
  ): Promise<Unsubscribe> {
    try {
      const eventsRef = collection(db, 'calendarEvents');
      const q = query(eventsRef, where('userId', '==', userId));
      return onSnapshot(q, (snapshot) => {
        const events = snapshot.docs.map(
          (doc) => ({ id: doc.id, ...doc.data() } as CalendarEventData)
        );
        callback(events);
      });
    } catch (error) {
      console.error('Error subscribing to events:', error);
      throw error;
    }
  },

  async getEvents(userId: string): Promise<CalendarEventData[]> {
    const eventsRef = collection(db, 'calendarEvents');
    const q = query(eventsRef, where('userId', '==', userId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(
      (doc) => ({ id: doc.id, ...doc.data() } as CalendarEventData)
    );
  },

  async addEvent(
    userId: string,
    event: Omit<CalendarEventData, 'id' | 'createdAt' | 'updatedAt' | 'userId'>
  ): Promise<string> {
    const eventsRef = collection(db, 'calendarEvents');
    const newEvent = {
      ...event,
      userId: userId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    const docRef = await addDoc(eventsRef, newEvent);
    return docRef.id;
  },

  async updateEvent(
    eventId: string,
    updates: Partial<Omit<CalendarEventData, 'id' | 'userId'>>
  ): Promise<void> {
    const eventRef = doc(db, 'calendarEvents', eventId);
    await updateDoc(eventRef, {
      ...updates,
      updatedAt: Date.now(),
    });
  },

  async deleteEvent(eventId: string): Promise<void> {
    const eventRef = doc(db, 'calendarEvents', eventId);
    await deleteDoc(eventRef);
  },
};

