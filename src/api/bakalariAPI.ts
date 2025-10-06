// src/api/bakalariAPI.ts
import { MOCK_TIMETABLE } from './bakalariMockData';

// Konfigurace
const USE_MOCK_DATA = import.meta.env.VITE_USE_MOCK_DATA === 'true';
const BAKALARI_SERVER_URL = import.meta.env.VITE_BAKALARI_SERVER || 'https://zszator.bakalari.cz';
const BAKALARI_USERNAME = import.meta.env.VITE_BAKALARI_USERNAME;
const BAKALARI_PASSWORD = import.meta.env.VITE_BAKALARI_PASSWORD;

console.log('🔧 Bakaláři API konfigurace:', USE_MOCK_DATA ? 'MOCK DATA' : 'REAL API');

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

interface TimetableDay {
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

  async login(): Promise<boolean> {
    try {
      const params = new URLSearchParams({
        client_id: 'ANDR',
        grant_type: 'password',
        username: BAKALARI_USERNAME || '',
        password: BAKALARI_PASSWORD || '',
      });

      console.log('🔐 Pokus o přihlášení do Bakalářů...');

      const response = await fetch(`${BAKALARI_SERVER_URL}/api/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });

      const responseText = await response.text();

      if (!response.ok) {
        console.error('Bakaláři login failed:', response.status);
        return false;
      }

      try {
        const data = JSON.parse(responseText);
        this.accessToken = data.access_token;
        this.tokenExpiry = Date.now() + data.expires_in * 1000;
        console.log('✅ Bakaláři login successful');
        return true;
      } catch (parseError) {
        console.error('❌ JSON parse error:', parseError);
        return false;
      }
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

  async getTimetable(): Promise<TimetableDay[]> {
    if (USE_MOCK_DATA) {
      console.log('📦 Používám MOCK data pro rozvrh');
      return new Promise((resolve) => {
        setTimeout(() => resolve(MOCK_TIMETABLE), 500);
      });
    }

    const cached = this.getCachedTimetable();
    if (cached) return cached;

    const hasToken = await this.ensureValidToken();
    if (!hasToken) throw new Error('Login failed');

    try {
      const response = await fetch(`${BAKALARI_SERVER_URL}/api/3/timetable/actual`, {
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
    if (!data || !data.Days) return [];

    const hoursMap = new Map<number, HourInfo>(
      data.Hours.map((hour: any) => [
        hour.Id,
        { beginTime: hour.BeginTime, endTime: hour.EndTime, caption: hour.Caption }
      ])
    );

    const subjectsMap = new Map<string, string>(
      (data.Subjects || []).map((subject: any) => [
        subject.Id,
        subject.Name || subject.Abbrev || subject.Id
      ])
    );

    const dayNames = ['', 'Pondělí', 'Úterý', 'Středa', 'Čtvrtek', 'Pátek'];

    return data.Days.map((day: any, dayIndex: number) => {
      let dayDate = '';
      if (day.Atoms.length > 0 && day.Atoms[0].Change?.Day) {
        dayDate = day.Atoms[0].Change.Day;
      } else {
        const today = new Date();
        const currentDay = today.getDay();
        const monday = new Date(today);
        monday.setDate(today.getDate() - currentDay + 1 + dayIndex);
        dayDate = monday.toISOString();
      }

      return {
        date: dayDate,
        dayOfWeek: dayIndex + 1,
        dayDescription: dayNames[dayIndex + 1] || '',
        lessons: (day.Atoms || [])
          .map((atom: any) => {
            const hourInfo = hoursMap.get(atom.HourId);
            if (!hourInfo) return null;

            const subjectName = subjectsMap.get(atom.SubjectId) || atom.SubjectId || 'Neznámý předmět';

            return {
              subjecttext: subjectName,
              teacher: atom.TeacherId || '',
              room: atom.RoomId || '',
              begintime: hourInfo.beginTime,
              endtime: hourInfo.endTime,
              theme: atom.Theme || '',
              notice: atom.Notice || '',
              change: atom.Change?.ChangeType || '',
            };
          })
          .filter((lesson: any) => lesson !== null),
      };
    });
  }
}

export const bakalariAPI = new BakalariAPI();
export type { TimetableLesson, TimetableDay };