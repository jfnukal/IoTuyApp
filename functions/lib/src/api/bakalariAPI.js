"use strict";
// src/api/bakalariAPI.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.bakalariAPI = void 0;
const configService_1 = require("../services/configService");
const bakalariMockData_1 = require("./bakalariMockData");
class BakalariAPI {
    constructor() {
        this.accessToken = null;
        this.tokenExpiry = 0;
        this.serverUrl = null;
        this.username = null;
        this.password = null;
        this.useMockData = false;
        // Spolehneme se na ensureConfig() pro líné načtení
    }
    async loadConfig() {
        try {
            const config = await configService_1.configService.loadConfig();
            this.serverUrl = config.apiKeys.bakalari_server;
            this.username = config.apiKeys.bakalari_username;
            this.password = config.apiKeys.bakalari_password;
            this.useMockData = config.features.useMockData;
            console.log('🔧 Bakaláři API konfigurace:', this.useMockData ? 'MOCK DATA' : 'REAL API');
        }
        catch (error) {
            console.error('❌ Nepodařilo se načíst Bakaláři konfiguraci:', error);
            this.useMockData = true;
        }
    }
    async ensureConfig() {
        if (!this.serverUrl || !this.username || !this.password) {
            await this.loadConfig();
        }
        if (!this.serverUrl || !this.username || !this.password) {
            throw new Error('Bakaláři konfigurace není dostupná');
        }
    }
    async login() {
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
        }
        catch (error) {
            console.error('Bakaláři login error:', error);
            return false;
        }
    }
    async ensureValidToken() {
        if (this.accessToken && Date.now() < this.tokenExpiry - 60000) {
            return true;
        }
        return await this.login();
    }
    getCachedTimetable() {
        try {
            const cached = localStorage.getItem('bakalari_timetable');
            if (!cached)
                return null;
            const { data, cachedAt } = JSON.parse(cached);
            const today = new Date().toISOString().split('T')[0];
            if (cachedAt === today) {
                console.log('✅ Používám cached rozvrh z localStorage');
                return data;
            }
            return null;
        }
        catch (error) {
            console.error('Chyba při čtení cache:', error);
            return null;
        }
    }
    cacheTimetable(data) {
        try {
            const cached = {
                data,
                cachedAt: new Date().toISOString().split('T')[0],
            };
            localStorage.setItem('bakalari_timetable', JSON.stringify(cached));
            console.log('💾 Rozvrh uložen do localStorage cache');
        }
        catch (error) {
            console.error('Chyba při ukládání cache:', error);
        }
    }
    async getTimetable(forceRefresh = false) {
        await this.ensureConfig();
        if (this.useMockData) {
            console.log('📦 Používám MOCK data pro rozvrh');
            return Promise.resolve(bakalariMockData_1.MOCK_TIMETABLE);
        }
        if (!forceRefresh) {
            const cached = this.getCachedTimetable();
            if (cached)
                return cached;
        }
        const hasToken = await this.ensureValidToken();
        if (!hasToken)
            throw new Error('Login failed');
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
        }
        catch (error) {
            console.error('Bakaláři timetable error:', error);
            return [];
        }
    }
    parseTimetable(data) {
        var _a, _b, _c, _d, _e;
        const hourMap = {};
        const subjectMap = {};
        const teacherMap = {};
        const roomMap = {};
        (_a = data.Hours) === null || _a === void 0 ? void 0 : _a.forEach((hour) => {
            hourMap[hour.Id] = { beginTime: hour.BeginTime, endTime: hour.EndTime };
        });
        (_b = data.Subjects) === null || _b === void 0 ? void 0 : _b.forEach((subject) => {
            subjectMap[subject.Id] = { name: subject.Name, abbrev: subject.Abbrev };
        });
        (_c = data.Teachers) === null || _c === void 0 ? void 0 : _c.forEach((teacher) => {
            teacherMap[teacher.Id] = { name: teacher.Name, abbrev: teacher.Abbrev };
        });
        (_d = data.Rooms) === null || _d === void 0 ? void 0 : _d.forEach((room) => {
            roomMap[room.Id] = { name: room.Name, abbrev: room.Abbrev };
        });
        const days = [];
        (_e = data.Days) === null || _e === void 0 ? void 0 : _e.forEach((day) => {
            var _a;
            const lessons = [];
            (_a = day.Atoms) === null || _a === void 0 ? void 0 : _a.forEach((atom) => {
                const hour = hourMap[atom.HourId];
                const subject = subjectMap[atom.SubjectId];
                const teacher = teacherMap[atom.TeacherId];
                const room = roomMap[atom.RoomId];
                if (!hour)
                    return;
                lessons.push({
                    subjecttext: (subject === null || subject === void 0 ? void 0 : subject.name) || atom.SubjectText || '',
                    teacher: (teacher === null || teacher === void 0 ? void 0 : teacher.abbrev) || '',
                    room: (room === null || room === void 0 ? void 0 : room.abbrev) || '',
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
exports.bakalariAPI = new BakalariAPI();
//# sourceMappingURL=bakalariAPI.js.map