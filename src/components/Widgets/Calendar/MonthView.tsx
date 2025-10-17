import React, { useMemo, useCallback, useRef, useEffect } from 'react';
import type { CalendarEventData, FamilyMember } from '../../../types/index';
import { useCalendar } from './CalendarProvider';

interface MonthViewProps {
  currentDate: Date;
  onDateClick: (date: Date) => void;
  onEventClick: (event: CalendarEventData) => void;
  onDeleteEvent: (eventId: string) => void;
  familyMembers: FamilyMember[];
  onAddEventFor: (date: Date, memberId: string) => void;
}

const MonthView: React.FC<MonthViewProps> = ({
  currentDate,
  onDateClick,
  onEventClick,
  onDeleteEvent,
  familyMembers,
  onAddEventFor,
}) => {
  const {
    isToday,
    getEventsByDate,
    getBirthdayEventsByDate,
    getHolidayByDate,
    getNamedayByDate,
    formatDate,
    isNamedayMarked,
    markNameday,
  } = useCalendar();

  const handleNamedayClick = (date: Date, e: React.MouseEvent) => {
    e.stopPropagation();
    const currentlyMarked = isNamedayMarked(date);
    markNameday(date, !currentlyMarked);
  };

  // Ref pro ukládání DOM elementů jednotlivých řádků
  const dayRefs = useRef<Map<string, HTMLDivElement | null>>(new Map());
  const hasScrolledRef = useRef(false);

  // Efekt, který scrolluje na dnešní den pouze jednou při prvním načtení
  useEffect(() => {
    // Pokud už jsme scrollovali, nedelej nic
    if (hasScrolledRef.current) return;

    // Počkej, až se komponenta vykreslí
    const timer = setTimeout(() => {
      const today = new Date();
      const todayKey = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;

      const todayElement = dayRefs.current.get(todayKey);

      if (todayElement) {
        todayElement.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
        hasScrolledRef.current = true; // Označ, že už jsme scrollovali
      }
    }, 100); // Malé zpoždění pro jistotu, že DOM je ready

    return () => clearTimeout(timer);
  }, []); // Spustí se pouze jednou při mount

  // Reset scroll flagu při změně měsíce
  useEffect(() => {
    hasScrolledRef.current = false;
  }, [currentDate.getMonth(), currentDate.getFullYear()]);

  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();

    const days: Date[] = [];
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }
    return days;
  }, [currentDate]);

  const renderEventsInCell = useCallback(
    (date: Date, member: FamilyMember) => {
      const allDayEvents = getEventsByDate(date);
      
      // ✅ NOVÉ: Vyfiltruj narozeniny - ty se zobrazí jinde!
      const dayEvents = allDayEvents.filter(
        (event) => 
          event.familyMemberId === member.id && 
          event.type !== 'birthday'  // ← DŮLEŽITÉ!
      );

      if (allDayEvents.length > 0) {
        console.log(
          `[renderEventsInCell] Datum: ${date.toLocaleDateString()}, Člen: ${
            member.name
          }`
        );
        console.log('  Všechny události:', allDayEvents);
        console.log('  Po filtrování:', dayEvents);
        console.log(
          '  FamilyMember IDs:',
          allDayEvents.map((e) => e.familyMemberId)
        );
      }

      return (
        <div className="events-in-cell">
          {dayEvents.map((event) => (
            <div key={event.id} className="event-wrapper">
              <div
                className="family-event-item"
                style={{ backgroundColor: member.color }}
                onClick={(e) => {
                  e.stopPropagation();
                  onEventClick(event);
                }}
                title={event.title}
              >
                {event.title}
              </div>
              <button
                className="quick-delete-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  if (window.confirm(`Opravdu smazat "${event.title}"?`)) {
                    onDeleteEvent(event.id);
                  }
                }}
                title="Smazat událost"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      );
    },
    [getEventsByDate, onEventClick, onDeleteEvent]
  );

  return (
    <div className="month-view new-family-layout">
      {/* Hlavička se jmény členů rodiny */}
      <div className="new-family-header">
        <div className="day-info-header-cell">Den</div>
        {familyMembers.map((member) => (
          <div key={member.id} className="member-header-cell">
            <span style={{ color: member.color || 'var(--calendar-text)' }}>
              {member.icon && (
                <span className="member-icon">{member.icon} </span>
              )}
              {member.name}
            </span>
          </div>
        ))}
      </div>

      {/* Tělo kalendáře, kde každý den je ŘÁDEK */}
      <div className="new-family-body">
        {calendarDays.map((date) => {
          const holiday = getHolidayByDate(date);
          const nameday = getNamedayByDate(date);
          const birthdays = familyMembers.filter(
            (member) =>
              member.birthday &&
              new Date(member.birthday).getDate() === date.getDate() &&
              new Date(member.birthday).getMonth() === date.getMonth()
          );

          // Jednodušší klíč pro ref mapu (rok-měsíc-den)
          const dateKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;

          return (
            <div
              key={date.toISOString()}
              className={`day-row ${isToday(date) ? 'today' : ''} ${
                date.getDay() === 6 || date.getDay() === 0 ? 'is-weekend' : ''
              }`}
              ref={(el) => {
                if (el) {
                  dayRefs.current.set(dateKey, el);
                }
              }}
            >
              <div className="day-info-cell">
                <div className="day-date">
                  <span className="day-number">{date.getDate()}</span>
                  <span className="day-name">
                    {formatDate(date, 'WEEKDAY')}
                  </span>
                </div>
          {/* 🎂 IKONA NAROZENIN V PRAVÉM HORNÍM ROHU */}
          {(() => {
            const birthdayEvents = getBirthdayEventsByDate(date);
            if (birthdayEvents.length === 0) return null;
            
            // Pokud je jen jedna narozenina, otevři rovnou EventForm
            if (birthdayEvents.length === 1) {
              return (
                <div 
                  className="birthday-indicator clickable"
                  title={`${birthdayEvents[0].title} - Klikni pro editaci`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onEventClick(birthdayEvents[0]);
                  }}
                >
                  🎂
                </div>
              );
            }
            
            // Pokud je více narozenin, zobraz popup menu
            return (
              <>
                <div 
                  className="birthday-indicator clickable multiple"
                  title={`${birthdayEvents.length} narozeniny - Klikni pro výběr`}
                  onClick={(e) => {
                    e.stopPropagation();
                    // Najdi wrapper (day-info-cell)
                    const dayCell = e.currentTarget.closest('.day-info-cell');
                    const menu = dayCell?.querySelector('.birthday-menu');
                    menu?.classList.toggle('show-menu');
                  }}
                >
                  🎂
                  <span className="birthday-badge">{birthdayEvents.length}</span>
                </div>
                
                {/* Menu MIMO indicator */}
                <div className="birthday-menu">
                  <div className="birthday-menu-header">
                    Narozeniny tohoto dne:
                  </div>
                  {birthdayEvents.map(event => (
                    <div
                      key={event.id}
                      className="birthday-menu-item"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEventClick(event);
                        e.currentTarget.parentElement?.classList.remove('show-menu');
                      }}
                    >
                      <span className="birthday-menu-icon">🎂</span>
                      <span className="birthday-menu-title">{event.title}</span>
                      <span className="birthday-menu-arrow">→</span>
                    </div>
                  ))}
                </div>
              </>
            );
          })()}
             
                <div
                  className={`day-special-events ${
                    nameday && isNamedayMarked(date) ? 'has-marked-nameday' : ''
                  }`}
                >
                  {/* Zobrazení jmenin a svátků bez prefixu */}
                  {nameday && (
                    <div
                      className={`special-event nameday ${
                        isNamedayMarked(date) ? 'marked' : ''
                      }`}
                      onClick={(e) => handleNamedayClick(date, e)}
                      title={`Svátek: ${nameday.names.join(
                        ', '
                      )} - Klikni pro označení`}
                    >
                      {nameday.name}
                    </div>
                  )}
                {holiday && (
                    <div className="special-event holiday" title={holiday.name}>
                      {holiday.name}
                    </div>
                  )}

                  {birthdays.map((member) => (                  
                    <div
                      key={member.id}
                      className="special-event birthday"
                      title={`Narozeniny: ${member.name}`}
                    >
                      🎈 {member.name}
                    </div>
                  ))}
                </div>
              </div>

              {familyMembers.map((member) => (
                <div
                  key={member.id}
                  className="member-day-cell"
                  onClick={() => onDateClick(date)}
                >
                  {renderEventsInCell(date, member)}
                  <button
                    className="add-event-button-cell"
                    onClick={(e) => {
                      e.stopPropagation();
                      onAddEventFor(date, member.id);
                    }}
                  />
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MonthView;
