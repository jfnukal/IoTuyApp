import React, { useState, useEffect } from 'react';
import { useCalendar } from '../Widgets/Calendar/CalendarProvider';
import type { FamilyMember } from '../Widgets/Calendar/types';
import { getMarkedNamedays } from '../Widgets/Calendar/utils/namedayState';
import './styles/HeaderInfo.css';

interface HeaderInfoProps {
  familyMembers: FamilyMember[];
}

const HeaderInfo: React.FC<HeaderInfoProps> = ({ 
  familyMembers
}) => {
  const {
    formatDate,
    getNamedayByDate,
    isSameDay,
  } = useCalendar();

  const [currentInfoIndex, setCurrentInfoIndex] = useState(0);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const todayNameday = getNamedayByDate(today);
  const tomorrowNameday = getNamedayByDate(tomorrow);

  // Najdi narozeniny dnes
  const birthdaysToday = familyMembers.filter(
    (member) => member.birthday && isSameDay(member.birthday, today)
  );

  // Získej zakroužkované jmeniny
  const getMarkedNamedayInfo = () => {
    const marked = getMarkedNamedays();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const info: { date: Date; names: string; daysUntil: number; isToday: boolean }[] = [];
    
    for (const dateStr of marked) {
      const date = new Date(dateStr);
      date.setHours(0, 0, 0, 0);
      const nameday = getNamedayByDate(date);
      if (!nameday) continue;
      
      const diffTime = date.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      info.push({
        date,
        names: nameday.names.join(', '),
        daysUntil: diffDays,
        isToday: diffDays === 0
      });
    }
    
    return info.sort((a, b) => a.daysUntil - b.daysUntil);
  };

  const markedNamedays = getMarkedNamedayInfo();
  const markedToday = markedNamedays.find(m => m.isToday);
  const upcomingMarked = markedNamedays.filter(m => m.daysUntil > 0).slice(0, 3);

  // Rotace: Dnes, Zítra, Nejbližší zakroužkované
  const namedayInfos = [
    todayNameday ? `Dneska má svátek ${todayNameday.names.join(', ')}` : null,
    tomorrowNameday ? `Zítra má svátek ${tomorrowNameday.names.join(', ')}` : null,
    upcomingMarked.length > 0 && upcomingMarked[0].daysUntil <= 14
      ? `Za ${upcomingMarked[0].daysUntil} ${upcomingMarked[0].daysUntil === 1 ? 'den' : 'dny'}: ${upcomingMarked[0].names}`
      : null,
  ].filter(Boolean);

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

  return (
    <div className="header-info">
      {/* Uvítání */}
      <div className="welcome-section">
        <h2 className="welcome-title">🏠 Ahoj rodino!</h2>
        <p className="date-info">
          Dnes je <strong>{formatDate(today, 'WEEKDAY')}</strong>{' '}
          {formatDate(today, 'DD.MM.YYYY')}
        </p>
        <p className="day-comment">{dayComments[weekday] || '✨'}</p>
      </div>

      {/* Jmeniny a upozornění */}
      <div className="nameday-row">
        {namedayInfos.length > 0 && (
          <div className="nameday-text animated" key={currentInfoIndex}>
            💐 {namedayInfos[currentInfoIndex]}
          </div>
        )}
        
        {markedToday && (
          <div className="nameday-alert">
            ⚠️ Bacha, jednoho známe!
          </div>
        )}
      </div>

      {/* Narozeniny */}
      {birthdaysToday.length > 0 && (
        <div className="birthday-section">
          <div className="birthday-alert">
            🎈 A bacha!!! Dnes má narozeniny:{' '}
            <strong>{birthdaysToday.map((m) => m.name).join(', ')}</strong>! 🎂
          </div>
        </div>
      )}

      {/* Nadcházející svátky */}
      {upcomingMarked.length > 1 && (
        <div className="upcoming-tip">
          💡 Tip: Blíží se svátky {upcomingMarked.slice(1).map(m => m.names).join(', ')}
        </div>
      )}
    </div>
  );
};

export default HeaderInfo;