// src/api/bakalariAPI.ts
import { MOCK_TIMETABLE, MOCK_LUNCH_MENU } from './bakalariMockData';

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

interface LunchMenu {
  date: string;
  meals: {
    name: string;
    allergens?: string[];
  }[];
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

      console.log('Response status:', response.status);

      const responseText = await response.text();
      console.log('📄 Response text:', responseText.substring(0, 500));

      if (!response.ok) {
        console.error('Bakaláři login failed:', response.status, responseText);
        return false;
      }

      try {
        const data = JSON.parse(responseText);
        console.log('✅ JSON parsed successfully:', data);
        
        this.accessToken = data.access_token;
        this.tokenExpiry = Date.now() + data.expires_in * 1000;

        console.log('✅ Bakaláři login successful');
        return true;
      } catch (parseError) {
        console.error('❌ JSON parse error:', parseError);
        console.error('Server vrátil:', responseText.substring(0, 1000));
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

  async getTimetable(): Promise<TimetableDay[]> {
    if (USE_MOCK_DATA) {
      console.log('📦 Používám MOCK data pro rozvrh');
      return new Promise((resolve) => {
        setTimeout(() => resolve(MOCK_TIMETABLE), 500);
      });
    }

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
      return this.parseTimetable(data);
    } catch (error) {
      console.error('Bakaláři timetable error:', error);
      return [];
    }
  }

  async getLunchMenu(): Promise<LunchMenu[]> {
    if (USE_MOCK_DATA) {
      console.log('📦 Používám MOCK data pro jídelníček');
      return new Promise((resolve) => {
        setTimeout(() => resolve(MOCK_LUNCH_MENU), 500);
      });
    }

    const hasToken = await this.ensureValidToken();
    if (!hasToken) throw new Error('Login failed');

    try {
      const response = await fetch(`${BAKALARI_SERVER_URL}/api/3/komens`, {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
      });

      if (!response.ok) {
        console.error('Lunch menu fetch failed:', response.status);
        return [];
      }

      const data = await response.json();
      return this.parseLunchMenu(data);
    } catch (error) {
      console.error('Bakaláři lunch menu error:', error);
      return [];
    }
  }

 private parseTimetable(data: any): TimetableDay[] {
  console.log('🔍 RAW timetable data:', JSON.stringify(data, null, 2));
  
  if (!data || !data.Days) return [];

  // Mapa času z Hours
  const hoursMap = new Map(
    data.Hours.map((hour: any) => [
      hour.Id,
      { beginTime: hour.BeginTime, endTime: hour.EndTime, caption: hour.Caption }
    ])
  );

  // Mapa názvů dnů
  const dayNames = ['', 'Pondělí', 'Úterý', 'Středa', 'Čtvrtek', 'Pátek'];

  return data.Days.map((day: any, dayIndex: number) => {
    // Získej datum z prvního Atomu (pokud existuje Change)
    let dayDate = '';
    if (day.Atoms.length > 0 && day.Atoms[0].Change?.Day) {
      dayDate = day.Atoms[0].Change.Day;
    } else {
      // Vypočítej datum - aktuální pondělí + dayIndex
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

          return {
            subjecttext: atom.Theme || atom.SubjectId || 'Neznámý předmět',
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

export const bakalariAPI = new BakalariAPI();
export type { TimetableLesson, TimetableDay, LunchMenu };


