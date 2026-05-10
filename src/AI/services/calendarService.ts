// src/AI/services/calendarService.ts
// Cache dat z CalendarProvider + handlery pro Gemini function calling

import type { CalendarEventData, Nameday } from '../../types/index';
import type { FamilyMember } from '../../types/index';

// ==================== CACHE ====================

let eventsCache: CalendarEventData[] = [];
let namedaysCache: Nameday[] = [];     // plný seznam jmenin (celý rok)
let familyMembersCache: FamilyMember[] = [];

type AddEventFn = (
  event: Omit<CalendarEventData, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
) => Promise<void>;

let addEventHandler: AddEventFn | null = null;

// ==================== SYNC Z REACTU ====================

export const syncEvents = (events: CalendarEventData[]) => {
  eventsCache = events;
};

export const syncNamedays = (namedays: Nameday[]) => {
  namedaysCache = namedays;
};

export const syncFamilyMembers = (members: FamilyMember[]) => {
  familyMembersCache = members;
};

export const registerAddEventHandler = (fn: AddEventFn) => {
  addEventHandler = fn;
};

// ==================== HELPERS ====================

const isSameDay = (a: Date, b: Date) =>
  a.getDate() === b.getDate() &&
  a.getMonth() === b.getMonth() &&
  a.getFullYear() === b.getFullYear();

const formatDateCz = (date: Date) =>
  date.toLocaleDateString('cs-CZ', {
    weekday: 'long', day: 'numeric', month: 'long',
  });

const parseDate = (input: string): Date => {
  if (input === 'today' || input === 'dnes') return new Date();
  if (input === 'tomorrow' || input === 'zítra') {
    const d = new Date(); d.setDate(d.getDate() + 1); return d;
  }
  // YYYY-MM-DD — new Date('2026-05-08') parsuje jako UTC půlnoc → timezone shift
  // Proto parsujeme ručně jako lokální datum
  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) {
    const [y, m, d] = input.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  // D.M. nebo D.M.YYYY
  const dot = input.match(/^(\d{1,2})\.(\d{1,2})\.?(\d{4})?$/);
  if (dot) {
    const year = dot[3] ? parseInt(dot[3]) : new Date().getFullYear();
    return new Date(year, parseInt(dot[2]) - 1, parseInt(dot[1]));
  }
  return new Date(input);
};

// ==================== API PRO GEMINI ====================

/** Vrátí události v rozmezí dnešek + N dní */
export const getCalendarEvents = (daysAhead = 7, fromDateStr?: string): string => {
  const from = fromDateStr ? parseDate(fromDateStr) : new Date();
  from.setHours(0, 0, 0, 0);
  const to = new Date(from);
  to.setDate(to.getDate() + daysAhead);
  to.setHours(23, 59, 59, 999);

  const filtered = eventsCache.filter(ev => {
    const d = new Date(ev.date);
    return d >= from && d <= to;
  });

  if (filtered.length === 0) {
    return daysAhead <= 1
      ? 'Dnes nemáte žádné události.'
      : `V příštích ${daysAhead} dnech nemáte žádné události.`;
  }

  const lines = filtered
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map(ev => {
      const d = new Date(ev.date);
      const time = ev.time ? ` v ${ev.time}` : '';
      return `${formatDateCz(d)}${time}: ${ev.title}`;
    });

  return lines.join('. ');
};

/** Vrátí kdo má svátek v daný den */
export const getNameday = (dateStr: string): string => {
  const date = parseDate(dateStr);
  const month = date.getMonth() + 1; // 1–12
  const day = date.getDate();

  const found = namedaysCache.find(n => {
    const d = new Date(n.date);
    return d.getMonth() + 1 === month && d.getDate() === day;
  });

  if (!found || found.names.length === 0) {
    return `${formatDateCz(date)} nemá nikdo svátek.`;
  }

  const names = found.names.join(' a ');
  const prefix = isSameDay(date, new Date())
    ? 'Dnes má svátek'
    : `${formatDateCz(date)} má svátek`;

  // Zkontroluj, jestli někdo z rodiny má svátek
  const family = familyMembersCache.filter(m =>
    found.names.some(n => m.name.toLowerCase().includes(n.toLowerCase()))
  );
  const familyNote = family.length > 0
    ? ` — a to je ${family.map(m => m.name).join(' a ')} z vaší rodiny!`
    : '';

  return `${prefix} ${names}${familyNote}`;
};

/** Přidá událost do kalendáře */
export const addCalendarEvent = async (
  title: string,
  dateStr: string,
  time?: string,
  memberName?: string,
): Promise<string> => {
  if (!addEventHandler) {
    console.error('[CalendarService] addEventHandler není registrován — CalendarBridge nenačten?');
    return 'Chyba: kalendář není propojen.';
  }

  const date = parseDate(dateStr);
  if (isNaN(date.getTime())) return `Nerozuměl jsem datu "${dateStr}".`;

  // Lokální datum (ne UTC) — toISOString() by posunul den zpět v CET
  const isoDate = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
  const description = memberName ? `Pro: ${memberName}` : undefined;

  const eventPayload: Record<string, any> = {
    title,
    date: isoDate,
    endDate: isoDate,
    type: 'family',
    color: '#667eea',
    isAllDay: !time,
    ...(time        && { time }),
    ...(description && { description }),
  };

  console.log('[CalendarService] Přidávám událost:', eventPayload);

  try {
    await addEventHandler(eventPayload as any);
  } catch (err) {
    console.error('[CalendarService] Chyba při zápisu události:', err);
    return `Nepodařilo se přidat událost: ${(err as Error).message}`;
  }

  const timeStr = time ? ` v ${time}` : '';
  const memberStr = memberName ? ` pro ${memberName}` : '';
  return `Přidáno: ${title}${memberStr} — ${formatDateCz(date)}${timeStr}.`;
};

/** Vrátí narozeniny z rodiny v daném rozmezí */
export const getUpcomingBirthdays = (daysAhead = 30): string => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const upcoming = familyMembersCache
    .filter(m => m.birthday)
    .map(m => {
      const bday = new Date(m.birthday!);
      const thisYear = new Date(today.getFullYear(), bday.getMonth(), bday.getDate());
      if (thisYear < today) thisYear.setFullYear(today.getFullYear() + 1);
      const diff = Math.round((thisYear.getTime() - today.getTime()) / 86400000);
      return { name: m.name, date: thisYear, daysUntil: diff };
    })
    .filter(b => b.daysUntil <= daysAhead)
    .sort((a, b) => a.daysUntil - b.daysUntil);

  if (upcoming.length === 0) return `V příštích ${daysAhead} dnech nikdo nemá narozeniny.`;

  return upcoming.map(b =>
    b.daysUntil === 0
      ? `Dnes má narozeniny ${b.name}!`
      : `Za ${b.daysUntil} dní má narozeniny ${b.name} (${formatDateCz(b.date)}).`
  ).join(' ');
};
