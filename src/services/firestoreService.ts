//src/services/firestoreService.ts
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
  writeBatch,
  onSnapshot,
  serverTimestamp,
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
  TimetableDay,
  NamedayPreferenceDoc,
  HeaderConfigDoc,
  HeaderSlotConfig,
  ShoppingItem,
  ShoppingList,
  DishwasherState,
  DishwasherHistoryItem,
} from '../types/index';

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
      // To vytvoří dokument, pokud neexistuje
      await setDoc(
        docRef,
        {
          ...updates,
          updatedAt: Date.now(),
        },
        { merge: true }
      );

      console.log('✅ User settings updated');
    } catch (error) {
      console.error('Error updating user settings:', error);
      throw new Error('Nepodařilo se aktualizovat nastavení');
    }
  }

  async saveFCMToken(userId: string, token: string): Promise<void> {
    const userSettingsRef = doc(db, 'userSettings', userId);

    // ✅ Nejdřív zkontroluj, jestli token už není
    const userSettingsSnap = await getDoc(userSettingsRef);
    const existingTokens = userSettingsSnap.data()?.fcmTokens || [];

    if (existingTokens.includes(token)) {
      console.log('✅ Token už existuje, nepřidávám duplicitu');
      return;
    }

    console.log('➕ Přidávám nový token');

    await setDoc(
      userSettingsRef,
      {
        fcmTokens: arrayUnion(token),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  }

  // ==================== ROOMS ====================

  /**
   * ⚛️ Atomicky přiřadí zařízení k místnosti (nebo ho odebere)
   * Aktualizuje dokument zařízení AŽ dva dokumenty místností.
   * * @param deviceId ID zařízení, které se přesouvá
   * @param newRoomId ID nové místnosti (nebo ""/null pro odebrání)
   * @param oldRoomId ID staré místnosti (pokud bylo někde přiřazeno)
   */
  async assignDeviceToRoom(
    deviceId: string,
    newRoomId: string | null | undefined,
    oldRoomId: string | null | undefined
  ) {
    try {
      const batch = this.getWriteBatch();
      const deviceRef = doc(db, 'devices', deviceId);

      // Krok 1: Aktualizuj samotné zařízení
      if (newRoomId) {
        // Přiřazujeme do nové místnosti
        batch.update(deviceRef, { roomId: newRoomId, lastUpdated: Date.now() });
      } else {
        // Odebíráme z místnosti (nastavujeme "nezařazeno")
        batch.update(deviceRef, {
          roomId: deleteField(), // Smaže pole 'roomId' z dokumentu
          lastUpdated: Date.now(),
        });
      }

      // Krok 2: Odeber ID zařízení ze staré místnosti (pokud existovala)
      if (oldRoomId) {
        const oldRoomRef = doc(db, 'rooms', oldRoomId);
        batch.update(oldRoomRef, {
          devices: arrayRemove(deviceId), // Atomicky odebere ID z pole
          updatedAt: Date.now(),
        });
      }

      // Krok 3: Přidej ID zařízení do nové místnosti (pokud existuje)
      if (newRoomId) {
        const newRoomRef = doc(db, 'rooms', newRoomId);
        batch.update(newRoomRef, {
          devices: arrayUnion(deviceId), // Atomicky přidá ID do pole
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

  // ==================== DEVICES ====================

  /**
   * 🗂️ Vytvoří novou dávku (batch) pro hromadné zápisy
   */
  getWriteBatch() {
    return writeBatch(db);
  }

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

      // ✅ NOVÉ: Nejprve načti existující zařízení pro zachování uživatelských nastavení
      const q = query(devicesRef, where('userId', '==', uid));
      const existingDevicesSnapshot = await getDocs(q);

      // Vytvoř mapu existujících zařízení pro rychlý přístup
      const existingDevicesMap = new Map<string, any>();
      existingDevicesSnapshot.forEach((docSnap) => {
        existingDevicesMap.set(docSnap.id, docSnap.data());
      });

      // Sleduj která zařízení zpracováváme (pro mazání starých)
      const processedIds = new Set<string>();

      devices.forEach((device) => {
        const docRef = doc(devicesRef, device.id);
        const existingData = existingDevicesMap.get(device.id);

        // ✅ Zachovej uživatelská nastavení z existujícího dokumentu
        const preservedSettings = existingData
          ? {
              gridLayout: existingData.gridLayout,
              cardSettings: existingData.cardSettings,
              customName: existingData.customName,
              customIcon: existingData.customIcon,
              customColor: existingData.customColor,
              notes: existingData.notes,
              roomId: existingData.roomId,
              position: existingData.position,
            }
          : {};

        // Odstraň undefined hodnoty z preservedSettings
        const cleanPreservedSettings = Object.fromEntries(
          Object.entries(preservedSettings).filter(([_, v]) => v !== undefined)
        );

        batch.set(docRef, {
          ...device,
          ...cleanPreservedSettings, // ✅ Přepíše daty z Tuya, ale zachová uživatelská nastavení
          userId: uid,
          lastUpdated: Date.now(),
        });

        processedIds.add(device.id);
      });

      // Smaž zařízení která už v Tuya nejsou (volitelné - můžeš zakomentovat)
      existingDevicesSnapshot.forEach((docSnap) => {
        if (!processedIds.has(docSnap.id)) {
          batch.delete(docSnap.ref);
        }
      });

      await batch.commit();
      console.log(
        `✅ Uloženo ${devices.length} zařízení (s preserved settings)`
      );
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

  /**
   * 🔄 Aktualizuje ČÁST nastavení JEDNOHO zařízení (pro batch)
   * Používá "dot notation" pro aktualizaci vnořeného objektu.
   *
   * @param batch Instance WriteBatch z getWriteBatch()
   * @param userId ID uživatele (zde se nepoužívá pro cestu, ale předává se)
   * @param deviceId ID zařízení
   * @param dataToUpdate Objekt s cestou k aktualizaci,
   * např: { 'cardSettings.gridLayout': {x: 1, y: 2, w: 1, h: 1} }
   */
  updateDevicePartial(
    batch: any, // Firebase WriteBatch
    _userId: string, // Přijímáme, ale nepoužíváme v cestě
    deviceId: string,
    dataToUpdate: Record<string, any>
  ) {
    // Tvoje kolekce je 'devices', nikoliv vnořená pod uživatelem
    const deviceDocRef = doc(db, 'devices', deviceId);

    // Přidáme i 'lastUpdated' pro konzistenci
    const updatesWithTimestamp = {
      ...dataToUpdate,
      lastUpdated: Date.now(),
    };

    batch.update(deviceDocRef, updatesWithTimestamp);
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

  // ==================== FAMILY MEMBERS ====================
  async subscribeToFamilyMembers(
    callback: (members: FamilyMember[]) => void
  ): Promise<Unsubscribe> {
    try {
      const membersCollection = collection(db, 'familyMembers');
      const q = query(membersCollection, orderBy('createdAt', 'asc'));
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

  // ==================== CALENDAR EVENTS ====================

  /**
   * ✅ NOVÉ: Rodinné události - vidí všichni!
   * Jen "personal" události vidí pouze ten, kdo je vytvořil
   */
  async subscribeToEvents(
    currentUserAuthUid: string,
    callback: (events: CalendarEventData[]) => void
  ): Promise<Unsubscribe> {
    try {
      // ✅ ZMĚNA: Načteme VŠECHNY události (bez filtru userId)
      const eventsRef = collection(db, 'calendarEvents');
      const q = query(eventsRef, orderBy('date', 'asc'));

      return onSnapshot(q, (snapshot) => {
        const allEvents = snapshot.docs.map(
          (doc) => ({ id: doc.id, ...doc.data() } as CalendarEventData)
        );

        // ✅ FILTROVÁNÍ: Personal události vidí jen jejich autor
        const visibleEvents = allEvents.filter((event) => {
          // Pokud je to osobní událost
          if (event.type === 'personal') {
            // Vidí jen ten, kdo ji vytvořil
            return (
              event.createdBy === currentUserAuthUid ||
              event.userId === currentUserAuthUid
            );
          }
          // Všechny ostatní typy jsou sdílené
          return true;
        });

        callback(visibleEvents);
      });
    } catch (error) {
      console.error('Error subscribing to events:', error);
      throw error;
    }
  }

  async getEvents(currentUserAuthUid: string): Promise<CalendarEventData[]> {
    const eventsRef = collection(db, 'calendarEvents');
    const q = query(eventsRef, orderBy('date', 'asc'));
    const snapshot = await getDocs(q);

    const allEvents = snapshot.docs.map(
      (doc) => ({ id: doc.id, ...doc.data() } as CalendarEventData)
    );

    // Filtrování stejně jako u subscribe
    return allEvents.filter((event) => {
      if (event.type === 'personal') {
        return (
          event.createdBy === currentUserAuthUid ||
          event.userId === currentUserAuthUid
        );
      }
      return true;
    });
  }

  async addEvent(
    currentUserAuthUid: string,
    event: Omit<
      CalendarEventData,
      'id' | 'createdAt' | 'updatedAt' | 'userId' | 'createdBy'
    >
  ): Promise<string> {
    const eventsRef = collection(db, 'calendarEvents');
    const newEvent = {
      ...event,
      userId: currentUserAuthUid, // Zachováme pro kompatibilitu
      createdBy: currentUserAuthUid, // ✅ NOVÉ: Kdo událost vytvořil
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    const docRef = await addDoc(eventsRef, newEvent);
    return docRef.id;
  }

  async updateEvent(
    eventId: string,
    updates: Partial<Omit<CalendarEventData, 'id' | 'userId' | 'createdBy'>>
  ): Promise<void> {
    const eventRef = doc(db, 'calendarEvents', eventId);
    await updateDoc(eventRef, {
      ...updates,
      updatedAt: Date.now(),
    });
  }

  async deleteEvent(eventId: string): Promise<void> {
    const eventRef = doc(db, 'calendarEvents', eventId);
    await deleteDoc(eventRef);
  }

  // ==================== SCHEDULES (ROZVRHY) ====================
  async getSchedule(scheduleId: string): Promise<TimetableDay[]> {
    try {
      const docRef = doc(db, 'schedules', scheduleId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return docSnap.data().days as TimetableDay[];
      } else {
        console.warn(`Rozvrh s ID "${scheduleId}" nebyl v databázi nalezen.`);
        return [];
      }
    } catch (error) {
      console.error(`Chyba při načítání rozvrhu "${scheduleId}":`, error);
      throw new Error('Nepodařilo se načíst rozvrh.');
    }
  }

  async saveSchedule(
    scheduleId: string,
    scheduleData: TimetableDay[]
  ): Promise<void> {
    try {
      const scheduleRef = doc(db, 'schedules', scheduleId);
      await setDoc(scheduleRef, {
        days: scheduleData,
        lastUpdated: new Date(),
      });
      console.log(`✅ Rozvrh "${scheduleId}" byl úspěšně uložen do Firestore.`);
    } catch (error) {
      console.error(`❌ Chyba při ukládání rozvrhu "${scheduleId}":`, error);
      throw new Error('Nepodařilo se uložit rozvrh.');
    }
  }

  // ==================== NAMEDAY PREFERENCES ====================

  async saveNamedayPreferences(
    userId: string,
    prefs: NamedayPreferenceDoc
  ): Promise<void> {
    try {
      const docRef = doc(db, 'namedayPreferences', userId);
      await setDoc(docRef, prefs, { merge: true });
    } catch (error) {
      console.error('Chyba při ukládání preferencí jmenin:', error);
    }
  }

  subscribeToNamedayPreferences(
    userId: string,
    callback: (prefs: NamedayPreferenceDoc | null) => void
  ): Unsubscribe {
    const docRef = doc(db, 'namedayPreferences', userId);
    return onSnapshot(docRef, (docSnap) => {
      callback(
        docSnap.exists() ? (docSnap.data() as NamedayPreferenceDoc) : null
      );
    });
  }

  // ==================== FAMILY MEMBER BY AUTH UID ====================
  async getFamilyMemberByAuthUid(
    authUid: string
  ): Promise<FamilyMember | null> {
    try {
      const membersRef = collection(db, 'familyMembers');
      const q = query(membersRef, where('authUid', '==', authUid));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        console.warn(`⚠️ Žádný family member s authUid: ${authUid}`);
        return null;
      }

      const doc = snapshot.docs[0];
      const member = { id: doc.id, ...doc.data() } as FamilyMember;
      return member;
    } catch (error) {
      console.error('❌ Error getting family member by authUid:', error);
      return null;
    }
  }

  // ==================== HEADER CONFIG ====================

  /**
   * Získá konfiguraci hlavičky pro rodinný tablet
   */
  async getHeaderConfig(): Promise<HeaderSlotConfig> {
    try {
      const docRef = doc(db, 'allFamily', 'headerConfig');
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data() as HeaderConfigDoc;
        return data.slots;
      }

      // Výchozí konfigurace
      const defaultConfig: HeaderSlotConfig = {
        left: 'greeting',
        center: 'upcoming',
        right: 'weather',
      };

      // Uložíme výchozí konfiguraci
      await this.updateHeaderConfig(defaultConfig);
      return defaultConfig;
    } catch (error) {
      console.error('❌ Chyba při načítání header config:', error);

      // Fallback výchozí konfigurace
      return {
        left: 'greeting',
        center: 'upcoming',
        right: 'weather',
      };
    }
  }

  /**
   * Aktualizuje konfiguraci hlavičky
   */
  async updateHeaderConfig(slots: HeaderSlotConfig): Promise<void> {
    try {
      const docRef = doc(db, 'allFamily', 'headerConfig');
      const data: HeaderConfigDoc = {
        slots,
        updatedAt: Date.now(),
      };

      await setDoc(docRef, data, { merge: true });
      console.log('✅ Header config uložena');
    } catch (error) {
      console.error('❌ Chyba při ukládání header config:', error);
      throw error;
    }
  }

  /**
   * Poslouchá změny v konfiguraci hlavičky (real-time)
   */
  subscribeToHeaderConfig(
    callback: (config: HeaderSlotConfig) => void
  ): () => void {
    const docRef = doc(db, 'allFamily', 'headerConfig');

    const unsubscribe = onSnapshot(
      docRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data() as HeaderConfigDoc;
          callback(data.slots);
        } else {
          // Výchozí konfigurace
          callback({
            left: 'greeting',
            center: 'upcoming',
            right: 'weather',
          });
        }
      },
      (error) => {
        console.error('❌ Chyba při poslechu header config:', error);
      }
    );

    return unsubscribe;
  }

  // ==================== SHOPPING LIST ====================

  /**
   * Získá nákupní seznam (sdílený pro celou rodinu)
   */
  async getShoppingList(): Promise<ShoppingList | null> {
    try {
      const docRef = doc(db, 'allFamily', 'shoppingList');
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as ShoppingList;
      }

      // Vytvoř prázdný seznam, pokud neexistuje
      const emptyList: Omit<ShoppingList, 'id'> = {
        items: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      await setDoc(docRef, emptyList);
      return { id: 'shoppingList', ...emptyList };
    } catch (error) {
      console.error('❌ Chyba při načítání nákupního seznamu:', error);
      throw new Error('Nepodařilo se načíst nákupní seznam');
    }
  }

  /**
   * Přidá položku do nákupního seznamu
   */
  async addShoppingItem(
    item: Omit<ShoppingItem, 'id' | 'addedAt' | 'completed'>
  ): Promise<void> {
    try {
      const docRef = doc(db, 'allFamily', 'shoppingList');
      const newItem: ShoppingItem = {
        ...item,
        id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        addedAt: Date.now(),
        completed: false,
      };

      // Nejprve zkontroluj, jestli dokument existuje
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        // Dokument existuje - přidej položku
        await updateDoc(docRef, {
          items: arrayUnion(newItem),
          updatedAt: Date.now(),
        });
      } else {
        // Dokument neexistuje - vytvoř ho s první položkou
        await setDoc(docRef, {
          items: [newItem],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      }

      console.log('✅ Položka přidána do nákupního seznamu');
    } catch (error) {
      console.error('❌ Chyba při přidávání položky:', error);
      throw new Error('Nepodařilo se přidat položku');
    }
  }

  /**
   * Aktualizuje položku v nákupním seznamu (např. completed)
   */
  async updateShoppingItem(
    itemId: string,
    updates: Partial<ShoppingItem>
  ): Promise<void> {
    try {
      const docRef = doc(db, 'allFamily', 'shoppingList');
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        throw new Error('Nákupní seznam neexistuje');
      }

      const data = docSnap.data() as ShoppingList;
      const updatedItems = data.items.map((item) =>
        item.id === itemId ? { ...item, ...updates } : item
      );

      await updateDoc(docRef, {
        items: updatedItems,
        updatedAt: Date.now(),
      });

      console.log('✅ Položka aktualizována');
    } catch (error) {
      console.error('❌ Chyba při aktualizaci položky:', error);
      throw new Error('Nepodařilo se aktualizovat položku');
    }
  }

  /**
   * Smaže položku z nákupního seznamu
   */
  async deleteShoppingItem(itemId: string): Promise<void> {
    try {
      const docRef = doc(db, 'allFamily', 'shoppingList');
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        throw new Error('Nákupní seznam neexistuje');
      }

      const data = docSnap.data() as ShoppingList;
      const filteredItems = data.items.filter((item) => item.id !== itemId);

      await updateDoc(docRef, {
        items: filteredItems,
        updatedAt: Date.now(),
      });

      console.log('✅ Položka smazána');
    } catch (error) {
      console.error('❌ Chyba při mazání položky:', error);
      throw new Error('Nepodařilo se smazat položku');
    }
  }

  /**
   * Smaže všechny dokončené položky
   */
  async clearCompletedItems(): Promise<void> {
    try {
      const docRef = doc(db, 'allFamily', 'shoppingList');
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) return;

      const data = docSnap.data() as ShoppingList;
      const activeItems = data.items.filter((item) => !item.completed);

      await updateDoc(docRef, {
        items: activeItems,
        updatedAt: Date.now(),
      });

      console.log('✅ Dokončené položky smazány');
    } catch (error) {
      console.error('❌ Chyba při mazání dokončených položek:', error);
      throw new Error('Nepodařilo se smazat dokončené položky');
    }
  }

  /**
   * Real-time poslouchání změn v nákupním seznamu
   */
  subscribeToShoppingList(
    callback: (list: ShoppingList | null) => void
  ): Unsubscribe {
    const docRef = doc(db, 'allFamily', 'shoppingList');

    return onSnapshot(
      docRef,
      (docSnap) => {
        if (docSnap.exists()) {
          callback({ id: docSnap.id, ...docSnap.data() } as ShoppingList);
        } else {
          callback(null);
        }
      },
      (error) => {
        console.error('❌ Chyba při poslechu nákupního seznamu:', error);
        callback(null);
      }
    );
  }

  // ==================== DISHWASHER ====================

  /**
   * Získá stav myčky (sdílený pro celou rodinu)
   */
  async getDishwasherState(): Promise<DishwasherState | null> {
    try {
      const docRef = doc(db, 'allFamily', 'dishwasher');
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        // Kontrola, jestli má nové schéma
        if (data.nextPersonId) {
          return { id: docSnap.id, ...data } as DishwasherState;
        }
        // Starý dokument - přepíšeme ho
        console.log('🍽️ Starý dokument, přepisuji na nové schéma...');
      }

      // Vytvoř výchozí stav - začíná Jareček
      const initialState: Omit<DishwasherState, 'id'> = {
        nextPersonId: 'jarecek',
        nextPersonName: 'Jareček',
        nextPersonEmoji: '👦',
        lastCompletedBy: '',
        lastCompletedByName: '',
        lastCompletedByEmoji: '',
        lastCompletedAt: null,
        history: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      await setDoc(docRef, initialState);
      return { id: 'dishwasher', ...initialState };
    } catch (error) {
      console.error('❌ Chyba při načítání stavu myčky:', error);
      throw new Error('Nepodařilo se načíst stav myčky');
    }
  }

  /**
   * Potvrdí, že aktuální osoba umyla nádobí a přepne na dalšího
   */
  async completeDishwasherDuty(): Promise<void> {
    try {
      const docRef = doc(db, 'allFamily', 'dishwasher');
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        throw new Error('Dokument myčky neexistuje');
      }

      const currentData = docSnap.data() as DishwasherState;

      // Nový záznam do historie
      const historyItem: DishwasherHistoryItem = {
        id: `hist_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        personId: currentData.nextPersonId,
        personName: currentData.nextPersonName,
        personEmoji: currentData.nextPersonEmoji,
        completedAt: Date.now(),
      };

      // Přepni na dalšího člověka
      const nextPerson =
        currentData.nextPersonId === 'jarecek'
          ? { id: 'johanka', name: 'Johanka nádobí!', emoji: '👧' }
          : { id: 'jarecek', name: 'Jareček nádobí!', emoji: '👦' };

      // Přidej nový záznam na začátek a omez na max 10 položek
      const updatedHistory = [
        historyItem,
        ...(currentData.history || []),
      ].slice(0, 10);

      await updateDoc(docRef, {
        nextPersonId: nextPerson.id,
        nextPersonName: nextPerson.name,
        nextPersonEmoji: nextPerson.emoji,
        lastCompletedBy: currentData.nextPersonId,
        lastCompletedByName: currentData.nextPersonName,
        lastCompletedByEmoji: currentData.nextPersonEmoji,
        lastCompletedAt: Date.now(),
        history: updatedHistory,
        updatedAt: Date.now(),
      });

      console.log(
        `✅ ${currentData.nextPersonName} umyl/a nádobí, další je ${nextPerson.name}`
      );
    } catch (error) {
      console.error('❌ Chyba při potvrzení mytí:', error);
      throw new Error('Nepodařilo se potvrdit mytí nádobí');
    }
  }

  /**
   * Vrátí poslední změnu (UNDO - pro rychlé překliknutí)
   */
  async undoDishwasherDuty(): Promise<void> {
    try {
      const docRef = doc(db, 'allFamily', 'dishwasher');
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        throw new Error('Dokument myčky neexistuje');
      }

      const currentData = docSnap.data() as DishwasherState;

      // Odeber poslední záznam z historie
      const lastRecord = currentData.history[0];
      if (!lastRecord) {
        console.log('⚠️ Žádná historie k vrácení');
        return;
      }

      const updatedHistory = currentData.history.slice(1);
      const previousRecord = updatedHistory[0];

      await updateDoc(docRef, {
        // Vrať zpět toho, kdo byl předtím na řadě
        nextPersonId: lastRecord.personId,
        nextPersonName: lastRecord.personName,
        nextPersonEmoji: lastRecord.personEmoji,
        // Aktualizuj "poslední dokončený"
        lastCompletedBy: previousRecord?.personId || '',
        lastCompletedByName: previousRecord?.personName || '',
        lastCompletedByEmoji: previousRecord?.personEmoji || '',
        lastCompletedAt: previousRecord?.completedAt || null,
        history: updatedHistory,
        updatedAt: Date.now(),
      });

      console.log(`✅ Undo: ${lastRecord.personName} je znovu na řadě`);
    } catch (error) {
      console.error('❌ Chyba při undo:', error);
      throw new Error('Nepodařilo se vrátit změnu');
    }
  }

  /**
   * Real-time poslouchání změn stavu myčky
   */
  subscribeToDishwasher(
    callback: (state: DishwasherState | null) => void
  ): Unsubscribe {
    const docRef = doc(db, 'allFamily', 'dishwasher');

    return onSnapshot(
      docRef,
      (docSnap) => {
        if (docSnap.exists()) {
          callback({ id: docSnap.id, ...docSnap.data() } as DishwasherState);
        } else {
          callback(null);
        }
      },
      (error) => {
        console.error('❌ Chyba při poslechu stavu myčky:', error);
        callback(null);
      }
    );
  }
}

export const firestoreService = new FirestoreService();
