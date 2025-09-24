import React from 'react';
import type { CalendarEvent, FamilyMember } from './types';
import { useCalendar } from './CalendarProvider';
import MonthView from './MonthView.tsx';
import WeekView from './WeekView.tsx'; // Odkomentujeme
import DayView from './DayView.tsx';   // Odkomentujeme
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

  // Tato funkce se nyní správně používá pro všechny pohledy
  const renderCurrentView = () => {
    switch (currentView) {
      case 'month':
        return (
          <MonthView
            currentDate={currentDate}
            onDateClick={handleDateClick}
            onEventClick={onEditEvent}
            familyMembers={familyMembers}
            onAddEventFor={(date, memberId) => onAddEvent(date, memberId)}
          />
        );
      case 'week':
        return (
          <WeekView
            currentDate={currentDate}
            onDateClick={handleDateClick}
            onEventClick={onEditEvent}
            familyMembers={familyMembers}
          />
        );
      case 'day':
        return (
          <DayView
            currentDate={currentDate}
            onEventClick={onEditEvent}
            familyMembers={familyMembers}
          />
        );
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
      <div className="calendar-content">
        {renderCurrentView()}
      </div>
    </div>
  );
};

export default CalendarWidget;