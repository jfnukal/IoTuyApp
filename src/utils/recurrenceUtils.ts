// src/utils/recurrenceUtils.ts
import type { CalendarEventData, RecurringPattern } from '../types';

// ==================== CACHE ====================
// Cache pro vygenerované instance - klíč je `${eventId}_${year}_${month}`
const instanceCache = new Map<string, CalendarEventData[]>();
const CACHE_MAX_SIZE = 500; // Maximální počet položek v cache

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

/**
 * Vyčistí cache (volat při změně událostí)
 */
export function clearRecurrenceCache(): void {
  instanceCache.clear();
  console.log('🗑️ Recurrence cache vyčištěna');
}

/**
 * Vyčistí cache pro konkrétní událost
 */
export function clearEventFromCache(eventId: string): void {
  const keysToDelete: string[] = [];
  instanceCache.forEach((_, key) => {
    if (key.startsWith(eventId)) {
      keysToDelete.push(key);
    }
  });
  keysToDelete.forEach(key => instanceCache.delete(key));
}

/**
 * Ořízne cache pokud je příliš velká
 */
function trimCache(): void {
  if (instanceCache.size > CACHE_MAX_SIZE) {
    const keysToDelete = Array.from(instanceCache.keys()).slice(0, 100);
    keysToDelete.forEach(key => instanceCache.delete(key));
  }
}

// ==================== HLAVNÍ FUNKCE ====================

/**
 * Rychlá kontrola, zda událost MŮŽE mít instanci v daném rozsahu
 * (bez generování všech instancí)
 */
function couldHaveInstanceInRange(
  event: CalendarEventData,
  rangeStart: Date,
  rangeEnd: Date
): boolean {
  const eventStart = new Date(event.date + 'T00:00:00');
  
  // Událost začíná po konci rozsahu - nemůže mít instanci
  if (eventStart > rangeEnd) {
    return false;
  }

  // Pokud není opakovaná, musí být přímo v rozsahu
  if (!event.recurring) {
    return eventStart >= rangeStart && eventStart <= rangeEnd;
  }

  const pattern = event.recurring;

  // Kontrola koncového data opakování
  if (pattern.endType === 'date' && pattern.endDate) {
    const recurrenceEnd = new Date(pattern.endDate + 'T23:59:59');
    if (recurrenceEnd < rangeStart) {
      return false; // Opakování skončilo před začátkem rozsahu
    }
  }

  // Kontrola počtu opakování (hrubý odhad)
  if (pattern.endType === 'count' && pattern.endCount) {
    const maxDays = getMaxDaysForPattern(pattern, pattern.endCount);
    const estimatedEnd = new Date(eventStart);
    estimatedEnd.setDate(estimatedEnd.getDate() + maxDays);
    if (estimatedEnd < rangeStart) {
      return false;
    }
  }

  return true;
}

/**
 * Odhadne maximální počet dní pro daný vzor a počet opakování
 */
function getMaxDaysForPattern(pattern: RecurringPattern, count: number): number {
  switch (pattern.frequency) {
    case 'daily': return count;
    case 'weekly': return count * 7;
    case 'biweekly': return count * 14;
    case 'monthly': return count * 31;
    case 'yearly': return count * 366;
    case 'custom': return count * 7;
    default: return count * 7;
  }
}

/**
 * Generuje všechny instance opakované události v daném rozsahu
 * S CACHE pro optimalizaci
 */
