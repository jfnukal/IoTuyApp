import React, { useState } from 'react';
import './styles/CalendarMini.css';
import { useCalendar } from './CalendarProvider';
import CalendarModal from './CalendarModal';
import type { FamilyMember, CalendarEventData } from '../../../types/index';

type UpcomingEvent = CalendarEventData & { displayDate: Date };

interface CalendarMiniWidgetProps {
  familyMembers?: FamilyMember[];
}

const CalendarMiniWidget: React.FC<CalendarMiniWidgetProps> = ({
  familyMembers = [],
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const { getEventsByDate, getHolidayByDate, getNamedayByDate, formatDate } =
    useCalendar();

  console.log('🚀 CalendarMiniWidget se renderuje!');
  const today = new Date();
  const allTodayEvents = getEventsByDate(today);
  // Filtrujeme připomínky bez příjemců (osobní upozornění)
  const todayEvents = allTodayEvents.filter(
    (event) =>
      event.type !== 'reminder' ||
      (event.reminderRecipients && event.reminderRecipients.length > 0)
  );

  const holiday = getHolidayByDate(today);
  const nameday = getNamedayByDate(today);

  const getUpcomingEvents = () => {
    const upcoming: UpcomingEvent[] = [];
    console.log('🔍 Hledám události od:', today);

    for (let i = 1; i <= 30; i++) {
      const date = new Date();
      date.setDate(today.getDate() + i);
      const dayEvents = getEventsByDate(date);

      console.log(
        `📅 Den ${i} (${date.toLocaleDateString()}):`,
        dayEvents.length,
        'událostí'
      );

      dayEvents.forEach((event) => {
        if (
          event.type !== 'reminder' ||
          (event.reminderRecipients && event.reminderRecipients.length > 0)
        ) {
          upcoming.push({ ...event, displayDate: date });
        }
      });
    }

    console.log('✅ Celkem nalezeno:', upcoming.length, 'událostí');
    console.log('📋 Zobrazuji:', upcoming.slice(0, 6));

    return upcoming.slice(0, 6);
  };

  const upcomingEvents = getUpcomingEvents();
  console.log('🎯 UPCOMING EVENTS RESULT:', upcomingEvents);
  const totalUpcomingEventCount = todayEvents.length + upcomingEvents.length;

  // Získej narozeniny tento měsíc
  const getBirthdaysThisMonth = () => {
    return familyMembers.filter((member) => {
      if (!member.birthday) return false;
      return new Date(member.birthday).getMonth() === today.getMonth();
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
          <div className="widget-title">🗓️ Co nás čeká?</div>

          <div className="mini-widget-controls">
            <div
              className="event-count-badge"
              onClick={(e) => e.stopPropagation()} // Zabráníme otevření modálu i při kliku na počet
            >
              {totalUpcomingEventCount} událostí
            </div>
            <button
              className="mini-widget-toggle-btn"
              onClick={(e) => {
                e.stopPropagation(); // Zabrání otevření modálu při kliku na šipku
                setIsExpanded(!isExpanded);
              }}
              aria-label={isExpanded ? 'Sbalit' : 'Rozbalit'}
            >
              {/* SVG ikona šipky */}
              <svg
                className={`toggle-arrow ${isExpanded ? 'expanded' : ''}`}
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </button>
          </div>
        </div>

        {/* Dnešní události */}
        <div className="mini-section">
          <h3 className="mini-section-title">Dnes</h3>
          {holiday && (
            <div className="mini-event holiday-event">
              <span className="event-icon">🎉</span>
              <span className="event-text">{holiday.name}</span>
            </div>
          )}

          {nameday && (
            <div className="mini-event nameday-event">
              <span className="event-icon">💐</span>
              <span className="event-text">
                Svátek: {nameday.names.join(', ')}
              </span>
            </div>
          )}

          {todayEvents.length > 0 ? (
            <div className="mini-events-grid">
              {todayEvents.slice(0, 4).map((event) => (
                <div key={event.id} className="mini-event user-event compact">
                  <span className="event-icon">📌</span>
                  <div className="event-details">
                    <span className="event-text">{event.title}</span>
                    {event.time && (
                      <span className="event-time">{event.time}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mini-event no-events">
              <span className="event-icon">✨</span>
              <span className="event-text">Žádné události</span>
            </div>
          )}

          {todayEvents.length > 3 && (
            <div className="mini-event more-events">
              <span className="event-text">
                +{todayEvents.length - 3} v kalendáři
              </span>
            </div>
          )}
        </div>

        {isExpanded && (
          <>
            {/* Nadcházející události */}
            {upcomingEvents.length > 0 && (
              <div className="mini-section">
                <h3 className="mini-section-title">Nadcházející</h3>
                {upcomingEvents.slice(0, 2).map((event) => (
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
                {upcomingEvents.length > 2 && (
                  <div className="mini-event more-events">
                    <span className="event-text">
                      +{upcomingEvents.length - 2} v kalendáři
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Narozeniny tento měsíc */}
            {birthdaysThisMonth.length > 0 && (
              <div className="mini-section">
                <h3 className="mini-section-title">
                  Narozeniny v {formatDate(today, 'MONTH')}
                </h3>
                {birthdaysThisMonth.slice(0, 2).map((member) => (
                  <div key={member.id} className="mini-event birthday-event">
                    <span className="event-icon">🎈</span>
                    <div className="event-details">
                      <span className="event-text">{member.name}</span>
                      <span className="event-date">
                        {member.birthday && (
                          <>
                            {new Date(member.birthday).getDate()}.
                            {new Date(member.birthday).getMonth() + 1}.
                          </>
                        )}
                      </span>
                    </div>
                  </div>
                ))}
                {birthdaysThisMonth.length > 2 && (
                  <div className="mini-event more-events">
                    <span className="event-text">
                      +{birthdaysThisMonth.length - 2} v kalendáři
                    </span>
                  </div>
                )}
              </div>
            )}
          </>
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
