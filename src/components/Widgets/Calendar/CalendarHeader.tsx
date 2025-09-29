import React from 'react';
import type { CalendarView } from './types';

interface CalendarHeaderProps {
  currentDate: Date;
  currentView: CalendarView;
  onDateChange: (date: Date) => void;
  onViewChange: (view: CalendarView) => void;
  onAddEvent: () => void;
  showMiniCalendar?: boolean;
}

const CalendarHeader: React.FC<CalendarHeaderProps> = ({
  currentDate,
  currentView,
  onDateChange,
  onViewChange,
  onAddEvent,
  showMiniCalendar = false,
}) => {
  // Navigace vpřed/vzad
  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);

    switch (currentView) {
      case 'month':
        newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
        break;
      case 'week':
        newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
        break;
      case 'day':
        newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1));
        break;
    }

    onDateChange(newDate);
  };

  // Přejdi na dnešek
  const goToToday = () => {
    onDateChange(new Date());
  };

  // Formátuj titulek podle aktuálního pohledu
  const getTitle = () => {
    const options: Intl.DateTimeFormatOptions = {};

    switch (currentView) {
      case 'month':
        options.month = 'long';
        options.year = 'numeric';
        break;
      case 'week':
        // Pro týden zobrazíme rozsah
        const startOfWeek = new Date(currentDate);
        const dayOfWeek = startOfWeek.getDay();
        const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        startOfWeek.setDate(startOfWeek.getDate() + diff);

        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);

        if (startOfWeek.getMonth() === endOfWeek.getMonth()) {
          return `${startOfWeek.getDate()}.–${endOfWeek.getDate()}. ${startOfWeek.toLocaleDateString(
            'cs-CZ',
            { month: 'long', year: 'numeric' }
          )}`;
        } else {
          return `${startOfWeek.getDate()}. ${startOfWeek.toLocaleDateString(
            'cs-CZ',
            { month: 'short' }
          )} – ${endOfWeek.getDate()}. ${endOfWeek.toLocaleDateString('cs-CZ', {
            month: 'short',
            year: 'numeric',
          })}`;
        }
      case 'day':
        options.weekday = 'long';
        options.day = 'numeric';
        options.month = 'long';
        options.year = 'numeric';
        break;
    }

    return currentDate.toLocaleDateString('cs-CZ', options);
  };

  // Názvy pohledů
  const viewNames = {
    month: 'Měsíc',
    week: 'Týden',
    day: 'Den',
  };

  return (
    <div className="calendar-header">
      <div className="calendar-title-section">
        <h2 className="calendar-title">{getTitle()}</h2>
        {!showMiniCalendar && (
          <div className="calendar-navigation">
            <button
              className="nav-button"
              onClick={() => navigateDate('prev')}
              title="Předchozí"
            >
              ◀
            </button>
            <button
              className="nav-button today-button"
              onClick={goToToday}
              title="Dnes"
            >
              Dnes
            </button>
            <button
              className="nav-button"
              onClick={() => navigateDate('next')}
              title="Další"
            >
              ▶
            </button>
          </div>
        )}
      </div>

      {!showMiniCalendar && (
        <div className="calendar-controls">
          <div className="view-selector">
            {(Object.keys(viewNames) as CalendarView[]).map((view) => (
              <button
                key={view}
                className={`view-button ${
                  currentView === view ? 'active' : ''
                }`}
                onClick={() => onViewChange(view)}
              >
                {viewNames[view]}
              </button>
            ))}
          </div>

          <button
            className="add-event-button"
            onClick={onAddEvent}
            title="Přidat událost"
          >
            <span>+</span>
            Přidat událost
          </button>
        </div>
      )}
    </div>
  );
};

export default CalendarHeader;
