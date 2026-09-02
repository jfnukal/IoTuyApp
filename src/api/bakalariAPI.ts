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

    await this.logUserInfo();

    try {
      let response = await this.fetchTimetable();

      /* Rozvrh „aktuálního týdne“ často selže 404 s hláškou „Rozvrh není pro
         toto období dostupný“ — týden je ještě prázdninový nebo škola rozvrh
         nezveřejnila. Zkusíme proto konkrétní data: pondělí tohohle týdne
         a pak pondělí příštího — jakmile škola rozvrh nahraje, appka ho
         chytí sama, bez zásahu. */
      if (!response.ok) {
        console.warn(
          `Bakaláři rozvrh (aktuální týden): stav ${response.status}, odpověď: ${await this.textOdpovedi(response)}`
        );

        const pondeli = this.pondeliOd(new Date());
        const priste = this.pondeliOd(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));

        for (const datum of [pondeli, priste]) {
          console.log(`Zkouším rozvrh na konkrétní datum ${datum}...`);
          const zaloha = await this.fetchTimetable(datum);
          if (zaloha.ok) {
            response = zaloha;
            break;
          }
          console.warn(
            `Bakaláři rozvrh (${datum}): stav ${zaloha.status}, odpověď: ${await this.textOdpovedi(zaloha)}`
          );
        }

        if (!response.ok) {
          console.error('Škola rozvrh zatím nezveřejnila — zkusíme to při dalším načtení.');
          return [];
        }
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

  /** Jedno stažení rozvrhu. `datum` prázdné = „aktuální týden“. */
  private fetchTimetable(datum?: string): Promise<Response> {
    const url = datum
      ? `${this.serverUrl}/api/3/timetable/actual?date=${datum}`
      : `${this.serverUrl}/api/3/timetable/actual`;
    return fetch(url, {
      headers: {
        Accept: 'application/json, text/plain, */*',
        Authorization: `Bearer ${this.accessToken}`,
      },
    });
  }

  /** Pondělí týdne, do kterého spadá zadaný den (YYYY-MM-DD). */
  private pondeliOd(d: Date): string {
    const p = new Date(d);
    p.setDate(p.getDate() - ((p.getDay() + 6) % 7));
    const mm = String(p.getMonth() + 1).padStart(2, '0');
    const dd = String(p.getDate()).padStart(2, '0');
    return `${p.getFullYear()}-${mm}-${dd}`;
  }

  /** Tělo chybové odpovědi do logu (zkrácené). */
  private async textOdpovedi(resp: Response): Promise<string> {
    try {
      const t = await resp.clone().text();
      return t ? t.slice(0, 300) : '(prázdná)';
    } catch {
      return '(nelze přečíst)';
    }
  }

  /* KDO SE TO VLASTNĚ PŘIHLÁSIL a co ten účet umí. Bakaláři to hlásí
     v /api/3/user (UserType + EnabledModules). Když škola nemá zapnutý modul
     rozvrhu, endpoint rozvrhu vrací 404 — z tohohle logu to poznáme. */
  private async logUserInfo(): Promise<void> {
    try {
      const resp = await fetch(`${this.serverUrl}/api/3/user`, {
        headers: {
          Accept: 'application/json, text/plain, */*',
          Authorization: `Bearer ${this.accessToken}`,
        },
      });
      if (!resp.ok) {
        console.warn(`Bakaláři /api/3/user: stav ${resp.status}`);
        return;
      }
      const u = await resp.json();
      const moduly = (u.EnabledModules || [])
        .map((m: any) => m?.Module)
        .filter(Boolean);
      console.log(
        `Bakaláři účet: typ="${u.UserType}", třída="${u.Class?.Abbrev || '?'}", moduly=[${moduly.join(', ')}]`
      );
    } catch (e) {
      console.warn('Bakaláři /api/3/user — nepodařilo se zjistit typ účtu:', e);
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