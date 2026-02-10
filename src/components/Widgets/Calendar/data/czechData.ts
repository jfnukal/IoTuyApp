// src/components/Widgets/Calendar/data/czechData.ts
import type { Holiday, Nameday } from '../../../../types/index';
import { getNameDay } from 'namedays-cs';
import { getPublicHoliday, isPublicHoliday } from 'holidays-cs';
import { DateTime } from 'luxon';

interface YearlyData {
  holidays: Holiday[];
  namedays: Nameday[];
}

/**
 * Generuje svátky a jmeniny pro celý rok z OFFLINE dat.
 * Používá balíčky namedays-cs a holidays-cs - žádné API volání.
 * 
 * @param year - Rok, pro který se mají data vygenerovat.
 * @returns Objekt obsahující pole svátků a pole jmenin.
 */
export const fetchCalendarDataForYear = async (
  year: number
): Promise<YearlyData> => {
  const holidays: Holiday[] = [];
  const namedays: Nameday[] = [];

  // Zjistíme, jestli je rok přestupný
  const isLeap = new Date(year, 1, 29).getMonth() === 1;
  const daysInYear = isLeap ? 366 : 365;

  // Projdeme všechny dny v roce
  for (let dayOfYear = 0; dayOfYear < daysInYear; dayOfYear++) {
    const jsDate = new Date(year, 0, 1 + dayOfYear);
    const luxonDate = DateTime.fromJSDate(jsDate);
    
    // Formát pro ID: YYYY-MM-DD
    const dateStr = `${year}-${String(jsDate.getMonth() + 1).padStart(2, '0')}-${String(jsDate.getDate()).padStart(2, '0')}`;

    // === STÁTNÍ SVÁTKY (holidays-cs) ===
    if (isPublicHoliday(luxonDate)) {
      const holidayName = getPublicHoliday(luxonDate);
      if (holidayName) {
        holidays.push({
          id: `holiday-${dateStr}`,
          name: holidayName,
          date: jsDate,
          type: 'national',
          isPublic: true,
        });
      }
    }

    // === JMENINY (namedays-cs) ===
    const names = getNameDay(jsDate); // Vrací pole: ['Adam', 'Eva'] nebo []
    
    if (names && names.length > 0) {
      namedays.push({
        id: `nameday-${dateStr}`,
        name: names.join(', '), // "Adam, Eva"
        date: jsDate,
        names: names, // ['Adam', 'Eva']
      });
    }
  }

  console.log(`✅ Načteno offline: ${holidays.length} svátků, ${namedays.length} jmenin pro rok ${year}`);
  
  return { holidays, namedays };
};