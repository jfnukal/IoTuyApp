// src/services/deviceService.ts
import {
  doc,
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  onSnapshot,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type { TuyaDevice, DeviceCategory } from '../types/index';

class DeviceService {
  // ==================== WRITE BATCH ====================
  
  /**
   * 🗂️ Vytvoří novou dávku (batch) pro hromadné zápisy
   */
  getWriteBatch() {
    return writeBatch(db);
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

      // Načti existující zařízení pro zachování uživatelských nastavení
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

        // Zachovej uživatelská nastavení z existujícího dokumentu
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
          ...cleanPreservedSettings,
          userId: uid,
          lastUpdated: Date.now(),
        });

        processedIds.add(device.id);
      });

      // Smaž zařízení která už v Tuya nejsou
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
      
      // 🆕 Odfiltruj undefined hodnoty - Firestore je nepodporuje
      const cleanedUpdates = Object.fromEntries(
        Object.entries(updates).filter(([_, value]) => value !== undefined)
      );
      
      if (Object.keys(cleanedUpdates).length === 0) {
        console.warn('⚠️ updateDevice: Žádná data k uložení');
        return;
      }
      
      await updateDoc(deviceRef, { ...cleanedUpdates, lastUpdated: Date.now() });
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
      console.error('DeviceService error:', error);
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
   * Aktualizuje ČÁST nastavení JEDNOHO zařízení (pro batch)
   */
  updateDevicePartial(
    batch: any,
    _userId: string,
    deviceId: string,
    dataToUpdate: Record<string, any>
  ) {
    const deviceDocRef = doc(db, 'devices', deviceId);
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
}

export const deviceService = new DeviceService();