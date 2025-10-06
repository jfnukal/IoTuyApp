/**
 * @file Obsahuje funkce pro komunikaci s API pro dopravní spojení.
 */

const USE_MOCK = import.meta.env.VITE_USE_MOCK_TRANSPORT === 'true';

/**
 * Reprezentuje jedno nalezené dopravní spojení.
 */
export interface TransportConnection {
  departureTime: string;
  arrivalTime: string;
  line: string;
}

/**
 * Vyhledá dopravní spojení z bodu A do bodu B.
 *
 * @param from Počáteční místo cesty.
 * @param to Cílové místo cesty.
 * @returns Objekt s informacemi o prvním nalezeném spojení.
 * @throws Vyhodí chybu, pokud se nepodaří spojení načíst.
 */
export async function findConnection(
  from: string,
  to: string
): Promise<TransportConnection> {

  // Mock data pro lokální vývoj
  if (USE_MOCK) {
    const { MOCK_CONNECTIONS } = await import('./transportationMockData');
    const key = from.includes('Brantice') ? 'Brantice-Zátor' : 'Krnov-Bruntál';
    
    // Simulace načítání
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return MOCK_CONNECTIONS[key];
  }

  console.log('🗺️ Volám Mapy.cz API přes Netlify funkci');

  // Volání na novou Netlify funkci s Mapy.cz API
  const apiUrl = `/.netlify/functions/mapy-connection?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;

  try {
    const response = await fetch(apiUrl);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Neznámá chyba serveru' }));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    const data: TransportConnection = await response.json();
    return data;
  } catch (error) {
    console.error('Chyba při vyhledávání spojení:', error);
    throw error;
  }
}
