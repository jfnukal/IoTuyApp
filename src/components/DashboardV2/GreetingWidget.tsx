// src/components/DashboardV2/GreetingWidget.tsx
import React, { useEffect, useState } from 'react';
import { useFamilyEvents } from '../../hooks/useFamilyEvents';
import { firestoreService } from '../../services/firestoreService';
import type { FamilyMember } from '../../types';
import './GreetingWidget.css';

// Zvýrazní jméno v řetězci "Dnes má svátek Stanislav" → Stanislav tučně
function highlightName(info: string): React.ReactNode {
  const svatekmatch = info.match(/^(.*svátek )(.+)$/);
  if (svatekmatch) {
    return <>{svatekmatch[1]}<strong className="gw-nameday__name">{svatekmatch[2]}</strong></>;
  }
  const colonMatch = info.match(/^(.*: )(.+)$/);
  if (colonMatch) {
    return <>{colonMatch[1]}<strong className="gw-nameday__name">{colonMatch[2]}</strong></>;
  }
  return info;
}

const GreetingWidget: React.FC = () => {
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);

  useEffect(() => {
    let unsub: (() => void) | undefined;
    firestoreService.subscribeToFamilyMembers((members) => {
      setFamilyMembers(members);
    }).then((fn) => { unsub = fn; });
    return () => { unsub?.(); };
  }, []);

  const {
    today,
    formatDate,
    dayComment,
    birthdaysToday,
    namedayInfos,
    currentInfoIndex,
    markedToday,
  } = useFamilyEvents(familyMembers);

  return (
    <div className="gw-root">
      {/* Pozdrav + datum */}
      <div className="gw-greeting">
        <div className="gw-title">🏠 Ahoj rodino!</div>
        <div className="gw-date">
          <span className="gw-weekday">{formatDate(today, 'WEEKDAY')}</span>
          <span className="gw-day">{formatDate(today, 'DD.MM.YYYY')}</span>
        </div>
        <div className="gw-comment">{dayComment}</div>
      </div>

      {/* Svátek — vlastní rámeček */}
      {namedayInfos.length > 0 && (
        <div className="gw-nameday" key={currentInfoIndex}>
          <span className="gw-nameday__icon">💐</span>
          <span className="gw-nameday__text">
            {highlightName(namedayInfos[currentInfoIndex])}
          </span>
        </div>
      )}

      {/* Upozornění "jednoho známe" — samostatný rámeček */}
      {markedToday && (
        <div className="gw-alert">
          ⚠️ Bacha, jednoho známe!
        </div>
      )}

      {/* Narozeniny */}
      {birthdaysToday.length > 0 && (
        <div className="gw-birthday">
          🎈 Dnes má narozeniny:{' '}
          <strong>{birthdaysToday.map((m) => m.name).join(', ')}</strong>! 🎂
        </div>
      )}
    </div>
  );
};

export default GreetingWidget;
