// src/services/settingsService.ts
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

export interface WidgetSettings {
  calendar: {
    enabled: boolean;
    deleteAfterMonths: number;
    maxEvents: number;
    reminderDays: number;
    colorCategories: boolean;
    upcomingEventsDays: number;
  };
  weather: {
    enabled: boolean;
    compactMode: boolean;
  };
  schoolSchedule: {
    enabled: boolean;
    keepOnMain: boolean; // widget zůstane na hlavní stránce, ale zmizí ze stránky "widgety"
    currentLessonCheckInterval: number; // v sekundách
    displayHours: number; // kolik hodin dopředu zobrazit
    kidRotationInterval: number; // interval přepínání mezi dětmi (sekundy)
    showNextDayAfterHour: number; // od které hodiny zobrazit příští den (0-23)
  };
  stickyNotes: {
    enabled: boolean;
    notifyOnNew: boolean; // poslat push tomu, komu je vzkaz určen
    deleteAfterDays: number;
    maxNotes: number;
  };
  handwritingNotes: {
    enabled: boolean;
    deleteAfterDays: number;
    maxNotes: number;
  };
  messageHistory: {
    enabled: boolean;
    deleteAfterDays: number;
    maxMessages: number;
  };
  busSchedule: {
    enabled: boolean;
    showWeekend: boolean;
  };
}

export interface APIStatus {
  name: string;
  status: 'online' | 'offline' | 'unknown';
  lastCheck: number;
  errorMessage?: string;
}

// 🆕 TUYA Auto-sync nastavení
export interface TuyaSyncSettings {
  enabled: boolean;                    // Povolit auto-sync
  intervals: {
    critical: number;                  // Teploměry, topení (minuty)
    standard: number;                  // Světla, zásuvky (minuty)
    passive: number;                   // Kamery, dveřní senzory (minuty)
    discovery: number;                 // 🆕 Hledání nových zařízení (minuty)
  };
  criticalCategories: string[];        // Kategorie s častou synchronizací
  standardCategories: string[];        // Kategorie se standardní synchronizací
  // Zbytek kategorií = passive (nejméně časté)
  syncOnlyOnline: boolean;             // Synchronizovat pouze online zařízení
  nightModeEnabled: boolean;           // Méně časté sync v noci
  nightModeStart: number;              // Začátek nočního režimu (hodina 0-23)
  nightModeEnd: number;                // Konec nočního režimu (hodina 0-23)
}

export interface FCMStats {
  totalSent: number;
  monthSent: number;
  lastReset: number;
}

export interface AppSettings {
  widgets: WidgetSettings;
  fcmStats: FCMStats;
  apiStatuses: {
    weather: APIStatus;
    unsplash: APIStatus;
    googleVision: APIStatus;
    bakalari: APIStatus;
    firebase: APIStatus;
  };
  systemSettings: {
    apiCheckIntervalMinutes: number;
    autoCheckEnabled: boolean;
    fcmEnabled: boolean;
    // 🆕 TUYA Auto-sync
    tuyaSync: TuyaSyncSettings;
  };
}

const DEFAULT_SETTINGS: AppSettings = {
  widgets: {
    calendar: {
      enabled: true,
      deleteAfterMonths: 6,
      maxEvents: 5,
      reminderDays: 1,
      colorCategories: true,
      upcomingEventsDays: 60,
    },
    weather: {
      enabled: true,
      compactMode: true,
    },
    schoolSchedule: {
      enabled: true,
      keepOnMain: false, // výchozí: zobrazit i na stránce widgety
      currentLessonCheckInterval: 60, // Kontrola každou minutu
      displayHours: 3, // Zobrazit 3 hodiny dopředu
      kidRotationInterval: 10, // Přepínat děti každých 10 sekund
      showNextDayAfterHour: 14, // Od 14:00 zobrazit příští den
    },
    stickyNotes: {
      enabled: true,
      notifyOnNew: true,
      deleteAfterDays: 90,
      maxNotes: 20,
    },
    handwritingNotes: {
      enabled: true,
      deleteAfterDays: 30,
      maxNotes: 50,
    },
    messageHistory: {
      enabled: true,
      deleteAfterDays: 30,
      maxMessages: 100,
    },
    busSchedule: {
      enabled: true,
      showWeekend: false,
    },
  },
  fcmStats: {
    totalSent: 0,
    monthSent: 0,
    lastReset: Date.now(),
  },
  apiStatuses: {
    weather: { name: 'Weather API', status: 'unknown', lastCheck: 0 },
    unsplash: { name: 'Unsplash API', status: 'unknown', lastCheck: 0 },
    googleVision: { name: 'Google Vision', status: 'unknown', lastCheck: 0 },
    bakalari: { name: 'Bakaláři', status: 'unknown', lastCheck: 0 },
    firebase: { name: 'Firebase', status: 'unknown', lastCheck: 0 },
  },
  systemSettings: {
    apiCheckIntervalMinutes: 30,
    autoCheckEnabled: false,
    fcmEnabled: true,
    // 🆕 TUYA Auto-sync
    tuyaSync: {
      enabled: false,                          // Defaultně vypnuto
      intervals: {
        critical: 15,                          // 🔧 Teploměry každých 15 minut (bylo 5)
        standard: 30,                          // 🔧 Světla každých 30 minut (bylo 15)
        passive: 120,                          // 🔧 Kamery každé 2 hodiny (bylo 60)
        discovery: 10080,                      // Discovery 1x týdně - OK
      },
      criticalCategories: ['wsdcg', 'wk', 'pir'],      // Teploměry, topení, PIR
      standardCategories: ['dj', 'kg', 'cz', 'pc'],    // Světla, vypínače, zásuvky
      syncOnlyOnline: true,                    // Šetří API volání
      nightModeEnabled: false,
      nightModeStart: 23,                      // 23:00
      nightModeEnd: 6,                         // 06:00
    },
  },
};

