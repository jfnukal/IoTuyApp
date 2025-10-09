// src/api/bakalariAPI.ts

import { configService } from '../services/configService';
import { MOCK_TIMETABLE } from './bakalariMockData';
import type { TimetableDay, TimetableLesson } from '../types/index';

// Pomocné typy pro parsování
interface HourInfo {
  beginTime: string;
  endTime: string;
}
interface SubjectInfo {
  name: string;
  abbrev: string;
}
interface TeacherInfo {
  name: string;
  abbrev: string;
}
interface RoomInfo {
  name: string;
  abbrev: string;
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
    // Spolehneme se na ensureConfig() pro líné načtení
  }

  private async loadConfig(): Promise<void> {
    try {
      const config = await configService.loadConfig();
      this.serverUrl = config.apiKeys.bakalari_server;
      this.username = config.apiKeys.bakalari_username;
      this.password = config.apiKeys.bakalari_password;
      this.useMockData = config.features.useMockData;
      console.log('🔧 Bakaláři API konfigurace:', this.useMockData ? 'MOCK DATA' : 'REAL API');
    } catch (error) {
      console.error('❌ Nepodařilo se načíst Bakaláři konfiguraci:', error);
      this.useMockData = true;
    }
  }

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
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
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
        console.log('✅ Používám cached rozvrh z localStorage');
        return data;
      }
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
      console.log('💾 Rozvrh uložen do localStorage cache');
    } catch (error) {
      console.error('Chyba při ukládání cache:', error);
    }
  }
  
  public async getTimetable(forceRefresh = false): Promise<TimetableDay[]> {
    await this.ensureConfig();
  
    if (this.useMockData) {
      console.log('📦 Používám MOCK data pro rozvrh');
      return Promise.resolve(MOCK_TIMETABLE);
    }
  
    if (!forceRefresh) {
      const cached = this.getCachedTimetable();
      if (cached) return cached;
    }
  
    const hasToken = await this.ensureValidToken();
    if (!hasToken) throw new Error('Login failed');
  
    try {
      const response = await fetch(`${this.serverUrl}/api/3/timetable/actual`, {
        headers: { Authorization: `Bearer ${this.accessToken}` },
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
    const hourMap: Record<string, HourInfo> = {};
    const subjectMap: Record<string, SubjectInfo> = {};
    const teacherMap: Record<string, TeacherInfo> = {};
    const roomMap: Record<string, RoomInfo> = {};

    data.Hours?.forEach((hour: any) => {
      hourMap[hour.Id] = { beginTime: hour.BeginTime, endTime: hour.EndTime };
    });
    data.Subjects?.forEach((subject: any) => {
      subjectMap[subject.Id] = { name: subject.Name, abbrev: subject.Abbrev };
    });
    data.Teachers?.forEach((teacher: any) => {
      teacherMap[teacher.Id] = { name: teacher.Name, abbrev: teacher.Abbrev };
    });
    data.Rooms?.forEach((room: any) => {
      roomMap[room.Id] = { name: room.Name, abbrev: room.Abbrev };
    });

    const days: TimetableDay[] = [];
    data.Days?.forEach((day: any) => {
      const lessons: TimetableLesson[] = [];
      day.Atoms?.forEach((atom: any) => {
        const hour = hourMap[atom.HourId];
        const subject = subjectMap[atom.SubjectId];
        const teacher = teacherMap[atom.TeacherId];
        const room = roomMap[atom.RoomId];
        if (!hour) return;

        lessons.push({
          subjecttext: subject?.name || atom.SubjectText || '',
          teacher: teacher?.abbrev || '',
          room: room?.abbrev || '',
          begintime: hour.beginTime,
          endtime: hour.endTime,
        });
      });

      const sortedLessons = lessons.sort((a, b) => {
          const timeA = parseInt(a.begintime.replace(':', ''), 10);
          const timeB = parseInt(b.begintime.replace(':', ''), 10);
          return timeA - timeB;
      });

      days.push({
        date: day.Date,
        dayOfWeek: day.DayOfWeek,
        dayDescription: day.DayDescription,
        lessons: sortedLessons,
      });
    });
    
    return days;
  }
}

export const bakalariAPI = new BakalariAPI();