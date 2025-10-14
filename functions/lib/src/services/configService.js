"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.configService = void 0;
// src/services/configService.ts
const firestore_1 = require("firebase/firestore");
const firebase_1 = require("../config/firebase");
class ConfigService {
    constructor() {
        this.config = null;
        this.loadPromise = null;
    }
    /**
     * Načte konfiguraci z Firestore
     * Cachuje výsledek, takže další volání jsou rychlá
     */
    async loadConfig() {
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
        }
        finally {
            this.loadPromise = null;
        }
    }
    /**
     * Interní metoda pro skutečné načtení z Firestore
     */
    async _fetchConfig() {
        var _a, _b;
        try {
            console.log('🔑 Načítám API klíče z Firebase...');
            // Načteme oba dokumenty paralelně
            const [apiKeysDoc, featuresDoc] = await Promise.all([
                (0, firestore_1.getDoc)((0, firestore_1.doc)(firebase_1.db, 'appConfig', 'apiKeys')),
                (0, firestore_1.getDoc)((0, firestore_1.doc)(firebase_1.db, 'appConfig', 'features')),
            ]);
            if (!apiKeysDoc.exists() || !featuresDoc.exists()) {
                throw new Error('❌ Konfigurace není v Firebase! Nahraj ji přes Firebase Console.');
            }
            const apiKeysData = apiKeysDoc.data();
            const featuresData = featuresDoc.data();
            const config = {
                apiKeys: {
                    weather: apiKeysData.weather || '',
                    unsplash: apiKeysData.unsplash || '',
                    bakalari_username: apiKeysData.bakalari_username || '',
                    bakalari_password: apiKeysData.bakalari_password || '',
                    bakalari_server: apiKeysData.bakalari_server || '',
                },
                features: {
                    useMockData: (_a = featuresData.useMockData) !== null && _a !== void 0 ? _a : false,
                    useMockTransport: (_b = featuresData.useMockTransport) !== null && _b !== void 0 ? _b : false,
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
        }
        catch (error) {
            console.error('❌ Chyba při načítání konfigurace:', error);
            throw error;
        }
    }
    /**
     * Získá konkrétní API klíč
     */
    async getApiKey(keyName) {
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
    async getFeature(featureName) {
        const config = await this.loadConfig();
        return config.features[featureName];
    }
    /**
     * Získá aktuální prostředí
     */
    async getEnvironment() {
        const config = await this.loadConfig();
        return config.environment;
    }
    /**
     * Vymaže cache - použij pokud víš, že se konfigurace změnila
     */
    clearCache() {
        this.config = null;
        this.loadPromise = null;
        console.log('🔄 Config cache vymazána');
    }
    /**
     * Vrátí celou konfiguraci (pokud je načtená)
     */
    getCachedConfig() {
        return this.config;
    }
}
// Exportujeme singleton instanci
exports.configService = new ConfigService();
//# sourceMappingURL=configService.js.map