// src/api/weatherAPI.ts
// Free Weather API using OpenWeatherMap (free tier: 1000 calls/day)

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
  private readonly API_KEY = import.meta.env.VITE_WEATHER_API_KEY;
  private readonly BASE_URL = 'https://api.weatherapi.com/v1';

  constructor() {
    if (!this.API_KEY) {
      console.warn('Weather API key not found. Please add VITE_WEATHER_API_KEY to your .env file');
    }
  }

  // Získání počasí pro město/obec
  async getWeatherByCity(cityName: string, days: number = 7): Promise<WeatherData> {
    try {
      const response = await fetch(
        `${this.BASE_URL}/forecast.json?key=${this.API_KEY}&q=${encodeURIComponent(cityName)}&days=${days}&aqi=no&alerts=yes`
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
  async getWeatherByCoordinates(lat: number, lon: number, days: number = 7): Promise<WeatherData> {
    try {
      const response = await fetch(
        `${this.BASE_URL}/forecast.json?key=${this.API_KEY}&q=${lat},${lon}&days=${days}&aqi=no&alerts=yes`
      );

      if (!response.ok) {
        throw new Error(`Weather API Error: ${response.status}`);
      }

      const data: WeatherAPIResponse = await response.json();
      return this.transformWeatherData(data, `GPS: ${lat.toFixed(2)}, ${lon.toFixed(2)}`);
    } catch (error) {
      console.error('Error fetching weather by coordinates:', error);
      throw error;
    }
  }

  // Vyhledání městě podle názvu
  async searchLocations(query: string): Promise<LocationData[]> {
    try {
      const response = await fetch(
        `${this.BASE_URL}/search.json?key=${this.API_KEY}&q=${encodeURIComponent(query)}`
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
        visibility: current.vis_km,
        iconUrl: `https:${current.condition.icon}`.replace('64x64', '128x128'),
      },
      hourly: forecast.forecastday[0]?.hour?.slice(0, 24).map((hour: any) => ({
        time: hour.time,
        temperature: Math.round(hour.temp_c),
        condition: hour.condition.text,
        conditionCode: hour.condition.code,
        chanceOfRain: hour.chance_of_rain,
        humidity: hour.humidity,
        windSpeed: Math.round(hour.wind_kph),
        iconUrl: `https:${hour.condition.icon}`.replace('64x64', '128x128'),
      })) || [],
      daily: forecast.forecastday?.map((day: any) => ({
        date: day.date,
        maxTemp: Math.round(day.day.maxtemp_c),
        minTemp: Math.round(day.day.mintemp_c),
        condition: day.day.condition.text,
        conditionCode: day.day.condition.code,
        chanceOfRain: day.day.chance_of_rain,
        chanceOfSnow: day.day.chance_of_snow || 0,
        iconUrl: `https:${day.day.condition.icon}`.replace('64x64', '128x128'),
      })) || [],
      alerts: data.alerts?.alert?.map((alert: any) => ({
        title: alert.headline,
        description: alert.desc,
        severity: this.mapAlertSeverity(alert.severity),
      })) || [],
    };
  }

  private mapAlertSeverity(severity: string): 'minor' | 'moderate' | 'severe' | 'extreme' {
    switch (severity?.toLowerCase()) {
      case 'extreme':
        return 'extreme';
      case 'severe':
        return 'severe';
      case 'moderate':
        return 'moderate';
      default:
        return 'minor';
    }
  }

  // Získání hravých komentářů pro děti
  getPlayfulComment(conditionCode: number, temperature: number): string {
    const comments = {
      sunny: [
        '☀️ Krásně svítí sluníčko! Běž si užít ven!',
        '🌞 Perfektní počasí na hraní venku!',
        '😎 Nezapomeň na sluneční brýle!',
        '🏃‍♂️ Ideální den na sportování!',
      ],
      cloudy: [
        '☁️ Oblačno, ale pořád se dá hrát venku!',
        '🌤️ Občas se ukáže sluníčko!',
        '🎈 Prima počasí na procházku!',
      ],
      rainy: [
        '🌧️ Prší! Nezapomeň na deštník!',
        '☔ Vem si pláštěnku a běž si hrát do louží!',
        '🌦️ Ideální počasí na čtení knihy doma!',
        '💧 Rostlinky budou mít radost z deštíčku!',
      ],
      snowy: [
        '❄️ Sněží! Čas na sněhuláka!',
        '⛄ Perfektní počasí na zimní radovánky!',
        '🛷 Nezapomeň na teplé oblečení!',
        '🧣 Oblíkni si čepici a rukavice!',
      ],
      stormy: [
        '⛈️ Bouřka! Zůstaň radši doma!',
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
      return comments.cloudy[Math.floor(Math.random() * comments.cloudy.length)];
    } else if (conditionCode >= 1063 && conditionCode <= 1201) {
      return comments.rainy[Math.floor(Math.random() * comments.rainy.length)];
    } else if (conditionCode >= 1204 && conditionCode <= 1282) {
      return comments.snowy[Math.floor(Math.random() * comments.snowy.length)];
    } else if (conditionCode >= 1273 && conditionCode <= 1282) {
      return comments.stormy[Math.floor(Math.random() * comments.stormy.length)];
    }

    return comments.sunny[0]; // výchozí komentář
  }
}

export const weatherAPI = new WeatherAPI();