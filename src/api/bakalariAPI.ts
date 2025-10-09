// src/api/bakalariAPI.ts

// ODSTRANĚNO: Import 'node-fetch' se na frontendu nepoužívá. Prohlížeč má vlastní fetch.
import { configService } from '../services/configService';
import { MOCK_TIMETABLE } from './bakalariMockData';

// ... definice interface (TimetableLesson, TimetableDay, atd.) zůstávají stejné ...
interface TimetableLesson {
  subjecttext: string;
  teacher: string;
  room: string;
  begintime: string;
  endtime: string;
  theme?: string;
  notice?: string;
  change?: string;
}

export interface TimetableDay {
  date: string;
  dayOfWeek: number;
  dayDescription: string;
  lessons: TimetableLesson[];
}

interface HourInfo {
  beginTime: string;
  endTime: string;
  caption: string;
}

interface CachedTimetable {
  data: TimetableDay[];
  cachedAt: string;
}

class BakalariAPI {
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;
  private serverUrl: string | null = null;
  private username: string | null = null;
  private password: string | null = null;
  private useMockData: boolean = false;

  constructor() {
    // ODSTRANĚNO: Volání async metody z konstruktoru. Spolehneme se na ensureConfig().
    // this.loadConfig();
  }

  /**
   * Načte konfiguraci z Firebase
   */
  private async loadConfig(): Promise<void> {
    try {
      const config = await configService.loadConfig();
      this.serverUrl = config.apiKeys.bakalari_server;
      this.username = config.apiKeys.bakalari_username;
      this.password = config.apiKeys.bakalari_password;
      this.useMockData = config.features.useMockData;

      console.log(
        '🔧 Bakaláři API konfigurace:',
        this.useMockData ? 'MOCK DATA' : 'REAL API'
      );
    } catch (error) {
      console.error('❌ Nepodařilo se načíst Bakaláři konfiguraci:', error);
      this.useMockData = true;
    }
  }

  /**
   * Zajistí, že máme načtenou konfiguraci
   */
  private async ensureConfig(): Promise<void> {
    if (!this.serverUrl || !this.username || !this.password) {
      await this.loadConfig();
    }

    if (!this.serverUrl || !this.username || !this.password) {
      throw new Error('Bakaláři konfigurace není dostupná');
    }
  }

  async login(): Promise<boolean> {
    try {
      await this.ensureConfig();

      const params = new URLSearchParams({
        client_id: 'ANDR',
        grant_type: 'password',
        username: this.username || '',
        password: this.password || '',
      });

      console.log('🔐 Pokus o přihlášení do Bakalářů...');

      const response = await fetch(`${this.serverUrl}/api/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });

      if (!response.ok) {
        console.error('Bakaláři login failed:', response.status);
        return false;
      }

      const data = await response.json();
      this.accessToken = data.access_token;
      this.tokenExpiry = Date.now() + data.expires_in * 1000;
      console.log('✅ Bakaláři login successful');
      return true;
    } catch (error) {
      console.error('Bakaláři login error:', error);
      return false;
    }
  }

  private async ensureValidToken(): Promise<boolean> {
    if (this.accessToken && Date.now() < this.tokenExpiry - 60000) {
      return true;
    }
    return await this.login();
  }

  private getCachedTimetable(): TimetableDay[] | null {
    try {
      const cached = localStorage.getItem('bakalari_timetable');
      if (!cached) return null;

      const { data, cachedAt }: CachedTimetable = JSON.parse(cached);
      const today = new Date().toISOString().split('T')[0];

      if (cachedAt === today) {
        console.log('✅ Používám cached rozvrh');
        return data;
      }

      console.log('❌ Cache je stará, načítám nová data');
      return null;
    } catch (error) {
      console.error('Chyba při čtení cache:', error);
      return null;
    }
  }

  private cacheTimetable(data: TimetableDay[]): void {
    try {
      const cached: CachedTimetable = {
        data,
        cachedAt: new Date().toISOString().split('T')[0],
      };
      localStorage.setItem('bakalari_timetable', JSON.stringify(cached));
      console.log('💾 Rozvrh uložen do cache');
    } catch (error) {
      console.error('Chyba při ukládání cache:', error);
    }
  }

  // PŘIDÁNO: Toto je ta klíčová veřejná metoda, která chyběla.
  async getTimetable(): Promise<TimetableDay[]> {
    await this.ensureConfig();

    if (this.useMockData) {
      console.log('📦 Používám MOCK data pro rozvrh');
      return Promise.resolve(MOCK_TIMETABLE);
    }

    const cached = this.getCachedTimetable();
    if (cached) return cached;

    const hasToken = await this.ensureValidToken();
    if (!hasToken) throw new Error('Login failed');

    try {
      const response = await fetch(`${this.serverUrl}/api/3/timetable/actual`, {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
      });

      if (!response.ok) {
        console.error('Timetable fetch failed:', response.status);
        return [];
      }

      const data = await response.json();
      const timetable = this.parseTimetable(data);

      this.cacheTimetable(timetable);

      return timetable;
    } catch (error) {
      console.error('Bakaláři timetable error:', error);
      return [];
    }
  }

  private parseTimetable(data: any): TimetableDay[] {
    const days: TimetableDay[] = [];
    const hourInfoMap: Record<string, HourInfo> = {};

    if (data.Hours && Array.isArray(data.Hours)) {
      data.Hours.forEach((hour: any) => {
        hourInfoMap[hour.Id] = {
          beginTime: hour.BeginTime,
          endTime: hour.EndTime,
          caption: hour.Caption,
        };
      });
    }

    if (data.Days && Array.isArray(data.Days)) {
      data.Days.forEach((day: any) => {
        const lessons: TimetableLesson[] = [];

        if (day.Atoms && Array.isArray(day.Atoms)) {
          day.Atoms.forEach((atom: any) => {
            const hourInfo = hourInfoMap[atom.HourId];
            if (!hourInfo) return;

            lessons.push({
              subjecttext: atom.SubjectText || '',
              teacher: atom.TeacherAbbrev || '',
              room: atom.RoomAbbrev || '',
              begintime: hourInfo.beginTime,
              endtime: hourInfo.endTime,
              theme: atom.Theme || '',
              notice: atom.Notice || '',
              change: atom.Change || '',
            });
          });
        }

        days.push({
          date: day.Date,
          dayOfWeek: day.DayOfWeek,
          dayDescription: day.DayDescription,
          lessons: lessons.sort((a, b) =>
            a.begintime.localeCompare(b.begintime)
          ),
        });
      });
    }

    return days;
  }
}

export const bakalariAPI = new BakalariAPI();
