exports.handler = async function (event, context) {
  console.log('=== IMAGE PROXY REQUEST ===');

  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

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
        'Cache-Control': 'public, max-age=3600', // Cache na 1 hodinu
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
};