// src/components/Widgets/Weather/hooks/useWeather.ts
import { useState, useEffect, useCallback } from 'react';
import { weatherAPI, type WeatherData } from '../api/weatherAPI'
import type { WeatherWidgetSettings, WeatherState, WeatherLocation } from '../types';
import { DEFAULT_WEATHER_SETTINGS } from '../types';
import { geoAPI } from '../../../../api/geoAPI';

export const useWeather = (initialSettings?: Partial<WeatherWidgetSettings>) => {
  const [state, setState] = useState<WeatherState>({
    isLoading: false,
    error: null,
    lastUpdate: null,
    locations: [],
    currentWeather: {},
    settings: { ...DEFAULT_WEATHER_SETTINGS, ...initialSettings },
  });

  const [refreshTimer, setRefreshTimer] = useState<NodeJS.Timeout | null>(null);

  // Načítání počasí pro konkrétní lokaci
  const fetchWeatherForLocation = useCallback(async (location: WeatherLocation): Promise<WeatherData | null> => {
    try {
      let weatherData: WeatherData;

      if (location.isGPS || (location.lat && location.lon)) {
        weatherData = await weatherAPI.getWeatherByCoordinates(location.lat, location.lon);
      } else {
        weatherData = await weatherAPI.getWeatherByCity(location.name);
      }

      return weatherData;
    } catch (error) {
      console.error(`Error fetching weather for ${location.name}:`, error);
      return null;
    }
  }, []);

  // Načítání počasí pro všechny lokace
  const fetchAllWeatherData = useCallback(async () => {
    if (state.locations.length === 0) {
      return;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const weatherPromises = state.locations.map(async (location) => {
        const weatherData = await fetchWeatherForLocation(location);
        return { locationId: location.id, weatherData };
      });

      const results = await Promise.allSettled(weatherPromises);
      const currentWeather: { [locationId: string]: WeatherData } = {};

      results.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value.weatherData) {
          currentWeather[state.locations[index].id] = result.value.weatherData;
        }
      });

      setState(prev => ({
        ...prev,
        isLoading: false,
        currentWeather,
        lastUpdate: Date.now(),
      }));

    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Chyba při načítání počasí',
      }));
    }
  }, [state.locations, fetchWeatherForLocation]);

  // Načtení výchozí lokace (GPS nebo město)
  const loadDefaultLocation = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const { primaryLocation } = state.settings;
      let location: WeatherLocation;

      if (primaryLocation.type === 'gps') {
        try {
          const coords = await weatherAPI.getCurrentLocation();
          const weatherData = await weatherAPI.getWeatherByCoordinates(coords.lat, coords.lon);
          
          location = {
            id: 'primary-gps',
            name: weatherData.location.name,
            country: weatherData.location.country,
            lat: coords.lat,
            lon: coords.lon,
            isPrimary: true,
            isGPS: true,
          };
        } catch (error) {
          // Fallback na výchozí město (Praha)
          location = {
            id: 'primary-fallback',
            name: 'Praha',
            country: 'CZ',
            lat: 50.0755,
            lon: 14.4378,
            isPrimary: true,
            isGPS: false,
          };
        }
      } else if (primaryLocation.type === 'coordinates') {
        const [lat, lon] = primaryLocation.value.split(',').map(Number);
        const weatherData = await weatherAPI.getWeatherByCoordinates(lat, lon);
        
        location = {
          id: 'primary-coords',
          name: weatherData.location.name,
          country: weatherData.location.country,
          lat,
          lon,
          isPrimary: true,
          isGPS: false,
        };
      } else {
        // city
        const weatherData = await weatherAPI.getWeatherByCity(primaryLocation.value || 'Praha');
        
        location = {
          id: 'primary-city',
          name: weatherData.location.name,
          country: weatherData.location.country,
          lat: weatherData.location.lat,
          lon: weatherData.location.lon,
          isPrimary: true,
          isGPS: false,
        };
      }

      setState(prev => ({
        ...prev,
        locations: [location],
        isLoading: false,
      }));

      // Po načtení lokace načteme počasí
      setTimeout(async () => {
        try {
          const weatherData = await fetchWeatherForLocation(location);
          if (weatherData) {
            setState(prev => ({
              ...prev,
              currentWeather: {
                [location.id]: weatherData,
              },
              lastUpdate: Date.now(),
            }));
          }
        } catch (error) {
          console.error('Error loading weather after location setup:', error);
        }
      }, 100);

    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Chyba při načítání lokace',
      }));
    }
  }, [state.settings, fetchWeatherForLocation]);

  // Přidání nové lokace
  const addLocation = useCallback(async (cityName: string) => {
    try {
      setState(prev => ({ ...prev, isLoading: true }));

      const weatherData = await weatherAPI.getWeatherByCity(cityName);
      const newLocation: WeatherLocation = {
        id: `location-${Date.now()}`,
        name: weatherData.location.name,
        country: weatherData.location.country,
        lat: weatherData.location.lat,
        lon: weatherData.location.lon,
        isPrimary: state.locations.length === 0,
        isGPS: false,
      };

      setState(prev => ({
        ...prev,
        locations: [...prev.locations, newLocation],
        currentWeather: {
          ...prev.currentWeather,
          [newLocation.id]: weatherData,
        },
        isLoading: false,
        lastUpdate: Date.now(),
      }));

    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Chyba při přidávání lokace',
      }));
    }
  }, [state.locations]);

  // Odstranění lokace
  const removeLocation = useCallback((locationId: string) => {
    setState(prev => ({
      ...prev,
      locations: prev.locations.filter(loc => loc.id !== locationId),
      currentWeather: Object.fromEntries(
        Object.entries(prev.currentWeather).filter(([id]) => id !== locationId)
      ),
    }));
  }, []);

  // Aktualizace nastavení
  const updateSettings = useCallback((newSettings: Partial<WeatherWidgetSettings>) => {
    const updatedSettings = { ...state.settings, ...newSettings };
    setState(prev => ({
      ...prev,
      settings: updatedSettings,
    }));

    // Uložení do localStorage
    localStorage.setItem('weather-widget-settings', JSON.stringify(updatedSettings));
  }, [state.settings]);

  // Manuální refresh
  const refreshWeather = useCallback(() => {
    if (state.locations.length > 0) {
      fetchAllWeatherData();
    } else {
      loadDefaultLocation();
    }
  }, [state.locations.length, fetchAllWeatherData, loadDefaultLocation]);

  const searchCities = async (query: string) => {
    console.log('searchCities called with query:', query);
    
    try {
      const results = await geoAPI.searchLocations(query);
      console.log('geoAPI.searchLocations results:', results);
      
      return results.map((location: any) => ({
        name: location.displayName,
        country: location.country,
        lat: location.lat,
        lon: location.lon
      }));
    } catch (error) {
      console.error('Error in searchCities:', error);
      return [];
    }
  };

  // Získání hravého komentáře
  const getPlayfulComment = useCallback((locationId: string): string => {
    const weatherData = state.currentWeather[locationId];
    if (!weatherData || !state.settings.showPlayfulComments) {
      return '';
    }

    return weatherAPI.getPlayfulComment(
      weatherData.current.conditionCode,
      weatherData.current.temperature
    );
  }, [state.currentWeather, state.settings.showPlayfulComments]);

  // Načtení nastavení z localStorage při inicializaci
  useEffect(() => {
    const savedSettings = localStorage.getItem('weather-widget-settings');
    if (savedSettings) {
      try {
        const parsedSettings = JSON.parse(savedSettings);
        setState(prev => ({
          ...prev,
          settings: { ...DEFAULT_WEATHER_SETTINGS, ...parsedSettings },
        }));
      } catch (error) {
        console.error('Error loading weather settings:', error);
      }
    }
  }, []);

  // Načtení výchozí lokace při startu
  useEffect(() => {
    if (state.settings.isEnabled && state.locations.length === 0) {
      loadDefaultLocation();
    }
  }, [state.settings.isEnabled, loadDefaultLocation]);

  // Nastavení automatického refreshe
  useEffect(() => {
    if (refreshTimer) {
      clearInterval(refreshTimer);
    }

    if (state.settings.isEnabled && state.settings.refreshInterval > 0) {
      const timer = setInterval(() => {
        refreshWeather();
      }, state.settings.refreshInterval * 60 * 1000);

      setRefreshTimer(timer);
    }

    return () => {
      if (refreshTimer) {
        clearInterval(refreshTimer);
      }
    };
  }, [state.settings.isEnabled, state.settings.refreshInterval, refreshWeather]);

  // Cleanup při unmount
  useEffect(() => {
    return () => {
      if (refreshTimer) {
        clearInterval(refreshTimer);
      }
    };
  }, [refreshTimer]);

  // Přidej tuto funkci před return statement:
const swapLocations = useCallback(() => {
  setState(prev => {
    const newLocations = prev.locations.map(loc => ({
      ...loc,
      isPrimary: !loc.isPrimary
    }));
    
    return {
      ...prev,
      locations: newLocations
    };
  });
}, []);

const removeSecondaryLocation = useCallback(() => {
  setState(prev => ({
    ...prev,
    locations: prev.locations.filter(loc => loc.isPrimary), // Ponechej jen primární lokaci
  }));
}, []);

  return {
    // State
    isLoading: state.isLoading,
    error: state.error,
    locations: state.locations,
    currentWeather: state.currentWeather,
    settings: state.settings,
    lastUpdate: state.lastUpdate,

    // Actions
    refreshWeather,
    addLocation,
    swapLocations,
    removeLocation,
    removeSecondaryLocation, // PŘESUŇ SEM
    updateSettings,
    searchCities,
    loadDefaultLocation,
    getPlayfulComment,

    // Computed values
    primaryLocation: state.locations.find(loc => loc.isPrimary),
    secondaryLocation: state.locations.find(loc => !loc.isPrimary),
    hasWeatherData: Object.keys(state.currentWeather).length > 0,
    isOnline: navigator.onLine,
  };
};