export function generateRecurringInstances(
  event: CalendarEventData,
  rangeStart: Date,
  rangeEnd: Date
): CalendarEventData[] {
  // Pokud není opakovaná, vrať původní (pokud je v rozsahu)
  if (!event.recurring) {
    const eventDate = new Date(event.date + 'T00:00:00');
    if (eventDate >= rangeStart && eventDate <= rangeEnd) {
      return [event];
    }
    return [];
  }

  // Rychlá kontrola - může vůbec mít instanci v rozsahu?
  if (!couldHaveInstanceInRange(event, rangeStart, rangeEnd)) {
    return [];
  }

  // Cache klíč založený na měsíci pro efektivnější cache hits
  const cacheKey = `${event.id}_${rangeStart.getFullYear()}_${rangeStart.getMonth()}_${event.updatedAt || 0}`;
  
  // Zkus najít v cache
  const cached = instanceCache.get(cacheKey);
  if (cached) {
    // Filtruj cached výsledky pro přesný rozsah
    return cached.filter(inst => {
      const instDate = new Date(inst.date + 'T00:00:00');
      return instDate >= rangeStart && instDate <= rangeEnd;
    });
  }

  // Generuj instance
  const instances = generateInstancesInternal(event, rangeStart, rangeEnd);
  
  // Ulož do cache
  trimCache();
  instanceCache.set(cacheKey, instances);

  return instances;
}

/**
 * Interní funkce pro generování instancí (bez cache)
 */
function generateInstancesInternal(
  event: CalendarEventData,
  rangeStart: Date,
  rangeEnd: Date
): CalendarEventData[] {
  const instances: CalendarEventData[] = [];
  const pattern = event.recurring!;
  const eventStartDate = new Date(event.date + 'T00:00:00');

  // Určení koncového data opakování
  let recurrenceEndDate: Date | null = null;
  let maxCount: number = MAX_INSTANCES[pattern.frequency] || 100;

  if (pattern.endType === 'date' && pattern.endDate) {
    recurrenceEndDate = new Date(pattern.endDate + 'T23:59:59');
  } else if (pattern.endType === 'count' && pattern.endCount) {
    maxCount = Math.min(pattern.endCount, maxCount);
  }

  maxCount = Math.min(maxCount, ABSOLUTE_MAX);

  // Pro custom frekvenci použij optimalizovanou verzi
  if (pattern.frequency === 'custom' && pattern.daysOfWeek?.length) {
    return generateCustomInstances(event, eventStartDate, rangeStart, rangeEnd, recurrenceEndDate, maxCount);
  }

  let currentDate = new Date(eventStartDate);
  let instanceCount = 0;

  // Optimalizace: Přeskoč na začátek rozsahu pokud je událost daleko v minulosti
  currentDate = skipToRangeStart(currentDate, rangeStart, pattern);

  while (instanceCount < maxCount) {
    if (recurrenceEndDate && currentDate > recurrenceEndDate) break;
    if (currentDate > rangeEnd) break;

    // Max 4 roky do budoucnosti
    const maxFutureDate = new Date();
    maxFutureDate.setFullYear(maxFutureDate.getFullYear() + 4);
    if (currentDate > maxFutureDate) break;

    const dateKey = formatDateKey(currentDate);
    const isException = pattern.exceptions?.includes(dateKey);

    if (!isException && currentDate >= rangeStart && currentDate <= rangeEnd) {
      instances.push(createInstance(event, currentDate, instanceCount));
    }

    currentDate = getNextOccurrence(currentDate, pattern, eventStartDate);
    instanceCount++;

    if (instanceCount > 500) {
      console.warn('RecurrenceUtils: Příliš mnoho iterací');
      break;
    }
  }

  return instances;
}

/**
 * Optimalizovaná verze pro custom frekvenci (konkrétní dny v týdnu)
 */
