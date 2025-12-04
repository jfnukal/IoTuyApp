// src/utils/recurrenceUtils.ts
import type { CalendarEventData, RecurringPattern } from '../types';

// Maximální limity pro generování instancí
const MAX_INSTANCES: Record<string, number> = {
  daily: 365,
  weekly: 104,
  biweekly: 52,
  monthly: 48,
  yearly: 4,
  custom: 104,
};

const ABSOLUTE_MAX = 100;

// ==================== CACHE ====================
const instanceCache = new Map<string, CalendarEventData[]>();
const CACHE_MAX_SIZE = 200;

/**
 * Vyčistí cache (volat při změně událostí)
 */
export function clearRecurrenceCache(): void {
  instanceCache.clear();
}

/**
 * Ořízne cache pokud je příliš velká
 */
function trimCache(): void {
  if (instanceCache.size > CACHE_MAX_SIZE) {
    const keysToDelete = Array.from(instanceCache.keys()).slice(0, 50);
    keysToDelete.forEach(key => instanceCache.delete(key));
  }
}

/**
 * Formátuje datum jako YYYY-MM-DD
 */
function formatDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Kontrola zda jsou dva datumy stejný den
 */
function isSameDay(d1: Date, d2: Date): boolean {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

/**
 * Vytvoří instanci události pro konkrétní datum
 */
function createInstance(
  originalEvent: CalendarEventData,
  date: Date,
  instanceIndex: number
): CalendarEventData {
  const dateKey = formatDateKey(date);

  return {
    ...originalEvent,
    id: `${originalEvent.id}_instance_${dateKey}`,
    date: dateKey,
    isRecurringInstance: true,
    originalEventId: originalEvent.id,
    instanceIndex,
  } as CalendarEventData;
}

/**
 * Hlavní funkce - generuje instance pro daný rozsah
 */
 export function generateRecurringInstances(
  event: CalendarEventData,
  rangeStart: Date,
  rangeEnd: Date
): CalendarEventData[] {
  // Pokud není opakovaná nebo nemá platnou frequency
  if (!event.recurring || !event.recurring.frequency) {
    const eventDate = new Date(event.date + 'T00:00:00');
    if (eventDate >= rangeStart && eventDate <= rangeEnd) {
      return [event];
    }
    return [];
  }

  // ✅ CACHE - zkus najít v cache
  const cacheKey = `${event.id}_${formatDateKey(rangeStart)}_${formatDateKey(rangeEnd)}_${event.updatedAt || 0}`;
  const cached = instanceCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const pattern = event.recurring;
  const eventStartDate = new Date(event.date + 'T00:00:00');

  // Událost začíná po konci rozsahu
  if (eventStartDate > rangeEnd) {
    return [];
  }

  // Určení koncového data a max počtu
  let recurrenceEndDate: Date | null = null;
  let maxCount: number = MAX_INSTANCES[pattern.frequency] || 100;

  if (pattern.endType === 'date' && pattern.endDate) {
    recurrenceEndDate = new Date(pattern.endDate + 'T23:59:59');
    // Opakování skončilo před začátkem rozsahu
    if (recurrenceEndDate < rangeStart) {
      return [];
    }
  } else if (pattern.endType === 'count' && pattern.endCount) {
    maxCount = Math.min(pattern.endCount, maxCount);
  }

  maxCount = Math.min(maxCount, ABSOLUTE_MAX);

  const instances: CalendarEventData[] = [];
  let currentDate = new Date(eventStartDate);
  let instanceCount = 0;

  // Pro weekly/custom s daysOfWeek - speciální logika
  if (pattern.daysOfWeek && pattern.daysOfWeek.length > 0) {
    return generateWeeklyWithDays(
      event,
      eventStartDate,
      rangeStart,
      rangeEnd,
      recurrenceEndDate,
      maxCount,
      pattern
    );
  }

  // Standardní opakování (daily, monthly, yearly)
  while (instanceCount < maxCount) {
    // Kontroly pro ukončení
    if (recurrenceEndDate && currentDate > recurrenceEndDate) break;
    if (currentDate > rangeEnd) break;

    // Max 4 roky do budoucnosti
    const maxFuture = new Date();
    maxFuture.setFullYear(maxFuture.getFullYear() + 4);
    if (currentDate > maxFuture) break;

    // Kontrola výjimek
    const dateKey = formatDateKey(currentDate);
    const isException = pattern.exceptions?.includes(dateKey);

    // Přidej pokud je v rozsahu
    if (!isException && currentDate >= rangeStart && currentDate <= rangeEnd) {
      instances.push(createInstance(event, currentDate, instanceCount));
    }

    // Posuň na další výskyt
    currentDate = getNextDate(currentDate, pattern, eventStartDate);
    instanceCount++;

    // Bezpečnostní pojistka
    if (instanceCount > 200) break;
  }

    // ✅ Ulož do cache
    trimCache();
    instanceCache.set(cacheKey, instances);

  return instances;
}

/**
 * Speciální generátor pro weekly/custom s konkrétními dny v týdnu
 */
function generateWeeklyWithDays(
  event: CalendarEventData,
  eventStartDate: Date,
  rangeStart: Date,
  rangeEnd: Date,
  recurrenceEndDate: Date | null,
  maxCount: number,
  pattern: RecurringPattern
): CalendarEventData[] {
  const instances: CalendarEventData[] = [];
  const daysOfWeek = pattern.daysOfWeek || [];

  if (daysOfWeek.length === 0) return [];

  // Začni od začátku události nebo rozsahu (co je později)
  let currentDate = new Date(Math.max(eventStartDate.getTime(), rangeStart.getTime()));
  currentDate.setHours(0, 0, 0, 0);

  // Vrať se na začátek týdne pokud jsme začali od rangeStart
  // abychom nepřeskočili události
  if (currentDate > eventStartDate) {
    // Vrať se o týden zpět pro jistotu
    currentDate.setDate(currentDate.getDate() - 7);
  }

  let instanceCount = 0;
  let safetyCounter = 0;

  while (instanceCount < maxCount && safetyCounter < 500) {
    safetyCounter++;

    // Kontroly pro ukončení
    if (recurrenceEndDate && currentDate > recurrenceEndDate) break;
    if (currentDate > rangeEnd) break;

    // Max 4 roky do budoucnosti
    const maxFuture = new Date();
    maxFuture.setFullYear(maxFuture.getFullYear() + 4);
    if (currentDate > maxFuture) break;

    // Kontrola zda je správný den v týdnu
    const dayOfWeek = currentDate.getDay();
    
    if (daysOfWeek.includes(dayOfWeek) && currentDate >= eventStartDate) {
      // Kontrola výjimek
      const dateKey = formatDateKey(currentDate);
      const isException = pattern.exceptions?.includes(dateKey);

      // Přidej pokud je v rozsahu
      if (!isException && currentDate >= rangeStart && currentDate <= rangeEnd) {
        instances.push(createInstance(event, currentDate, instanceCount));
      }
      
      // Počítej pouze platné instance (které jsou po začátku události)
      if (currentDate >= eventStartDate) {
        instanceCount++;
      }
    }

    // Posuň na další den
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return instances;
}

/**
 * Vrátí další datum podle frekvence
 */
function getNextDate(
  currentDate: Date,
  pattern: RecurringPattern,
  originalStart: Date
): Date {
  const next = new Date(currentDate);
  const interval = pattern.interval || 1;

  switch (pattern.frequency) {
    case 'daily':
      next.setDate(next.getDate() + interval);
      break;

    case 'weekly':
      next.setDate(next.getDate() + 7 * interval);
      break;

    case 'biweekly':
      next.setDate(next.getDate() + 14);
      break;

    case 'monthly':
      next.setMonth(next.getMonth() + interval);
      const targetDay = pattern.dayOfMonth || originalStart.getDate();
      const daysInMonth = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
      next.setDate(Math.min(targetDay, daysInMonth));
      break;

    case 'yearly':
      next.setFullYear(next.getFullYear() + interval);
      break;

    default:
      next.setDate(next.getDate() + 1);
  }

  return next;
}

// ==================== VEŘEJNÉ API ====================

/**
 * Získá všechny události pro konkrétní den (včetně opakovaných)
 */
export function getEventsForDate(
  events: CalendarEventData[],
  date: Date
): CalendarEventData[] {
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);

  const dayEnd = new Date(date);
  dayEnd.setHours(23, 59, 59, 999);

  const result: CalendarEventData[] = [];

  for (const event of events) {
    if (event.recurring && event.recurring.frequency) {
      const instances = generateRecurringInstances(event, dayStart, dayEnd);
      result.push(...instances);
    } else {
      // Běžná událost
      const eventDate = new Date(event.date + 'T00:00:00');
      if (isSameDay(eventDate, date)) {
        result.push(event);
      }
    }
  }

  return result;
}

/**
 * Získá všechny události pro měsíc (včetně opakovaných)
 */
export function getEventsForMonth(
  events: CalendarEventData[],
  year: number,
  month: number
): CalendarEventData[] {
  const rangeStart = new Date(year, month, 1);
  const rangeEnd = new Date(year, month + 1, 0, 23, 59, 59);

  const allInstances: CalendarEventData[] = [];

  for (const event of events) {
    if (event.recurring && event.recurring.frequency) {
      const instances = generateRecurringInstances(event, rangeStart, rangeEnd);
      allInstances.push(...instances);
    } else {
      const eventDate = new Date(event.date + 'T00:00:00');
      if (eventDate >= rangeStart && eventDate <= rangeEnd) {
        allInstances.push(event);
      }
    }
  }

  return allInstances;
}