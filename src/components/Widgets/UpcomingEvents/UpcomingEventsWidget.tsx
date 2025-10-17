import React, { useState, useEffect } from 'react';
import { useCalendar } from '../Calendar/CalendarProvider';
import CalendarModal from '../Calendar/CalendarModal';
import type { CalendarEventData, FamilyMember } from '../../../types';
import './UpcomingEventsWidget.css';

interface UpcomingEventsWidgetProps {
  daysAhead?: number; // V budoucnu konfigurovatelné
  maxEvents?: number;
  familyMembers?: FamilyMember[];
}

const UpcomingEventsWidget: React.FC<UpcomingEventsWidgetProps> = ({
  daysAhead = 7,
  maxEvents = 5,
  familyMembers = [],
}) => {
  const { getEventsByDate, formatDate, isToday } = useCalendar();
  const [upcomingEvents, setUpcomingEvents] = useState<
    Array<CalendarEventData & { displayDate: Date }>
  >([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true); // Defaultně rozbaleno

  useEffect(() => {
    const loadEvents = () => {
      const today = new Date();
      const events: Array<CalendarEventData & { displayDate: Date }> = [];

      // Načti dnešní události
      const todayEvents = getEventsByDate(today);
      todayEvents.forEach((event) => {
        events.push({ ...event, displayDate: today });
      });

      // Načti události pro následujících X dní
      for (let i = 1; i <= daysAhead; i++) {
        const date = new Date();
        date.setDate(today.getDate() + i);
        const dayEvents = getEventsByDate(date);
        dayEvents.forEach((event) => {
          events.push({ ...event, displayDate: date });
        });
      }

      // Seřaď podle data a omezte na maxEvents
      const sorted = events
        .sort((a, b) => a.displayDate.getTime() - b.displayDate.getTime())
        .slice(0, maxEvents);

      setUpcomingEvents(sorted);
    };

    loadEvents();
  }, [getEventsByDate, daysAhead, maxEvents]);

  // Ikony podle typu události
  const getEventIcon = (type: string) => {
    switch (type) {
      case 'birthday':
        return '🎂';
      case 'holiday':
        return '🎉';
      case 'school':
        return '🎒';
      case 'family':
        return '👨‍👩‍👧‍👦';
      case 'work':
        return '💼';
      case 'personal':
        return '📌';
      default:
        return '📅';
    }
  };

  // Barvy podle typu
  const getEventColor = (type: string) => {
    switch (type) {
      case 'birthday':
        return 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)';
      case 'holiday':
        return 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)';
      case 'school':
        return 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)';
      case 'family':
        return 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)';
      case 'work':
        return 'linear-gradient(135deg, #30cfd0 0%, #330867 100%)';
      default:
        return 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)';
    }
  };

  const todayEvents = upcomingEvents.filter((e) => isToday(e.displayDate));
  const hasTodayEvents = todayEvents.length > 0;

  return (
    <>
      <div
        className="upcoming-events-widget"
        onClick={() => setIsModalOpen(true)}
      >
        {/* Header */}
        <div className="widget-header">
          <h3 className="widget-title">🗓️ Co nás čeká?</h3>
          <div className="widget-controls">
            <span className="event-count">{upcomingEvents.length} událostí</span>
            <button
              className="toggle-button"
              onClick={(e) => {
                e.stopPropagation(); // Zabrání otevření modálu při kliku na šipku
                setIsExpanded(!isExpanded);
              }}
              aria-label={isExpanded ? 'Sbalit' : 'Rozbalit'}
            >
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

        {/* Obsah */}
        <div className="events-container">
          {upcomingEvents.length === 0 ? (
            // Žádné události
            <div className="no-events-message">
              <div className="celebration-icon">🎊</div>
              <h4 className="no-events-title">Hurá!</h4>
              <p className="no-events-text">Dnes nemáme žádný úkol!</p>
              <div className="happy-emoji">😎</div>
            </div>
          ) : (
            <>
              {/* Dnešní události - speciální sekce */}
              {hasTodayEvents && (
                <div className="today-section">
                  <h4 className="section-title">🌟 Dnes</h4>
                  {todayEvents.map((event, index) => (
                    <div
                      key={event.id}
                      className="event-card today-event"
                      style={{
                        background: getEventColor(event.type),
                        animationDelay: `${index * 0.1}s`,
                      }}
                    >
                      <div className="event-icon">
                        {getEventIcon(event.type)}
                      </div>
                      <div className="event-details">
                        <h5 className="event-title">{event.title}</h5>
                        {event.time && (
                          <span className="event-time">⏰ {event.time}</span>
                        )}
                      </div>
                      <div className="event-badge">Dnes!</div>
                    </div>
                  ))}
                </div>
              )}

        {/* Nadcházející události */}
            {isExpanded &&
              upcomingEvents.filter((e) => !isToday(e.displayDate)).length > 0 && (
                <div className="upcoming-section">
                  <h4 className="section-title">🔜 Brzy</h4>
                  {upcomingEvents
                    .filter((e) => !isToday(e.displayDate))
                    .map((event, index) => (
                      <div
                        key={event.id}
                        className="event-card upcoming-event"
                        style={{
                          background: getEventColor(event.type),
                          animationDelay: `${
                            (todayEvents.length + index) * 0.1
                          }s`,
                        }}
                      >
                        <div className="event-icon">
                          {getEventIcon(event.type)}
                        </div>
                        <div className="event-details">
                          <h5 className="event-title">{event.title}</h5>
                          <span className="event-date">
                            {formatDate(event.displayDate, 'DD.MM')} -{' '}
                            {formatDate(event.displayDate, 'WEEKDAY')}
                          </span>
                          {event.time && (
                            <span className="event-time">⏰ {event.time}</span>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Click Hint */}
        <div className="click-hint-events">
          <span>👆 Klikni pro celý kalendář</span>
        </div>
      </div>

      {/* Modal s kalendářem */}
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

export default UpcomingEventsWidget;
