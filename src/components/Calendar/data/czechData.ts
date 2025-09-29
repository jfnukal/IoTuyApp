// src/components/Widgets/Calendar/data/czechData.ts
import type { Holiday, Nameday } from '../types';

interface YearlyData {
  holidays: Holiday[];
  namedays: Nameday[];
}

/**
 * Načte svátky a jmeniny pro celý zadaný rok pomocí jednoho API volání.
 * @param year - Rok, pro který se mají data načíst.
 * @returns Objekt obsahující pole svátků a pole jmenin.
 */
export const fetchCalendarDataForYear = async (year: number): Promise<YearlyData> => {
  // Zjistíme, jestli je rok přestupný, abychom načetli správný počet dní
  const isLeap = new Date(year, 1, 29).getMonth() === 1;
  const daysInYear = isLeap ? 366 : 365;
  
  const url = `https://svatkyapi.cz/api/day/${year}-01-01/interval/${daysInYear}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`API svatkyapi.cz vrátilo chybu: ${response.status}`);
    }
    const data: any[] = await response.json();

    const holidays: Holiday[] = [];
    const namedays: Nameday[] = [];

    // Projdeme data pro každý den v roce
    data.forEach(day => {
      const currentDate = new Date(day.date);
      
      // Pokud je den svátek, přidáme ho do pole svátků
      if (day.isHoliday && day.holidayName) {
        holidays.push({
          id: `holiday-${day.date}`,
          name: day.holidayName,
          date: currentDate,
          type: 'national',
          isPublic: true,
        });
      }

      // Pro každý den přidáme jmeniny do pole jmenin
      if (day.name) {
        const names = day.name.split(/, | a /);
        namedays.push({
          id: `nameday-${day.date}`,
          name: day.name,
          date: currentDate,
          names: names,
        });
      }
    });

    return { holidays, namedays };

  } catch (error) {
    console.error("Nepodařilo se načíst data z svatkyapi.cz:", error);
    // V případě chyby vrátíme prázdné objekty
    return { holidays: [], namedays: [] };
  }
};
