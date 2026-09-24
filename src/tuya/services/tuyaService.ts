// src/services/tuyaService.ts
import { auth } from '../../config/firebase';
import { deviceService } from '../../services/deviceService';
import type { TuyaDevice, TuyaStatus } from '../../types';

/** Co z Tuya přišlo pro jedno zařízení (netlify/functions/get-devices-status.js) */
export interface TuyaDeviceState {
  status: TuyaStatus[];
  /** undefined = funkce online stav neposlala (starší verze, záložní /status) */
  online?: boolean;
}

/** Odpověď Netlify funkce get-devices-status */
interface DevicesStatusResponse {
  success: boolean;
  error?: string;
  results: Array<{
    deviceId: string;
    success: boolean;
    status?: TuyaStatus[];
    online?: boolean;
  }>;
}

// Netlify funkce get-devices-status bere nejvýš 20 zařízení na jeden dotaz
const MAX_DEVICES_PER_REQUEST = 20;
// Funkce sama smí běžet nejvýš 10–26 s, déle nemá smysl čekat
const REQUEST_TIMEOUT_MS = 20 * 1000;

class TuyaService {
  private baseUrl = '/.netlify/functions';

  /**
   * Zavolá Netlify funkci s přihlašovacím tokenem (Authorization: Bearer).
   * Bez něj funkce odmítnou — ovládají zařízení v domě a nesmí je volat
   * kdokoli, kdo zná adresu (netlify/lib/familyAuth.cjs). Na 401 se zkusí
   * jednou znovu s čerstvým tokenem (ten starý mohl právě vypršet).
   */
  private async callFunction(
    name: string,
    init: Omit<RequestInit, 'headers'> = {}
  ): Promise<Response> {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('Uživatel není přihlášen');
    }

    const send = async (forceRefresh: boolean) =>
      fetch(`${this.baseUrl}/${name}`, {
        ...init,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${await user.getIdToken(forceRefresh)}`,
        },
      });

    const response = await send(false);
    return response.status === 401 ? send(true) : response;
  }

  /**
   * Načte všechna Tuya zařízení ze serveru
   */
   async fetchDevices(): Promise<TuyaDevice[]> {
    try {
      console.log('📡 Načítám Tuya zařízení ze serveru...');

      const response = await this.callFunction('get-device-list', { method: 'GET' });

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

      const response = await this.callFunction('control-device', {
        method: 'POST',
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
   * 🆕 Získá stav více zařízení jedním dotazem (nejvýš 20 — víc Netlify
   * funkce nevezme). Když selže celý dotaz (síť, Netlify, Tuya token),
   * VYHODÍ chybu — volající tak pozná, že má zkusit znovu. Zařízení, pro
   * která Tuya vrátila chybu, ve výsledku jen chybí.
   */
  async getDevicesStatus(deviceIds: string[]): Promise<Map<string, TuyaDeviceState>> {
    console.log(`📡 Batch status request for ${deviceIds.length} devices...`);

    // Bez časového limitu by dotaz odeslaný těsně po probuzení tabletu (Wi-Fi
    // ještě nenaskočila) mohl viset minuty a blokovat další synchronizaci
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    let data: DevicesStatusResponse;
    try {
      const response = await this.callFunction('get-devices-status', {
        method: 'POST',
        body: JSON.stringify({ deviceIds }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      data = await response.json();
    } finally {
      clearTimeout(timeout);
    }

    if (!data.success) {
      throw new Error(data.error || 'Nepodařilo se získat status zařízení');
    }

    const states = new Map<string, TuyaDeviceState>();
    data.results.forEach((result) => {
      if (result.success && Array.isArray(result.status)) {
        states.set(result.deviceId, {
          status: result.status,
          online: typeof result.online === 'boolean' ? result.online : undefined,
        });
      }
    });

    console.log(`✅ Batch status: ${states.size}/${deviceIds.length} úspěšných`);
    return states;
  }

  /**
   * 🆕 Stáhne aktuální stav zařízení z Tuya a zapíše ho do Firestore.
   * Vrací počet zařízení, u kterých Tuya odpověděla. Když selže celý dotaz,
   * vyhodí chybu (viz getDevicesStatus).
   */
  async syncDevicesStatus(devices: Array<Pick<TuyaDevice, 'id'>>): Promise<number> {
    let answered = 0;

    // Po dávkách a každou hned zapsat — ať první dávka (auto-sync do ní
    // dává teploměry) nečeká, až se stáhne zbytek
    for (let i = 0; i < devices.length; i += MAX_DEVICES_PER_REQUEST) {
      const chunk = devices.slice(i, i + MAX_DEVICES_PER_REQUEST);
      const states = await this.getDevicesStatus(chunk.map((d) => d.id));
      await this.saveDevicesState(chunk, states);
      answered += states.size;
    }

    return answered;
  }

  /** Zapíše do Firestore, co pro zařízení přišlo z Tuya */
  private async saveDevicesState(
    devices: Array<Pick<TuyaDevice, 'id'>>,
    states: Map<string, TuyaDeviceState>
  ): Promise<void> {
    const now = Date.now();

    await Promise.all(
      devices.map((device) => {
        const state = states.get(device.id);

        if (!state) {
          // Tuya pro tohle zařízení vrátila chybu — jen poznamenat, že se
          // zkoušelo, ať se na něj auto-sync po každém obnovení stránky
          // neptá znovu (jinak by se zkoušelo dřív než za celý interval)
          return deviceService.updateDeviceKeepLastUpdated(device.id, {
            lastChecked: now,
          });
        }

        // Prázdný status nepřepisuje poslední známé hodnoty
        const status = state.status.length > 0 ? { status: state.status } : {};

        if (state.online === false) {
          // Zařízení je v Tuya offline: hodnoty jsou poslední známé, ne čerstvé
          // měření → lastUpdated („před X min") se neposouvá
          return deviceService.updateDeviceKeepLastUpdated(device.id, {
            ...status,
            online: false,
            lastChecked: now,
          });
        }

        return deviceService.updateDevice(device.id, {
          ...status,
          ...(state.online === true && { online: true }),
          lastChecked: now,
        });
      })
    );
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

      const response = await this.callFunction('get-doorbell-snapshot', {
        method: 'POST',
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
   * POZOR: funkce image-proxy chce přihlašovací token, <img src> ho neposílá —
   * obrázek je potřeba stáhnout přes callFunction (zatím se nikde nepoužívá)
   */
  getProxiedImageUrl(originalUrl: string): string {
    if (!originalUrl) return '';
    const encodedUrl = encodeURIComponent(originalUrl);
    return `${this.baseUrl}/image-proxy?url=${encodedUrl}`;
  }
}

export const tuyaService = new TuyaService();
