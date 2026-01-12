// src/services/tuyaService.ts
import { deviceService } from '../../services/deviceService';
import type { TuyaDevice } from '../../types';

class TuyaService {
  private baseUrl = '/.netlify/functions';

  
  /**
   * Načte všechna Tuya zařízení ze serveru
   */
   async fetchDevices(): Promise<TuyaDevice[]> {
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
        name: device.customName || device.name || 'Neznámé zařízení',
        local_key: device.local_key || device.localKey || '',  // ← TAKÉ OPRAVA
        category: device.category || 'other',
        product_id: device.product_id || device.productId || '',  // ← TAKÉ OPRAVA
        product_name: device.product_name || device.productName || '',  // ← TAKÉ OPRAVA
        sub: device.sub || false,
        uuid: device.uuid || device.id,
        owner_id: device.owner_id || '',
        online: device.online !== undefined ? device.online : false,  // ← OPRAVENO
        status: device.status || [],
        lastUpdated: Date.now(),
        isVisible: true,
        ...(device.customName && { customName: device.customName }),
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
      console.log('📦 RAW DATA Z API:', JSON.stringify(data, null, 2));
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
      const devicesWithUserId = devices.map((device) => ({
        ...device,
        userId: userId, // Explicitně přidej userId
      }));

      // Ulož do Firestore
      await deviceService.saveUserDevices(userId, devicesWithUserId);

      console.log('✅ Synchronizace dokončena');
      return devicesWithUserId;
    } catch (error) {
      console.error('❌ Chyba při synchronizaci:', error);
      throw error;
    }
  }

  /**
   * 🆕 Získá status pro více zařízení najednou (batch)
   * Používá se pro auto-sync podle kategorií
   */
   async getDevicesStatus(deviceIds: string[]): Promise<Map<string, any[]>> {
    try {
      if (deviceIds.length === 0) {
        return new Map();
      }

      console.log(`📡 Batch status request for ${deviceIds.length} devices...`);

      const response = await fetch(`${this.baseUrl}/get-devices-status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ deviceIds }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Nepodařilo se získat status zařízení');
      }

      // Převeď výsledky na Map pro snadný přístup
      const statusMap = new Map<string, any[]>();
      data.results.forEach((result: any) => {
        if (result.success && result.status) {
          statusMap.set(result.deviceId, result.status);
        }
      });

      console.log(`✅ Batch status: ${statusMap.size}/${deviceIds.length} úspěšných`);
      return statusMap;

    } catch (error) {
      console.error('❌ Chyba při batch status:', error);
      return new Map();
    }
  }

  /**
   * 🆕 Synchronizuje status zařízení podle kategorie a aktualizuje Firestore
   */
   async syncDevicesByCategory(
    devices: Array<{ id: string; category: string; online: boolean }>,
    categories: string[],
    syncOnlyOnline: boolean = true
  ): Promise<number> {
    try {
      // Filtruj zařízení podle kategorií
      let devicesToSync = devices.filter(d => categories.includes(d.category));
      
      // Filtruj pouze online pokud je nastaveno
      if (syncOnlyOnline) {
        devicesToSync = devicesToSync.filter(d => d.online);
      }

      if (devicesToSync.length === 0) {
        console.log(`⏭️ Žádná zařízení k synchronizaci pro kategorie: ${categories.join(', ')}`);
        return 0;
      }

      const deviceIds = devicesToSync.map(d => d.id);
      console.log(`🔄 Synchronizuji ${deviceIds.length} zařízení (kategorie: ${categories.join(', ')})`);

      // Získej statusy z Tuya API
      const statusMap = await this.getDevicesStatus(deviceIds);

      if (statusMap.size === 0) {
        console.log('⚠️ Nepodařilo se získat žádné statusy');
        return 0;
      }

      // Aktualizuj Firestore pro každé zařízení
      const updatePromises: Promise<void>[] = [];
      
      statusMap.forEach((status, deviceId) => {
        updatePromises.push(
          deviceService.updateDevice(deviceId, {
            status,
            lastUpdated: Date.now(),
          })
        );
      });

      await Promise.all(updatePromises);
      
      console.log(`✅ Synchronizováno ${statusMap.size} zařízení`);
      return statusMap.size;

    } catch (error) {
      console.error('❌ Chyba při synchronizaci kategorií:', error);
      return 0;
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

  /**
   * Získá snapshot z doorbell
   */
   async getDoorbellSnapshot(deviceId: string): Promise<string | null> {
    try {
      console.log(`📸 Získávám snapshot pro doorbell ${deviceId}...`);

      const response = await fetch(`${this.baseUrl}/get-doorbell-snapshot`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          deviceId,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Nepodařilo se získat snapshot');
      }

      console.log('✅ Snapshot URL získána');
      return data.snapshot?.url || null;
    } catch (error) {
      console.error('❌ Chyba při získávání snapshotu:', error);
      return null;
    }
  }

  /**
   * Proxy pro načítání obrázků (obchází CORS)
   */
  getProxiedImageUrl(originalUrl: string): string {
    if (!originalUrl) return '';
    const encodedUrl = encodeURIComponent(originalUrl);
    return `${this.baseUrl}/image-proxy?url=${encodedUrl}`;
  }
}

export const tuyaService = new TuyaService();
