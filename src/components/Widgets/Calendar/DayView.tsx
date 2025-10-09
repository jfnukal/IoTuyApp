import React from 'react';
import type { CalendarEventData, FamilyMember } from '../../../types/index';
import { useCalendar } from './CalendarProvider';

interface DayViewProps {
  currentDate: Date;
  onEventClick: (event: CalendarEventData) => void;
  familyMembers: FamilyMember[];
}

const DayView: React.FC<DayViewProps> = ({
  currentDate,
  onEventClick,
  familyMembers,
}) => {
  const { getEventsByDate, getHolidayByDate, getNamedayByDate, formatDate } =
    useCalendar();

  // Získej události pro daný den
  const dayEvents = getEventsByDate(currentDate);
  const holiday = getHolidayByDate(currentDate);
  const nameday = getNamedayByDate(currentDate);

  // Seřaď události podle času
  const sortedEvents = dayEvents.sort((a, b) => {
    if (!a.time && !b.time) return 0;
    if (!a.time) return 1;
    if (!b.time) return -1;
    return a.time.localeCompare(b.time);
  });

  // Rozdělí události podle času a bez času
  const timedEvents = sortedEvents.filter((event) => event.time);
  const allDayEvents = sortedEvents.filter((event) => !event.time);

  // Získej hodiny pro zobrazení
  const getTimeSlots = () => {
    const slots: string[] = [];
    for (let hour = 6; hour <= 23; hour++) {
      slots.push(`${hour.toString().padStart(2, '0')}:00`);
      slots.push(`${hour.toString().padStart(2, '0')}:30`);
    }
    return slots;
  };

  const timeSlots = getTimeSlots();

  // Získej události pro časový slot
  const getEventsForTimeSlot = (timeSlot: string) => {
    return timedEvents.filter((event) => {
      if (!event.time) return false;
      const eventTime = event.time;
      const slotHour = timeSlot.split(':')[0];
      const slotMinute = timeSlot.split(':')[1];
      const eventHour = eventTime.split(':')[0];
      const eventMinute = eventTime.split(':')[1];

      // Zobraz událost ve slotu, kde začína
      return (
        eventHour === slotHour &&
        Math.abs(parseInt(eventMinute) - parseInt(slotMinute)) < 30
      );
    });
  };

  // Renderuj událost
  const renderEvent = (event: CalendarEventData, isAllDay = false) => {
    const member = familyMembers.find(m => m.id === event.familyMemberId);
    const color = member ? member.color : (event.color || '#667eea');
    const memberName = member ? member.name : null;

    return (
      <div
        key={event.id}
        className={`day-event ${isAllDay ? 'all-day' : ''}`}
        style={{
          background: `linear-gradient(135deg, ${color}, ${color}dd)`,
          borderLeft: `4px solid ${color}`,
        }}
        onClick={() => onEventClick(event)}
      >
        {event.time && !isAllDay && (
          <div className="event-time">
            {event.time}
            {event.endTime && ` - ${event.endTime}`}
          </div>
        )}
        <div className="event-title">{event.title}</div>
        {event.description && (
          <div className="event-description">{event.description}</div>
        )}
        {memberName && <div className="event-member">👤 {memberName}</div>}
        {event.attachments && event.attachments.length > 0 && (
          <div className="event-attachments">
            📎 {event.attachments.length} příloha
            {event.attachments.length > 1 ? 'y' : ''}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="day-view">
      {/* Hlavička dne */}
      <div className="day-view-header">
        <div className="day-view-title">
          {formatDate(currentDate, 'WEEKDAY')}
        </div>
        <div className="day-view-date">{formatDate(currentDate, 'FULL')}</div>

        {/* Speciální události */}
        <div className="day-special-events">
          {holiday && (
            <div className="special-event holiday">🎉 {holiday.name}</div>
          )}
          {nameday && (
            <div className="special-event nameday">
              🎂 Svátek: {nameday.names.join(', ')}
            </div>
          )}
        </div>
      </div>

      {/* Celodenní události */}
      {allDayEvents.length > 0 && (
        <div className="all-day-events">
          <h3 className="section-title">Celodenní události</h3>
          <div className="all-day-events-list">
            {allDayEvents.map((event) => renderEvent(event, true))}
          </div>
        </div>
      )}

      {/* Časový harmonogram */}
      <div className="day-schedule">
        <div className="day-times">
          {timeSlots.map((timeSlot) => (
            <div key={timeSlot} className="time-slot">
              {timeSlot}
            </div>
          ))}
        </div>

        <div className="day-events-column">
          {timeSlots.map((timeSlot) => {
            const slotEvents = getEventsForTimeSlot(timeSlot);
            return (
              <div key={timeSlot} className="time-slot-events">
                {slotEvents.map((event) => renderEvent(event))}
                {slotEvents.length === 0 && timeSlot.endsWith(':00') && (
                  <div className="empty-slot"></div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Shrnutí dne */}
      <div className="day-summary">
        <div className="day-stats">
          <div className="stat-item">
            <span className="stat-number">{dayEvents.length}</span>
            <span className="stat-label">událostí</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">{timedEvents.length}</span>
            <span className="stat-label">s časem</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">{allDayEvents.length}</span>
            <span className="stat-label">celodenních</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DayView;
