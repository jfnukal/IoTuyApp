// src/components/Widgets/Weather/WeatherModal.tsx
import React, { useState, useEffect } from 'react';
import { useWeather } from './hooks/useWeather';
import { WeatherUtils } from './utils/weatherUtils';
import { fetchImageForQuery } from '../../../api/unsplash';
import type { WeatherView } from './types';
import './WeatherModal.css';
import { translateWeatherCondition } from './utils/weatherUtils';

interface WeatherModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const WeatherModal: React.FC<WeatherModalProps> = ({ isOpen, onClose }) => {
  const {
    isLoading,
    currentWeather,
    swapLocations,
    primaryLocation,
    secondaryLocation,
    settings,
    getPlayfulComment,
    refreshWeather,
    lastUpdate,
    searchCities,
    addLocation,
    removeSecondaryLocation,
  } = useWeather();

  const [currentView, setCurrentView] = useState<WeatherView>('hourly');
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
// Přidáme debug log pro vyhledávání - pouze při změně
const [lastLoggedQuery, setLastLoggedQuery] = useState('');
if (searchQuery !== lastLoggedQuery) {
  setLastLoggedQuery(searchQuery);
}

  const handleSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && searchResults.length > 0) {
      // Automaticky přidá první výsledek v seznamu
      addLocation(searchResults[0].name);
      setSearchQuery('');
      setSearchResults([]);
    }
  };

  // Získání počasí pro primární lokaci
  const primaryWeather = primaryLocation ? currentWeather[primaryLocation.id] : null;
  const secondaryWeather = secondaryLocation ? currentWeather[secondaryLocation.id] : null;

  // Načtení background image podle počasí
  useEffect(() => {
    if (primaryWeather && settings.backgroundEffects && isOpen) {
      const loadBackgroundImage = async () => {
        try {
          const condition = WeatherUtils.getWeatherCondition(primaryWeather.current.conditionCode);
          let searchQuery = '';

          switch (condition.animation) {
            case 'sun':
              searchQuery = 'beautiful sunny day landscape mountains';
              break;
            case 'rain':
              searchQuery = 'rain city windows cozy atmosphere';
              break;
            case 'snow':
              searchQuery = 'winter snow landscape peaceful nature';
              break;
            case 'storm':
              searchQuery = 'dramatic storm clouds lightning sky';
              break;
            case 'fog':
              searchQuery = 'misty fog forest mysterious atmosphere';
              break;
            default:
              searchQuery = 'beautiful cloudy sky nature landscape';
          }

          const imageUrl = await fetchImageForQuery(searchQuery);
          setBackgroundImage(imageUrl);
        } catch (error) {
          console.error('Error loading background image:', error);
        }
      };

      loadBackgroundImage();
    }
  }, [primaryWeather?.current.conditionCode, settings.backgroundEffects, isOpen]);

        // Vyhledávání měst
        useEffect(() => {
          const searchTimeout = setTimeout(async () => {
            if (searchQuery.length >= 2) {
              console.log('Starting search for:', searchQuery);
              setIsSearching(true);
              
              try {
                const results = await searchCities(searchQuery);
                console.log('Search results received:', results);
                setSearchResults(results.slice(0, 5));
              } catch (error) {
                console.error('Search error:', error);
                setSearchResults([]);
              } finally {
                setIsSearching(false);
              }
            } else {
              setSearchResults([]);
              setIsSearching(false);
            }
          }, 300);

          return () => clearTimeout(searchTimeout);
        }, [searchQuery]); 

        // Zavření modalu při ESC
        useEffect(() => {
          const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && isOpen) {
              onClose();
            }
          };

          if (isOpen) {
            document.addEventListener('keydown', handleKeyDown);
            document.body.style.overflow = 'hidden';
          } else {
            // Vyčisti state při zavření modalu
            setSearchQuery('');
            setSearchResults([]);
            setIsSearching(false);
          }

          return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = 'unset';
          };
        }, [isOpen, onClose]);

  if (!isOpen) return null;

  const condition = primaryWeather ? WeatherUtils.getWeatherCondition(primaryWeather.current.conditionCode) : null;
  const playfulComment = primaryLocation ? getPlayfulComment(primaryLocation.id) : '';

  // Získání gradient barvy podle počasí
  const gradient = condition ? WeatherUtils.getWeatherGradient(primaryWeather!.current.conditionCode) : ['#667eea', '#764ba2'];
  const gradientStyle = `linear-gradient(135deg, ${gradient[0]}, ${gradient[1]})`;

  return (
    <div className="weather-modal-overlay" onClick={onClose}>
          <div 
            className="weather-modal" 
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundImage: backgroundImage 
                ? `linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.6)), url(${backgroundImage})`
                : gradientStyle,
              backgroundColor: gradient[0], // Záložní barva z gradientu
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          >
        {/* Zavírací tlačítko - 3/4 venku, 1/4 uvnitř */}
        <button className="weather-modal-close" onClick={onClose} title="Zavřít">
          <span className="close-icon">✕</span>
        </button>

        {/* Header - nový layout */}
        <div className="weather-modal-header">
          <div className="header-top-row">
            <h1 className="modal-title">
              {condition?.emoji || '🌤️'} Počasí
            </h1>
            <div className="header-controls">
              <button 
                className="refresh-btn-modal" 
                onClick={refreshWeather}
                disabled={isLoading}
                title="Obnovit počasí"
              >
                <span className={`refresh-icon ${isLoading ? 'spinning' : ''}`}>🔄</span>
              </button>
              
              <div className="view-switcher">
                {(['hourly', 'weekly'] as WeatherView[]).map((view) => (
                  <button
                    key={view}
                    className={`view-btn ${currentView === view ? 'active' : ''}`}
                    onClick={() => setCurrentView(view)}
                  >
                    {view === 'hourly' && 'Hodiny'}
                    {view === 'weekly' && 'Týden'}
                  </button>
                ))}
              </div>
            </div>
          </div>


          {/* LEVÁ ČÁST: Primární město s GPS ikonou a hravým komentářem pod ním */}
          <div className="primary-location-container">
            <div className="primary-location-info">
              {primaryLocation?.isGPS && (
                <span className="gps-indicator" title="Poloha zjištěna pomocí GPS">📍</span>
              )}
              <span className="primary-location-name">{primaryLocation?.name}</span>
            </div>
            {playfulComment && (
              <div className="playful-comment-text" style={{ fontSize: '1rem', fontStyle: 'italic', opacity: 0.9, marginTop: '4px' }}>
                {playfulComment}
              </div>
            )}
          </div>

          {/* STŘED: Prázdný prostor pro lepší rozložení */}
          <div></div>
          

          {/* PRAVÁ ČÁST: Druhé město nebo vyhledávání - kompaktní */}
          <div className="secondary-location-container">
            {secondaryLocation && secondaryWeather ? (
              <div className="secondary-location-full">
                <button 
                  className="secondary-location-widget"
                  onClick={swapLocations}
                  title={`Přepnout na ${secondaryLocation.name}`}
                  style={{ fontSize: '0.9rem', padding: '6px 10px' }}
                >
                  <span className="secondary-location-name">{secondaryLocation.name}</span>
                  <div className="secondary-weather-info">
                    <img src={secondaryWeather.current.iconUrl} alt={secondaryWeather.current.condition} className="secondary-weather-icon" style={{ width: '24px', height: '24px' }} />
                    <span className="secondary-weather-temp">{secondaryWeather.current.temperature}°</span>
                  </div>
                </button>
                <button 
                  className="remove-secondary-btn"
                  onClick={removeSecondaryLocation}
                  title="Odstranit druhé město"
                  style={{ width: '24px', height: '24px', fontSize: '12px' }}
                >
                  ✕
                </button>
              </div>
            ) : (
              <div className="search-container">
                <input
                  type="text"
                  placeholder="Přidat město..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleSearchKeyDown}
                  className="city-search-input"
                  style={{ width: '160px', fontSize: '0.85rem' }}
                />
                {isSearching && <div className="search-spinner">⟲</div>}
                {searchResults.length > 0 && (
                  <div className="search-results">
                    {searchResults.map((result, index) => (
                      <button
                        key={index}
                        className="search-result"
                        onClick={() => {
                          addLocation(result.name);
                          setSearchQuery('');
                          setSearchResults([]);
                        }}
                      >
                        {result.name}
                        <span className="add-icon">+</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

</div>



        {/* Main Content */}
        <div className="weather-modal-content">
          {/* Kompaktní main weather layout */}
          <div className="weather-main-compact">
            {/* Levá část - Aktuální počasí */}
            <div className="current-weather-left">
              <div className="temp-and-icon">
                <div className="temperature-section">
                  <span className="temp-huge">
                    {primaryWeather ? WeatherUtils.formatTemperature(primaryWeather.current.temperature, settings.temperatureUnit) : '--°'}
                  </span>
                  <div className="condition-section">
                  <span className="condition-text">
                        {primaryWeather ? translateWeatherCondition(primaryWeather.current.condition) : 'Načítám...'}
                      </span>
                    <span className="feels-like-text">
                      Pocitově {primaryWeather ? WeatherUtils.formatTemperature(primaryWeather.current.feelsLike, settings.temperatureUnit) : '--°'}
                    </span>
                  </div>
                </div>
                
                <div className="weather-icon-section">
                  {primaryWeather && (
                    <img 
                      src={primaryWeather.current.iconUrl} 
                      alt={primaryWeather.current.condition}
                      className="weather-icon-huge"
                    />
                  )}
                </div>
              </div>

              {/* Detailní statistiky přesunuté pod teplotu */}
              <div className="weather-details-grid">
                {primaryWeather && (
                  <>
                    <div className="detail-card">
                      <div className="detail-icon">💨</div>
                      <div className="detail-content">
                        <span className="detail-label">Vítr</span>
                        <span className="detail-value">
                          {WeatherUtils.formatWindSpeed(primaryWeather.current.windSpeed, settings.windUnit)}
                        </span>
                      </div>
                    </div>

                    <div className="detail-card">
                      <div className="detail-icon">💧</div>
                      <div className="detail-content">
                        <span className="detail-label">Vlhkost</span>
                        <span className="detail-value">{primaryWeather.current.humidity}%</span>
                      </div>
                    </div>

                    <div className="detail-card">
                      <div className="detail-icon">👁️</div>
                      <div className="detail-content">
                        <span className="detail-label">Viditelnost</span>
                        <span className="detail-value">{primaryWeather.current.visibility}km</span>
                      </div>
                    </div>

                    <div className="detail-card">
                      <div className="detail-icon">☀️</div>
                      <div className="detail-content">
                        <span className="detail-label">UV Index</span>
                        <span className="detail-value">{primaryWeather.current.uvIndex}</span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Pravá část - Kratší hodinová předpověď */}
            <div className="hourly-forecast-right">
              <h3 className="forecast-title">Nejbližší hodiny</h3>
              <div className="hourly-compact-list">
              {primaryWeather?.hourly.filter((hour: any) => {
                  const hourTime = new Date(hour.time);
                  const now = new Date();
                  return hourTime >= now;
                }).slice(0, 8).map((hour: any, index: number) => (
                  <div key={index} className="hourly-compact-item">
                    <span className="hour-time-compact">{WeatherUtils.formatTime(hour.time)}</span>
                    <img src={hour.iconUrl} alt={hour.condition} className="hour-icon-compact" />
                    <span className="hour-temp-compact">{hour.temperature}°</span>
                    <span className="hour-rain-compact">☔ {hour.chanceOfRain}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Content based on current view */}
          <div className="weather-view-content">
            {currentView === 'hourly' && (
              <div className="hourly-view">
                <h3 className="view-title">24hodinová předpověď</h3>
                <div className="hourly-grid">
                  {primaryWeather?.hourly.map((hour: any, index: number) => (
                    <div key={index} className="hourly-card">
                      <span className="hourly-time">{WeatherUtils.formatTime(hour.time)}</span>
                      <img src={hour.iconUrl} alt={translateWeatherCondition(hour.condition)} className="hourly-icon" />
                      <span className="hourly-temp">{hour.temperature}°</span>
                      <div className="hourly-details">
                        <span>☔ {hour.chanceOfRain}%</span>
                        <span>💨 {hour.windSpeed}km/h</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {currentView === 'weekly' && (
              <div className="weekly-view">
                <h3 className="view-title">Týdenní předpověď</h3>
                <div className="weekly-list">
                  {primaryWeather?.daily.map((day: any, index: number) => (
                    <div key={index} className="daily-card">
                      <div className="daily-date">
                        <span className="daily-day">{WeatherUtils.formatDate(day.date)}</span>
                      </div>
                      <div className="daily-icon">
                        <img src={day.iconUrl} alt={day.condition} />
                      </div>
                      <div className="daily-condition">
                      <span>{translateWeatherCondition(day.condition)}</span>
                      </div>
                      <div className="daily-temps">
                        <span className="daily-high">{day.maxTemp}°</span>
                        <span className="daily-low">{day.minTemp}°</span>
                      </div>
                      <div className="daily-rain">
                        <span>☔ {day.chanceOfRain}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="weather-modal-footer">
          {lastUpdate && (
            <span className="last-updated-modal">
              Aktualizováno {WeatherUtils.getRelativeTime(lastUpdate)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default WeatherModal;