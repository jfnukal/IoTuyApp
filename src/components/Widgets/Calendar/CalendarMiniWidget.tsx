import React, { useState } from 'react';
import '../../../styles/Calendar.css';
import { useCalendar } from './CalendarProvider';
import CalendarModal from './CalendarModal';
import type { FamilyMember, CalendarEvent } from './types';

type UpcomingEvent = CalendarEvent & { displayDate: Date };

interface CalendarMiniWidgetProps {
  familyMembers?: FamilyMember[];
}

const CalendarMiniWidget: React.FC<CalendarMiniWidgetProps> = ({
  familyMembers = [],
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { getEventsByDate, getHolidayByDate, getNamedayByDate, formatDate } =
    useCalendar();

  const today = new Date();
  const todayEvents = getEventsByDate(today);
  const holiday = getHolidayByDate(today);
  const nameday = getNamedayByDate(today);

  // Získej nejbližší události (následujících 7 dní)
  const getUpcomingEvents = () => {
    const upcoming: UpcomingEvent[] = [];
    for (let i = 1; i <= 7; i++) {
      const date = new Date();
      date.setDate(today.getDate() + i);
      const dayEvents = getEventsByDate(date);
      dayEvents.forEach((event) => {
        upcoming.push({ ...event, displayDate: date });
      });
    }
    return upcoming.slice(0, 3); // Max 3 nadcházející události
  };

  const upcomingEvents = getUpcomingEvents();

  // Získej narozeniny tento měsíc
  const getBirthdaysThisMonth = () => {
    return familyMembers.filter((member) => {
      if (!member.birthday) return false;
      return member.birthday.getMonth() === today.getMonth();
    });
  };

  const birthdaysThisMonth = getBirthdaysThisMonth();

  return (
    <>
      <div
        className="calendar-mini-widget"
        onClick={() => setIsModalOpen(true)}
      >
        {/* Header */}
        <div className="mini-widget-header">
          <div className="widget-title">📅 Kalendář</div>
          <div className="current-date">{formatDate(today, 'FULL')}</div>
        </div>

        {/* Dnešní události */}
        <div className="mini-section">
          <h3 className="mini-section-title">
            Dnes ({formatDate(today, 'DD.MM')})
          </h3>

          {holiday && (
            <div className="mini-event holiday-event">
              <span className="event-icon">🎉</span>
              <span className="event-text">{holiday.name}</span>
            </div>
          )}

          {nameday && (
            <div className="mini-event nameday-event">
              <span className="event-icon">🎂</span>
              <span className="event-text">
                Svátek: {nameday.names.join(', ')}
              </span>
            </div>
          )}

          {todayEvents.length > 0 ? (
            todayEvents.slice(0, 2).map((event) => (
              <div key={event.id} className="mini-event user-event">
                <span className="event-icon">📝</span>
                <div className="event-details">
                  <span className="event-text">{event.title}</span>
                  {event.time && (
                    <span className="event-time">{event.time}</span>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="mini-event no-events">
              <span className="event-icon">✨</span>
              <span className="event-text">Žádné události</span>
            </div>
          )}

          {todayEvents.length > 2 && (
            <div className="mini-event more-events">
              <span className="event-text">
                +{todayEvents.length - 2} dalších událostí
              </span>
            </div>
          )}
        </div>

        {/* Nadcházející události */}
        {upcomingEvents.length > 0 && (
          <div className="mini-section">
            <h3 className="mini-section-title">Nadcházející</h3>
            {upcomingEvents.map((event) => (
              <div
                key={`${event.id}-${event.displayDate}`}
                className="mini-event upcoming-event"
              >
                <span className="event-icon">⏰</span>
                <div className="event-details">
                  <span className="event-text">{event.title}</span>
                  <span className="event-date">
                    {formatDate(event.displayDate, 'DD.MM')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Narozeniny tento měsíc */}
        {birthdaysThisMonth.length > 0 && (
          <div className="mini-section">
            <h3 className="mini-section-title">
              Narozeniny v {formatDate(today, 'MONTH')}
            </h3>
            {birthdaysThisMonth.map((member) => (
              <div key={member.id} className="mini-event birthday-event">
                <span className="event-icon">🎈</span>
                <div className="event-details">
                  <span className="event-text">{member.name}</span>
                  <span className="event-date">
                    {member.birthday?.getDate()}.
                    {(member.birthday?.getMonth() || 0) + 1}.
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Klik pro otevření */}
        <div className="mini-widget-footer">
          <span className="click-hint">👆 Klikněte pro otevření kalendáře</span>
        </div>
      </div>

      {/* Modal s plným kalendářem */}
      {isModalOpen && (
        <CalendarModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          familyMembers={familyMembers}
        />
      )}
    </>
  );
};

export default CalendarMiniWidget;
