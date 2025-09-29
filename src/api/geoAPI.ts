// src/api/geoAPI.ts
// Používáme OpenStreetMap Nominatim API - free, žádný API key

export interface GeoLocation {
  name: string;
  displayName: string;
  country: string;
  countryCode: string;
  state?: string;
  lat: number;
  lon: number;
  importance: number; // Pro řazení výsledků
}

class GeoAPI {
  private readonly BASE_URL = 'https://nominatim.openstreetmap.org/search';

  async searchLocations(query: string): Promise<GeoLocation[]> {
    if (query.length < 2) return [];
  
    try {
      const params = new URLSearchParams({
        q: query,
        format: 'json',
        addressdetails: '1',
        limit: '10',
        'accept-language': 'cs,en',
        countrycodes: 'cz,sk,at,de,pl,hu',
      });
  
      const fullUrl = `${this.BASE_URL}?${params}`;
      console.log('Making request to:', fullUrl);
  
      const response = await fetch(fullUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'IoTuyApp Weather Widget',
          'Accept': 'application/json',
        },
        mode: 'cors'
      });
  
      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);
  
      if (!response.ok) {
        throw new Error(`Geo API Error: ${response.status} ${response.statusText}`);
      }
  
      const data = await response.json();
      console.log('Raw API response:', data);
  
      if (!Array.isArray(data)) {
        console.error('API response is not an array:', data);
        return [];
      }
  
      const filteredData = data.filter((item: any) => {
        // Rozšíříme povolené typy o administrative pro města
        const validTypes = ['city', 'town', 'village', 'municipality', 'administrative'];
        const validClasses = ['city', 'town', 'village', 'municipality', 'boundary', 'place'];
        
        const hasValidType = validTypes.includes(item.type) || validClasses.includes(item.class);
        
        // Navíc zkontrolujme, jestli má address.city nebo address.town
        const hasAddress = item.address && (item.address.city || item.address.town || item.address.village);
        
        const isValid = hasValidType || hasAddress;
        
        console.log('Item:', item.name, 'Type:', item.type, 'Class:', item.class, 'Address:', item.address, 'Valid:', isValid);
        return isValid;
      });
  
      console.log('Filtered results count:', filteredData.length);
  
      const mappedResults = filteredData.map((item: any) => ({
        name: item.name || item.display_name.split(',')[0],
        displayName: this.formatDisplayName(item),
        country: item.address?.country || 'Unknown',
        countryCode: item.address?.country_code?.toUpperCase() || 'XX',
        state: item.address?.state,
        lat: parseFloat(item.lat),
        lon: parseFloat(item.lon),
        importance: parseFloat(item.importance) || 0,
      }));
  
      console.log('Mapped results:', mappedResults);
  
      return mappedResults
        .sort((a: GeoLocation, b: GeoLocation) => {
          if (a.countryCode === 'CZ' && b.countryCode !== 'CZ') return -1;
          if (b.countryCode === 'CZ' && a.countryCode !== 'CZ') return 1;
          return b.importance - a.importance;
        })
        .slice(0, 8);
  
    } catch (error) {
      console.error('Error searching locations:', error);
      return [];
    }
  }

  private formatDisplayName(item: any): string {
    const parts = [];
    
    if (item.name) {
      parts.push(item.name);
    }
    
    if (item.address?.state && item.address.state !== item.name) {
      parts.push(item.address.state);
    }
    
    if (item.address?.country) {
      parts.push(item.address.country);
    }

    return parts.join(', ');
  }

  // Pro česká města můžeme přidat speciální metodu s RUIAN
  async searchCzechCities(query: string): Promise<GeoLocation[]> {
    // Toto by bylo rozšíření s RUIAN API, pokud bude potřeba
    // Pro teď používáme Nominatim, který má dobré pokrytí ČR
    return this.searchLocations(`${query}, Czech Republic`);
  }
}

export const geoAPI = new GeoAPI();