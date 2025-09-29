// src/components/Widgets/Weather/utils/weatherUtils.ts
import { WEATHER_CONDITIONS, type WeatherAnimation } from '../types';

export class WeatherUtils {
  
  // Převod teploty
  static convertTemperature(celsius: number, unit: 'celsius' | 'fahrenheit'): number {
    if (unit === 'fahrenheit') {
      return Math.round((celsius * 9/5) + 32);
    }
    return Math.round(celsius);
  }

  // Převod rychlosti větru
  static convertWindSpeed(kmh: number, unit: 'kmh' | 'mph'): number {
    if (unit === 'mph') {
      return Math.round(kmh * 0.621371);
    }
    return Math.round(kmh);
  }

  // Formátování teploty s jednotkou
  static formatTemperature(celsius: number, unit: 'celsius' | 'fahrenheit'): string {
    const temp = this.convertTemperature(celsius, unit);
    const symbol = unit === 'celsius' ? '°C' : '°F';
    return `${temp}${symbol}`;
  }

  // Formátování rychlosti větru s jednotkou
  static formatWindSpeed(kmh: number, unit: 'kmh' | 'mph'): string {
    const speed = this.convertWindSpeed(kmh, unit);
    const unitText = unit === 'kmh' ? 'km/h' : 'mph';
    return `${speed} ${unitText}`;
  }

  // Získání weather condition podle kódu
  static getWeatherCondition(code: number) {
    return WEATHER_CONDITIONS[code as keyof typeof WEATHER_CONDITIONS] || {
      name: 'Neznámé počasí',
      emoji: '🌈',
      gradient: ['#87CEEB', '#E0E0E0'],
      animation: 'clouds' as WeatherAnimation['type']
    };
  }

  // Získání gradientu pro pozadí
  static getWeatherGradient(code: number, timeOfDay: 'day' | 'night' = 'day'): readonly string[] {
    const condition = this.getWeatherCondition(code);
    
    if (timeOfDay === 'night') {
      // Tmavší verze pro noc
      return condition.gradient.map(color => this.darkenColor(color, 0.4));
    }
    
    return condition.gradient;
  }

  // Ztmavení barvy (pro noční režim)
  static darkenColor(color: string, factor: number): string {
    // Jednoduchá implementace - můžeme rozšířit
    const rgb = this.hexToRgb(color);
    if (!rgb) return color;
    
    return `rgb(${Math.floor(rgb.r * (1 - factor))}, ${Math.floor(rgb.g * (1 - factor))}, ${Math.floor(rgb.b * (1 - factor))})`;
  }

