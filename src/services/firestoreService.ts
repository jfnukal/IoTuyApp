//src/services/firestoreService.ts
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  arrayUnion,
  collection,
  addDoc,
  query,
  orderBy,
  getDocs,
  onSnapshot,
  serverTimestamp,
  where,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type {
  UserSettings,
  CalendarEventData,
  FamilyMember,
  TimetableDay,
  NamedayPreferenceDoc,
  DaySummaryConfig,
  HeaderConfigDoc,
  HeaderSlotConfig,
  ShoppingItem,
  ShoppingList,
  DishwasherState,
  DishwasherHistoryItem,
  Recipe,
  RecipeFormData,
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

  // ==================== SOUHRN DNE (per-člen) ====================
  /** Načte konfiguraci Souhrnu dne pro daného uživatele (authUid). */
  async getDaySummaryConfig(userId: string): Promise<DaySummaryConfig | null> {
    const ref = doc(db, 'userSettings', userId);
    const snap = await getDoc(ref);
    return (snap.data()?.daySummary as DaySummaryConfig) || null;
  }

  /** Uloží zapnutí + čas Souhrnu dne. lastSentDate needitujeme z klienta (spravuje Cloud Function). */
  async saveDaySummaryConfig(
    userId: string,
    cfg: { enabled: boolean; time: string }
  ): Promise<void> {
    const ref = doc(db, 'userSettings', userId);
    await setDoc(
      ref,
      {
        daySummary: { enabled: cfg.enabled, time: cfg.time },
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
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

  // ==================== KUCHAŘKA (RECEPTY) ====================

  subscribeToRecipes(callback: (recipes: Recipe[]) => void): Unsubscribe {
    const q = query(collection(db, 'recipes'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snap) => {
      const recipes = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Recipe));
      callback(recipes);
    }, (error) => {
      console.error('❌ Chyba při poslechu receptů:', error);
      callback([]);
    });
  }

  async getRecipes(): Promise<Recipe[]> {
    const q = query(collection(db, 'recipes'), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Recipe));
  }

  async addRecipe(data: RecipeFormData): Promise<string> {
    const now = Date.now();
    // Strip undefined values — Firestore rejects them
    const clean = Object.fromEntries(
      Object.entries({ ...data, createdAt: now, updatedAt: now })
        .filter(([, v]) => v !== undefined)
    );
    const docRef = await addDoc(collection(db, 'recipes'), clean);
    return docRef.id;
  }

  async updateRecipe(id: string, data: Partial<RecipeFormData>): Promise<void> {
    const docRef = doc(db, 'recipes', id);
    await updateDoc(docRef, { ...data, updatedAt: Date.now() });
  }

  async deleteRecipe(id: string): Promise<void> {
    await deleteDoc(doc(db, 'recipes', id));
  }
}

export const firestoreService = new FirestoreService();
