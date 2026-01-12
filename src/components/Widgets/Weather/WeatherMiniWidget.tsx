// src/components/Widgets/Weather/WeatherMiniWidget.tsx
import React, { useState, useEffect, lazy, Suspense, memo } from 'react';
import { useWeather } from './hooks/useWeather';
import { WeatherUtils } from './utils/weatherUtils';
import { fetchImageForQuery } from '../../../api/unsplash';
import './WeatherMiniWidget.css';

// 🚀 Lazy loading pro modály - načtou se až když uživatel otevře detail počasí
const WeatherModal = lazy(() => import('./WeatherModal'));
const WeatherModalMobile = lazy(() => import('./WeatherModalMobile'));
import { createPortal } from 'react-dom';

interface WeatherMiniWidgetProps {
  className?: string;
  onExpand?: () => void;
  isVisible?: boolean;
  headerMode?: boolean; // 🆕 Režim pro hlavičku
  compactMode?: boolean;
}

const WeatherMiniWidget: React.FC<WeatherMiniWidgetProps> = ({
  className = '',
  onExpand,
  isVisible = true,
  headerMode = false,
  compactMode = false,
}) => {
  const {
    isLoading,
    error,
    currentWeather,
    primaryLocation,
    settings,
    getPlayfulComment,
    refreshWeather,
    lastUpdate,
  } = useWeather();

  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  // Sledování změn velikosti okna
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Získání počasí pro primární lokaci
  const primaryWeather = primaryLocation
    ? currentWeather[primaryLocation.id]
    : null;

  // Načtení background image podle počasí
  useEffect(() => {
    if (primaryWeather && settings.backgroundEffects) {
      const loadBackgroundImage = async () => {
        try {
          const condition = WeatherUtils.getWeatherCondition(
            primaryWeather.current.conditionCode
          );
          let searchQuery = '';

          // Mapování počasí na vhodné obrázky
          switch (condition.animation) {
            case 'sun':
              searchQuery = 'sunny day nature blue sky';
              break;
            case 'rain':
              searchQuery = 'rain drops window cozy';
              break;
            case 'snow':
              searchQuery = 'snow winter landscape';
              break;
            case 'storm':
              searchQuery = 'storm clouds dramatic sky';
              break;
            case 'fog':
              searchQuery = 'fog misty morning nature';
              break;
            default:
              searchQuery = 'cloudy sky nature peaceful';
          }

          const imageUrl = await fetchImageForQuery(searchQuery);
          setBackgroundImage(imageUrl);
        } catch (error) {
          console.error('Error loading background image:', error);
        }
      };

      loadBackgroundImage();
    }
  }, [primaryWeather?.current.conditionCode, settings.backgroundEffects]);

  // Pokud není widget povolen nebo viditelný
  if (!settings.isEnabled || !isVisible) {
    return null;
  }

  const handleClick = () => {
    setShowModal(true);
    onExpand?.();
  };

  const handleRefresh = (e: React.MouseEvent) => {
    e.stopPropagation();
    refreshWeather();
  };

  if (isLoading && !primaryWeather) {
    return (
      <div className={`weather-mini-widget weather-skeleton ${className}`}>
        <div className="weather-mini-header">
          <h3 className="widget-title">🌤️ Počasí</h3>
          <div className="skeleton-location"></div>
        </div>
        <div className="skeleton-content">
          <div className="skeleton-temp"></div>
          <div className="skeleton-icon"></div>
        </div>
        <div className="skeleton-forecast">
          <div className="skeleton-day"></div>
          <div className="skeleton-day"></div>
        </div>
      </div>
    );
  }

  if (error || !primaryWeather) {
    return (
      <div className={`weather-mini-widget weather-error ${className}`}>
        <div className="weather-mini-header">
          <h3 className="widget-title">🌤️ Počasí</h3>
          <button
            className="refresh-btn"
            onClick={handleRefresh}
            title="Obnovit"
          >
            🔄
          </button>
        </div>
        <div className="error-content">
          <p className="error-message">
            {error || 'Nepodařilo se načíst počasí'}
          </p>
          <button className="retry-btn" onClick={handleRefresh}>
            Zkusit znovu
          </button>
        </div>
      </div>
    );
  }

  const condition = WeatherUtils.getWeatherCondition(
    primaryWeather.current.conditionCode
  );
  const playfulComment = getPlayfulComment(primaryLocation!.id);
  const todayForecast = primaryWeather.daily[0];
  const tomorrowForecast = primaryWeather.daily[1];

  // Získání gradient barvy podle počasí
  const gradient = WeatherUtils.getWeatherGradient(
    primaryWeather.current.conditionCode
  );
  const gradientStyle = `linear-gradient(135deg, ${gradient[0]}, ${gradient[1]})`;

  const modalRoot = document.getElementById('modal-root');

  // Speciální render pro header mode
  if (headerMode) {
    return (
      <>
        <div
          className={`weather-mini-widget header-compact-mode ${className}`}
          onClick={handleClick}
          style={{
            backgroundImage: backgroundImage
              ? `linear-gradient(rgba(0,0,0,0.3), rgba(0,0,0,0.5)), url(${backgroundImage})`
              : gradientStyle,
            backgroundColor: gradient[0],
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          {/* Current Weather - kompaktní */}
          <div className="current-weather-section">
            <div className="current-temp-container">
              <span className="current-temp">
                {WeatherUtils.formatTemperature(
                  primaryWeather.current.temperature,
                  settings.temperatureUnit
                )}
              </span>
              <div className="current-details">
                <span className="condition-text">
                  {primaryWeather.current.condition}
                </span>
                <span className="feels-like">
                  Pocitově{' '}
                  {WeatherUtils.formatTemperature(
                    primaryWeather.current.feelsLike,
                    settings.temperatureUnit
                  )}
                </span>
              </div>
            </div>

            <div className="weather-icon-container">
              <img
                src={primaryWeather.current.iconUrl}
                alt={primaryWeather.current.condition}
                className="weather-icon"
                width={80}
                height={80}
                loading="eager"
              />
            </div>
          </div>

          {/* Today vs Tomorrow */}
          <div className="forecast-comparison">
            <div className="forecast-day today">
              <span className="day-label">Dnes</span>
              <div className="day-temps">
                <span className="temp-high">{todayForecast?.maxTemp}°</span>
                <span className="temp-low">{todayForecast?.minTemp}°</span>
              </div>
              <div className="rain-chance">
                <span className="rain-icon">☔</span>
                <span className="rain-percentage">
                  {todayForecast?.chanceOfRain}%
                </span>
              </div>
            </div>

            <div className="forecast-separator"></div>

            <div className="forecast-day tomorrow">
              <span className="day-label">Zítra</span>
              <div className="day-temps">
                <span className="temp-high">{tomorrowForecast?.maxTemp}°</span>
                <span className="temp-low">{tomorrowForecast?.minTemp}°</span>
              </div>
              <div className="rain-chance">
                <span className="rain-icon">☔</span>
                <span className="rain-percentage">
                  {tomorrowForecast?.chanceOfRain}%
                </span>
              </div>
            </div>
          </div>

          {/* Playful Comment */}
          {playfulComment && (
            <div className="playful-comment">
              <span className="comment-text">{playfulComment}</span>
            </div>
          )}

          {/* Quick Stats */}
          <div className="quick-stats">
            <div className="stat-item">
              <span className="stat-icon">💨</span>
              <span className="stat-value">
                {WeatherUtils.formatWindSpeed(
                  primaryWeather.current.windSpeed,
                  settings.windUnit
                )}
              </span>
            </div>
            <div className="stat-item">
              <span className="stat-icon">💧</span>
              <span className="stat-value">
                {primaryWeather.current.humidity}%
              </span>
            </div>
            <div className="stat-item">
              <span className="stat-icon">👁️</span>
              <span className="stat-value">
                {primaryWeather.current.visibility}km
              </span>
            </div>
          </div>

          {/* Click Hint */}
          <div className="click-hint">
            <span>Klikni pro detail</span>
          </div>
        </div>

        {showModal &&
          modalRoot &&
          createPortal(
            <Suspense
              fallback={
                <div
                  style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0, 0, 0, 0.9)',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    zIndex: 1000,
                    color: 'white',
                    fontSize: '2rem',
                  }}
                >
                  🌤️ Načítám počasí...
                </div>
              }
            >
              {isMobile ? (
                <WeatherModalMobile
                  isOpen={showModal}
                  onClose={() => setShowModal(false)}
                />
              ) : (
                <WeatherModal
                  isOpen={showModal}
                  onClose={() => setShowModal(false)}
                />
              )}
            </Suspense>,
            modalRoot
          )}
      </>
    );
  }

  // Normální render pro ne-header mode

  return (
    <>
      <div
        className={`weather-mini-widget ${
          compactMode ? 'force-compact-mode' : ''
        } ${className}`}
        onClick={handleClick}
        style={{
          backgroundImage: backgroundImage
            ? `linear-gradient(rgba(0,0,0,0.3), rgba(0,0,0,0.5)), url(${backgroundImage})`
            : gradientStyle,
          backgroundColor: gradient[0], // Záložní barva z gradientu
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        {/* Header */}
        <div className="weather-mini-header">
          <div className="widget-title-section">
            <h3 className="widget-title">{condition.emoji} Počasí</h3>
            <span className="location-name">{primaryLocation?.name}</span>
          </div>

          <div className="widget-controls">
            <button
              className="refresh-btn"
              onClick={handleRefresh}
              title="Obnovit"
            >
              {isLoading ? (
                <div
                  className="spinner-mini"
                  style={{
                    width: '16px',
                    height: '16px',
                    borderWidth: '2px',
                    margin: '0 auto',
                  }}
                ></div>
              ) : (
                <span className="refresh-icon">🔄</span>
              )}
            </button>
          </div>
        </div>

        {/* Current Weather */}
        <div className="current-weather-section">
          <div className="current-temp-container">
            <span className="current-temp">
              {WeatherUtils.formatTemperature(
                primaryWeather.current.temperature,
                settings.temperatureUnit
              )}
            </span>
            <div className="current-details">
              <span className="condition-text">
                {primaryWeather.current.condition}
              </span>
              <span className="feels-like">
                Pocitově{' '}
                {WeatherUtils.formatTemperature(
                  primaryWeather.current.feelsLike,
                  settings.temperatureUnit
                )}
              </span>
            </div>
          </div>

          <div className="weather-icon-container">
            <img
              src={primaryWeather.current.iconUrl}
              alt={primaryWeather.current.condition}
              className="weather-icon"
              width={80}
              height={80}
              loading="eager"
            />
          </div>
        </div>

        {/* Today vs Tomorrow */}
        <div className="forecast-comparison">
          <div className="forecast-day today">
            <span className="day-label">Dnes</span>
            <div className="day-temps">
              <span className="temp-high">{todayForecast?.maxTemp}°</span>
              <span className="temp-low">{todayForecast?.minTemp}°</span>
            </div>
            <div className="rain-chance">
              <span className="rain-icon">☔</span>
              <span className="rain-percentage">
                {todayForecast?.chanceOfRain}%
              </span>
            </div>
          </div>

          <div className="forecast-separator"></div>

          <div className="forecast-day tomorrow">
            <span className="day-label">Zítra</span>
            <div className="day-temps">
              <span className="temp-high">{tomorrowForecast?.maxTemp}°</span>
              <span className="temp-low">{tomorrowForecast?.minTemp}°</span>
            </div>
            <div className="rain-chance">
              <span className="rain-icon">☔</span>
              <span className="rain-percentage">
                {tomorrowForecast?.chanceOfRain}%
              </span>
            </div>
          </div>
        </div>

        {/* Playful Comment */}
        {playfulComment && (
          <div className="playful-comment">
            <span className="comment-text">{playfulComment}</span>
          </div>
        )}

        {/* Quick Stats */}
        <div className="quick-stats">
          <div className="stat-item">
            <span className="stat-icon">💨</span>
            <span className="stat-value">
              {WeatherUtils.formatWindSpeed(
                primaryWeather.current.windSpeed,
                settings.windUnit
              )}
            </span>
          </div>
          <div className="stat-item">
            <span className="stat-icon">💧</span>
            <span className="stat-value">
              {primaryWeather.current.humidity}%
            </span>
          </div>
          <div className="stat-item">
            <span className="stat-icon">👁️</span>
            <span className="stat-value">
              {primaryWeather.current.visibility}km
            </span>
          </div>
        </div>

        {/* Last Updated */}
        {lastUpdate && (
          <div className="last-updated">
            Aktualizováno {WeatherUtils.getRelativeTime(lastUpdate)}
          </div>
        )}

        {/* Click Hint */}
        <div className="click-hint">
          <span>Klikni pro detail</span>
        </div>
      </div>

      {showModal &&
        modalRoot &&
        createPortal(
          <Suspense
            fallback={
              <div
                style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: 'rgba(0, 0, 0, 0.9)',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  zIndex: 1000,
                  color: 'white',
                  fontSize: '2rem',
                }}
              >
                🌤️ Načítám počasí...
              </div>
            }
          >
            {isMobile ? (
              <WeatherModalMobile
                isOpen={showModal}
                onClose={() => setShowModal(false)}
              />
            ) : (
              <WeatherModal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
              />
            )}
          </Suspense>,
          modalRoot
        )}

      {/* Weather Animations */}
      {settings.enableAnimations && (
        <div className="weather-animations">
          {/* Implementace animací podle typu počasí */}
          {condition.animation === 'rain' && (
            <div className="rain-animation">
              {[...Array(30)].map((_, i) => (
                <div
                  key={i}
                  className="rain-drop"
                  style={{
                    left: `${Math.random() * 100}%`,
                    animationDelay: `${Math.random() * 2}s`,
                    animationDuration: `${0.5 + Math.random() * 0.5}s`,
                  }}
                />
              ))}
            </div>
          )}

          {condition.animation === 'snow' && (
            <div className="snow-animation">
              {[...Array(20)].map((_, i) => (
                <div
                  key={i}
                  className="snowflake"
                  style={{
                    left: `${Math.random() * 100}%`,
                    animationDelay: `${Math.random() * 3}s`,
                    animationDuration: `${2 + Math.random() * 2}s`,
                  }}
                >
                  ❄
                </div>
              ))}
            </div>
          )}

          {condition.animation === 'sun' && (
            <div className="sun-animation">
              <div className="sun-rays"></div>
            </div>
          )}
        </div>
      )}
    </>
  );
};

// 🚀 React.memo - widget se překreslí POUZE když se změní props (className, isVisible, headerMode, compactMode)
// To je důležité, protože počasí má hodně dat a efektů (animace, obrázky)
export default memo(WeatherMiniWidget);
