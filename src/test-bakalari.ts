// src/test-bakalari.ts
import { bakalariAPI } from './api/bakalariAPI';

export const testBakalariAPI = async () => {
  console.log('🔍 Testování Bakaláři API...');

  try {
    const timetable = await bakalariAPI.getTimetable();
    console.log('✅ Rozvrh:', timetable);

    const lunch = await bakalariAPI.getLunchMenu();
    console.log('✅ Obědy:', lunch);
  } catch (error) {
    console.error('❌ Chyba:', error);
  }
};
