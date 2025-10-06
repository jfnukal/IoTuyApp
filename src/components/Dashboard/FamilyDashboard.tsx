// src/components/Dashboard/FamilyDashboard.tsx
import React from 'react';
import WeatherMiniWidget from '../Widgets/Weather/WeatherMiniWidget';
import StickyNotesWidget from '../Widgets/StickyNotes/StickyNotesWidget';
import SchoolScheduleWidget from '../Widgets/SchoolSchedule/SchoolScheduleWidget';
import BusScheduleWidget from '../Widgets/SchoolSchedule/BusScheduleWidget';
import UpcomingEventsWidget from '../Widgets/UpcomingEvents/UpcomingEventsWidget';
import type { FamilyMember } from '../Widgets/Calendar/types';
import './styles/FamilyDashboard.css';
import MessageHistoryWidget from '../Notifications/MessageHistoryWidget';

interface FamilyDashboardProps {
  selectedMember: string | null;
  onClearFilter: () => void;
  familyMembers: FamilyMember[];
}

const FamilyDashboard: React.FC<FamilyDashboardProps> = ({ 
  selectedMember, 
  onClearFilter,
  familyMembers
}) => {
  return (
    <div className="family-dashboard">
      <div className="widgets-grid">
        {/* Počasí Widget - HOTOVÝ */}
        <div className="widget-container weather-container">
          <WeatherMiniWidget isVisible={true} />
        </div>

              {/* Nadcházející události Widget - NOVÝ */}
              <div className="widget-container upcoming-events-container">
                    <UpcomingEventsWidget familyMembers={familyMembers} />
                  </div>
                  

        {/* Sticky Notes Widget - NOVÝ */}
        <div className="widget-container stickynotes-container">
          <StickyNotesWidget selectedMember={selectedMember} />
        </div>

        {/* Školní rozvrh Widget - NOVÝ (placeholder) */}
        <div className="widget-container schedule-container">
          <SchoolScheduleWidget />
        </div>

        <div className="widget-card">
            <BusScheduleWidget />
          </div>

      {/* Message History Widget - NOVÝ */}
      <div className="widget-container messages-container">
          <MessageHistoryWidget />
        </div>

        {/* Placeholder pro budoucí widgety */}
        <div className="widget-container add-widget-container">
          <div className="add-widget-placeholder">
            <div className="add-widget-icon">➕</div>
            <div className="add-widget-text">Přidat widget</div>
            <p className="add-widget-hint">Brzy dostupné...</p>
          </div>
        </div>
      </div>

      {/* Info panel když je vybrán člen rodiny */}
      {selectedMember && (
        <div className="member-info-panel">
          <p className="member-info-text">
            📊 Zobrazuji aktivitu pro: <strong>{selectedMember}</strong>
          </p>
          <button
            className="clear-filter-btn"
            onClick={onClearFilter}
          >
            ✕ Zobrazit vše
          </button>
        </div>
      )}
    </div>
  );
};

export default FamilyDashboard;
