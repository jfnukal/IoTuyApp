import React, { useMemo, useCallback, useRef, useEffect } from 'react';
import type { CalendarEvent, FamilyMember } from './types';
import { useCalendar } from './CalendarProvider';
import { markNameday, isNamedayMarked } from 'src/components/Widgets/Calendar/utils/namedayState';

interface MonthViewProps {
  currentDate: Date;
  onDateClick: (date: Date) => void;
  onEventClick: (event: CalendarEvent) => void;
  familyMembers: FamilyMember[];
  onAddEventFor: (date: Date, memberId: string) => void;
}

const MonthView: React.FC<MonthViewProps> = ({
  currentDate,
  onDateClick,
  onEventClick,
  familyMembers,
  onAddEventFor,
}) => {
  const {
    isToday,
    getEventsByDate,
    getHolidayByDate,
    getNamedayByDate,
    formatDate,
  } = useCalendar();

  const [, forceUpdate] = React.useState({});

  const handleNamedayClick = (date: Date, e: React.MouseEvent) => {
    e.stopPropagation();
    const currentlyMarked = isNamedayMarked(date);
    markNameday(date, !currentlyMarked);
    forceUpdate({});
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
      const dayEvents = getEventsByDate(date).filter(
        (event) => event.familyMember === member.id
      );
      return (
        <div className="events-in-cell">
          {dayEvents.map((event) => (
            <div
              key={event.id}
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
          ))}
        </div>
      );
    },
    [getEventsByDate, onEventClick]
  );

  return (
    <div className="month-view new-family-layout">
      {/* Hlavička se jmény členů rodiny */}
      <div className="new-family-header">
        <div className="day-info-header-cell">Den</div>
        {familyMembers.map((member) => (
          <div
            key={member.id}
            className="member-header-cell"
            style={{ color: member.color }}
          >
            {member.icon && <span className="member-icon">{member.icon}</span>}
            <span>{member.name}</span>
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
              member.birthday?.getDate() === date.getDate() &&
              member.birthday?.getMonth() === date.getMonth()
          );

          // Jednodušší klíč pro ref mapu (rok-měsíc-den)
          const dateKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;

          return (
            <div
              key={date.toISOString()}
              className={`day-row ${isToday(date) ? 'today' : ''}`}
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
                <div className={`day-special-events ${nameday && isNamedayMarked(date) ? 'has-marked-nameday' : ''}`}>
                  {/* Zobrazení jmenin a svátků bez prefixu */}
                  {nameday && (
                        <div
                          className={`special-event nameday ${isNamedayMarked(date) ? 'marked' : ''}`}
                          onClick={(e) => handleNamedayClick(date, e)}
                          title={`Svátek: ${nameday.names.join(', ')} - Klikni pro označení`}
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

