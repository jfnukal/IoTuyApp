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
      console.log('🔑 Načítám API klíče z Firebase...');

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
        },
        features: {
          useMockData: featuresData.useMockData ?? false,
          useMockTransport: featuresData.useMockTransport ?? false,
        },
        environment: apiKeysData.environment || 'development',
      };

      console.log('✅ Konfigurace načtena:', {
        environment: config.environment,
        hasWeatherKey: !!config.apiKeys.weather,
        hasUnsplashKey: !!config.apiKeys.unsplash,
        hasBakalariCreds: !!config.apiKeys.bakalari_username,
        useMockData: config.features.useMockData,
      });

      return config;
    } catch (error) {
      console.error('❌ Chyba při načítání konfigurace:', error);
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
      console.warn(`⚠️ API klíč "${keyName}" není nastaven!`);
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
    console.log('🔄 Config cache vymazána');
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