class SettingsService {
  private readonly COLLECTION = 'appSettings';
  private readonly DOC_ID = 'main';

  /**
   * Načte nastavení z Firestore
   */
  async loadSettings(): Promise<AppSettings> {
    try {
      const docRef = doc(db, this.COLLECTION, this.DOC_ID);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        return { ...DEFAULT_SETTINGS, ...docSnap.data() } as AppSettings;
      } else {
        // První inicializace - vytvoř dokument
        await setDoc(docRef, DEFAULT_SETTINGS);
        return DEFAULT_SETTINGS;
      }
    } catch (error) {
      console.error('❌ Chyba při načítání nastavení:', error);
      return DEFAULT_SETTINGS;
    }
  }

  /**
   * Uloží celá nastavení
   */
  async saveSettings(settings: AppSettings): Promise<void> {
    try {
      const docRef = doc(db, this.COLLECTION, this.DOC_ID);
      await setDoc(docRef, settings);
      console.log('✅ Nastavení uložena');
    } catch (error) {
      console.error('❌ Chyba při ukládání nastavení:', error);
      throw error;
    }
  }

  /**
   * Aktualizuje konkrétní část nastavení
   */
  async updateSettings(path: string, value: any): Promise<void> {
    try {
      const docRef = doc(db, this.COLLECTION, this.DOC_ID);
      await updateDoc(docRef, { [path]: value });
      console.log(`✅ Aktualizováno: ${path}`);
    } catch (error) {
      console.error('❌ Chyba při aktualizaci:', error);
      throw error;
    }
  }

  /**
   * Inkrementuje počet odeslaných FCM zpráv
   */
  async incrementFCM(): Promise<void> {
    try {
      const settings = await this.loadSettings();
      const now = Date.now();
      const monthStart = new Date(now).setDate(1);

      // Reset měsíčního počítadla pokud je nový měsíc
      if (settings.fcmStats.lastReset < monthStart) {
        settings.fcmStats.monthSent = 0;
        settings.fcmStats.lastReset = now;
      }

      settings.fcmStats.totalSent += 1;
      settings.fcmStats.monthSent += 1;

      await this.updateSettings('fcmStats', settings.fcmStats);
    } catch (error) {
      console.error('❌ Chyba při inkrementaci FCM:', error);
    }
  }

  /**
   * Aktualizuje status API
   */
  async updateAPIStatus(
    apiName: keyof AppSettings['apiStatuses'],
    status: 'online' | 'offline',
    errorMessage?: string
  ): Promise<void> {
    try {
      const settings = await this.loadSettings();

      // 🔧 FIX: Odstranit undefined
      const statusUpdate: APIStatus = {
        ...settings.apiStatuses[apiName],
        status,
        lastCheck: Date.now(),
      };

      // Pouze přidat errorMessage pokud existuje
      if (errorMessage) {
        statusUpdate.errorMessage = errorMessage;
      } else {
        delete statusUpdate.errorMessage; // Odstranit pokud je undefined
      }

      settings.apiStatuses[apiName] = statusUpdate;
      await this.updateSettings(`apiStatuses.${apiName}`, statusUpdate);
    } catch (error) {
      console.error('❌ Chyba při aktualizaci API statusu:', error);
    }
  }

  /**
   * Zkontroluje všechna API
   */
  async checkAllAPIs(): Promise<void> {
    console.log('🔍 Kontroluji všechna API...');

    // Weather API
    try {
      const { configService } = await import('../services/configService');
      const weatherKey = await configService.getApiKey('weather');

      if (weatherKey) {
        // Test API call
        const response = await fetch(
          `https://api.weatherapi.com/v1/current.json?key=${weatherKey}&q=Praha`
        );
        await this.updateAPIStatus(
          'weather',
          response.ok ? 'online' : 'offline',
          response.ok ? undefined : 'API nereaguje'
        );
      } else {
        await this.updateAPIStatus('weather', 'offline', 'Chybí API klíč');
      }
    } catch (error) {
      await this.updateAPIStatus('weather', 'offline', 'Chyba při testu');
    }

    // Google Vision
    try {
      const { configService } = await import('../services/configService');
      const visionKey = await configService.getApiKey('google_vision');
      await this.updateAPIStatus(
        'googleVision',
        visionKey ? 'online' : 'offline',
        visionKey ? undefined : 'Chybí API klíč'
      );
    } catch (error) {
      await this.updateAPIStatus('googleVision', 'offline', 'Chyba');
    }

    // Unsplash
    try {
      const { configService } = await import('../services/configService');
      const unsplashKey = await configService.getApiKey('unsplash');
      await this.updateAPIStatus(
        'unsplash',
        unsplashKey ? 'online' : 'offline',
        unsplashKey ? undefined : 'Chybí API klíč'
      );
    } catch (error) {
      await this.updateAPIStatus('unsplash', 'offline', 'Chyba');
    }

    // Bakaláři
    try {
      const { bakalariAPI } = await import('../api/bakalariAPI');
      const timetable = await bakalariAPI.getTimetable();
      await this.updateAPIStatus('bakalari', timetable ? 'online' : 'offline');
    } catch (error) {
      await this.updateAPIStatus('bakalari', 'offline', 'Chyba připojení');
    }

    // Firebase
    // Firebase
    try {
      await import('../config/firebase'); // Jen kontrola, jestli se import povede
      await this.updateAPIStatus('firebase', 'online');
    } catch (error) {
      await this.updateAPIStatus('firebase', 'offline', 'Není připojeno');
    }
    console.log('✅ Kontrola API dokončena');
  }
}

export const settingsService = new SettingsService();
