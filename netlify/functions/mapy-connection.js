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
    console.error('❌ Chybí MAPY_CZ_API_KEY v environment variables');
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Chybí API klíč pro Mapy.cz' }),
    };
  }

  try {
    console.log('🚀 Hledám spojení přes Mapy.cz API');
    console.log('📍 Z:', from, '→ Do:', to);
    console.log('🔑 API klíč (prvních 10 znaků):', API_KEY.substring(0, 10) + '...');

    // VARIANTA 1: GET request s API klíčem v URL
    const searchUrl = `https://api.mapy.cz/v1/routing?start=${encodeURIComponent(from)}&end=${encodeURIComponent(to)}&routeType=pubtran&apikey=${API_KEY}`;

    console.log('📡 Volám Mapy.cz API (GET s apikey v URL)...');

    let response = await fetch(searchUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Pokud GET nefunguje (401/403), zkusíme s API klíčem v headerech
    if (response.status === 401 || response.status === 403) {
      console.log('⚠️ GET s apikey v URL selhal, zkouším s API klíčem v headerech...');
      
      const searchUrlNoKey = `https://api.mapy.cz/v1/routing?start=${encodeURIComponent(from)}&end=${encodeURIComponent(to)}&routeType=pubtran`;
      
      response = await fetch(searchUrlNoKey, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`,
          'X-API-Key': API_KEY,
          'api-key': API_KEY,
        },
      });
    }

    // Pokud stále nefunguje, zkusíme POST
    if (response.status === 401 || response.status === 403) {
      console.log('⚠️ GET s headery selhal, zkouším POST request...');
      
      response = await fetch('https://api.mapy.cz/v1/routing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`,
          'X-API-Key': API_KEY,
        },
        body: JSON.stringify({
          start: from,
          end: to,
          routeType: 'pubtran',
          apikey: API_KEY,
        }),
      });
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Mapy.cz API error:', response.status, errorText);
      
      return {
        statusCode: response.status,
        headers,
        body: JSON.stringify({ 
          error: `Mapy.cz API chyba: ${response.status}`,
          details: errorText,
          hint: 'Zkontroluj API klíč na developer.mapy.cz'
        }),
      };
    }

    const data = await response.json();
    console.log('✅ Data získána z Mapy.cz');
    console.log('📦 Struktura odpovědi:', JSON.stringify(data, null, 2).substring(0, 500) + '...');

    // Parse odpovědi - struktura se může lišit
    let departureTime = 'N/A';
    let arrivalTime = 'N/A';
    let line = 'N/A';

    // Pokusíme se najít data na různých místech ve struktuře
    if (data.result && data.result.routes && data.result.routes.length > 0) {
      const firstRoute = data.result.routes[0];
      
      if (firstRoute.summary) {
        departureTime = formatTime(firstRoute.summary.departureTime || firstRoute.summary.departure);
        arrivalTime = formatTime(firstRoute.summary.arrivalTime || firstRoute.summary.arrival);
      }
      
      if (firstRoute.legs && firstRoute.legs.length > 0) {
        const firstLeg = firstRoute.legs[0];
        if (firstLeg.line) {
          line = firstLeg.line.name || firstLeg.line.shortName || firstLeg.line;
        }
        if (departureTime === 'N/A' && firstLeg.departure) {
          departureTime = formatTime(firstLeg.departure.time || firstLeg.departure);
        }
        if (arrivalTime === 'N/A' && firstRoute.legs[firstRoute.legs.length - 1].arrival) {
          arrivalTime = formatTime(firstRoute.legs[firstRoute.legs.length - 1].arrival.time || firstRoute.legs[firstRoute.legs.length - 1].arrival);
        }
      }
    } else if (data.routes && data.routes.length > 0) {
      // Alternativní struktura
      const firstRoute = data.routes[0];
      
      if (firstRoute.legs && firstRoute.legs.length > 0) {
        const firstLeg = firstRoute.legs[0];
        const lastLeg = firstRoute.legs[firstRoute.legs.length - 1];
        
        departureTime = formatTime(firstLeg.departure?.time || firstLeg.departureTime);
        arrivalTime = formatTime(lastLeg.arrival?.time || lastLeg.arrivalTime);
        line = firstLeg.line?.name || firstLeg.line?.shortName || 'N/A';
      }
    } else {
      console.log('❌ Žádné spojení nenalezeno v odpovědi');
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ 
          error: 'Spojení nenalezeno',
          debug: 'Mapy.cz API nevrátilo žádné trasy'
        }),
      };
    }

    const result = {
      departureTime,
      arrivalTime,
      line,
    };

    console.log('✅ Spojení nalezeno:', result);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(result),
    };

  } catch (error) {
    console.error('❌ Chyba při vyhledávání spojení:', error);
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

/**
 * Pomocná funkce pro formátování času
 */
function formatTime(timeString) {
  if (!timeString || timeString === 'N/A') return 'N/A';
  
  try {
    // Pokud je to timestamp (number)
    if (typeof timeString === 'number') {
      const date = new Date(timeString * 1000);
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      return `${hours}:${minutes}`;
    }
    
    // Pokud je to ISO string
    if (typeof timeString === 'string' && timeString.includes('T')) {
      const date = new Date(timeString);
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      return `${hours}:${minutes}`;
    }
    
    // Pokud už je to ve formátu HH:MM
    if (typeof timeString === 'string' && timeString.includes(':')) {
      return timeString;
    }
    
    return timeString.toString();
  } catch (error) {
    console.error('Chyba při formátování času:', error);
    return 'N/A';
  }
}