function generateCustomInstances(
  event: CalendarEventData,
  eventStartDate: Date,
  rangeStart: Date,
  rangeEnd: Date,
  recurrenceEndDate: Date | null,
  maxCount: number
): CalendarEventData[] {
  const instances: CalendarEventData[] = [];
  const pattern = event.recurring!;
  const daysOfWeek = pattern.daysOfWeek || [];

  if (daysOfWeek.length === 0) return [];

  // Začni od začátku rozsahu (nebo od začátku události)
  let currentDate = new Date(Math.max(rangeStart.getTime(), eventStartDate.getTime()));
  currentDate.setHours(0, 0, 0, 0);

  // Posuň na první platný den v týdnu
  let safety = 0;
  while (!daysOfWeek.includes(currentDate.getDay()) && safety < 7) {
    currentDate.setDate(currentDate.getDate() + 1);
    safety++;
  }

  let instanceCount = 0;

  while (currentDate <= rangeEnd && instanceCount < maxCount) {
    if (recurrenceEndDate && currentDate > recurrenceEndDate) break;

    // Max 4 roky do budoucnosti
    const maxFutureDate = new Date();
    maxFutureDate.setFullYear(maxFutureDate.getFullYear() + 4);
    if (currentDate > maxFutureDate) break;

    // Kontrola, že datum je po začátku události
    if (currentDate >= eventStartDate) {
      const dateKey = formatDateKey(currentDate);
      const isException = pattern.exceptions?.includes(dateKey);

      if (!isException && currentDate >= rangeStart) {
        instances.push(createInstance(event, currentDate, instanceCount));
        instanceCount++;
      }
    }

    // Posuň na další platný den
    do {
      currentDate.setDate(currentDate.getDate() + 1);
    } while (!daysOfWeek.includes(currentDate.getDay()) && currentDate <= rangeEnd);
  }

  return instances;
}

/**
 * Přeskočí na začátek rozsahu (optimalizace pro události daleko v minulosti)
 */
function skipToRangeStart(
  currentDate: Date,
  rangeStart: Date,
  pattern: RecurringPattern
): Date {
  if (currentDate >= rangeStart) return currentDate;

  const diffMs = rangeStart.getTime() - currentDate.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  let skipDays = 0;

  switch (pattern.frequency) {
    case 'daily':
      skipDays = diffDays;
      break;
    case 'weekly':
      skipDays = Math.floor(diffDays / 7) * 7;
      break;
    case 'biweekly':
      skipDays = Math.floor(diffDays / 14) * 14;
      break;
    case 'monthly':
      // Pro měsíční je složitější, přeskočíme celé měsíce
      const monthsDiff = (rangeStart.getFullYear() - currentDate.getFullYear()) * 12 
                        + (rangeStart.getMonth() - currentDate.getMonth()) - 1;
      if (monthsDiff > 0) {
        const newDate = new Date(currentDate);
        newDate.setMonth(newDate.getMonth() + monthsDiff);
        return newDate;
      }
      return currentDate;
    case 'yearly':
      const yearsDiff = rangeStart.getFullYear() - currentDate.getFullYear() - 1;
      if (yearsDiff > 0) {
        const newDate = new Date(currentDate);
        newDate.setFullYear(newDate.getFullYear() + yearsDiff);
        return newDate;
      }
      return currentDate;
    default:
      return currentDate;
  }

  if (skipDays > 0) {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + skipDays);
    return newDate;
  }

  return currentDate;
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
 * Vrátí další výskyt podle vzoru opakování
 */
function getNextOccurrence(
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

/**
 * Formátuje datum jako YYYY-MM-DD
 */
function formatDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// ==================== VEŘEJNÉ API ====================

/**
 * Získá všechny události pro zobrazení v daném měsíci (včetně opakovaných)
 * OPTIMALIZOVANÁ VERZE
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
    // Rychlá kontrola před generováním
    if (!couldHaveInstanceInRange(event, rangeStart, rangeEnd)) {
      continue;
    }

    if (event.recurring) {
      const instances = generateRecurringInstances(event, rangeStart, rangeEnd);
      allInstances.push(...instances);
    } else {
      allInstances.push(event);
    }
  }

  return allInstances;
}

/**
 * Získá všechny události pro konkrétní den (včetně opakovaných)
 * OPTIMALIZOVANÁ VERZE
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
    // Rychlá kontrola před generováním
    if (!couldHaveInstanceInRange(event, dayStart, dayEnd)) {
      continue;
    }

    if (event.recurring) {
      const instances = generateRecurringInstances(event, dayStart, dayEnd);
      result.push(...instances);
    } else {
      result.push(event);
    }
  }

  return result;
}
