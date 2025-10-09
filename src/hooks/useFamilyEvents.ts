// Soubor: src/hooks/useFamilyEvents.ts

import { useState, useEffect } from 'react';
import { useCalendar } from '../components/Widgets/Calendar/CalendarProvider';
import type { FamilyMember } from '../types';
import { getMarkedNamedays } from '../components/Widgets/Calendar/utils/namedayState';

export const useFamilyEvents = (familyMembers: FamilyMember[]) => {
  const { formatDate, getNamedayByDate, isSameDay } = useCalendar();
  const [currentInfoIndex, setCurrentInfoIndex] = useState(0);

  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // --- Logika pro svátky ---
  const todayNameday = getNamedayByDate(today);
  const tomorrowNameday = getNamedayByDate(tomorrow);

  const getMarkedNamedayInfo = () => {
    const marked = getMarkedNamedays();
    const todayZero = new Date();
    todayZero.setHours(0, 0, 0, 0);
    const info: { names: string; daysUntil: number; isToday: boolean }[] = [];

    for (const dateStr of marked) {
      const date = new Date(dateStr);
      date.setHours(0, 0, 0, 0);
      const nameday = getNamedayByDate(date);
      if (!nameday) continue;

      const diffTime = date.getTime() - todayZero.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      info.push({
        names: nameday.names.join(', '),
        daysUntil: diffDays,
        isToday: diffDays === 0,
      });
    }
    return info.sort((a, b) => a.daysUntil - b.daysUntil);
  };

  const markedNamedays = getMarkedNamedayInfo();
  const markedToday = markedNamedays.find((m) => m.isToday);
  const upcomingMarked = markedNamedays
    .filter((m) => m.daysUntil > 0)
    .slice(0, 3);

  // --- Logika pro narozeniny ---
  const birthdaysToday = familyMembers.filter(
    (member) => member.birthday && isSameDay(new Date(member.birthday), today)
  );

  // --- Rotující informace v záhlaví ---
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

  // === OPRAVA: PŘIDÁNÍ KOMENTÁŘŮ KE DNI ===
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
  // === KONEC OPRAVY ===

  // Hook vrací připravená data pro zobrazení
  return {
    today,
    formatDate,
    dayComment, // <-- Posíláme dál opravený komentář
    birthdaysToday,
    namedayInfos,
    currentInfoIndex,
    markedToday,
    upcomingMarked,
  };
};
