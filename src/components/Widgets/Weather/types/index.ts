// src/components/Widgets/Weather/types/index.ts

export interface WeatherWidgetSettings {
  isEnabled: boolean;
  refreshInterval: number; // v minutách
  primaryLocation: {
    type: 'city' | 'gps' | 'coordinates';
    value: string; // název města nebo "lat,lon"
    displayName: string;
  };
  secondaryLocation?: {
    type: 'city' | 'coordinates';
    value: string;
    displayName: string;
  };
  showHourlyForecast: boolean;
  showWeeklyForecast: boolean;
  enableAnimations: boolean;
  temperatureUnit: 'celsius' | 'fahrenheit';
  windUnit: 'kmh' | 'mph';
  showPlayfulComments: boolean;
  showAlerts: boolean;
  backgroundEffects: boolean;
}

export interface WeatherAnimation {
  type: 'rain' | 'snow' | 'sun' | 'clouds' | 'storm' | 'fog';
  intensity: 'light' | 'medium' | 'heavy';
  particles?: number;
  speed?: number;
}

export interface WeatherIcon {
  code: number;
  condition: string;
  icon: string;
  animation?: WeatherAnimation;
  gradient?: string[];
  emoji?: string;
}

export interface WeatherLocation {
  id: string;
  name: string;
  country: string;
  lat: number;
  lon: number;
  isPrimary: boolean;
  isGPS: boolean;
  lastUpdated?: number;
}

export interface WeatherAlert {
  id: string;
  title: string;
  description: string;
  severity: 'minor' | 'moderate' | 'severe' | 'extreme';
  startTime: string;
  endTime: string;
  areas: string[];
}

export interface WeatherTheme {
  name: string;
  gradient: string[];
  textColor: string;
  iconColor: string;
  backgroundImage?: string;
  animation?: WeatherAnimation;
}

export interface WeatherState {
  isLoading: boolean;
  error: string | null;
  lastUpdate: number | null;
  locations: WeatherLocation[];
  currentWeather: {
    [locationId: string]: any; // WeatherData from API
  };
  settings: WeatherWidgetSettings;
}

export interface WeatherModalProps {
  isOpen: boolean;
  onClose: () => void;
  location: string;
  weatherData: any;
}

// Konstanty pro Weather kódy a jejich mapování
export const WEATHER_CONDITIONS = {
  // Slunečno
  1000: {
    name: 'Jasno',
    emoji: '☀️',
    gradient: ['#FFD700', '#FFA500'],
    animation: 'sun',
  },
  1003: {
    name: 'Polojasno',
    emoji: '🌤️',
    gradient: ['#87CEEB', '#FFD700'],
    animation: 'sun',
  },

  // Oblačno
  1006: {
    name: 'Oblačno',
    emoji: '☁️',
    gradient: ['#87CEEB', '#B0C4DE'],
    animation: 'clouds',
  },
  1009: {
    name: 'Zamračeno',
    emoji: '☁️',
    gradient: ['#696969', '#A9A9A9'],
    animation: 'clouds',
  },
  1030: {
    name: 'Mlha',
    emoji: '🌫️',
    gradient: ['#E6E6FA', '#D3D3D3'],
    animation: 'fog',
  },

  // Déšť
  1063: {
    name: 'Přeháňky',
    emoji: '🌦️',
    gradient: ['#4682B4', '#87CEEB'],
    animation: 'rain',
  },
  1180: {
    name: 'Mírný déšť',
    emoji: '🌧️',
    gradient: ['#4169E1', '#87CEEB'],
    animation: 'rain',
  },
  1183: {
    name: 'Déšť',
    emoji: '🌧️',
    gradient: ['#000080', '#4169E1'],
    animation: 'rain',
  },
  1186: {
    name: 'Silný déšť',
    emoji: '🌧️',
    gradient: ['#191970', '#000080'],
    animation: 'rain',
  },

  // Sníh
  1210: {
    name: 'Sněžení',
    emoji: '🌨️',
    gradient: ['#E6E6FA', '#F0F8FF'],
    animation: 'snow',
  },
  1213: {
    name: 'Mírné sněžení',
    emoji: '🌨️',
    gradient: ['#F0F8FF', '#E6E6FA'],
    animation: 'snow',
  },
  1216: {
    name: 'Sněžení',
    emoji: '❄️',
    gradient: ['#B0E0E6', '#E6E6FA'],
    animation: 'snow',
  },

  // Bouře
  1273: {
    name: 'Bouře',
    emoji: '⛈️',
    gradient: ['#2F4F4F', '#696969'],
    animation: 'storm',
  },
  1276: {
    name: 'Silná bouře',
    emoji: '⛈️',
    gradient: ['#000000', '#2F4F4F'],
    animation: 'storm',
  },
} as const;

export const DEFAULT_WEATHER_SETTINGS: WeatherWidgetSettings = {
  isEnabled: true,
  refreshInterval: 15, // 15 minut
  primaryLocation: {
    type: 'city', // Změněno z 'gps'
    value: 'Brantice', // Změněno z ''
    displayName: 'Aktuální poloha', // Změněno z 'Aktuální poloha'
  },
  showHourlyForecast: true,
  showWeeklyForecast: true,
  enableAnimations: true,
  temperatureUnit: 'celsius',
  windUnit: 'kmh',
  showPlayfulComments: true,
  showAlerts: true,
  backgroundEffects: true,
};

export type WeatherView = 'today' | 'current' | 'weekly' | 'details';
