import React, { useState } from 'react';
import { useCalendar } from './CalendarProvider';
import type { CalendarEventData, FamilyMember } from '../../../types/index';
import RecurringEditDialog from './RecurringEditDialog';
import type { RecurringEditAction } from './RecurringEditDialog';
import EventForm from './EventForm';
import './styles/CalendarMobile.css';

interface CalendarMobileProps {
  familyMembers?: FamilyMember[];
  onClose?: () => void;
}

const CalendarMobile: React.FC<CalendarMobileProps> = ({
  familyMembers = [],
  onClose,
}) => {
  const {
    events,
    currentDate,
    setCurrentDate,
    getEventsByDate,
    getHolidayByDate,
    getNamedayByDate,
    formatDate,
    addEvent,
    updateEvent,
    deleteEvent,
    getCurrentMonthTheme,
  } = useCalendar();

  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEventData | null>(
    null
  );

  const [deleteDialog, setDeleteDialog] = useState<{
    isOpen: boolean;
    event: CalendarEventData | null;
  }>({
    isOpen: false,
    event: null,
  });

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

  const handleEditEvent = (event: CalendarEventData) => {
    setSelectedEvent(event);
    setSelectedDate(new Date(event.date));
    setIsFormOpen(true);
  };

  const handleSaveEvent = (eventData: Partial<CalendarEventData>) => {
    if (selectedEvent) {
      // Část pro úpravu události zůstává stejná
      updateEvent(selectedEvent.id, eventData);
    } else {
      // Část pro vytvoření nové události je teď čistší
      const finalDate = eventData.date
        ? new Date(eventData.date).toISOString().split('T')[0]
        : (selectedDate || new Date()).toISOString().split('T')[0];

      const newEventPayload = {
        title: 'Nová událost',
        type: 'personal' as const,
        ...eventData, // Nejprve vložíme data z formuláře
        date: finalDate, // A pak přepíšeme datum za správně naformátované
      };

      addEvent(newEventPayload);
    }
    setIsFormOpen(false);
  };

  // Pomocná funkce pro formátování data
  const formatDateKey = (date: Date): string => {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Rozhodne, zda ukázat dialog nebo smazat rovnou
  const handleDeleteEvent = (event: CalendarEventData) => {
    if (event.isRecurringInstance || (event.recurring && event.recurring.frequency)) {
      // Opakovaná událost - ukázat dialog
      setDeleteDialog({
        isOpen: true,
        event: event,
      });
    } else {
      // Běžná událost - smazat rovnou
      if (window.confirm(`Opravdu smazat "${event.title}"?`)) {
        deleteEvent(event.id);
        setIsFormOpen(false);
      }
    }
  };

  // Zpracování výběru z dialogu
  const handleDeleteDialogSelect = async (action: RecurringEditAction) => {
    const { event } = deleteDialog;

    if (action === 'cancel' || !event) {
      setDeleteDialog({ isOpen: false, event: null });
      return;
    }

    const originalEventId = event.originalEventId || event.id;

    switch (action) {
      case 'this':
        // Přidej toto datum do výjimek
        const originalEvent = await getOriginalEvent(originalEventId);
        if (originalEvent && originalEvent.recurring) {
          const currentExceptions = originalEvent.recurring.exceptions || [];
          await updateEvent(originalEventId, {
            recurring: {
              ...originalEvent.recurring,
              exceptions: [...currentExceptions, event.date],
            },
          });
        }
        break;

      case 'future':
        // Ukonči opakování den PŘED tímto datem
        const origEvent = await getOriginalEvent(originalEventId);
        if (origEvent && origEvent.recurring) {
          const dayBefore = new Date(event.date + 'T00:00:00');
          dayBefore.setDate(dayBefore.getDate() - 1);
          const endDateStr = formatDateKey(dayBefore);

          await updateEvent(originalEventId, {
            recurring: {
              ...origEvent.recurring,
              endType: 'date',
              endDate: endDateStr,
            },
          });
        }
        break;

      case 'all':
        // Smaž celou sérii
        if (window.confirm(`Opravdu smazat VŠECHNY výskyty této události?`)) {
          deleteEvent(originalEventId);
        }
        break;
    }

    setDeleteDialog({ isOpen: false, event: null });
    setIsFormOpen(false);
  };

  // Pomocná funkce pro získání původní události
  const getOriginalEvent = (eventId: string): CalendarEventData | null => {
    return events.find(e => e.id === eventId) || null;
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
    setCurrentDate(newDate);
  };

  const isToday = (date: Date) => {
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const selectedDateEvents = selectedDate ? getEventsByDate(selectedDate) : [];
  const selectedHoliday = selectedDate ? getHolidayByDate(selectedDate) : null;
  const selectedNameday = selectedDate ? getNamedayByDate(selectedDate) : null;

  return (
    <div className="calendar-mobile">
      {/* Header */}
      <div
        className="calendar-mobile-header"
        style={{ background: theme.backgroundImage }}
      >
        <div className="mobile-header-controls">
          <button
            className="mobile-nav-btn"
            onClick={() => navigateMonth('prev')}
          >
            ◀
          </button>
          <h2 className="mobile-month-title" style={{ color: theme.textColor }}>
            {formatDate(currentDate, 'MONTH')} {currentDate.getFullYear()}
          </h2>
          <button
            className="mobile-nav-btn"
            onClick={() => navigateMonth('next')}
          >
            ▶
          </button>
          <button
            className="mobile-close-btn"
            onClick={onClose || (() => window.history.back())}
            aria-label="Zavřít kalendář"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Kalendářní mřížka */}
      <div className="calendar-mobile-grid">
        <div className="mobile-weekdays">
          {['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne'].map((day) => (
            <div key={day} className="mobile-weekday">
              {day}
            </div>
          ))}
        </div>
        <div className="mobile-days">
          {days.map((date, index) => {
            if (!date) {
              return (
                <div key={`empty-${index}`} className="mobile-day empty" />
              );
            }
            const dayEvents = getEventsByDate(date);
            const hasEvents = dayEvents.length > 0;
            const holiday = getHolidayByDate(date);
            const isSelected =
              selectedDate &&
              date.getDate() === selectedDate.getDate() &&
              date.getMonth() === selectedDate.getMonth();
            return (
              <div
                key={date.toISOString()}
                className={`mobile-day ${isToday(date) ? 'today' : ''} ${
                  isSelected ? 'selected' : ''
                } ${holiday ? 'holiday' : ''} ${hasEvents ? 'has-events' : ''}`}
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
          {/* ✅ PŘIDÁNO: Narozeniny */}
          {selectedDate &&
            (() => {
              const birthdaysToday = familyMembers.filter(
                (member) =>
                  member.birthday &&
                  new Date(member.birthday).getDate() ===
                    selectedDate.getDate() &&
                  new Date(member.birthday).getMonth() ===
                    selectedDate.getMonth()
              );
              return birthdaysToday.map((member) => (
                <div key={member.id} className="mobile-special-event birthday">
                  🎈 Narozeniny: {member.name}
                </div>
              ));
            })()}
          <div className="mobile-events-list">
            {selectedDateEvents.length > 0 ? (
              selectedDateEvents.map((event) => {
                const member = familyMembers.find(
                  (m) => m.id === event.familyMemberId
                );
                return (
                  <div
                    key={event.id}
                    className="mobile-event-item"
                    style={{ borderLeftColor: member?.color || event.color }}
                    onClick={() => handleEditEvent(event)}
                  >
                    {event.time && (
                      <span className="mobile-event-time">{event.time}</span>
                    )}
                    <span className="mobile-event-title">{event.title}</span>
                    {member && (
                      <span className="mobile-event-member">{member.name}</span>
                    )}
                  </div>
                );
              })
            ) : (
              <p className="mobile-no-events">Žádné události</p>
            )}
          </div>
        </div>
      )}

      {/* Dialog pro mazání opakovaných událostí */}
      <RecurringEditDialog
        isOpen={deleteDialog.isOpen}
        mode="delete"
        eventTitle={deleteDialog.event?.title || ''}
        instanceDate={deleteDialog.event?.date || ''}
        onSelect={handleDeleteDialogSelect}
      />

      {/* Formulář */}
      {isFormOpen && (
        <EventForm
          event={selectedEvent}
          date={selectedDate}
          familyMembers={familyMembers}
          onSave={handleSaveEvent}
          onDelete={selectedEvent ? () => handleDeleteEvent(selectedEvent) : undefined}
          onClose={() => setIsFormOpen(false)}
        />
      )}
    </div>
  );
};

export default CalendarMobile;
