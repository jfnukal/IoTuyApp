import React from 'react';
import type { CalendarEvent, FamilyMember } from './types';
import { useCalendar } from './CalendarProvider';

interface WeekViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  onDateClick: (date: Date) => void;
  onEventClick: (event: CalendarEvent) => void;
  familyMembers: FamilyMember[];
}

const WeekView: React.FC<WeekViewProps> = ({
  currentDate,
  events,
  onDateClick,
  onEventClick,
  familyMembers
}) => {
  const { isToday, isSameDay, getEventsByDate } = useCalendar();

  // Získej dny týdnu (pondělí - neděle)
  const getWeekDays = () => {
    const startOfWeek = new Date(currentDate);
    const dayOfWeek = startOfWeek.getDay();
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Pondělí jako první den
    startOfWeek.setDate(startOfWeek.getDate() + diff);
    
    const weekDays: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      weekDays.push(day);
    }
    
    return weekDays;
  };

  // Získej hodiny pro zobrazení (6:00 - 23:00)
  const getHours = () => {
    const hours: string[] = [];
    for (let hour = 6; hour <= 23; hour++) {
      hours.push(`${hour.toString().padStart(2, '0')}:00`);
    }
    return hours;
  };

  const weekDays = getWeekDays();
  const hours = getHours();

  // Získej barvu pro člena rodiny
  const getFamilyMemberColor = (memberId: string) => {
    const member = familyMembers.find(m => m.id === memberId);
    return member?.color || '#667eea';
  };

  // Získej události pro hodinu
  const getEventsForHour = (date: Date, hour: string) => {
    const dayEvents = getEventsByDate(date);
    return dayEvents.filter(event => {
      if (!event.time) return false;
      const eventHour = event.time.split(':')[0];
      return eventHour === hour.split(':')[0];
    });
  };

  // Renderuj událost
  const renderEvent = (event: CalendarEvent) => {
    const color = event.familyMember 
      ? getFamilyMemberColor(event.familyMember)
      : (event.color || '#667eea');
    
    return (
      <div
        key={event.id}
        className="week-event"
        style={{ 
          background: color,
          color: 'white'
        }}
        onClick={(e) => {
          e.stopPropagation();
          onEventClick(event);
        }}
        title={`${event.title}${event.description ? `\n${event.description}` : ''}`}
      >
        <div className="event-time">{event.time}</div>
        <div className="event-title">{event.title}</div>
      </div>
    );
  };

  return (
    <div className="week-view">
      {/* Hlavička s dny */}
      <div className="week-header">
        <div className="time-column"></div>
        {weekDays.map((day) => (
          <div 
            key={day.toISOString()} 
            className={`week-day-header ${isToday(day) ? 'today' : ''}`}
            onClick={() => onDateClick(day)}
          >
            <div className="week-day-name">
              {day.toLocaleDateString('cs-CZ', { weekday: 'short' })}
            </div>
            <div className="week-day-number">
              {day.getDate()}
            </div>
          </div>
        ))}
      </div>

      {/* Mřížka s hodinami */}
      <div className="week-grid">
        {hours.map((hour) => (
          <React.Fragment key={hour}>
            <div className="hour-label">{hour}</div>
            {weekDays.map((day) => {
              const hourEvents = getEventsForHour(day, hour);
              return (
                <div
                  key={`${day.toISOString()}-${hour}`}
                  className="hour-slot"
                  onClick={() => onDateClick(day)}
                >
                  {hourEvents.map(renderEvent)}
                </div>
              );
            })}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

export default WeekView;