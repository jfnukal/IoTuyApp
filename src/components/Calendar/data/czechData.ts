// src/components/Widgets/Calendar/data/czechData.ts
import type { Holiday, Nameday } from '../types';

/**
 * Načte české státní svátky pro aktuální rok z svatkyapi.cz.
 * @param year - Rok, pro který se mají svátky vytvořit (API ho nebere, ale my ho potřebujeme pro vytvoření Date objektu).
 * @returns Pole objektů Holiday.
 */
export const fetchCzechHolidays = async (year: number): Promise<Holiday[]> => {
  try {
    const response = await fetch(`https://svatkyapi.cz/api/holidays`);
    if (!response.ok) {
      throw new Error(`API pro svátky vrátilo chybu: ${response.status}`);
    }
    const data: { date: string, name: string }[] = await response.json();

    // Převedeme data z API na náš interní formát 'Holiday'
    return data.map(holiday => {
      // API vrací datum ve formátu "D.M."
      const [day, month] = holiday.date.split('.').map(Number);
      const date = new Date(year, month - 1, day);

      return {
        id: `holiday-${year}-${month}-${day}`,
        name: holiday.name,
        date: date,
        type: 'national',
        isPublic: true,
      };
    });
  } catch (error) {
    console.error("Nepodařilo se načíst státní svátky z svatkyapi.cz:", error);
    return []; // V případě chyby vrátíme prázdné pole
  }
};

/**
 * Načte jmeniny pro celý rok z svatkyapi.cz.
 * @param year - Rok, pro který se mají jmeniny zpracovat.
 * @returns Pole objektů Nameday.
 */
export const fetchCzechNamedays = async (year: number): Promise<Nameday[]> => {
  try {
    const response = await fetch(`https://svatkyapi.cz/api/names`);
    if (!response.ok) {
      throw new Error(`API pro jmeniny vrátilo chybu: ${response.status}`);
    }
    const data: { date: string, name: string }[] = await response.json();
    
    // Převedeme data z API na náš interní formát 'Nameday'
    return data.map(item => {
      // API vrací datum ve formátu "DDMM", musíme z něj vytvořit platné datum
      const day = parseInt(item.date.substring(0, 2), 10);
      const month = parseInt(item.date.substring(2, 4), 10);
      const date = new Date(year, month - 1, day);

      // Některé dny mají více jmen (např. "Adam a Eva"), rozdělíme je
      const names = item.name.split(/, | a /);

      return {
        id: `nameday-${year}-${month}-${day}`,
        name: item.name,
        date: date,
        names: names,
      };
    });
  } catch (error) {
    console.error("Nepodařilo se načíst jmeniny z svatkyapi.cz:", error);
    return []; // V případě chyby vrátíme prázdné pole
  }
};
