//scr/components/Widgets/UpcomingEvents/UpcomingEventsWidget.tsx

import React, { useState, useEffect, lazy, Suspense, memo } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { useCalendar } from '../Calendar/CalendarProvider';
import { useWidgetSettings } from '../../../hooks/useWidgetSettings';
import { useDnes } from '../../../hooks/useDnes';

// 🚀 Lazy loading pro CalendarModal - načte se až když uživatel otevře modál
const CalendarModal = lazy(() => import('../Calendar/CalendarModal'));
import type { CalendarEventData, FamilyMember } from '../../../types';
import './UpcomingEventsWidget.css';

interface UpcomingEventsWidgetProps {
  daysAhead?: number; // Volitelně můžeš přepsat nastavení
  maxEvents?: number; // Volitelně můžeš přepsat nastavení
  familyMembers?: FamilyMember[];
  compact?: boolean; // Pro hlavičku - 2 sloupce
}

const UpcomingEventsWidget: React.FC<UpcomingEventsWidgetProps> = ({
  daysAhead,
  maxEvents,
  familyMembers = [],
  compact = false,
}) => {
  const { getEventsByDate, formatDate, isToday } = useCalendar();
  const { currentUser } = useAuth();
  const [newEventsPopupOpen, setNewEventsPopupOpen] = useState(false);
  const { settings } = useWidgetSettings();
  // Po půlnoci přepočítat „Dnes" i bez obnovy stránky a bez změny událostí
  const dnes = useDnes();

  // Načíst ze settings, nebo použít props, nebo fallback hodnoty
  const effectiveDaysAhead =
    daysAhead ?? settings?.widgets?.calendar?.upcomingEventsDays ?? 60;
  const effectiveMaxEvents =
    maxEvents ?? settings?.widgets?.calendar?.maxEvents ?? 8;

  const [upcomingEvents, setUpcomingEvents] = useState<
    Array<CalendarEventData & { displayDate: Date }>
  >([]);
  const [eventToEdit, setEventToEdit] = useState<CalendarEventData | null>(
    null
  );
  const [previewEvent, setPreviewEvent] = useState<CalendarEventData | null>(
    null
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);

  // 🆕 Filtruj nové události (< 24h, ne autor, ne personal)
  const newEvents = upcomingEvents.filter((event) => {
    const now = Date.now();
    const twentyFourHoursAgo = now - 24 * 60 * 60 * 1000;
    const isRecent = event.createdAt > twentyFourHoursAgo;
    const isNotAuthor = event.createdBy !== currentUser?.uid; // TODO: vrátit na event.createdBy !== currentUser?.uid // testy: const isNotAuthor = true; // ostre: const isNotAuthor = event.createdBy !== currentUser?.uid;
    const isNotPersonal = event.type !== 'personal';
    return isRecent && isNotAuthor && isNotPersonal;
  });

  useEffect(() => {
    const loadEvents = () => {
      const today = new Date();
      const events: Array<CalendarEventData & { displayDate: Date }> = [];

      // Načti dnešní události (filtruj typ "personal")
      const todayEvents = getEventsByDate(today);
      todayEvents.forEach((event) => {
        if (event.type !== 'personal') {
          events.push({ ...event, displayDate: today });
        }
      });

      // Načti události pro následujících X dní
      for (let i = 1; i <= effectiveDaysAhead; i++) {
        const date = new Date();
        date.setDate(today.getDate() + i);
        const dayEvents = getEventsByDate(date);
        dayEvents.forEach((event) => {
          // Filtruj typ "personal"
          if (event.type !== 'personal') {
            events.push({ ...event, displayDate: date });
          }
        });
      }

      // Seřaď podle data a omezte na maxEvents
      const sorted = events
        .sort((a, b) => a.displayDate.getTime() - b.displayDate.getTime())
        .slice(0, effectiveMaxEvents);

      // console.log('  - Nalezeno celkem:', events.length);
      // console.log('  - Po seřazení a limitu:', sorted.length);
      // console.log(
      //   '  - Události:',
      //   sorted.map(
      //     (e) => `${e.title} (${e.displayDate.toLocaleDateString('cs')})`
      //   )
      // );

      setUpcomingEvents(sorted);
    };

    loadEvents();
  }, [getEventsByDate, effectiveDaysAhead, effectiveMaxEvents, dnes]);

  // Helper funkce pro získání jmen
  const getAuthorName = (authUid: string | undefined): string => {
    if (!authUid) return 'Neznámý';
    const author = familyMembers.find((m) => m.authUid === authUid);
    return author?.name || 'Neznámý';
  };

  const getMemberName = (memberId: string | undefined): string => {
    if (!memberId) return 'Nepřiřazeno';
    if (memberId === 'all') return 'Celá rodina';
    const member = familyMembers.find((m) => m.id === memberId);
    return member?.name || 'Nepřiřazeno';
  };

  const getRecurringText = (event: CalendarEventData): string | null => {
    if (!event.recurring) return null;
    switch (event.recurring.frequency) {
      case 'daily':
        return 'Opakuje se denně';
      case 'weekly':
        return 'Opakuje se týdně';
      case 'biweekly':
        return 'Opakuje se každé 2 týdny';
      case 'monthly':
        return 'Opakuje se měsíčně';
      case 'yearly':
        return 'Opakuje se ročně';
      case 'custom':
        return 'Vlastní opakování';
      default:
        return null;
    }
  };

  // Ikony podle typu události - s podporou vlastní ikony
  const getEventIcon = (event: CalendarEventData) => {
    // Pokud má událost vlastní ikonu, použij ji
    if (event.icon) {
      return event.icon;
    }

    // Jinak fallback podle typu
    switch (event.type) {
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
        className={`upcoming-events-widget ${
          previewEvent ? 'preview-open' : ''
        }`}
        onClick={() => setIsModalOpen(true)}
      >
        {/* Header */}
        <div className="widget-header">
          <h3 className="widget-title">🗓️ Co nás čeká?</h3>
          <div className="widget-controls">
            <span className="event-count">
              {upcomingEvents.length} událostí
            </span>
            {newEvents.length > 0 && (
              <button
                className="new-events-badge"
                onClick={(e) => {
                  e.stopPropagation();
                  setNewEventsPopupOpen(!newEventsPopupOpen);
                }}
              >
                🆕 {newEvents.length} {newEvents.length === 1 ? 'nová' : 'nové'}
              </button>
            )}
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
                  <div
                    className={`today-events-grid ${
                      todayEvents.length === 1 ? 'single-event' : ''
                    }`}
                  >
                    {todayEvents.slice(0, 6).map((event) => (
                      <div
                        key={event.id}
                        className="event-card today-event"
                        style={{
                          background: getEventColor(event.type),
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setPreviewEvent(event);
                        }}
                      >
                        <div className="event-icon">{getEventIcon(event)}</div>
                        <div className="event-details">
                          <h5 className="event-title">{event.title}</h5>
                          {event.time && (
                            <span className="event-time">⏰ {event.time}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Nadcházející události */}
              {isExpanded &&
                upcomingEvents.filter((e) => !isToday(e.displayDate)).length >
                  0 && (
                  <div
                    className={`upcoming-section ${
                      compact ? 'compact-mode' : ''
                    }`}
                  >
                    <h4 className="section-title">📜 Brzy</h4>
                    <div
                      className={`events-list ${compact ? 'two-columns' : ''}`}
                    >
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
                            onClick={(e) => {
                              e.stopPropagation();
                              setPreviewEvent(event);
                            }}
                          >
                            <div className="event-icon">
                              {getEventIcon(event)}
                            </div>
                            <div className="event-details">
                              <h5 className="event-title">{event.title}</h5>
                              <span className="event-date">
                                {formatDate(event.displayDate, 'DD.MM')} -{' '}
                                {formatDate(event.displayDate, 'WEEKDAY')}
                              </span>
                              {event.time && (
                                <span className="event-time">
                                  ⏰ {event.time}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
            </>
          )}
        </div>

        {/* 🆕 Popup s novými událostmi */}
        {newEventsPopupOpen && newEvents.length > 0 && (
          <div
            className="new-events-popup"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="new-events-popup-header">
              <h4>🆕 Nové události</h4>
              <button
                className="popup-close-btn"
                onClick={() => setNewEventsPopupOpen(false)}
              >
                ✕
              </button>
            </div>
            <div className="new-events-popup-list">
              {newEvents.map((event) => (
                <div
                  key={event.id}
                  className="new-event-item"
                  onClick={() => {
                    setNewEventsPopupOpen(false);
                    setPreviewEvent(event);
                  }}
                >
                  <span className="new-event-icon">{getEventIcon(event)}</span>
                  <div className="new-event-details">
                    <span className="new-event-title">{event.title}</span>
                    <span className="new-event-date">
                      {formatDate(event.displayDate, 'DD.MM')}{' '}
                      {event.time && `v ${event.time}`}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Click Hint */}
        <div className="click-hint-events">
          <span>👆 Klikni pro celý kalendář</span>
        </div>
      </div>

      {/* 🔍 Náhled události */}
      {previewEvent && (
        <>
          <div
            className="event-preview-overlay"
            onClick={(e) => {
              e.stopPropagation();
              setPreviewEvent(null);
            }}
          />
          <div
            className="event-preview-popup"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="event-preview-header">
              <span className="preview-icon">{getEventIcon(previewEvent)}</span>
              <h4 className="preview-title">{previewEvent.title}</h4>
              <button
                className="popup-close-btn"
                onClick={() => setPreviewEvent(null)}
              >
                ✕
              </button>
            </div>

            <div className="event-preview-content">
              {/* Datum */}
              <div className="preview-row">
                <span className="preview-label">📅 Datum:</span>
                <span className="preview-value">
                  {formatDate(
                    new Date(previewEvent.date + 'T00:00:00'),
                    'DD.MM.YYYY'
                  )}
                </span>
              </div>

              {/* Vícedenní událost */}
              {(() => {
                if (!previewEvent.endDate) return null;
                if (typeof previewEvent.endDate !== 'string') return null;
                if (previewEvent.endDate === previewEvent.date) return null;

                const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
                if (!dateRegex.test(previewEvent.endDate)) return null;

                const endDateObj = new Date(previewEvent.endDate + 'T00:00:00');
                if (isNaN(endDateObj.getTime())) return null;

                return (
                  <div className="preview-row">
                    <span className="preview-label">📆 Do:</span>
                    <span className="preview-value">
                      {formatDate(endDateObj, 'DD.MM.YYYY')}
                    </span>
                  </div>
                );
              })()}

              {/* Čas */}
              {previewEvent.time && (
                <div className="preview-row">
                  <span className="preview-label">⏰ Čas:</span>
                  <span className="preview-value">
                    {previewEvent.time}
                    {previewEvent.endTime && ` – ${previewEvent.endTime}`}
                  </span>
                </div>
              )}

              {/* Pro koho */}
              <div className="preview-row">
                <span className="preview-label">👤 Pro:</span>
                <span className="preview-value">
                  {getMemberName(previewEvent.familyMemberId)}
                </span>
              </div>

              {/* Vytvořil */}
              <div className="preview-row">
                <span className="preview-label">✍️ Vytvořil:</span>
                <span className="preview-value">
                  {getAuthorName(previewEvent.createdBy)}
                </span>
              </div>

              {/* Opakování */}
              {getRecurringText(previewEvent) && (
                <div className="preview-row">
                  <span className="preview-label">🔄 Opakování:</span>
                  <span className="preview-value">
                    {getRecurringText(previewEvent)}
                  </span>
                </div>
              )}

              {/* Popis */}
              {previewEvent.description && (
                <div className="preview-row preview-description">
                  <span className="preview-label">📝 Poznámka:</span>
                  <span className="preview-value">
                    {previewEvent.description}
                  </span>
                </div>
              )}
            </div>

            <div className="event-preview-actions">
              <button
                className="preview-edit-btn"
                onClick={() => {
                  setPreviewEvent(null);
                  setEventToEdit(previewEvent);
                  setIsModalOpen(true);
                }}
              >
                ✏️ Upravit
              </button>
            </div>
          </div>
        </>
      )}

      {/* Modal s kalendářem */}
      {isModalOpen && (
        <Suspense
          fallback={
            <div
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(0, 0, 0, 0.8)',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                zIndex: 1000,
                color: 'white',
                fontSize: '2rem',
              }}
            >
              📅 Načítám kalendář...
            </div>
          }
        >
          <CalendarModal
            isOpen={isModalOpen}
            onClose={() => {
              setIsModalOpen(false);
              setEventToEdit(null);
            }}
            familyMembers={familyMembers}
            initialEventToEdit={eventToEdit}
          />
        </Suspense>
      )}
    </>
  );
};

// 🚀 React.memo - widget se překreslí POUZE když se změní props (daysAhead, maxEvents, familyMembers, compact)
// UpcomingEventsWidget má hodně animací a karet, takže optimalizace zrychlí celý dashboard
export default memo(UpcomingEventsWidget);
