// Soubor: src/hooks/useFamilyEvents.ts

import { useState, useEffect } from 'react';
import { useCalendar } from '../components/Widgets/Calendar/CalendarProvider';
import type { FamilyMember } from '../types';

// SMAZÁNO: Starý a nefunkční import
// import { getMarkedNamedays } from '../components/Widgets/Calendar/utils/namedayState';

export const useFamilyEvents = (familyMembers: FamilyMember[]) => {
  // ZMĚNA: Přidali jsme si 'isNamedayMarked', abychom se mohli ptát na označené dny
  const { formatDate, getNamedayByDate, isSameDay, isNamedayMarked } =
    useCalendar();
  const [currentInfoIndex, setCurrentInfoIndex] = useState(0);

  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // --- Logika pro svátky (zůstává stejná) ---
  const todayNameday = getNamedayByDate(today);
  const tomorrowNameday = getNamedayByDate(tomorrow);

  // --- ZMĚNA: Celá tato funkce je teď mnohem jednodušší ---
  // Už si nemusíme nic složitě načítat, jen se zeptáme `isNamedayMarked`
  const getMarkedNamedayInfo = () => {
    const info: { names: string; daysUntil: number; isToday: boolean }[] = [];
    // Projdeme následujících 30 dní a podíváme se, jestli jsou označené
    for (let i = 0; i < 30; i++) {
      const date = new Date();
      date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() + i);

      if (isNamedayMarked(date)) {
        const nameday = getNamedayByDate(date);
        if (nameday) {
          info.push({
            names: nameday.names.join(', '),
            daysUntil: i,
            isToday: i === 0,
          });
        }
      }
    }
    return info;
  };

  const markedNamedays = getMarkedNamedayInfo();
  const markedToday = markedNamedays.find((m) => m.isToday);
  const upcomingMarked = markedNamedays
    .filter((m) => m.daysUntil > 0)
    .slice(0, 3);

  // --- Logika pro narozeniny (zůstává stejná) ---
  const birthdaysToday = familyMembers.filter(
    (member) => member.birthday && isSameDay(new Date(member.birthday), today)
  );

  // --- Rotující informace v záhlaví (zůstává stejná) ---
  const namedayInfos = [
    todayNameday ? `Dnes má svátek ${todayNameday.names.join(', ')}` : null,
    tomorrowNameday
      ? `Zítra má svátek ${tomorrowNameday.names.join(', ')}`
      : null,
    upcomingMarked.length > 0 && upcomingMarked[0].daysUntil <= 14
      ? `Za ${upcomingMarked[0].daysUntil} ${
          upcomingMarked[0].daysUntil === 1 ? 'den' : 'dny'
        }: ${upcomingMarked[0].names}`
      : null,
  ].filter((info): info is string => info !== null);

  useEffect(() => {
    if (namedayInfos.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentInfoIndex((prev) => (prev + 1) % namedayInfos.length);
    }, 10000);
    return () => clearInterval(interval);
  }, [namedayInfos.length]);

  const weekday = today.toLocaleDateString('cs-CZ', { weekday: 'long' });
  const dayComments: { [key: string]: string } = {
    pondělí: 'Začínáme nový týden! 💪',
    úterý: 'Úterní energie! ⚡',
    středa: 'Půlka týdne za námi! 🎉',
    čtvrtek: 'Blíží se páteček! 🌟',
    pátek: 'Hurá, je tady pátek! 🎊',
    sobota: 'Víkendová pohoda! 🏖️',
    neděle: 'Odpočinkový den! 😴',
  };
  const dayComment = dayComments[weekday] || '✨';

  // Hook vrací připravená data pro zobrazení
  return {
    today,
    formatDate,
    dayComment,
    birthdaysToday,
    namedayInfos,
    currentInfoIndex,
    markedToday,
    upcomingMarked,
  };
};
