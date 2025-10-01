// src/components/Widgets/BusSchedule/BusScheduleWidget.tsx
import React, { useState, useEffect } from 'react';
import { MOCK_BUS_CONNECTIONS } from '../../../api/mhdMockData';
import type { BusConnection } from '../../../api/mhdMockData';
import './BusSchedule.css';

const BusScheduleWidget: React.FC = () => {
  const [selectedKid, setSelectedKid] = useState<'johanka' | 'jarecek'>(
    'johanka'
  );
  const [currentTime, setCurrentTime] = useState(new Date());

  // Aktualizace času každou minutu
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // každou minutu

    return () => clearInterval(timer);
  }, []);

  // Filtruj spoje pro vybrané dítě
  const connections = MOCK_BUS_CONNECTIONS.filter(
    (conn) => conn.kidName === selectedKid
  );

  // Získej dnešní den v týdnu (1=Po, 5=Pá)
  const today = currentTime.getDay() === 0 ? 7 : currentTime.getDay();
  const isWeekday = today >= 1 && today <= 5;

  // Výpočet minuty do odjezdu
  const getMinutesUntilDeparture = (departureTime: string): number => {
    const [hours, minutes] = departureTime.split(':').map(Number);
    const departure = new Date();
    departure.setHours(hours, minutes, 0, 0);

    const now = new Date();
    const diff = departure.getTime() - now.getTime();
    return Math.floor(diff / 60000);
  };

  // Najdi nejbližší spoj (dnes nebo zítra)
  const getNextConnection = (): {
    connection: BusConnection;
    isTomorrow: boolean;
  } | null => {
    if (!isWeekday && today !== 5) return null; // Víkend (kromě pátku)

    const now = currentTime.getHours() * 60 + currentTime.getMinutes();

    // Hledej dnešní spoj
    for (const conn of connections) {
      const [hours, minutes] = conn.departure.split(':').map(Number);
      const departureMinutes = hours * 60 + minutes;

      if (departureMinutes > now) {
        return { connection: conn, isTomorrow: false };
      }
    }

    // Žádný dnešní spoj - vrať první zítřejší (pokud je dnes Po-Čt)
    if (today >= 1 && today <= 4 && connections.length > 0) {
      return { connection: connections[0], isTomorrow: true };
    }

    return null;
  };

  const nextConnection = getNextConnection();

  // Link na IDOS
  const getIdosLink = (from: string, to: string) => {
    const params = new URLSearchParams({
      f: from,
      t: to,
    });
    return `https://idos.cz/vlakyautobusy/spojeni/?${params.toString()}`;
  };

  return (
    <div className="bus-schedule-widget">
      <div className="bus-header">
        <div className="bus-title">
          <span className="bus-icon">🚌</span>
          <span>Autobus do školy</span>
        </div>

        <div className="bus-kids-tabs">
          <button
            className={`bus-kid-tab ${
              selectedKid === 'johanka' ? 'active' : ''
            }`}
            onClick={() => setSelectedKid('johanka')}
          >
            👧 Johanka
          </button>
          <button
            className={`bus-kid-tab ${
              selectedKid === 'jarecek' ? 'active' : ''
            }`}
            onClick={() => setSelectedKid('jarecek')}
          >
            👦 Jareček
          </button>
        </div>
      </div>

      <div className="bus-content">
        {!isWeekday ? (
          <div className="bus-weekend">
            <div className="weekend-emoji">🏖️</div>
            <div className="weekend-text">O víkendu se nejezdí!</div>
          </div>
        ) : nextConnection ? (
          <>
            {/* Nejbližší spoj */}
            <div className="next-bus-card">
              <div className="next-bus-badge">
                {nextConnection.isTomorrow
                  ? 'Zítřejší autobus'
                  : 'Nejbližší autobus'}
              </div>

              <div className="bus-time-section">
                <div className="bus-departure-time">
                  {nextConnection.isTomorrow ? '🌙 ' : ''}
                  {nextConnection.connection.departure}
                </div>
                <div className="bus-countdown">
                  {nextConnection.isTomorrow
                    ? 'Zítra ráno'
                    : (() => {
                        const mins = getMinutesUntilDeparture(
                          nextConnection.connection.departure
                        );
                        if (mins < 0) return 'Odjel';
                        if (mins === 0) return 'Odjíždí!';
                        if (mins < 5) return `Za ${mins} min! 🏃`;
                        return `Za ${mins} minut`;
                      })()}
                </div>
              </div>

              <div className="bus-route">
                <div className="bus-stop">
                  <div className="stop-icon">📍</div>
                  <div className="stop-name">
                    {nextConnection.connection.from}
                  </div>
                </div>
                <div className="bus-arrow">→</div>
                <div className="bus-stop">
                  <div className="stop-icon">🏫</div>
                  <div className="stop-name">
                    {nextConnection.connection.to}
                  </div>
                </div>
              </div>

              <div className="bus-info">
                <span className="bus-line">
                  Linka {nextConnection.connection.line}
                </span>
                <span className="bus-duration">
                  {nextConnection.connection.duration} min
                </span>
              </div>
            </div>

            {/* Všechny ranní spoje */}
            <div className="all-buses-section">
              <div className="section-title">Ranní spoje</div>
              <div className="buses-list">
                {connections.map((conn) => (
                  <div key={conn.id} className="bus-item">
                    <div className="bus-item-time">{conn.departure}</div>
                    <div className="bus-item-arrow">→</div>
                    <div className="bus-item-arrival">{conn.arrival}</div>
                    <div className="bus-item-line">#{conn.line}</div>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="no-buses">
            <div className="no-buses-emoji">⏰</div>
            <div className="no-buses-text">Dnes už žádné autobusy nejezdí</div>
          </div>
        )}

        {/* Odkaz na IDOS */}

        <div className="idos-link-section">
          <a
            href={getIdosLink(
              connections[0]?.from || 'Brantice',
              connections[0]?.to || 'Zátor'
            )}
            target="_blank"
            rel="noopener noreferrer"
            className="idos-link-btn"
          >
            🔍 Hledat jiné spojení
          </a>
        </div>
      </div>
    </div>
  );
};

export default BusScheduleWidget;
