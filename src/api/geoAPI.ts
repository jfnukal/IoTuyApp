// src/api/geoAPI.ts
import { configService } from '../services/configService';

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

  /**
   * Vyhledá lokace (města) podle zadaného textového dotazu.
   * @param query - Hledaný název města (např. "Brno")
   * @returns Pole nalezených lokací ve formátu LocationData[]
   */
  searchLocations = async (query: string): Promise<LocationData[]> => {
    // Pokud je dotaz příliš krátký nebo prázdný, nebudeme API zatěžovat.
    if (!query || query.length < 2) {
      return [];
    }

    try {
      // Získáme API klíč
      const apiKey = await this.ensureApiKey();

      // Sestavení a odeslání dotazu na API
      const response = await fetch(
        `${this.BASE_URL}/search.json?key=${apiKey}&q=${encodeURIComponent(query)}`
      );

      // Kontrola, zda odpověď z API byla úspěšná
      if (!response.ok) {
        throw new Error(`Chyba při komunikaci s API: ${response.status}`);
      }

      const locations = await response.json();

      // Pojistka pro případ, že API nevrátí pole (např. při chybě klíče)
      if (!Array.isArray(locations)) {
        console.error(
          'API pro vyhledávání měst nevrátilo platná data:',
          locations
        );
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
  };
}

/**
 * Exportujeme jednu sdílenou instanci třídy GeoAPI,
 * kterou budeme používat v celé aplikaci.
 */
export const geoAPI = new GeoAPI();