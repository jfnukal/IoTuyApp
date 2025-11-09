// src/components/Widgets/Weather/api/weatherAPI.ts
import { configService } from '../../../../services/configService';

interface WeatherAPIResponse {
  current: {
    temp_c: number;
    condition: {
      text: string;
      icon: string;
      code: number;
    };
    humidity: number;
    wind_kph: number;
    feelslike_c: number;
    uv: number;
    vis_km: number;
  };
  forecast: {
    forecastday: Array<{
      date: string;
      day: {
        maxtemp_c: number;
        mintemp_c: number;
        condition: {
          text: string;
          icon: string;
          code: number;
        };
        chance_of_rain: number;
        chance_of_snow: number;
      };
      hour: Array<{
        time: string;
        temp_c: number;
        condition: {
          text: string;
          icon: string;
          code: number;
        };
        chance_of_rain: number;
        humidity: number;
        wind_kph: number;
      }>;
    }>;
  };
}

export interface WeatherData {
  location: {
    name: string;
    country: string;
    lat: number;
    lon: number;
  };
  current: {
    temperature: number;
    condition: string;
    conditionCode: number;
    humidity: number;
    windSpeed: number;
    feelsLike: number;
    uvIndex: number;
    visibility: number;
    iconUrl: string;
  };
  hourly: Array<{
    time: string;
    temperature: number;
    condition: string;
    conditionCode: number;
    chanceOfRain: number;
    humidity: number;
    windSpeed: number;
    iconUrl: string;
  }>;
  daily: Array<{
    date: string;
    maxTemp: number;
    minTemp: number;
    condition: string;
    conditionCode: number;
    chanceOfRain: number;
    chanceOfSnow: number;
    iconUrl: string;
  }>;
  alerts?: Array<{
    title: string;
    description: string;
    severity: 'minor' | 'moderate' | 'severe' | 'extreme';
  }>;
}

export interface LocationData {
  name: string;
  country: string;
  lat: number;
  lon: number;
  isGPS?: boolean;
}

class WeatherAPI {
  private readonly BASE_URL = 'https://api.weatherapi.com/v1';
  private apiKey: string | null = null;

  constructor() {
    // API klíč se načte asynchronně při prvním použití
    this.loadApiKey();
  }

  /**
   * Načte API klíč z Firebase
   */
  private async loadApiKey(): Promise<void> {
    try {
      this.apiKey = await configService.getApiKey('weather');
    } catch (error) {
      console.error('❌ Nepodařilo se načíst Weather API klíč:', error);
    }
  }

  /**
   * Zajistí, že máme API klíč před voláním
   */
  private async ensureApiKey(): Promise<string> {
    if (!this.apiKey) {
      this.apiKey = await configService.getApiKey('weather');
    }
    if (!this.apiKey) {
      throw new Error('Weather API klíč není dostupný');
    }
    return this.apiKey;
  }

  // Získání počasí pro město/obec
  async getWeatherByCity(
    cityName: string,
    days: number = 7
  ): Promise<WeatherData> {
    try {
      const apiKey = await this.ensureApiKey();

      const response = await fetch(
        `${this.BASE_URL}/forecast.json?key=${apiKey}&q=${encodeURIComponent(
          cityName
        )}&days=${days}&aqi=no&alerts=yes`
      );

      if (!response.ok) {
        throw new Error(`Weather API Error: ${response.status}`);
      }

      const data: WeatherAPIResponse = await response.json();
      return this.transformWeatherData(data, cityName);
    } catch (error) {
      console.error('Error fetching weather by city:', error);
      throw error;
    }
  }

  // Získání počasí pro GPS souřadnice
  async getWeatherByCoordinates(
    lat: number,
    lon: number,
    days: number = 7
  ): Promise<WeatherData> {
    try {
      const apiKey = await this.ensureApiKey();

      const response = await fetch(
        `${this.BASE_URL}/forecast.json?key=${apiKey}&q=${lat},${lon}&days=${days}&aqi=no&alerts=yes`
      );

      if (!response.ok) {
        throw new Error(`Weather API Error: ${response.status}`);
      }

      const data: WeatherAPIResponse = await response.json();
      return this.transformWeatherData(
        data,
        `GPS: ${lat.toFixed(2)}, ${lon.toFixed(2)}`
      );
    } catch (error) {
      console.error('Error fetching weather by coordinates:', error);
      throw error;
    }
  }

  // Vyhledání měst podle názvu
  async searchLocations(query: string): Promise<LocationData[]> {
    try {
      const apiKey = await this.ensureApiKey();

      const response = await fetch(
        `${this.BASE_URL}/search.json?key=${apiKey}&q=${encodeURIComponent(
          query
        )}`
      );

      if (!response.ok) {
        throw new Error(`Location search error: ${response.status}`);
      }

      const locations = await response.json();
      return locations.map((loc: any) => ({
        name: loc.name,
        country: loc.country,
        lat: loc.lat,
        lon: loc.lon,
      }));
    } catch (error) {
      console.error('Error searching locations:', error);
      return [];
    }
  }

