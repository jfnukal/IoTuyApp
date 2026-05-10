// src/components/DashboardV2/CalendarV2.tsx
import React, { useEffect, useState } from 'react';
import UpcomingEventsWidget from '../Widgets/UpcomingEvents/UpcomingEventsWidget';
import { firestoreService } from '../../services/firestoreService';
import type { FamilyMember } from '../../types';

const CalendarV2: React.FC = () => {
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);

  useEffect(() => {
    let unsub: (() => void) | undefined;
    firestoreService.subscribeToFamilyMembers((members) => {
      setFamilyMembers(members);
    }).then((fn) => { unsub = fn; });
    return () => { unsub?.(); };
  }, []);

  return (
    <UpcomingEventsWidget
      familyMembers={familyMembers}
      daysAhead={60}
      maxEvents={8}
      compact={true}
    />
  );
};

export default CalendarV2;
