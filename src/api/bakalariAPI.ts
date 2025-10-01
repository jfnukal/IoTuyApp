// src/api/bakalariAPI.ts
import { MOCK_TIMETABLE, MOCK_LUNCH_MENU } from './bakalariMockData';

// Konfigurace
const USE_MOCK_DATA = import.meta.env.VITE_USE_MOCK_DATA === 'true';
const BAKALARI_SERVER_URL = import.meta.env.VITE_BAKALARI_SERVER || 'https://zszator.bakalari.cz';
const PROXY_URL = 'https://corsproxy.io/?';
const BAKALARI_BASE_URL = `${PROXY_URL}${encodeURIComponent(BAKALARI_SERVER_URL)}/api/3`;

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
//  private refreshToken: string | null = null;
  private tokenExpiry: number = 0;

  // Získání access tokenu
  async login(): Promise<boolean> {
    try {
      const params = new URLSearchParams({
        client_id: 'ANDR',
        grant_type: 'password',
        username: BAKALARI_USERNAME || '',
        password: BAKALARI_PASSWORD || '',
      });
  
      console.log('🔐 Pokus o přihlášení do Bakalářů...');
      console.log('URL:', `${BAKALARI_BASE_URL}/login`);
      console.log('Username nastaven:', !!BAKALARI_USERNAME);
      console.log('Password nastaven:', !!BAKALARI_PASSWORD);
  
      const response = await fetch(`${BAKALARI_BASE_URL}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });
  
      console.log('Response status:', response.status);
  
      // PŘIDÁNO: Zobraz, co server vrací
      const responseText = await response.text();
      console.log('📄 Response text:', responseText.substring(0, 500)); // První 500 znaků
  
      if (!response.ok) {
        console.error('Bakaláři login failed:', response.status, responseText);
        return false;
      }
  
      // Zkus parsovat JSON
      try {
        const data = JSON.parse(responseText);
        console.log('✅ JSON parsed successfully:', data);
        
        this.accessToken = data.access_token;
     //   this.refreshToken = data.refresh_token;
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

  // Kontrola a refresh tokenu
  private async ensureValidToken(): Promise<boolean> {
    if (this.accessToken && Date.now() < this.tokenExpiry - 60000) {
      return true;
    }
    return await this.login();
  }

  // Získání rozvrhu
// Získání rozvrhu
async getTimetable(): Promise<TimetableDay[]> {
  // Pokud používáme mock data, vrať je okamžitě
  if (USE_MOCK_DATA) {
    console.log('📦 Používám MOCK data pro rozvrh');
    return new Promise((resolve) => {
      setTimeout(() => resolve(MOCK_TIMETABLE), 500); // Simulace zpoždění
    });
  }

  // Reálné API volání
  const hasToken = await this.ensureValidToken();
  if (!hasToken) throw new Error('Login failed');

  try {
    const response = await fetch(`${BAKALARI_BASE_URL}/timetable/actual`, {
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
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

// Získání jídelníčku
async getLunchMenu(): Promise<LunchMenu[]> {
  // Pokud používáme mock data, vrať je okamžitě
  if (USE_MOCK_DATA) {
    console.log('📦 Používám MOCK data pro jídelníček');
    return new Promise((resolve) => {
      setTimeout(() => resolve(MOCK_LUNCH_MENU), 500); // Simulace zpoždění
    });
  }

  // Reálné API volání
  const hasToken = await this.ensureValidToken();
  if (!hasToken) throw new Error('Login failed');

  try {
    const response = await fetch(`${BAKALARI_BASE_URL}/komens`, {
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
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

  // Parsování rozvrhu
  private parseTimetable(data: any): TimetableDay[] {
    if (!data || !data.Days) return [];

    return data.Days.map((day: any) => ({
      date: day.Date,
      dayOfWeek: day.DayOfWeek,
      dayDescription: day.DayDescription,
      lessons: (day.Atoms || [])
        .filter((atom: any) => atom.SubjectText) // Jen hodiny s předmětem
        .map((atom: any) => ({
          subjecttext: atom.SubjectText || '',
          teacher: atom.TeacherAbbrev || '',
          room: atom.RoomAbbrev || '',
          begintime: atom.BeginTime || '',
          endtime: atom.EndTime || '',
          theme: atom.Theme || '',
          notice: atom.Notice || '',
          change: atom.Change?.ChangeType || '',
        })),
    }));
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


