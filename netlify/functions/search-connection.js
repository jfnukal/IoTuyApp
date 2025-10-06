// netlify/functions/mapy-connection.js
export const handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  const { from, to } = event.queryStringParameters || {};

  if (!from || !to) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Chybí parametry "from" a "to"' }),
    };
  }

  const API_KEY = process.env.MAPY_CZ_API_KEY;

  if (!API_KEY) {
    console.error('❌ Chybí MAPY_CZ_API_KEY');
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Chybí API klíč' }),
    };
  }

  try {
    console.log('🚀 Hledám spojení:', from, '→', to);

    // API endpoint pro vyhledání trasy
    const apiUrl = `https://api.mapy.cz/v1/routing/route`;
    
    const requestBody = {
      start: from,
      end: to,
      routeType: 'pubtran', // veřejná doprava
      apikey: API_KEY,
    };

    console.log('📡 Volám Mapy.cz API...');

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ API error:', response.status, errorText);
      throw new Error(`Mapy.cz API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('✅ Data získána');

    // Parse odpovědi a vyhledej první spojení
    if (!data.routes || data.routes.length === 0) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Spojení nenalezeno' }),
      };
    }

    const firstRoute = data.routes[0];
    
    // Extrahuj informace o spoji
    const departureTime = firstRoute.legs?.[0]?.departure?.time || 'N/A';
    const arrivalTime = firstRoute.legs?.[firstRoute.legs.length - 1]?.arrival?.time || 'N/A';
    const line = firstRoute.legs?.[0]?.line?.name || 'N/A';

    const result = {
      departureTime: formatTime(departureTime),
      arrivalTime: formatTime(arrivalTime),
      line: line,
    };

    console.log('✅ Spojení nalezeno:', result);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(result),
    };

  } catch (error) {
    console.error('❌ Chyba:', error.message);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Chyba při vyhledávání spojení',
        details: error.message,
      }),
    };
  }
};

// Pomocná funkce pro formátování času
function formatTime(timeString) {
  if (!timeString || timeString === 'N/A') return 'N/A';
  
  try {
    // Pokud je to timestamp nebo ISO string
    const date = new Date(timeString);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  } catch {
    // Pokud už je to ve formátu HH:MM
    return timeString;
  }
}
