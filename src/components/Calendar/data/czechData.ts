// src/components/Widgets/Calendar/data/czechData.ts
import type { Holiday, Nameday } from '../types';

// Cache klíče
const CACHE_KEY_PREFIX = 'namedays_cache_';
const CACHE_EXPIRY_KEY = 'namedays_cache_expiry';

/**
 * Načte jmeniny pro daný měsíc a rok.
 * Používá localStorage jako cache - pokud už máme data pro tento měsíc, nebudeme volat API.
 */
export const fetchCzechNamedays = async (
  year: number,
  month: number
): Promise<Nameday[]> => {
  console.log(`[Namedays] Načítám jmeniny pro ${month}/${year}`);

  const cacheKey = `${CACHE_KEY_PREFIX}${year}_${month}`;

  // Zkusíme načíst z cache
  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      const data = JSON.parse(cached);
      // Převedeme string datumy zpět na Date objekty
      const namedays = data.map((item: any) => ({
        ...item,
        date: new Date(item.date),
      }));
      console.log(`[Namedays] Načteno z cache: ${namedays.length} jmenin`);
      return namedays;
    }
  } catch (e) {
    console.warn('[Namedays] Cache read failed:', e);
  }

  // Nemáme v cache, načteme z API
  try {
    const namedays: Nameday[] = [];
    const daysInMonth = new Date(year, month, 0).getDate();

    console.log(`[Namedays] Načítám z API - měsíc má ${daysInMonth} dní`);

    for (let day = 1; day <= daysInMonth; day++) {
      try {
        const url = `https://nameday.abalin.net/api/V1/getdate?country=cz&month=${month}&day=${day}`;
        console.log(`[Namedays] Volám: ${url}`);
        const response = await fetch(url);

        console.log(`[Namedays] Den ${day}: status ${response.status}`);

        if (response.ok) {
          const data = await response.json();
          console.log(`[Namedays] Den ${day} data:`, data);

          if (data.nameday && data.nameday.cz) {
            const date = new Date(year, month - 1, day);
            const name = data.nameday.cz;
            const names = name.split(/, | a /);

            console.log(`[Namedays] Den ${day}: ${name}`);

            namedays.push({
              id: `nameday-${year}-${month}-${day}`,
              name: name,
              date: date,
              names: names,
            });
          } else {
            console.warn(`[Namedays] Den ${day}: Chybí data.nameday.cz`, data);
          }
        }
      } catch (dayError) {
        console.error(`[Namedays] Den ${day}.${month}. selhal:`, dayError);
      }

      await new Promise((resolve) => setTimeout(resolve, 30));
    }

    // Uložíme do cache
    try {
      const cacheData = namedays.map((item) => ({
        ...item,
        date: item.date.toISOString(), // Převedeme Date na string pro localStorage
      }));
      localStorage.setItem(cacheKey, JSON.stringify(cacheData));
      console.log(`[Namedays] Uloženo do cache: ${namedays.length} jmenin`);
    } catch (e) {
      console.warn('[Namedays] Cache write failed:', e);
    }

    return namedays;
  } catch (error) {
    console.error('[Namedays] CHYBA při načítání:', error);
    return getFallbackForMonth(year, month);
  }
};

/**
 * Vymaže cache pro daný rok (voláme na začátku nového roku)
 */
export const clearNamedaysCache = (year: number) => {
  console.log(`[Namedays] Mažu cache pro rok ${year}`);
  for (let month = 1; month <= 12; month++) {
    const cacheKey = `${CACHE_KEY_PREFIX}${year}_${month}`;
    localStorage.removeItem(cacheKey);
  }
};

/**
 * Zkontroluje, jestli je nový rok a vymaže starou cache
 */
export const checkAndClearOldCache = () => {
  const currentYear = new Date().getFullYear();
  const lastCacheYear = localStorage.getItem(CACHE_EXPIRY_KEY);

  if (lastCacheYear !== String(currentYear)) {
    console.log('[Namedays] Nový rok - mažu starou cache');
    // Vymažeme cache pro všechny roky
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith(CACHE_KEY_PREFIX)) {
        localStorage.removeItem(key);
      }
    });
    localStorage.setItem(CACHE_EXPIRY_KEY, String(currentYear));
  }
};

export const fetchCzechHolidays = async (year: number): Promise<Holiday[]> => {
  try {
    const url = `https://date.nager.at/api/v3/PublicHolidays/${year}/CZ`;
    const response = await fetch(url);

    if (!response.ok) throw new Error(`API error: ${response.status}`);

    const data: any[] = await response.json();

    return data.map((holiday) => ({
      id: `holiday-${holiday.date}`,
      name: holiday.localName,
      date: new Date(holiday.date),
      type: 'national' as const,
      isPublic: true,
    }));
  } catch (error) {
    console.error('[Holidays] CHYBA:', error);
    return [];
  }
};

const getFallbackForMonth = (year: number, month: number): Nameday[] => {
  // Základní fallback data pro daný měsíc
  return [];
};
