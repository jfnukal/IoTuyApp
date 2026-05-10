// src/components/DashboardV2/MorePage.tsx
// Placeholder pro budoucí widgety. Přístupná přes swipe left z /v2 nebo URL /v2/more.

import React from 'react';
import StickyNotesWidget from '../Widgets/StickyNotes/StickyNotesWidget';
import SchoolScheduleWidget from '../Widgets/SchoolSchedule/SchoolScheduleWidget';
import BusScheduleWidget from '../Widgets/SchoolSchedule/BusScheduleWidget';
import GridConfigPanel from './GridConfigPanel';
import './DashboardV2.css';

const MorePage: React.FC = () => {
  return (
    <div className="v2-layout v2-more-layout">

      {/* Jemný hint — přejeď doprava pro návrat */}
      <div className="v2-swipe-hint v2-swipe-hint--right">
        → přejeď doprava pro návrat
      </div>

      <div className="v2-more-content">

        <div className="v2-more-grid">

          <div className="v2-slot v2-slot--sticky">
            <StickyNotesWidget selectedMember={null} />
          </div>

          <div className="v2-slot v2-slot--full-schedule">
            <SchoolScheduleWidget />
          </div>

          <div className="v2-slot v2-slot--bus">
            <BusScheduleWidget />
          </div>

        </div>
      </div>

      <GridConfigPanel />

    </div>
  );
};

export default MorePage;
