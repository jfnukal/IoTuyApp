// src/api/geoAPI.ts

/**
 * Definice čistého datového formátu pro jednu geografickou lokaci.
 */
 export interface LocationData {
  name: string;
  country: string;
  lat: number;
  lon: number;
}

class GeoAPI {
  // Používáme stejný API klíč jako pro počasí, protože vyhledávání je součástí stejné služby.
  private readonly API_KEY = import.meta.env.VITE_WEATHER_API_KEY;
  private readonly BASE_URL = 'https://api.weatherapi.com/v1';

  constructor() {
    if (!this.API_KEY) {
      console.warn('VITE_WEATHER_API_KEY nebyl nalezen. Vyhledávání měst nebude fungovat.');
    }
  }

  /**
   * Vyhledá lokace (města) podle zadaného textového dotazu.
   * @param query - Hledaný název města (např. "Brno")
   * @returns Pole nalezených lokací ve formátu LocationData[]
   */
  async searchLocations(query: string): Promise<LocationData[]> {
    // Pokud je dotaz příliš krátký nebo prázdný, nebudeme API zatěžovat.
    if (!query || query.length < 2) {
      return [];
    }

    try {
      // Sestavení a odeslání dotazu na API
      const response = await fetch(
        `${this.BASE_URL}/search.json?key=${this.API_KEY}&q=${encodeURIComponent(query)}`
      );

      // Kontrola, zda odpověď z API byla úspěšná
      if (!response.ok) {
        throw new Error(`Chyba při komunikaci s API: ${response.status}`);
      }

      const locations = await response.json();

      // Pojistka pro případ, že API nevrátí pole (např. při chybě klíče)
      if (!Array.isArray(locations)) {
        console.error('API pro vyhledávání měst nevrátilo platná data:', locations);
        return [];
      }

      // Převedeme data z API na náš čistý formát LocationData
      return locations.map((loc: any) => ({
        name: loc.name,
        country: loc.country,
        lat: loc.lat,
        lon: loc.lon,
      }));
    } catch (error) {
      console.error('Došlo k chybě ve funkci searchLocations:', error);
      return []; // V případě jakékoliv chyby vrátíme prázdné pole, aby aplikace nespadla.
    }
  }
}

/**
 * Exportujeme jednu sdílenou instanci třídy GeoAPI,
 * kterou budeme používat v celé aplikaci.
 */
export const geoAPI = new GeoAPI();