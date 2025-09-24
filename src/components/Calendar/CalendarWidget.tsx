import React from 'react';
import type { CalendarEvent, FamilyMember } from './types';
import { useCalendar } from './CalendarProvider';
import MonthView from './MonthView.tsx';
// import WeekView from './WeekView.tsx';
// import DayView from './DayView.tsx';
import CalendarHeader from './CalendarHeader.tsx';

interface CalendarWidgetProps {
  familyMembers?: FamilyMember[];
  onAddEvent: (date: Date, memberId?: string) => void;
  onEditEvent: (event: CalendarEvent) => void;
}

const CalendarWidget: React.FC<CalendarWidgetProps> = ({
  familyMembers = [],
  onAddEvent,
  onEditEvent,
}) => {
  const {
    currentDate,
    setCurrentDate,
    currentView,
    setCurrentView,
    getCurrentMonthTheme
  } = useCalendar();

  const handleDateClick = (date: Date) => {
    if (currentView !== 'day') {
      setCurrentView('day');
      setCurrentDate(date);
    }
  };

  const renderCurrentView = () => {
    switch (currentView) {
      case 'month':
        return (
          <MonthView
            currentDate={currentDate}
            onDateClick={handleDateClick}
            onEventClick={onEditEvent} // Klik na událost rovnou spustí editaci
            familyMembers={familyMembers}
            onAddEventFor={(date, memberId) => onAddEvent(date, memberId)}
          />
        );
      // WeekView a DayView zde pro jednoduchost vynecháme, princip je stejný
      case 'week':
        return <div>Week View Placeholder</div>;
      case 'day':
        return <div>Day View Placeholder</div>;
      default:
        return null;
    }
  };

  const monthTheme = getCurrentMonthTheme();
  
  return (
    <div className="calendar-widget">
      <div className="calendar-header" style={{ backgroundImage: monthTheme.backgroundImage }}>
        <CalendarHeader
          currentDate={currentDate}
          currentView={currentView}
          onDateChange={setCurrentDate}
          onViewChange={setCurrentView}
          onAddEvent={() => onAddEvent(currentDate)}
          />
          </div>
          <div className="calendar-content"> {/* Tento kontejner se bude rolovat */}
            {renderCurrentView()}
          </div>
        </div>
      );
};

export default CalendarWidget;