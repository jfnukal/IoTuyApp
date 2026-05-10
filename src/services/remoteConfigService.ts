// src/services/remoteConfigService.ts
import {
  getRemoteConfig,
  fetchAndActivate,
  getValue,
} from 'firebase/remote-config';
import app from '../config/firebase';

class RemoteConfigService {
  private remoteConfig;
  private isInitialized = false;
  private configCache: Map<string, any> = new Map();

  constructor() {
    this.remoteConfig = getRemoteConfig(app);

    // Nastavení pro vývoj (kratší časy pro testování)
    this.remoteConfig.settings.minimumFetchIntervalMillis = import.meta.env.DEV
      ? 10000
      : 3600000; // 10s pro dev, 1h pro prod

    // Výchozí hodnoty jako fallback (pokud Remote Config selže)
    this.remoteConfig.defaultConfig = {
      WEATHER_API_KEY: '',
      UNSPLASH_ACCESS_KEY: '',
      BAKALARI_USERNAME: '',
      BAKALARI_PASSWORD: '',
      BAKALARI_SERVER: '',
      ALLOWED_EMAILS: '[]',
    };
  }

  /**
   * Inicializuje Remote Config a načte hodnoty ze serveru
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      await fetchAndActivate(this.remoteConfig);
      this.isInitialized = true;
      this.preloadCache();
    } catch (error) {
      console.error('[RemoteConfig] Chyba načítání:', error);
      this.isInitialized = true;
    }
  }

  /**
   * Přednahraje všechny hodnoty do cache pro rychlejší přístup
   */
  private preloadCache(): void {
    const keys = [
      'WEATHER_API_KEY',
      'UNSPLASH_ACCESS_KEY',
      'BAKALARI_USERNAME',
      'BAKALARI_PASSWORD',
      'BAKALARI_SERVER',
      'ALLOWED_EMAILS',
    ];

    keys.forEach((key) => {
      try {
        const value = getValue(this.remoteConfig, key);
        this.configCache.set(key, value.asString());
      } catch {
        // klíč přeskočen
      }
    });
  }

  /**
   * Získá hodnotu z Remote Config
   */
  getString(key: string): string {
    if (!this.isInitialized) {
      return '';
    }

    // Nejdřív zkusíme cache
    if (this.configCache.has(key)) {
      return this.configCache.get(key);
    }

    // Pokud není v cache, načteme ze serveru
    try {
      const value = getValue(this.remoteConfig, key);
      const stringValue = value.asString();

      // Uložíme do cache pro příště
      this.configCache.set(key, stringValue);

      return stringValue;
    } catch (error) {
      console.error(`[RemoteConfig] klíč "${key}":`, error);
      return '';
    }
  }

  /**
   * Získá hodnotu jako číslo
   */
  getNumber(key: string): number {
    if (!this.isInitialized) {
      console.warn('⚠️ Remote Config ještě není inicializován');
      return 0;
    }

    try {
      const value = getValue(this.remoteConfig, key);
      return value.asNumber();
    } catch (error) {
      console.error(`[RemoteConfig] číslo "${key}":`, error);
      return 0;
    }
  }

  /**
   * Získá hodnotu jako boolean
   */
  getBoolean(key: string): boolean {
    if (!this.isInitialized) {
      console.warn('⚠️ Remote Config ještě není inicializován');
      return false;
    }

    try {
      const value = getValue(this.remoteConfig, key);
      return value.asBoolean();
    } catch (error) {
      console.error(`[RemoteConfig] boolean "${key}":`, error);
      return false;
    }
  }

  /**
   * Získá hodnotu a parsuje jako JSON
   */
  getJSON<T = any>(key: string): T | null {
    const stringValue = this.getString(key);

    if (!stringValue) {
      return null;
    }

    try {
      return JSON.parse(stringValue) as T;
    } catch (error) {
      console.error(`[RemoteConfig] JSON "${key}":`, error);
      return null;
    }
  }

  /**
   * Zkontroluje, zda je email v whitelist
   */
  isEmailAllowed(email: string): boolean {
    const allowedEmails = this.getJSON<string[]>('ALLOWED_EMAILS');

    if (!allowedEmails || !Array.isArray(allowedEmails)) {
      console.warn('⚠️ ALLOWED_EMAILS není správně nastaven');
      return false;
    }

    return allowedEmails.includes(email.toLowerCase());
  }

  /**
   * Vyčistí cache (užitečné při testování)
   */
  clearCache(): void {
    this.configCache.clear();
    console.log('🗑️ Cache Remote Config vymazána');
  }

  /**
   * Vrátí všechny načtené hodnoty (pro debugging)
   */
  getAllValues(): Record<string, string> {
    const values: Record<string, string> = {};

    this.configCache.forEach((value, key) => {
      // Maskujeme citlivé hodnoty
      if (key.includes('PASSWORD') || key.includes('KEY')) {
        values[key] = '***HIDDEN***';
      } else {
        values[key] = value;
      }
    });

    return values;
  }
}

// Exportujeme jedinou instanci (singleton)
export const remoteConfigService = new RemoteConfigService();