  // Převod hex na RGB
  static hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }

  // Zjištění, zda je den nebo noc
  static getTimeOfDay(hour: number): 'day' | 'night' {
    return hour >= 6 && hour <= 18 ? 'day' : 'night';
  }

  // Formátování času
  static formatTime(time: string, format24h: boolean = true): string {
    const date = new Date(time);
    
    if (format24h) {
      return date.toLocaleTimeString('cs-CZ', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } else {
      return date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      });
    }
  }

  // Formátování data
  static formatDate(date: string): string {
    const dateObj = new Date(date);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Porovnání dat
    if (dateObj.toDateString() === today.toDateString()) {
      return 'Dnes';
    } else if (dateObj.toDateString() === tomorrow.toDateString()) {
      return 'Zítra';
    } else {
      return dateObj.toLocaleDateString('cs-CZ', { 
        weekday: 'short', 
        day: 'numeric',
        month: 'short'
      });
    }
  }

  // Získání relativního času ("před 5 minutami")
  static getRelativeTime(timestamp: number): string {
    const now = Date.now();
    const diffMs = now - timestamp;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);

    if (diffMins < 1) {
      return 'Právě teď';
    } else if (diffMins < 60) {
      return `Před ${diffMins} min`;
    } else if (diffHours < 24) {
      return `Před ${diffHours} hod`;
    } else {
      const diffDays = Math.floor(diffHours / 24);
      return `Před ${diffDays} dny`;
    }
  }

  // Získání UV indexu s popisem
  static getUVDescription(uvIndex: number): { level: string; color: string; description: string } {
    if (uvIndex <= 2) {
      return {
        level: 'Nízký',
        color: '#4CAF50',
        description: 'Minimální riziko'
      };
    } else if (uvIndex <= 5) {
      return {
        level: 'Střední',
        color: '#FF9800',
        description: 'Používej opalovací krém'
      };
    } else if (uvIndex <= 7) {
      return {
        level: 'Vysoký',
        color: '#FF5722',
        description: 'Opatrnost na slunci'
      };
    } else if (uvIndex <= 10) {
      return {
        level: 'Velmi vysoký',
        color: '#F44336',
        description: 'Vyhýbej se slunci'
      };
    } else {
      return {
        level: 'Extrémní',
        color: '#9C27B0',
        description: 'Nebezpečné!'
      };
    }
  }

  // Získání popisu vlhkosti
  static getHumidityDescription(humidity: number): string {
    if (humidity < 30) {
      return 'Velmi sucho';
    } else if (humidity < 50) {
      return 'Sucho';
    } else if (humidity < 70) {
      return 'Příjemně';
    } else if (humidity < 85) {
      return 'Vlhko';
    } else {
      return 'Velmi vlhko';
    }
  }

  // Získání animace podle počasí
  static getWeatherAnimation(code: number, intensity: 'light' | 'medium' | 'heavy' = 'medium'): WeatherAnimation {
    const condition = this.getWeatherCondition(code);
    
    const animations: Record<WeatherAnimation['type'], WeatherAnimation> = {
      sun: {
        type: 'sun',
        intensity,
        particles: 20,
        speed: 0.5
      },
      clouds: {
        type: 'clouds',
        intensity,
        particles: 15,
        speed: 0.3
      },
      rain: {
        type: 'rain',
        intensity,
        particles: intensity === 'light' ? 50 : intensity === 'medium' ? 100 : 200,
        speed: intensity === 'light' ? 2 : intensity === 'medium' ? 4 : 6
      },
      snow: {
        type: 'snow',
        intensity,
        particles: intensity === 'light' ? 30 : intensity === 'medium' ? 60 : 100,
        speed: intensity === 'light' ? 1 : intensity === 'medium' ? 2 : 3
      },
      storm: {
        type: 'storm',
        intensity,
        particles: 150,
        speed: 8
      },
      fog: {
        type: 'fog',
        intensity,
        particles: 40,
        speed: 0.2
      }
    };

    return animations[condition.animation] || animations.clouds;
  }

  // Zjištění, zda je počasí vhodné pro aktivity
  static getActivityRecommendation(temperature: number, conditionCode: number, windSpeed: number): {
    outdoor: boolean;
    activity: string;
    reason: string;
  } {
        
    // Bouře nebo silný déšť
    if (conditionCode >= 1273 || conditionCode === 1186) {
      return {
        outdoor: false,
        activity: 'Zůstaň doma',
        reason: 'Nebezpečné počasí'
      };
    }

    // Velmi horko nebo zima
    if (temperature > 35) {
      return {
        outdoor: false,
        activity: 'Zůstaň v chládku',
        reason: 'Příliš horko'
      };
    }

    if (temperature < -10) {
      return {
        outdoor: false,
        activity: 'Zahřej se uvnitř',
        reason: 'Mrzne'
      };
    }

    // Mírný déšť
    if (conditionCode >= 1180 && conditionCode <= 1183) {
      return {
        outdoor: true,
        activity: 'Nezapomeň deštník',
        reason: 'Lehký déšť'
      };
    }

    // Sněžení
    if (conditionCode >= 1210 && conditionCode <= 1225) {
      return {
        outdoor: true,
        activity: 'Oblíkni se teplo',
        reason: 'Sněží'
      };
    }

    // Silný vítr
    if (windSpeed > 30) {
      return {
        outdoor: false,
        activity: 'Pozor na vítr',
        reason: 'Větrno'
      };
    }

    // Ideální počasí
    if (temperature >= 15 && temperature <= 25 && conditionCode <= 1003) {
      return {
        outdoor: true,
        activity: 'Perfektní na procházku!',
        reason: 'Krásné počasí'
      };
    }

    // Defaultní doporučení
    return {
      outdoor: true,
      activity: 'Běž ven a užij si to!',
      reason: 'Docela fajn počasí'
    };
  }

  // Odhad oblečení podle počasí
  static getClothingRecommendation(temperature: number, conditionCode: number): {
    items: string[];
    emoji: string;
  } {
    const items: string[] = [];
    let emoji = '👕';

    if (temperature < 0) {
      items.push('Zimní bunda', 'Čepice', 'Rukavice', 'Šála', 'Teplé boty');
      emoji = '🧥';
    } else if (temperature < 10) {
      items.push('Bunda', 'Svetr', 'Dlouhé kalhoty');
      emoji = '🧥';
    } else if (temperature < 20) {
      items.push('Mikina', 'Dlouhé kalhoty');
      emoji = '👔';
    } else if (temperature < 25) {
      items.push('Tričko', 'Lehká bunda');
      emoji = '👕';
    } else {
      items.push('Tričko', 'Kraťasy');
      emoji = '👕';
    }

    // Přidání podle počasí
    if (conditionCode >= 1180) { // Déšť
      items.push('Deštník', 'Nepromokavá bunda');
    }

    if (conditionCode >= 1210) { // Sníh
      items.push('Voděodolné boty');
    }

    return { items, emoji };
  }
}

// Překlad počasí do češtiny
export const translateWeatherCondition = (englishCondition: string): string => {
  const translations: { [key: string]: string } = {
    // Slunečno
    'Clear': 'Jasno',
    'Sunny': 'Slunečno',
    'Fair': 'Příjemné počasí',
    
    // Oblačno
    'Partly cloudy': 'Polojasno',
    'Partly Cloudy': 'Polojasno',
    'Mostly cloudy': 'Převážně oblačno',
    'Mostly Cloudy': 'Převážně oblačno',
    'Cloudy': 'Oblačno',
    'Overcast': 'Zataženo',
    
    // Déšť
    'Light rain': 'Slabý déšť',
    'Light Rain': 'Slabý déšť',
    'Rain': 'Déšť',
    'Heavy rain': 'Silný déšť',
    'Heavy Rain': 'Silný déšť',
    'Drizzle': 'Mrholení',
    'Showers': 'Přeháňky',
    'Light drizzle': 'Slabé mrholení',
    
    // Sníh
    'Snow': 'Sníh',
    'Light snow': 'Slabé sněžení',
    'Heavy snow': 'Silné sněžení',
    'Sleet': 'Déšť se sněhem',
    'Freezing rain': 'Mrznoucí déšť',
    
    // Bouřky
    'Thunderstorm': 'Bouřka',
    'Thunder': 'Bouřka',
    'Storm': 'Bouře',
    
    // Mlha
    'Fog': 'Mlha',
    'Mist': 'Opar',
    'Haze': 'Lehká mlha',
    
    // Vítr
    'Windy': 'Větrno',
    'Breezy': 'Mírný vítr',
    
    // Ostatní
    'Hot': 'Horko',
    'Cold': 'Zima',
    'Humid': 'Vlhko',
    'Dry': 'Sucho',
  };

  return translations[englishCondition] || englishCondition;
};