import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useCalendar } from './CalendarProvider';
import type { CalendarEventData, FamilyMember } from '../../../types/index';
import RecurringEditDialog, { type RecurringEditAction } from './RecurringEditDialog';
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
    isToday,
  } = useCalendar();

  // State
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEventData | null>(null);
  const [formDate, setFormDate] = useState<Date>(new Date());
  
  // Ref pro scrollování
  const dayRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Dialog pro mazání
  const [deleteDialog, setDeleteDialog] = useState<{
    isOpen: boolean;
    event: CalendarEventData | null;
  }>({
    isOpen: false,
    event: null,
  });

  const theme = getCurrentMonthTheme();

  // Automatický scroll na dnešek (pouze při změně měsíce)
  useEffect(() => {
    setTimeout(() => {
      const todayKey = new Date().toDateString();
      const element = dayRefs.current.get(todayKey);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 300);
  }, [currentDate.getMonth(), currentDate.getFullYear()]);

  // --- OPTIMALIZACE: Výpočet dnů jen při změně data ---
  const days = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysArr: Date[] = [];
    for (let i = 1; i <= daysInMonth; i++) {
      daysArr.push(new Date(year, month, i));
    }
    return daysArr;
  }, [currentDate.getFullYear(), currentDate.getMonth()]);

  // --- HANDLERS ---
  const handleJumpToDate = (date: Date) => {
    if (date.getMonth() !== currentDate.getMonth()) {
      setCurrentDate(date);
    }
    setIsDatePickerOpen(false);
    setTimeout(() => {
      const key = date.toDateString();
      const element = dayRefs.current.get(key);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };

  const handleAddEvent = (date: Date) => {
    setSelectedEvent(null);
    setFormDate(date);
    setIsFormOpen(true);
  };

  const handleEditEvent = (event: CalendarEventData) => {
    setSelectedEvent(event);
    setFormDate(new Date(event.date));
    setIsFormOpen(true);
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
    setCurrentDate(newDate);
  };

  const handleSaveEvent = (eventData: Partial<CalendarEventData>) => {
    if (selectedEvent) {
      updateEvent(selectedEvent.id, eventData);
    } else {
      const finalDate = eventData.date
        ? new Date(eventData.date).toISOString().split('T')[0]
        : formDate.toISOString().split('T')[0];

      const newEventPayload = {
        title: 'Nová událost',
        type: 'personal' as const,
        ...eventData,
        date: finalDate,
      };
      addEvent(newEventPayload);
    }
    setIsFormOpen(false);
  };

  const handleDeleteEvent = (event: CalendarEventData) => {
    if (event.isRecurringInstance || (event.recurring && event.recurring.frequency)) {
      setDeleteDialog({ isOpen: true, event: event });
    } else {
      if (window.confirm(`Opravdu smazat "${event.title}"?`)) {
        deleteEvent(event.id);
        setIsFormOpen(false);
      }
    }
  };

  const handleDeleteDialogSelect = async (action: RecurringEditAction) => {
     const { event } = deleteDialog;
     if (action === 'cancel' || !event) {
       setDeleteDialog({ isOpen: false, event: null });
       return;
     }
     const originalEventId = event.originalEventId || event.id;
     if(action === 'all') deleteEvent(originalEventId);
     setDeleteDialog({ isOpen: false, event: null });
     setIsFormOpen(false);
  };

  // --- RENDERERS ---
  const renderDatePicker = () => {
    if (!isDatePickerOpen) return null;
    const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const startingDayOfWeek = (firstDayOfMonth.getDay() + 6) % 7; 
    const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
    
    const gridDays = [];
    for (let i = 0; i < startingDayOfWeek; i++) gridDays.push(null);
    for (let i = 1; i <= daysInMonth; i++) gridDays.push(new Date(currentDate.getFullYear(), currentDate.getMonth(), i));

    return (
      <div className="mobile-date-picker-overlay" onClick={() => setIsDatePickerOpen(false)}>
        <div className="mobile-date-picker" onClick={e => e.stopPropagation()}>
          <div className="picker-header">
            <button onClick={() => navigateMonth('prev')}>◀</button>
            <span>{formatDate(currentDate, 'MONTH')} {currentDate.getFullYear()}</span>
            <button onClick={() => navigateMonth('next')}>▶</button>
          </div>
          <div className="picker-grid">
            {['Po','Út','St','Čt','Pá','So','Ne'].map(d => <div key={d} className="picker-weekday">{d}</div>)}
            {gridDays.map((date, idx) => {
              if (!date) return <div key={`empty-${idx}`} />;
              const hasEvents = getEventsByDate(date).length > 0;
              const isTodayDate = isToday(date);
              return (
                <div 
                  key={date.toISOString()} 
                  className={`picker-day ${isTodayDate ? 'today' : ''} ${hasEvents ? 'has-events' : ''}`}
                  onClick={() => handleJumpToDate(date)}
                >
                  {date.getDate()}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="calendar-mobile-container">
      {/* HEADER */}
      <div className="mobile-header" style={{ background: theme.backgroundImage }}>
        <div className="mobile-header-content">
          <h2 className="mobile-title" style={{ color: theme.textColor }}>
            {formatDate(currentDate, 'MONTH')} {currentDate.getFullYear()}
          </h2>
          <div className="mobile-actions">
            <button 
              className="action-btn"
              onClick={() => setIsDatePickerOpen(!isDatePickerOpen)}
            >
              📅
            </button>
            <button 
              className="action-btn close-btn" 
              onClick={onClose}
            >
              ✕
            </button>
          </div>
        </div>
      </div>

      {renderDatePicker()}

      {/* SCROLLABLE CONTENT */}
      <div className="mobile-scroll-area">
        <div className="mobile-agenda-list">
          {days.map((date) => {
            const dayEvents = getEventsByDate(date);
            const holiday = getHolidayByDate(date);
            const nameday = getNamedayByDate(date);
            const isWeekend = date.getDay() === 0 || date.getDay() === 6;
            const isTodayDay = isToday(date);
            
            const birthdays = familyMembers.filter(m => 
              m.birthday && 
              new Date(m.birthday).getDate() === date.getDate() && 
              new Date(m.birthday).getMonth() === date.getMonth()
            );

            return (
              <div 
                key={date.toISOString()} 
                className={`agenda-card ${isTodayDay ? 'today' : ''} ${isWeekend ? 'weekend' : ''}`}
                ref={(el) => { if (el) dayRefs.current.set(date.toDateString(), el); }}
              >
                {/* Hlavička karty */}
                <div className="agenda-card-header">
                  <div className="date-badge">
                    <span className="day-name">{formatDate(date, 'WEEKDAY').substring(0, 2)}</span>
                    <span className="day-num">{date.getDate()}</span>
                  </div>
                  
                  <div className="day-info">
                    {holiday && <span className="tag holiday">{holiday.name}</span>}
                    {nameday && <span className="tag nameday">Svátek: {nameday.names[0]}</span>}
                    {birthdays.map(m => (
                      <span key={m.id} className="tag birthday">🎂 {m.name}</span>
                    ))}
                  </div>

                  <button className="add-btn" onClick={() => handleAddEvent(date)}>
                    +
                  </button>
                </div>

                {/* Seznam událostí */}
                <div className="agenda-events">
                  {dayEvents.length > 0 ? (
                    dayEvents.map((event: CalendarEventData) => {
                      const member = familyMembers.find(m => m.id === event.familyMemberId);
                      return (
                        <div 
                          key={event.id} 
                          className="agenda-event"
                          style={{ borderLeftColor: member?.color || event.color || '#ccc' }}
                          onClick={() => handleEditEvent(event)}
                        >
                          <div className="event-time">
                            {event.isAllDay ? 'Celý den' : event.time}
                          </div>
                          <div className="event-content">
                            <div className="event-title">{event.title}</div>
                            {member && <div className="event-member" style={{ color: member.color }}>{member.name}</div>}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="no-events-spacer" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <RecurringEditDialog
        isOpen={deleteDialog.isOpen}
        mode="delete"
        eventTitle={deleteDialog.event?.title || ''}
        instanceDate={deleteDialog.event?.date || ''}
        onSelect={handleDeleteDialogSelect}
      />

      {isFormOpen && (
        <EventForm
          event={selectedEvent}
          date={formDate}
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