// Soubor: src/components/Dashboard/HeaderInfo.tsx

import React from 'react';
import { useFamilyEvents } from '../../hooks/useFamilyEvents';
import type { FamilyMember } from '../../types';
import './styles/HeaderInfo.css';

interface HeaderInfoProps {
  familyMembers: FamilyMember[];
}

const HeaderInfo: React.FC<HeaderInfoProps> = ({ familyMembers }) => {
  // Zavoláme náš hook a získáme všechna připravená data
  const {
    today,
    formatDate,
    dayComment, // <-- Zde už máme správný komentář pro daný den
    birthdaysToday,
    namedayInfos,
    currentInfoIndex,
    markedToday,
    upcomingMarked,
  } = useFamilyEvents(familyMembers);

  return (
    <div className="header-info">
      {/* Uvítání */}
      <div className="welcome-section">
        <h2 className="welcome-title">🏠 Ahoj rodino!</h2>
        <p className="date-info">
          Dnes je <strong>{formatDate(today, 'WEEKDAY')}</strong>{' '}
          {formatDate(today, 'DD.MM.YYYY')}
        </p>
        <p className="day-comment">{dayComment}</p>
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
            🎈 Dnes má narozeniny:{' '}
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