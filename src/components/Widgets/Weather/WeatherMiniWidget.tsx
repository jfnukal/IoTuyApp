// src/components/Widgets/Weather/WeatherMiniWidget.tsx
import React, { useState, useEffect } from 'react';
import { useWeather } from './hooks/useWeather';
import { WeatherUtils } from './utils/weatherUtils';
import { fetchImageForQuery } from '../../../api/unsplash';
import './WeatherMiniWidget.css';
import WeatherModal from './WeatherModal';
// import WeatherModalMobile from './WeatherModalMobile.css';
import './WeatherModalMobile.css';

interface WeatherMiniWidgetProps {
  className?: string;
  onExpand?: () => void;
  isVisible?: boolean;
}

const WeatherMiniWidget: React.FC<WeatherMiniWidgetProps> = ({
  className = '',
  onExpand,
  isVisible = true,
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

  // Získání počasí pro primární lokaci
  const primaryWeather = primaryLocation ? currentWeather[primaryLocation.id] : null;

  // Načtení background image podle počasí
  useEffect(() => {
    if (primaryWeather && settings.backgroundEffects) {
      const loadBackgroundImage = async () => {
        try {
          const condition = WeatherUtils.getWeatherCondition(primaryWeather.current.conditionCode);
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
      <div className={`weather-mini-widget weather-loading ${className}`}>
        <div className="weather-mini-header">
          <h3 className="widget-title">🌤️ Počasí</h3>
        </div>
        <div className="loading-content">
          <div className="weather-spinner"></div>
          <p>Načítám počasí...</p>
        </div>
      </div>
    );
  }

  if (error || !primaryWeather) {
    return (
      <div className={`weather-mini-widget weather-error ${className}`}>
        <div className="weather-mini-header">
          <h3 className="widget-title">🌤️ Počasí</h3>
          <button className="refresh-btn" onClick={handleRefresh} title="Obnovit">
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

  const condition = WeatherUtils.getWeatherCondition(primaryWeather.current.conditionCode);
  const playfulComment = getPlayfulComment(primaryLocation!.id);
  const todayForecast = primaryWeather.daily[0];
  const tomorrowForecast = primaryWeather.daily[1];

  // Získání gradient barvy podle počasí
  const gradient = WeatherUtils.getWeatherGradient(primaryWeather.current.conditionCode);
  const gradientStyle = `linear-gradient(135deg, ${gradient[0]}, ${gradient[1]})`;

  // Detekce mobilního zařízení
const isMobile = window.innerWidth <= 768;

  return (
    <>
     <div 
          className={`weather-mini-widget ${className}`}
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
            <h3 className="widget-title">
              {condition.emoji} Počasí
            </h3>
            <span className="location-name">{primaryLocation?.name}</span>
          </div>
          
          <div className="widget-controls">
            <button className="refresh-btn" onClick={handleRefresh} title="Obnovit">
              <span className={`refresh-icon ${isLoading ? 'spinning' : ''}`}>🔄</span>
            </button>
            <div className="close-widget-btn" title="Rozšířit" onClick={(e) => {
              e.stopPropagation();
              handleClick();
            }}>
              <div className="mickey-ear mickey-ear-left"></div>
              <div className="mickey-ear mickey-ear-right"></div>
              <span className="expand-icon">⚏</span>
            </div>
          </div>
        </div>

        {/* Current Weather */}
        <div className="current-weather-section">
          <div className="current-temp-container">
            <span className="current-temp">
              {WeatherUtils.formatTemperature(primaryWeather.current.temperature, settings.temperatureUnit)}
            </span>
            <div className="current-details">
              <span className="condition-text">{primaryWeather.current.condition}</span>
              <span className="feels-like">
                Pocitově {WeatherUtils.formatTemperature(primaryWeather.current.feelsLike, settings.temperatureUnit)}
              </span>
            </div>
          </div>
          
          <div className="weather-icon-container">
            <img 
              src={primaryWeather.current.iconUrl} 
              alt={primaryWeather.current.condition}
              className="weather-icon"
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
              <span className="rain-percentage">{todayForecast?.chanceOfRain}%</span>
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
              <span className="rain-percentage">{tomorrowForecast?.chanceOfRain}%</span>
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
              {WeatherUtils.formatWindSpeed(primaryWeather.current.windSpeed, settings.windUnit)}
            </span>
          </div>
          <div className="stat-item">
            <span className="stat-icon">💧</span>
            <span className="stat-value">{primaryWeather.current.humidity}%</span>
          </div>
          <div className="stat-item">
            <span className="stat-icon">👁️</span>
            <span className="stat-value">{primaryWeather.current.visibility}km</span>
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

        {/* Weather Modal - nahraď stávající modal tímto: */}
        {isMobile ? (
          <WeatherModal 
            isOpen={showModal}
            onClose={() => setShowModal(false)}
          />
        ) : (
          <WeatherModal 
            isOpen={showModal}
            onClose={() => setShowModal(false)}
          />
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
                    animationDuration: `${0.5 + Math.random() * 0.5}s`
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
                    animationDuration: `${2 + Math.random() * 2}s`
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

export default WeatherMiniWidget;