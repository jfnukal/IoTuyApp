// src/components/Widgets/Weather/WeatherModalMobile.tsx
import React from 'react';
import { useWeather } from './hooks/useWeather';
import { WeatherUtils } from './utils/weatherUtils';
import './WeatherModalMobile.css';

interface WeatherModalMobileProps {
  isOpen: boolean;
  onClose: () => void;
}

const WeatherModalMobile: React.FC<WeatherModalMobileProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    isLoading,
    currentWeather,
    primaryLocation,
    settings,
    getPlayfulComment,
    refreshWeather,
    lastUpdate,
  } = useWeather();

  // Získání počasí pro primární lokaci
  const primaryWeather = primaryLocation
    ? currentWeather[primaryLocation.id]
    : null;

  if (!isOpen) return null;

  const condition = primaryWeather
    ? WeatherUtils.getWeatherCondition(primaryWeather.current.conditionCode)
    : null;
  const playfulComment = primaryLocation
    ? getPlayfulComment(primaryLocation.id)
    : '';
  const todayForecast = primaryWeather?.daily[0];
  const tomorrowForecast = primaryWeather?.daily[1];

  const gradient = condition
    ? WeatherUtils.getWeatherGradient(primaryWeather!.current.conditionCode)
    : ['#667eea', '#764ba2'];
  const gradientStyle = `linear-gradient(135deg, ${gradient[0]}, ${gradient[1]})`;

  return (
    <div className="weather-modal-mobile-overlay" onClick={onClose}>
      <div
        className="weather-modal-mobile"
        onClick={(e) => e.stopPropagation()}
        style={{ background: gradientStyle }}
      >
        {/* Zavírací tlačítko */}
        <button className="weather-modal-mobile-close" onClick={onClose}>
          <span className="close-icon-mobile">✕</span>
        </button>

        {/* Header */}
        <div className="weather-mobile-header">
          <h1 className="mobile-title">
            {condition?.emoji || '🌤️'} {primaryLocation?.name}
          </h1>
          {primaryLocation?.isGPS && <span className="gps-mobile">📍 GPS</span>}
        </div>

        {/* Hlavní počasí - jako miniwidget */}
        <div className="mobile-main-weather">
          <div className="mobile-temp-section">
            <span className="mobile-temp">
              {primaryWeather
                ? WeatherUtils.formatTemperature(
                    primaryWeather.current.temperature,
                    settings.temperatureUnit
                  )
                : '--°'}
            </span>
            <div className="mobile-condition">
              <span className="mobile-condition-text">
                {primaryWeather?.current.condition || 'Načítám...'}
              </span>
              <span className="mobile-feels-like">
                Pocitově{' '}
                {primaryWeather
                  ? WeatherUtils.formatTemperature(
                      primaryWeather.current.feelsLike,
                      settings.temperatureUnit
                    )
                  : '--°'}
              </span>
            </div>
          </div>

          <div className="mobile-icon">
            {primaryWeather && (
              <img
                src={primaryWeather.current.iconUrl}
                alt={primaryWeather.current.condition}
                className="mobile-weather-icon"
              />
            )}
          </div>
        </div>

        {/* Dnes vs Zítra */}
        <div className="mobile-forecast-comparison">
          <div className="mobile-day today">
            <span className="mobile-day-label">Dnes</span>
            <div className="mobile-day-temps">
              <span className="mobile-temp-high">
                {todayForecast?.maxTemp}°
              </span>
              <span className="mobile-temp-low">{todayForecast?.minTemp}°</span>
            </div>
            <span className="mobile-rain">
              ☔ {todayForecast?.chanceOfRain}%
            </span>
          </div>

          <div className="mobile-separator"></div>

          <div className="mobile-day tomorrow">
            <span className="mobile-day-label">Zítra</span>
            <div className="mobile-day-temps">
              <span className="mobile-temp-high">
                {tomorrowForecast?.maxTemp}°
              </span>
              <span className="mobile-temp-low">
                {tomorrowForecast?.minTemp}°
              </span>
            </div>
            <span className="mobile-rain">
              ☔ {tomorrowForecast?.chanceOfRain}%
            </span>
          </div>
        </div>

        {/* Hravý komentář */}
        {playfulComment && (
          <div className="mobile-playful-comment">
            <span className="mobile-comment-text">{playfulComment}</span>
          </div>
        )}

        {/* Detailní statistiky */}
        <div className="mobile-stats">
          {primaryWeather && (
            <>
              <div className="mobile-stat">
                <span className="mobile-stat-icon">💨</span>
                <span className="mobile-stat-label">Vítr</span>
                <span className="mobile-stat-value">
                  {WeatherUtils.formatWindSpeed(
                    primaryWeather.current.windSpeed,
                    settings.windUnit
                  )}
                </span>
              </div>

              <div className="mobile-stat">
                <span className="mobile-stat-icon">💧</span>
                <span className="mobile-stat-label">Vlhkost</span>
                <span className="mobile-stat-value">
                  {primaryWeather.current.humidity}%
                </span>
              </div>

              <div className="mobile-stat">
                <span className="mobile-stat-icon">👁️</span>
                <span className="mobile-stat-label">Viditelnost</span>
                <span className="mobile-stat-value">
                  {primaryWeather.current.visibility}km
                </span>
              </div>

              <div className="mobile-stat">
                <span className="mobile-stat-icon">☀️</span>
                <span className="mobile-stat-label">UV Index</span>
                <span className="mobile-stat-value">
                  {primaryWeather.current.uvIndex}
                </span>
              </div>
            </>
          )}
        </div>

        {/* Footer s refresh a last update */}
        <div className="mobile-footer">
          <button
            className="mobile-refresh-btn"
            onClick={refreshWeather}
            disabled={isLoading}
            title="Obnovit počasí"
          >
            {isLoading ? (
              <div
                className="spinner-mini"
                style={{
                  width: '16px',
                  height: '16px',
                  borderWidth: '2px',
                  margin: '0 8px 0 0',
                  display: 'inline-block',
                  verticalAlign: 'middle',
                }}
              ></div>
            ) : (
              <span className="mobile-refresh-icon">🔄</span>
            )}
            Obnovit
          </button>

          {lastUpdate && (
            <span className="mobile-last-updated">
              {WeatherUtils.getRelativeTime(lastUpdate)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default WeatherModalMobile;
