// src/services/configService.ts
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

export interface AppConfig {
  apiKeys: {
    weather: string;
    unsplash: string;
    bakalari_username: string;
    bakalari_password: string;
    bakalari_server: string;
    google_vision: string;
    strava_username: string;
    strava_password: string;
    strava_canteen: string;
    gemini: string;
    openai: string;
    elevenlabs: string;
  };
  features: {
    useMockData: boolean;
    useMockTransport: boolean;
  };
  environment: 'development' | 'production';
}

class ConfigService {
  private config: AppConfig | null = null;
  private loadPromise: Promise<AppConfig> | null = null;

  /**
   * Načte konfiguraci z Firestore
   * Cachuje výsledek, takže další volání jsou rychlá
   */
  async loadConfig(): Promise<AppConfig> {
    // Pokud už máme config, vrátíme ho
    if (this.config) {
      return this.config;
    }

    // Pokud už probíhá načítání, počkáme na něj
    if (this.loadPromise) {
      return this.loadPromise;
    }

    // Spustíme nové načítání
    this.loadPromise = this._fetchConfig();

    try {
      this.config = await this.loadPromise;
      return this.config;
    } finally {
      this.loadPromise = null;
    }
  }

  /**
   * Interní metoda pro skutečné načtení z Firestore
   */
  private async _fetchConfig(): Promise<AppConfig> {
    try {

      // Načteme oba dokumenty paralelně
      const [apiKeysDoc, featuresDoc] = await Promise.all([
        getDoc(doc(db, 'appConfig', 'apiKeys')),
        getDoc(doc(db, 'appConfig', 'features')),
      ]);

      if (!apiKeysDoc.exists() || !featuresDoc.exists()) {
        throw new Error(
          '❌ Konfigurace není v Firebase! Nahraj ji přes Firebase Console.'
        );
      }

      const apiKeysData = apiKeysDoc.data();
      const featuresData = featuresDoc.data();

      const config: AppConfig = {
        apiKeys: {
          weather: apiKeysData.weather || '',
          unsplash: apiKeysData.unsplash || '',
          bakalari_username: apiKeysData.bakalari_username || '',
          bakalari_password: apiKeysData.bakalari_password || '',
          bakalari_server: apiKeysData.bakalari_server || '',
          google_vision: apiKeysData.google_vision || '',
          strava_username: apiKeysData.strava_username || '',
          strava_password: apiKeysData.strava_password || '',
          strava_canteen: apiKeysData.strava_canteen || '',
          gemini: apiKeysData.gemini || '',
          openai: apiKeysData.openai || '',
          elevenlabs: apiKeysData.elevenlabs || '',
        },
        features: {
          useMockData: featuresData.useMockData ?? false,
          useMockTransport: featuresData.useMockTransport ?? false,
        },
        environment: apiKeysData.environment || 'development',
      };

      return config;
    } catch (error) {
      console.error('[Config] Chyba načítání:', error);
      throw error;
    }
  }

  /**
   * Získá konkrétní API klíč
   */
  async getApiKey(keyName: keyof AppConfig['apiKeys']): Promise<string> {
    const config = await this.loadConfig();
    const key = config.apiKeys[keyName];

    if (!key) {
      console.warn(`[Config] Klíč "${keyName}" není nastaven`);
    }

    return key;
  }

  /**
   * Získá feature flag
   */
  async getFeature(featureName: keyof AppConfig['features']): Promise<boolean> {
    const config = await this.loadConfig();
    return config.features[featureName];
  }

  /**
   * Získá aktuální prostředí
   */
  async getEnvironment(): Promise<'development' | 'production'> {
    const config = await this.loadConfig();
    return config.environment;
  }

  /**
   * Vymaže cache - použij pokud víš, že se konfigurace změnila
   */
  clearCache(): void {
    this.config = null;
    this.loadPromise = null;
  }

  /**
   * Vrátí celou konfiguraci (pokud je načtená)
   */
  getCachedConfig(): AppConfig | null {
    return this.config;
  }
}

// Exportujeme singleton instanci
export const configService = new ConfigService();
