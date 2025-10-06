import React, { useState, useEffect } from 'react';
import { findConnection } from '@/api/transportation';
import type { TransportConnection } from '@/api/transportation';
import './BusSchedule.css';

const KID_ROUTES = {
  johanka: { from: 'Brantice', to: 'Zátor, škola' },
  jarecek: { from: 'Krnov, aut.st.', to: 'Bruntál, aut.st.' },
};

const BusScheduleWidget: React.FC = () => {
  const [selectedKid, setSelectedKid] = useState<'johanka' | 'jarecek'>(
    'johanka'
  );
  const [connection, setConnection] = useState<TransportConnection | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadConnection = async () => {
      setIsLoading(true);
      setError(null);
      setConnection(null);
      const route = KID_ROUTES[selectedKid];
      try {
        const result = await findConnection(route.from, route.to);
        setConnection(result);
      } catch (err) {
        console.error(err);
        setError('Nepodařilo se najít žádný spoj.');
      } finally {
        setIsLoading(false);
      }
    };
    loadConnection();
  }, [selectedKid]);

  const getMinutesUntilDeparture = (departureTime: string): number => {
    const [hours, minutes] = departureTime.split(':').map(Number);
    const departure = new Date();
    departure.setHours(hours, minutes, 0, 0);
    const now = new Date();
    const diff = departure.getTime() - now.getTime();
    return Math.floor(diff / 60000);
  };

  const getIdosLink = (from: string, to: string) => {
    const params = new URLSearchParams({ f: from, t: to });
    return `https://idos.idnes.cz/vlakyautobusy/spojeni/?${params.toString()}`;
  };

  const currentRoute = KID_ROUTES[selectedKid];

  return (
    <div className="bus-schedule-widget">
      <div className="bus-header">
        <div className="bus-title">
          <span className="bus-icon">🚌</span>
          <span>Nejbližší spoj</span>
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
        {isLoading ? (
          <div className="bus-loading">⏳ Hledám spojení...</div>
        ) : error ? (
          <div className="bus-error">⚠️ {error}</div>
        ) : connection ? (
          <>
            <div className="next-bus-card">
              <div className="next-bus-badge">Nejbližší spoj</div>
              <div className="bus-time-section">
                <div className="bus-departure-time">
                  {connection.departureTime}
                </div>
                <div className="bus-countdown">
                  {(() => {
                    const mins = getMinutesUntilDeparture(
                      connection.departureTime
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
                  <div className="stop-name">{currentRoute.from}</div>
                </div>
                <div className="bus-arrow">→</div>
                <div className="bus-stop">
                  <div className="stop-icon">🏫</div>
                  <div className="stop-name">{currentRoute.to}</div>
                </div>
              </div>
              <div className="bus-info">
                <span className="bus-line">Linka {connection.line}</span>
              </div>
            </div>
          </>
        ) : null}
        <div className="idos-link-section">
          <a
            href={getIdosLink(currentRoute.from, currentRoute.to)}
            target="_blank"
            rel="noopener noreferrer"
            className="idos-link-btn"
          >
            🔍 Hledat jiné spojení na IDOS.cz
          </a>
        </div>
      </div>
    </div>
  );
};

export default BusScheduleWidget;
