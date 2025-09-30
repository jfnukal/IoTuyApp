import React, { useState } from 'react';
import { useCalendar } from './CalendarProvider';
import type { CalendarEvent, FamilyMember } from './types';
import EventForm from './EventForm';
import './styles/CalendarMobile.css'; 

interface CalendarMobileProps {
  familyMembers?: FamilyMember[];
}

const CalendarMobile: React.FC<CalendarMobileProps> = ({ familyMembers = [] }) => {
  const {
    currentDate,
    setCurrentDate,
    getEventsByDate,
    getHolidayByDate,
    getNamedayByDate,
    formatDate,
    addEvent,
    updateEvent,
    deleteEvent,
    getCurrentMonthTheme
  } = useCalendar();

  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  const theme = getCurrentMonthTheme();
  const today = new Date();

  // Získej dny měsíce
  const getDaysInMonth = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = (firstDay.getDay() + 6) % 7; // Pondělí = 0

    const days: (Date | null)[] = [];
    
    // Prázdná místa na začátku
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Dny měsíce
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }
    
    return days;
  };

  const days = getDaysInMonth();

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
  };

  const handleAddEvent = () => {
    setSelectedEvent(null);
    setIsFormOpen(true);
  };

  const handleEditEvent = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setSelectedDate(event.date);
    setIsFormOpen(true);
  };

  const handleSaveEvent = (eventData: Partial<CalendarEvent>) => {
    if (selectedEvent) {
      updateEvent(selectedEvent.id, eventData);
    } else {
      addEvent({
        id: Date.now().toString(),
        title: eventData.title || '',
        date: eventData.date || selectedDate || new Date(),
        type: 'personal',
        ...eventData,
      });
    }
    setIsFormOpen(false);
  };

  const handleDeleteEvent = (eventId: string) => {
    deleteEvent(eventId);
    setIsFormOpen(false);
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
    setCurrentDate(newDate);
  };

  const isToday = (date: Date) => {
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  };

  const selectedDateEvents = selectedDate ? getEventsByDate(selectedDate) : [];
  const selectedHoliday = selectedDate ? getHolidayByDate(selectedDate) : null;
  const selectedNameday = selectedDate ? getNamedayByDate(selectedDate) : null;

  return (
    <div className="calendar-mobile">
      {/* Header */}
      <div className="calendar-mobile-header" style={{ background: theme.backgroundImage }}>
        <div className="mobile-header-controls">
          <button className="mobile-nav-btn" onClick={() => navigateMonth('prev')}>
            ◀
          </button>
          <h2 className="mobile-month-title" style={{ color: theme.textColor }}>
            {formatDate(currentDate, 'MONTH')} {currentDate.getFullYear()}
          </h2>
          <button className="mobile-nav-btn" onClick={() => navigateMonth('next')}>
            ▶
          </button>
        </div>
      </div>

      {/* Kalendářní mřížka */}
      <div className="calendar-mobile-grid">
        {/* Dny v týdnu */}
        <div className="mobile-weekdays">
          {['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne'].map((day) => (
            <div key={day} className="mobile-weekday">{day}</div>
          ))}
        </div>

        {/* Dny měsíce */}
        <div className="mobile-days">
          {days.map((date, index) => {
            if (!date) {
              return <div key={`empty-${index}`} className="mobile-day empty" />;
            }

            const dayEvents = getEventsByDate(date);
            const hasEvents = dayEvents.length > 0;
            const holiday = getHolidayByDate(date);
            const isSelected = selectedDate && 
              date.getDate() === selectedDate.getDate() &&
              date.getMonth() === selectedDate.getMonth();

            return (
              <div
                key={date.toISOString()}
                className={`mobile-day ${isToday(date) ? 'today' : ''} ${isSelected ? 'selected' : ''} ${holiday ? 'holiday' : ''}`}
                onClick={() => handleDateClick(date)}
              >
                <span className="mobile-day-number">{date.getDate()}</span>
                {hasEvents && <div className="mobile-event-dot" />}
              </div>
            );
          })}
        </div>
      </div>

      {/* Detail vybraného dne */}
      {selectedDate && (
        <div className="mobile-day-detail">
          <div className="mobile-detail-header">
            <h3>{formatDate(selectedDate, 'FULL')}</h3>
            <button className="mobile-add-btn" onClick={handleAddEvent}>
              + Přidat
            </button>
          </div>

          {selectedHoliday && (
            <div className="mobile-special-event holiday">
              🎉 {selectedHoliday.name}
            </div>
          )}

          {selectedNameday && (
            <div className="mobile-special-event nameday">
              🎂 Svátek: {selectedNameday.names.join(', ')}
            </div>
          )}

          <div className="mobile-events-list">
            {selectedDateEvents.length > 0 ? (
              selectedDateEvents.map((event) => {
                const member = familyMembers.find(m => m.id === event.familyMember);
                return (
                  <div
                    key={event.id}
                    className="mobile-event-item"
                    style={{ borderLeftColor: member?.color || event.color }}
                    onClick={() => handleEditEvent(event)}
                  >
                    {event.time && <span className="mobile-event-time">{event.time}</span>}
                    <span className="mobile-event-title">{event.title}</span>
                    {member && <span className="mobile-event-member">{member.name}</span>}
                  </div>
                );
              })
            ) : (
              <p className="mobile-no-events">Žádné události</p>
            )}
          </div>
        </div>
      )}

      {/* Formulář */}
      {isFormOpen && (
        <EventForm
          event={selectedEvent}
          date={selectedDate}
          familyMembers={familyMembers}
          onSave={handleSaveEvent}
          onDelete={selectedEvent ? () => handleDeleteEvent(selectedEvent.id) : undefined}
          onClose={() => setIsFormOpen(false)}
        />
      )}
    </div>
  );
};

export default CalendarMobile;