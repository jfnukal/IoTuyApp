// src/utils/recurrenceUtils.ts
import type { CalendarEventData, RecurringPattern } from '../types';

// Maximální limity pro generování instancí
const MAX_INSTANCES = {
  daily: 365,      // Max 1 rok
  weekly: 104,     // Max 2 roky
  biweekly: 52,    // Max 2 roky
  monthly: 48,     // Max 4 roky
  yearly: 4,       // Max 4 roky
  custom: 104,     // Max 2 roky
};

const ABSOLUTE_MAX = 100; // Nikdy více než 100 instancí

/**
 * Generuje všechny instance opakované události v daném rozsahu
 */
export function generateRecurringInstances(
  event: CalendarEventData,
  rangeStart: Date,
  rangeEnd: Date
): CalendarEventData[] {
  if (!event.recurring) {
    return [event];
  }

  const instances: CalendarEventData[] = [];
  const pattern = event.recurring;
  const eventStartDate = new Date(event.date + 'T00:00:00');
  
  // Určení koncového data opakování
  let recurrenceEndDate: Date | null = null;
  let maxCount: number = MAX_INSTANCES[pattern.frequency] || 100;
  
  // Aplikuj uživatelská omezení
  if (pattern.endType === 'date' && pattern.endDate) {
    recurrenceEndDate = new Date(pattern.endDate + 'T23:59:59');
  } else if (pattern.endType === 'count' && pattern.endCount) {
    maxCount = Math.min(pattern.endCount, maxCount);
  }
  
  // Omez na absolutní maximum
  maxCount = Math.min(maxCount, ABSOLUTE_MAX);

  let currentDate = new Date(eventStartDate);
  let instanceCount = 0;

  while (instanceCount < maxCount) {
    // Kontrola, zda jsme překročili koncové datum opakování
    if (recurrenceEndDate && currentDate > recurrenceEndDate) {
      break;
    }

    // Kontrola, zda jsme příliš daleko v budoucnosti (max 4 roky)
    const maxFutureDate = new Date();
    maxFutureDate.setFullYear(maxFutureDate.getFullYear() + 4);
    if (currentDate > maxFutureDate) {
      break;
    }

    // Kontrola výjimek (zrušené instance)
    const dateKey = formatDateKey(currentDate);
    const isException = pattern.exceptions?.includes(dateKey);

    // Pokud je datum v požadovaném rozsahu a není výjimka, přidej instanci
    if (!isException && currentDate >= rangeStart && currentDate <= rangeEnd) {
      // Pro custom frekvenci kontrolujeme den v týdnu
      if (pattern.frequency === 'custom') {
        if (pattern.daysOfWeek?.includes(currentDate.getDay())) {
          instances.push(createInstance(event, currentDate, instanceCount));
        }
      } else {
        instances.push(createInstance(event, currentDate, instanceCount));
      }
    }

    // Posuň na další datum podle frekvence
    currentDate = getNextOccurrence(currentDate, pattern, eventStartDate);
    instanceCount++;

    // Bezpečnostní pojistka
    if (instanceCount > 1000) {
      console.warn('RecurrenceUtils: Příliš mnoho iterací, ukončuji.');
      break;
    }
  }

  return instances;
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
    // Označení, že jde o instanci opakované události
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
      next.setDate(next.getDate() + (7 * interval));
      break;

    case 'biweekly':
      next.setDate(next.getDate() + 14);
      break;

    case 'monthly':
      next.setMonth(next.getMonth() + interval);
      // Zachování původního dne v měsíci
      const targetDay = pattern.dayOfMonth || originalStart.getDate();
      const daysInMonth = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
      next.setDate(Math.min(targetDay, daysInMonth));
      break;

    case 'yearly':
      next.setFullYear(next.getFullYear() + interval);
      break;

    case 'custom':
      // Pro custom posouváme po dnech a kontrolujeme v hlavní smyčce
      next.setDate(next.getDate() + 1);
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

/**
 * Získá všechny události pro zobrazení v daném měsíci (včetně opakovaných)
 */
export function getEventsForMonth(
  events: CalendarEventData[],
  year: number,
  month: number
): CalendarEventData[] {
  // Rozsah: celý měsíc + trochu navíc pro vícedenní události
  const rangeStart = new Date(year, month, 1);
  const rangeEnd = new Date(year, month + 1, 0, 23, 59, 59);

  const allInstances: CalendarEventData[] = [];

  for (const event of events) {
    if (event.recurring) {
      const instances = generateRecurringInstances(event, rangeStart, rangeEnd);
      allInstances.push(...instances);
    } else {
      // Běžná událost - přidej pokud je v rozsahu
      const eventDate = new Date(event.date + 'T00:00:00');
      if (eventDate >= rangeStart && eventDate <= rangeEnd) {
        allInstances.push(event);
      }
    }
  }

  return allInstances;
}

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
    if (event.recurring) {
      const instances = generateRecurringInstances(event, dayStart, dayEnd);
      result.push(...instances);
    } else {
      // Běžná událost
      const eventDate = new Date(event.date + 'T00:00:00');
      if (
        eventDate.getDate() === date.getDate() &&
        eventDate.getMonth() === date.getMonth() &&
        eventDate.getFullYear() === date.getFullYear()
      ) {
        result.push(event);
      }
    }
  }

  return result;
}