  // Získání aktuální GPS pozice uživatele
  async getCurrentLocation(): Promise<{ lat: number; lon: number }> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by this browser'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lon: position.coords.longitude,
          });
        },
        (error) => {
          reject(error);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000, // 5 minut cache
        }
      );
    });
  }

  // Transformace dat z API do našeho formátu
  private transformWeatherData(data: any, locationName: string): WeatherData {
    const current = data.current;
    const forecast = data.forecast;

    return {
      location: {
        name: data.location?.name || locationName,
        country: data.location?.country || 'CZ',
        lat: data.location?.lat || 0,
        lon: data.location?.lon || 0,
      },
      current: {
        temperature: Math.round(current.temp_c),
        condition: current.condition.text,
        conditionCode: current.condition.code,
        humidity: current.humidity,
        windSpeed: Math.round(current.wind_kph),
        feelsLike: Math.round(current.feelslike_c),
        uvIndex: current.uv,
        visibility: Math.round(current.vis_km),
        iconUrl: current.condition.icon,
      },
      hourly: forecast.forecastday[0].hour.map((hour: any) => ({
        time: hour.time,
        temperature: Math.round(hour.temp_c),
        condition: hour.condition.text,
        conditionCode: hour.condition.code,
        chanceOfRain: hour.chance_of_rain,
        humidity: hour.humidity,
        windSpeed: Math.round(hour.wind_kph),
        iconUrl: hour.condition.icon,
      })),
      daily: forecast.forecastday.map((day: any) => ({
        date: day.date,
        maxTemp: Math.round(day.day.maxtemp_c),
        minTemp: Math.round(day.day.mintemp_c),
        condition: day.day.condition.text,
        conditionCode: day.day.condition.code,
        chanceOfRain: day.day.chance_of_rain,
        chanceOfSnow: day.day.chance_of_snow,
        iconUrl: day.day.condition.icon,
      })),
    };
  }

  // Hravé komentáře k počasí
  getPlayfulComment(conditionCode: number, temperature: number): string {
    const comments = {
      sunny: [
        '☀️ Nádherný den! Jdi si užít sluníčko!',
        '😎 Prima počasí na venkovní aktivity!',
        '🌞 Slunce svítí! Nezapomeň na sluneční brýle!',
        '🏖️ Ideální den na výlet!',
      ],
      cloudy: [
        '☁️ Trochu zataženo, ale pořád fajn!',
        '🌥️ Pěkný den i bez sluníčka!',
        '⛅ Mraky přinesou trochu klidu!',
      ],
      rainy: [
        '🌧️ Prší! Nezapomeň deštník!',
        '☔ Perfektní počasí na povídání u kávy!',
        '💧 Déšť je dobrý pro zahrádku!',
        '🌂 Doma je teď nejlíp!',
      ],
      snowy: [
        '❄️ Sněží! Čas na sněhuláka!',
        '⛄ Perfektní počasí na zimní radovánky!',
        '🛷 Nezapomeň na teplé oblečení!',
        '🧣 Oblíkni si čepici a rukavice!',
      ],
      stormy: [
        '⛈️ Bouřka! Zůstaň raději doma!',
        '🌩️ Počkej, až bouřka přejde!',
        '🏠 Ideální čas na hraní her doma!',
      ],
      hot: [
        '🔥 Horko! Nezapomeň pít hodně vody!',
        '🌡️ Hledej stín a zůstaň v chládku!',
        '🏊‍♂️ Prima počasí na koupání!',
        '🍦 Čas na zmrzlinu!',
      ],
      cold: [
        '🥶 Zima! Oblíkni si teplé oblečení!',
        '🧥 Nezapomeň na bundu!',
        '☕ Čas na horký čaj!',
        '🏠 Zůstaň v teple!',
      ],
    };

    // Logika pro výběr komentáře podle kódu počasí a teploty
    if (temperature >= 25) {
      return comments.hot[Math.floor(Math.random() * comments.hot.length)];
    } else if (temperature <= 5) {
      return comments.cold[Math.floor(Math.random() * comments.cold.length)];
    } else if (conditionCode >= 1000 && conditionCode <= 1003) {
      return comments.sunny[Math.floor(Math.random() * comments.sunny.length)];
    } else if (conditionCode >= 1006 && conditionCode <= 1030) {
      return comments.cloudy[
        Math.floor(Math.random() * comments.cloudy.length)
      ];
    } else if (conditionCode >= 1063 && conditionCode <= 1201) {
      return comments.rainy[Math.floor(Math.random() * comments.rainy.length)];
    } else if (conditionCode >= 1204 && conditionCode <= 1282) {
      return comments.snowy[Math.floor(Math.random() * comments.snowy.length)];
    } else if (conditionCode >= 1273 && conditionCode <= 1282) {
      return comments.stormy[
        Math.floor(Math.random() * comments.stormy.length)
      ];
    }

    return comments.sunny[0]; // výchozí komentář
  }
}

export const weatherAPI = new WeatherAPI();
