const { protect } = require('../lib/familyAuth.cjs');

async function handler(event, context) {
  console.log('=== IMAGE PROXY REQUEST ===');

  // CORS doplní protect()
  const headers = { 'Content-Type': 'application/json' };

  try {
    if (event.httpMethod !== 'GET') {
      return {
        statusCode: 405,
        headers,
        body: JSON.stringify({ error: 'Method not allowed' }),
      };
    }

    // Získej URL z query parametru
    const imageUrl = event.queryStringParameters?.url;

    if (!imageUrl) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing url parameter' }),
      };
    }

    console.log('Fetching image from:', imageUrl);

    // Stáhni obrázek
    const response = await fetch(imageUrl);

    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status}`);
    }

    // Získej content type
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    
    // Získej obrázek jako buffer
    const buffer = await response.arrayBuffer();

    // Vrať obrázek
    return {
      statusCode: 200,
      headers: {
        ...headers,
        'Content-Type': contentType,
        // Cache na 1 hodinu — jen v prohlížeči (private), odpověď je pro přihlášeného
        'Cache-Control': 'private, max-age=3600',
      },
      body: Buffer.from(buffer).toString('base64'),
      isBase64Encoded: true,
    };
  } catch (error) {
    console.error('=== IMAGE PROXY ERROR ===');
    console.error('Error:', error.message);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to proxy image',
        message: error.message,
      }),
    };
  }
}

// Jen pro přihlášenou rodinu (jinak by to byl otevřený proxy server na cizí
// účet), CORS jen pro vlastní web (netlify/lib/familyAuth.cjs)
exports.handler = protect(handler, { methods: 'GET' });