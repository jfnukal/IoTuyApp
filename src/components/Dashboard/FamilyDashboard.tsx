// src/components/Dashboard/FamilyDashboard.tsx
import React from 'react';
import WeatherMiniWidget from '../Widgets/Weather/WeatherMiniWidget';
import CalendarMiniWidget from '../Widgets/Calendar/CalendarMiniWidget';
import StickyNotesWidget from '../Widgets/StickyNotes/StickyNotesWidget';
import SchoolScheduleWidget from '../Widgets/SchoolSchedule/SchoolScheduleWidget';
import BusScheduleWidget from '../Widgets/BusSchedule/BusScheduleWidget';
import './styles/FamilyDashboard.css';

interface FamilyDashboardProps {
  selectedMember: string | null;
  onClearFilter: () => void;
}

const FamilyDashboard: React.FC<FamilyDashboardProps> = ({ 
  selectedMember, 
  onClearFilter 
}) => {
  return (
    <div className="family-dashboard">
      <div className="widgets-grid">
        {/* Počasí Widget - HOTOVÝ */}
        <div className="widget-container weather-container">
          <WeatherMiniWidget isVisible={true} />
        </div>

        {/* Kalendář Widget - HOTOVÝ */}
        <div className="widget-container calendar-container">
          <CalendarMiniWidget
            familyMembers={[
              { id: '1', name: 'Táta', color: '#4ecdc4', icon: '👨' },
              { id: '2', name: 'Máma', color: '#ff6b6b', icon: '👩' },
              { id: '3', name: 'Jareček', color: '#96ceb4', icon: '👦' },
              { id: '4', name: 'Johanka', color: '#45b7d1', icon: '👧' },
            ]}
          />
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
