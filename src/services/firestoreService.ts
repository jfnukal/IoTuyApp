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
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type { UserSettings, Room, TuyaDevice, DeviceCategory } from '../types';

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

  async createDefaultUserSettings(uid: string): Promise<UserSettings> {
    const defaultSettings: UserSettings = {
      uid,
      theme: 'light',
      language: 'cs',
      notifications: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      preferences: {
        autoRefreshInterval: 30,
        showOfflineDevices: true,
        defaultRoomView: 'grid',
        soundEnabled: true,
        emailNotifications: false,
        showEmptyRooms: true,
        roomSortOrder: 'name',
      },
      tuyaConfig: {
        hasValidCredentials: false,
        lastSync: 0,
        deviceCount: 0,
      },
    };

    try {
      await this.createUserSettings(defaultSettings);

      // Vytvoř také výchozí místnost a nastav ji jako default
      const defaultRoomId = await this.createDefaultRoom(uid);

      // Aktualizuj settings s výchozí místností
      const updatedPreferences: UserSettings['preferences'] = {
        ...defaultSettings.preferences!,
        defaultRoomId: defaultRoomId,
      };

      await this.updateUserSettings(uid, {
        preferences: updatedPreferences,
      });

      return {
        ...defaultSettings,
        preferences: updatedPreferences,
      };
    } catch (error) {
      console.error('Error creating default user settings:', error);
      throw new Error('Nepodařilo se vytvořit výchozí nastavení');
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

  async updateDocument(
    collectionName: string,
    docId: string,
    updates: { [key: string]: any }
  ): Promise<void> {
    try {
      // Tato metoda vyžaduje uid uživatele, aby byla bezpečná
      // Předpokládáme, že uid bude součástí cesty v collectionName (např. 'users/uid/rooms')
      // V našem případě ale aktualizujeme přímo v kolekci 'rooms', což není ideální, ale pro teď to tak necháme.
      // Lepší by bylo předat i uid. Pro teď to zjednodušíme.
      const docRef = doc(db, collectionName, docId);
      await updateDoc(docRef, {
        ...updates,
        updatedAt: Date.now(),
      });
    } catch (error) {
      console.error(`Error updating document in ${collectionName}:`, error);
      throw new Error(
        `Nepodařilo se aktualizovat dokument v kolekci ${collectionName}`
      );
    }
  }

  async createDefaultRoom(uid: string): Promise<string> {
    try {
      // Nejdřív zkontroluj, jestli už uživatel nemá výchozí místnost
      const existingRooms = await this.getUserRooms(uid);
      const defaultRoom = existingRooms.find((room) => room.isDefault);

      if (defaultRoom) {
        console.log('Default room already exists:', defaultRoom.id);
        return defaultRoom.id;
      }

      // Vytvoř novou pouze pokud neexistuje
      const newDefaultRoom: Omit<Room, 'id'> = {
        name: 'Výchozí místnost',
        description: 'Automaticky vytvořená výchozí místnost',
        devices: [],
        owner: uid,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        color: '#007bff',
        icon: '🏠',
        isDefault: true,
      };

      const roomId = await this.createRoom(uid, newDefaultRoom);
      console.log('New default room created:', roomId);
      return roomId;
    } catch (error) {
      console.error('Error in createDefaultRoom:', error);
      throw error;
    }
  }

  async createRoom(uid: string, room: Omit<Room, 'id'>): Promise<string> {
    try {
      const roomsRef = collection(db, 'users', uid, 'rooms');
      const docRef = await addDoc(roomsRef, {
        ...room,
        owner: uid,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      return docRef.id;
    } catch (error) {
      console.error('Error creating room:', error);
      throw new Error('Nepodařilo se vytvořit místnost');
    }
  }

  // Aktualizace layoutu místnosti
  async updateRoomLayout(
    userId: string,
    roomId: string,
    layout: { width: number; height: number; type: '2d' | '3d' }
  ): Promise<void> {
    if (!userId || !roomId) {
      throw new Error('User ID and Room ID are required');
    }

    try {
      const roomRef = doc(db, 'users', userId, 'rooms', roomId);

      await updateDoc(roomRef, {
        layout: layout,
        updatedAt: Date.now(),
      });

      console.log(`Room ${roomId} layout updated:`, layout);
    } catch (error) {
      console.error('Error updating room layout:', error);
      throw new Error('Failed to update room layout');
    }
  }

  async deleteRoom(uid: string, roomId: string): Promise<void> {
    try {
      // Nejdřív zkontroluj, jestli není výchozí
      const roomRef = doc(db, 'users', uid, 'rooms', roomId);
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

  // ==================== DEVICES ====================

  async saveUserDevices(uid: string, devices: TuyaDevice[]): Promise<void> {
    try {
      const batch = writeBatch(db);
      const devicesRef = collection(db, 'users', uid, 'devices');

      // Smaž všechna stará zařízení a vlož nová
      const existingDevices = await getDocs(devicesRef);
      existingDevices.forEach((doc) => {
        batch.delete(doc.ref);
      });

      // Přidej nová zařízení
      devices.forEach((device) => {
        const docRef = doc(devicesRef, device.id);
        batch.set(docRef, {
          ...device,
          lastUpdated: Date.now(),
          isVisible: true,
        });
      });

      await batch.commit();
    } catch (error) {
      console.error('Error saving user devices:', error);
      throw new Error('Nepodařilo se uložit zařízení');
    }
  }

  async getUserDevices(uid: string): Promise<TuyaDevice[]> {
    try {
      const devicesRef = collection(db, 'users', uid, 'devices');
      const querySnapshot = await getDocs(devicesRef);

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

  async updateDevice(
    uid: string,
    deviceId: string,
    updates: Partial<TuyaDevice>
  ): Promise<void> {
    try {
      const deviceRef = doc(db, 'users', uid, 'devices', deviceId);
      await updateDoc(deviceRef, {
        ...updates,
        lastUpdated: Date.now(),
      });
    } catch (error) {
      console.error('Error updating device:', error);
      throw new Error('Nepodařilo se aktualizovat zařízení');
    }
  }

  // ==================== REAL-TIME LISTENERS ====================

  listenToUserRooms(
    uid: string,
    callback: (rooms: Room[]) => void
  ): Unsubscribe {
    const roomsRef = collection(db, 'users', uid, 'rooms');
    const q = query(roomsRef, orderBy('createdAt', 'asc'));

    return onSnapshot(
      q,
      (snapshot) => {
        const rooms: Room[] = [];
        snapshot.forEach((doc) => {
          rooms.push({ id: doc.id, ...doc.data() } as Room);
        });
        callback(rooms);
      },
      (error) => {
        console.error('Error listening to rooms:', error);
      }
    );
  }

  listenToUserDevices(
    uid: string,
    callback: (devices: TuyaDevice[]) => void
  ): Unsubscribe {
    const devicesRef = collection(db, 'users', uid, 'devices');

    return onSnapshot(
      devicesRef,
      (snapshot) => {
        const devices: TuyaDevice[] = [];
        snapshot.forEach((doc) => {
          devices.push({ id: doc.id, ...doc.data() } as TuyaDevice);
        });
        callback(devices);
      },
      (error) => {
        console.error('Error listening to devices:', error);
      }
    );
  }

  // ==================== BATCH OPERATIONS ====================

  async moveDeviceToRoom(
    uid: string,
    deviceId: string,
    fromRoomId: string | null,
    toRoomId: string
  ): Promise<void> {
    try {
      const batch = writeBatch(db);

      // Aktualizuj device
      const deviceRef = doc(db, 'users', uid, 'devices', deviceId);
      batch.update(deviceRef, {
        roomId: toRoomId,
        lastUpdated: Date.now(),
      });

      // Odeber z staré místnosti
      if (fromRoomId) {
        const oldRoomRef = doc(db, 'users', uid, 'rooms', fromRoomId);
        const oldRoomDoc = await getDoc(oldRoomRef);
        if (oldRoomDoc.exists()) {
          const devices = (oldRoomDoc.data().devices || []).filter(
            (id: string) => id !== deviceId
          );
          batch.update(oldRoomRef, {
            devices,
            updatedAt: Date.now(),
          });
        }
      }

      // Přidej do nové místnosti
      const newRoomRef = doc(db, 'users', uid, 'rooms', toRoomId);
      const newRoomDoc = await getDoc(newRoomRef);
      if (newRoomDoc.exists()) {
        const devices = [...(newRoomDoc.data().devices || []), deviceId];
        batch.update(newRoomRef, {
          devices: [...new Set(devices)], // Remove duplicates
          updatedAt: Date.now(),
        });
      }

      await batch.commit();
    } catch (error) {
      console.error('Error moving device to room:', error);
      throw new Error('Nepodařilo se přesunout zařízení');
    }
  }
  // ==================== ROOMS ====================

  async getUserRooms(uid: string): Promise<Room[]> {
    try {
      const roomsRef = collection(db, 'users', uid, 'rooms');
      const q = query(roomsRef, orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);

      return querySnapshot.docs.map(
        (doc) =>
          ({
            id: doc.id,
            ...doc.data(),
          } as Room)
      );
    } catch (error) {
      console.error('Error getting user rooms:', error);
      throw new Error('Nepodařilo se načíst místnosti');
    }
  }

  async subscribeToUserRooms(
    uid: string,
    callback: (rooms: Room[]) => void
  ): Promise<Unsubscribe> {
    try {
      const roomsRef = collection(db, 'users', uid, 'rooms');
      const q = query(roomsRef, orderBy('createdAt', 'desc'));

      return onSnapshot(q, (snapshot) => {
        const rooms = snapshot.docs.map(
          (doc) =>
            ({
              id: doc.id,
              ...doc.data(),
            } as Room)
        );
        callback(rooms);
      });
    } catch (error) {
      console.error('Error subscribing to rooms:', error);
      throw error;
    }
  }

  async addDeviceToRoom(
    uid: string,
    roomId: string,
    deviceId: string
  ): Promise<void> {
    try {
      const roomRef = doc(db, 'users', uid, 'rooms', roomId);
      const roomDoc = await getDoc(roomRef);

      if (!roomDoc.exists()) {
        throw new Error('Místnost neexistuje');
      }

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

  async removeDeviceFromRoom(
    uid: string,
    roomId: string,
    deviceId: string
  ): Promise<void> {
    try {
      const roomRef = doc(db, 'users', uid, 'rooms', roomId);
      const roomDoc = await getDoc(roomRef);

      if (!roomDoc.exists()) {
        throw new Error('Místnost neexistuje');
      }

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

  // Aktualizace pozice zařízení v místnosti
  async updateDevicePosition(
    userId: string,
    deviceId: string,
    position: { x: number; y: number }
  ): Promise<void> {
    console.log('FirestoreService.updateDevicePosition called');
    console.log('Params:', { userId, deviceId, position });

    if (!userId || !deviceId) {
      throw new Error('User ID and Device ID are required');
    }

    try {
      const deviceRef = doc(db, 'users', userId, 'devices', deviceId);
      console.log('Document ref created:', deviceRef.path);

      // Zkontroluj, že dokument existuje
      const deviceDoc = await getDoc(deviceRef);
      if (!deviceDoc.exists()) {
        throw new Error(`Device ${deviceId} not found in Firestore`);
      }

      console.log('Current device data:', deviceDoc.data());

      await updateDoc(deviceRef, {
        position: position,
        updatedAt: Date.now(),
      });

      console.log(
        `Device ${deviceId} position updated successfully:`,
        position
      );
    } catch (error) {
      console.error('FirestoreService error:', error);
      // PŘIDANÁ KONTROLA TYPU
      if (error instanceof Error) {
        throw new Error(`Failed to update device position: ${error.message}`);
      }
      throw new Error(
        'An unknown error occurred while updating device position.'
      );
    }
  }

  // ==================== DEVICE CATEGORIES ====================

  getDeviceCategories(): DeviceCategory[] {
    // Základní kategorie Tuya zařízení
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
      const devices = await this.getUserDevices(uid);
      const updatedDevices = devices.map((device) => {
        if (device.id === deviceId) {
          return {
            ...device,
            ...customization,
            lastUpdated: Date.now(),
          };
        }
        return device;
      });

      await this.saveUserDevices(uid, updatedDevices);
    } catch (error) {
      console.error('Error updating device customization:', error);
      throw new Error('Nepodařilo se aktualizovat vlastní nastavení zařízení');
    }
  }
  async subscribeToUserDevices(
    uid: string,
    callback: (devices: TuyaDevice[]) => void
  ): Promise<Unsubscribe> {
    try {
      const devicesRef = collection(db, 'users', uid, 'devices');

      return onSnapshot(devicesRef, (snapshot) => {
        const devices: TuyaDevice[] = [];
        snapshot.forEach((doc) => {
          devices.push({ id: doc.id, ...doc.data() } as TuyaDevice);
        });
        callback(devices);
      });
    } catch (error) {
      console.error('Error subscribing to user devices:', error);
      throw error;
    }
  }
}
// ==================== CALENDAR EVENTS ====================

export interface CalendarEventData {
  id: string;
  title: string;
  description?: string;
  date: string; // ISO format: "2025-10-01T14:30:00.000Z"
  time?: string;
  endTime?: string;
  type: 'personal' | 'work' | 'family' | 'birthday' | 'holiday' | 'nameday' | 'reminder';
  familyMemberId?: string;
  color?: string;
  reminder?: string;
  isAllDay?: boolean;
  createdAt: number;
  updatedAt: number;
}

export const calendarFirebaseService = {
  // Přidat událost
  async addEvent(
    userId: string,
    event: Omit<CalendarEventData, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<string> {
    const eventsRef = collection(db, `users/${userId}/calendarEvents`);
    const newEvent = {
      ...event,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    const docRef = await addDoc(eventsRef, newEvent);
    return docRef.id;
  },

  // Načíst všechny události
  async getEvents(userId: string): Promise<CalendarEventData[]> {
    const eventsRef = collection(db, `users/${userId}/calendarEvents`);
    const snapshot = await getDocs(eventsRef);
    return snapshot.docs.map(
      (doc) =>
        ({
          id: doc.id,
          ...doc.data(),
        } as CalendarEventData)
    );
  },

  // Aktualizovat událost
  async updateEvent(
    userId: string,
    eventId: string,
    updates: Partial<CalendarEventData>
  ): Promise<void> {
    const eventRef = doc(db, `users/${userId}/calendarEvents/${eventId}`);
    await updateDoc(eventRef, {
      ...updates,
      updatedAt: Date.now(),
    });
  },

  // Smazat událost
  async deleteEvent(userId: string, eventId: string): Promise<void> {
    const eventRef = doc(db, `users/${userId}/calendarEvents/${eventId}`);
    await deleteDoc(eventRef);
  },

  // Real-time listener - sleduje změny v reálném čase
  subscribeToEvents(
    userId: string,
    callback: (events: CalendarEventData[]) => void
  ): () => void {
    const eventsRef = collection(db, `users/${userId}/calendarEvents`);
    const unsubscribe = onSnapshot(eventsRef, (snapshot) => {
      const events = snapshot.docs.map(
        (doc) =>
          ({
            id: doc.id,
            ...doc.data(),
          } as CalendarEventData)
      );
      callback(events);
    });
    return unsubscribe;
  },
};

// Export singleton instance
export const firestoreService = new FirestoreService();
