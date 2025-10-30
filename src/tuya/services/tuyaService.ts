// src/services/tuyaService.ts
import { firestoreService } from '../../services/firestoreService';
import type { TuyaDevice } from '../../types';

class TuyaService {
  private baseUrl = '/.netlify/functions';

  /**
   * Načte Test Mode z nastavení
   */
   private async isTestMode(): Promise<boolean> {
    try {
      const { settingsService } = await import('../../services/settingsService');
      const settings = await settingsService.loadSettings();
      const testMode = settings.systemSettings.tuyaTestMode;
      console.log('🔍 Tuya Test Mode:', testMode); // ✅ Debug log
      return testMode;
    } catch (error) {
      console.warn('⚠️ Nepodařilo se načíst Tuya test mode, použiju default (true)');
      return true;
    }
  }

  /**
   * 🧪 Mock data pro development/testování
   */
  private getMockDevices(): TuyaDevice[] {
    console.log('🧪 Generuji mock Tuya data');
    return [
      {
        id: 'bfae2da6e578cdd1b0',
        name: 'Světlo chodba',
        local_key: 'mock_key_1',
        category: 'light',
        product_id: 'mock_product_1',
        product_name: 'Smart Light',
        sub: false,
        uuid: 'mock_uuid_1',
        owner_id: 'mock_owner',
        online: true,
        status: [
          { code: 'switch_1', value: true },
          { code: 'bright_value', value: 75 },
        ],
        lastUpdated: Date.now(),
        isVisible: true,
      },
      {
        id: 'bffbfe2dad8680b2a8a9',
        name: 'Garážové světlo',
        local_key: 'mock_key_2',
        category: 'light',
        product_id: 'mock_product_2',
        product_name: 'Garage Light',
        sub: false,
        uuid: 'mock_uuid_2',
        owner_id: 'mock_owner',
        online: true,
        status: [
          { code: 'switch_1', value: false },
          { code: 'bright_value', value: 0 },
        ],
        lastUpdated: Date.now(),
        isVisible: true,
      },
      {
        id: '31311065c44f33b75eaf',
        name: 'Hl.zásuvka-roz',
        local_key: 'mock_key_3',
        category: 'switch',
        product_id: 'mock_product_3',
        product_name: 'Smart Socket',
        sub: false,
        uuid: 'mock_uuid_3',
        owner_id: 'mock_owner',
        online: true,
        status: [
          { code: 'switch_1', value: true },
          { code: 'cur_power', value: 45 },
        ],
        lastUpdated: Date.now(),
        isVisible: true,
      },
      {
        id: 'bf0f8692301eaff1f6',
        name: 'Temperature and humidity sensor',
        local_key: 'mock_key_4',
        category: 'sensor',
        product_id: 'mock_product_4',
        product_name: 'Temp Sensor',
        sub: false,
        uuid: 'mock_uuid_4',
        owner_id: 'mock_owner',
        online: true,
        status: [
          { code: 'temp_current', value: 22 },
          { code: 'humidity_value', value: 55 },
        ],
        lastUpdated: Date.now(),
        isVisible: true,
      },
    ];
  }

  /**
   * Načte všechna Tuya zařízení ze serveru
   */
   async fetchDevices(): Promise<TuyaDevice[]> {
    // 🧪 TEST MODE: Vrátí mock data
    const testMode = await this.isTestMode();
    if (testMode) {
      console.log('🧪 TEST MODE: Používám mock Tuya data');
      return new Promise((resolve) => {
        setTimeout(() => resolve(this.getMockDevices()), 500);
      });
    }

    // 🚀 PRODUCTION: Volá skutečné Netlify funkce
    try {
      console.log('📡 Načítám Tuya zařízení ze serveru...');
      
      const response = await fetch(`${this.baseUrl}/get-device-list`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Nepodařilo se načíst zařízení');
      }

      console.log(`✅ Načteno ${data.devices.length} zařízení`);
      
      // Mapování dat z Tuya API na naše typy
      const devices: TuyaDevice[] = data.devices.map((device: any) => ({
        id: device.id || device.device_id,
        name: device.name || device.custom_name || 'Neznámé zařízení',
        local_key: device.local_key || '',
        category: device.category || 'other',
        product_id: device.product_id || '',
        product_name: device.product_name || '',
        sub: device.sub || false,
        uuid: device.uuid || device.id,
        owner_id: device.owner_id || '',
        online: device.online !== undefined ? device.online : false,
        status: device.status || [],
        lastUpdated: Date.now(),
        isVisible: true,
        customName: device.custom_name,
      }));

      return devices;
    } catch (error) {
      console.error('❌ Chyba při načítání Tuya zařízení:', error);
      throw error;
    }
  }

  /**
   * Ovládá zařízení (zapne/vypne/změna hodnoty)
   */
   async controlDevice(
    deviceId: string,
    commands: { code: string; value: any }[]
  ): Promise<boolean> {
    // 🧪 TEST MODE: Simuluj úspěch
    const testMode = await this.isTestMode();
    if (testMode) {
      console.log(`🧪 TEST MODE: Simuluji ovládání zařízení ${deviceId}:`, commands);
      return new Promise((resolve) => {
        setTimeout(() => resolve(true), 300);
      });
    }

    // 🚀 PRODUCTION: Volá skutečné Netlify funkce
    try {
      console.log(`🎮 Ovládám zařízení ${deviceId}:`, commands);

      const response = await fetch(`${this.baseUrl}/control-device`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          deviceId,
          commands,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Nepodařilo se ovládat zařízení');
      }

      console.log('✅ Zařízení úspěšně ovládnuto');
      return true;
    } catch (error) {
      console.error('❌ Chyba při ovládání zařízení:', error);
      throw error;
    }
  }

  /**
   * Synchronizuje Tuya zařízení do Firestore
   */
   async syncToFirestore(userId: string): Promise<TuyaDevice[]> {
    try {
      console.log('🔄 Synchronizuji Tuya → Firestore...');

      // Načti zařízení z Tuya
      const devices = await this.fetchDevices();

      // ✅ DŮLEŽITÉ: Přidej userId do každého zařízení
      const devicesWithUserId = devices.map(device => ({
        ...device,
        userId: userId // Explicitně přidej userId
      }));

      // Ulož do Firestore
      await firestoreService.saveUserDevices(userId, devicesWithUserId);

      console.log('✅ Synchronizace dokončena');
      return devicesWithUserId;
    } catch (error) {
      console.error('❌ Chyba při synchronizaci:', error);
      throw error;
    }
  }

  /**
   * Zapne zařízení
   */
  async turnOn(deviceId: string): Promise<boolean> {
    return this.controlDevice(deviceId, [{ code: 'switch_1', value: true }]);
  }

  /**
   * Vypne zařízení
   */
  async turnOff(deviceId: string): Promise<boolean> {
    return this.controlDevice(deviceId, [{ code: 'switch_1', value: false }]);
  }

  /**
   * Přepne stav zařízení (zapne/vypne)
   */
  async toggle(deviceId: string, currentState: boolean): Promise<boolean> {
    return currentState ? this.turnOff(deviceId) : this.turnOn(deviceId);
  }
}


export const tuyaService = new TuyaService();
