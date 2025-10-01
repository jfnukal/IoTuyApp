import React from 'react';
import type { CalendarEvent, FamilyMember } from './types';
import { useCalendar } from './CalendarProvider';
import MonthView from './MonthView.tsx';
import WeekView from './WeekView.tsx';
import DayView from './DayView.tsx';
import CalendarHeader from './CalendarHeader.tsx';
import './styles/CalendarWidget.css';

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
    headerImage,
    setCurrentView,
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

  // getCurrentMonthTheme stále můžeme používat pro barvy atd.
  // const monthTheme = getCurrentMonthTheme();

  return (
    <div
      className="calendar-widget"
      style={{
        backgroundImage:
          headerImage && headerImage.startsWith('http')
            ? `url('${headerImage}')`
            : headerImage || '',
      }}
    >
      <CalendarHeader
        currentDate={currentDate}
        currentView={currentView}
        onDateChange={setCurrentDate}
        onViewChange={setCurrentView}
        onAddEvent={() => onAddEvent(currentDate)}
      />
      <div className="calendar-content">{renderCurrentView()}</div>
    </div>
  );
};

export default CalendarWidget;
