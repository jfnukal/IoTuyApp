// src/components/Widgets/Calendar/data/czechData.ts
import type { Holiday, Nameday } from '../types';

/**
 * Načte české státní svátky pro aktuální den z API.
 * API vrací pouze svátek pro daný den, pokud nějaký je.
 * @returns {Promise<Holiday | null>} Vrátí svátek nebo null.
 */
export const fetchCzechHolidays = async (): Promise<Holiday[]> => {
  try {
    const response = await fetch(`https://svatky.dcerny.cz/api/v1/holiday`);
    if (!response.ok) {
      console.warn(`API pro svátky vrátilo chybu: ${response.status}`);
      return [];
    }
    const data = await response.json();

    // API vrací svátky pro celý rok v poli 'holidays'
    if (data && Array.isArray(data.holidays)) {
      return data.holidays.map((h: { date: string; name: string }) => ({
        id: `holiday-${h.date}`,
        name: h.name,
        date: new Date(h.date),
        type: 'national' as const,
        isPublic: true,
      }));
    }
    return [];
  } catch (error) {
    console.error("Nepodařilo se načíst státní svátky z API:", error);
    return [];
  }
};

/**
 * Načte jmeniny pro celý rok z API.
 * @returns {Promise<Nameday[]>} Vrátí pole jmenin pro celý rok.
 */
export const fetchCzechNamedays = async (): Promise<Nameday[]> => {
  try {
    // API vrací jmeniny pro celý rok na tomto endpointu
    const response = await fetch(`https://svatky.dcerny.cz/api/v1/namedays`);
    if (!response.ok) {
      throw new Error(`API pro jmeniny vrátilo chybu: ${response.status}`);
    }
    const data = await response.json();
    
    // Zpracujeme data do našeho formátu
    if (data && Array.isArray(data.namedays)) {
      const year = new Date().getFullYear(); // Použijeme aktuální rok
      return data.namedays.map((item: { date: string; name: string }) => {
        const [day, month] = item.date.split('.');
        const date = new Date(year, parseInt(month) - 1, parseInt(day));
        const names = item.name.split(', ');

        return {
          id: `nameday-${year}-${month}-${day}`,
          name: item.name,
          date: date,
          names: names,
        };
      });
    }
    return [];
  } catch (error) {
    console.error("Nepodařilo se načíst jmeniny z API:", error);
    return [];
  }
};
