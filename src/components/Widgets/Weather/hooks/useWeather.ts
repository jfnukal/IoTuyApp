// src/components/Widgets/Weather/hooks/useWeather.ts
import { useState, useEffect, useCallback } from 'react';
import { weatherAPI, type WeatherData } from '../api/weatherAPI';
import type { WeatherWidgetSettings, WeatherState, WeatherLocation } from '../types/index';
import { DEFAULT_WEATHER_SETTINGS } from '../types';
import { geoAPI } from '../../../../api/geoAPI';

export const useWeather = (initialSettings?: Partial<WeatherWidgetSettings>) => {
  const [state, setState] = useState<WeatherState>({
    isLoading: true,
    error: null,
    lastUpdate: null,
    locations: [],
    currentWeather: {},
    settings: { ...DEFAULT_WEATHER_SETTINGS, ...initialSettings },
  });

  // Načítání počasí pro jednu konkrétní lokaci
  const fetchWeatherForLocation = useCallback(async (location: WeatherLocation): Promise<WeatherData | null> => {
    try {
      return location.isGPS
        ? await weatherAPI.getWeatherByCoordinates(location.lat, location.lon)
        : await weatherAPI.getWeatherByCity(location.name);
    } catch (error) {
      console.error(`Chyba při načítání počasí pro ${location.name}:`, error);
      return null;
    }
  }, []);

 // useWeather.ts
const initialize = useCallback(async () => {
  setState(prev => ({ ...prev, isLoading: true, error: null }));

  try {
    const { primaryLocation: settingsLocation } = state.settings;
    let weatherData: WeatherData | null;
    let isGpsUsed = false;

    if (settingsLocation.type === 'gps') {
      try {
        const coords = await weatherAPI.getCurrentLocation();
        weatherData = await weatherAPI.getWeatherByCoordinates(coords.lat, coords.lon);
        isGpsUsed = true;
      } catch (gpsError) {
        weatherData = await weatherAPI.getWeatherByCity('Krnov');
      }
    } else {
      // Pro lokaci typu 'city'
      weatherData = await weatherAPI.getWeatherByCity(settingsLocation.value || 'Krnov');
    }

    if (!weatherData) {
      throw new Error("Nepodařilo se načíst data o počasí pro výchozí lokaci.");
    }
    
    // Nyní sestavíme objekt lokace s kompletními daty z API
    const primary: WeatherLocation = {
      id: isGpsUsed ? 'gps' : weatherData.location.name.toLowerCase(),
      name: weatherData.location.name,
      country: weatherData.location.country, // Zde doplňujeme chybějící 'country'
      lat: weatherData.location.lat,
      lon: weatherData.location.lon,
      isPrimary: true,
      isGPS: isGpsUsed,
    };

    setState(prev => ({
      ...prev,
      locations: [primary],
      currentWeather: { [primary.id]: weatherData },
      lastUpdate: Date.now(),
      isLoading: false,
    }));

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Neznámá chyba při inicializaci.';
    console.error("Chyba při inicializaci useWeather:", errorMessage);
    setState(prev => ({ ...prev, isLoading: false, error: "Nepodařilo se načíst výchozí lokaci." }));
  }
}, [state.settings]);

  // Přidání nové (sekundární) lokace
  const addLocation = useCallback(async (cityName: string) => {
    if (state.locations.length >= 2) return; // Povolíme max. 2 lokace

    setState(prev => ({ ...prev, isLoading: true }));
    try {
      const weatherData = await weatherAPI.getWeatherByCity(cityName);
      const newLocation: WeatherLocation = {
        id: `loc-${Date.now()}`,
        name: weatherData.location.name,
        country: weatherData.location.country,
        lat: weatherData.location.lat,
        lon: weatherData.location.lon,
        isPrimary: false, // Nově přidaná je vždy sekundární
        isGPS: false,
      };

      setState(prev => ({
        ...prev,
        locations: [...prev.locations, newLocation],
        currentWeather: { ...prev.currentWeather, [newLocation.id]: weatherData },
      }));
    } catch (error) {
      console.error("Chyba při přidávání lokace:", error);
    } finally {
      setState(prev => ({ ...prev, isLoading: false, lastUpdate: Date.now() }));
    }
  }, [state.locations]);

  // Prohození primární a sekundární lokace
  const swapLocations = useCallback(() => {
    if (state.locations.length < 2) return;
    setState(prev => ({
      ...prev,
      locations: prev.locations.map(loc => ({ ...loc, isPrimary: !loc.isPrimary })).reverse(), // .reverse() zajistí správné pořadí
    }));
  }, [state.locations.length]);

  // Odstranění sekundární lokace
  const removeSecondaryLocation = useCallback(() => {
    setState(prev => ({
      ...prev,
      locations: prev.locations.filter(loc => loc.isPrimary),
      currentWeather: Object.fromEntries(
        Object.entries(prev.currentWeather).filter(([id]) => id === prev.locations.find(l => l.isPrimary)?.id)
      ),
    }));
  }, []);

  // Manuální obnova počasí pro všechny lokace
  const refreshWeather = useCallback(async () => {
    // První načtení selhalo (třeba start bez internetu), takže není co
    // obnovovat → začít znovu od začátku. Jinak by tlačítko „Zkusit znovu"
    // ani pravidelná obnova nic neudělaly až do obnovení stránky.
    if (!state.locations.length) {
      await initialize();
      return;
    }
    setState(prev => ({ ...prev, isLoading: true }));

    const locations = state.locations;
    const results = await Promise.all(locations.map(loc => fetchWeatherForLocation(loc)));

    // Co se nepodařilo stáhnout, nechat jak bylo — krátký výpadek Wi-Fi
    // (třeba hned po probuzení tabletu) nesmí smazat dobrá data
    setState(prev => {
      const currentWeather = { ...prev.currentWeather };
      locations.forEach((loc, index) => {
        const data = results[index];
        if (data) currentWeather[loc.id] = data;
      });
      return {
        ...prev,
        currentWeather,
        isLoading: false,
        // „Aktualizováno" posunout, jen když se opravdu něco stáhlo
        lastUpdate: results.some(Boolean) ? Date.now() : prev.lastUpdate,
      };
    });
  }, [state.locations, fetchWeatherForLocation, initialize]);

  // Získání hravého komentáře
  const getPlayfulComment = useCallback((locationId: string): string => {
    const weather = state.currentWeather[locationId];
    if (!weather || !state.settings.showPlayfulComments) return '';
    return weatherAPI.getPlayfulComment(weather.current.conditionCode, weather.current.temperature);
  }, [state.currentWeather, state.settings.showPlayfulComments]);

  // Efekt pro první spuštění
  useEffect(() => {
    if (state.settings.isEnabled && state.locations.length === 0) {
      initialize();
    }
  }, [state.settings.isEnabled, initialize]);

  // Efekt pro automatický refresh
  // Časovač jen v proměnné efektu. Dřív byl ve state a úklid rušil vždy ten
  // předchozí, takže po zavření detailu počasí dál každých 15 min zbytečně stahoval.
  useEffect(() => {
    if (!state.settings.isEnabled || state.settings.refreshInterval <= 0) return;
    const timer = setInterval(refreshWeather, state.settings.refreshInterval * 60 * 1000);
    return () => clearInterval(timer);
  }, [state.settings.isEnabled, state.settings.refreshInterval, refreshWeather]);

  // Jakmile se vrátí internet (tablet po probuzení chytá Wi-Fi), načíst hned,
  // ne až při další pravidelné obnově za 15 minut
  useEffect(() => {
    if (!state.settings.isEnabled) return;
    window.addEventListener('online', refreshWeather);
    return () => window.removeEventListener('online', refreshWeather);
  }, [state.settings.isEnabled, refreshWeather]);


  return {
    // Stav
    isLoading: state.isLoading,
    error: state.error,
    currentWeather: state.currentWeather,
    settings: state.settings,
    lastUpdate: state.lastUpdate,

    // Akce
    refreshWeather,
    addLocation,
    swapLocations,
    removeSecondaryLocation,
    searchCities: geoAPI.searchLocations, // Zde používáme naši novou službu!

    // Vypočtené hodnoty
    primaryLocation: state.locations.find(loc => loc.isPrimary),
    secondaryLocation: state.locations.find(loc => !loc.isPrimary),
    getPlayfulComment,
  };
};