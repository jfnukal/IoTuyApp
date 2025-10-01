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

interface HourInfo {
  beginTime: string;
  endTime: string;
  caption: string;
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
 
  if (!data || !data.Days) return [];

  // Mapa času z Hours
  const hoursMap = new Map<number, HourInfo>(
    data.Hours.map((hour: any) => [
      hour.Id,
      { beginTime: hour.BeginTime, endTime: hour.EndTime, caption: hour.Caption }
    ])
  );

// ✅ MAPA PŘEDMĚTŮ - Id → Name
const subjectsMap = new Map<string, string>(
  (data.Subjects || []).map((subject: any) => [
    subject.Id,
    subject.Name || subject.Abbrev || subject.Id
  ])
);

  // Mapa názvů dnů
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

          // ✅ PŘEKLAD SubjectID → SubjectName
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

    // Parsování jídelníčku
  private parseLunchMenu(data: any): LunchMenu[] {
    if (!data || !data.Menus) return [];

    return data.Menus.map((menu: any) => ({
      date: menu.Date,
      meals: (menu.Meals || []).map((meal: any) => ({
        name: meal.Name || '',
        allergens: meal.Allergens || [],
      })),
    }));
  }
}

export const bakalariAPI = new BakalariAPI();
export type { TimetableLesson, TimetableDay, LunchMenu };



