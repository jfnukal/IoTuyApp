exports.handler = async function (event, context) {
  console.log('=== IMAGE PROXY REQUEST ===');

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

    const imageUrl = event.queryStringParameters?.url;

    if (!imageUrl) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing url parameter' }),
      };
    }

    console.log('Fetching image from:', imageUrl);

    const response = await fetch(imageUrl);

    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status}`);
    }

    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const buffer = await response.arrayBuffer();

    return {
      statusCode: 200,
      headers: {
        ...headers,
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600',
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
```

---

## 🚀 Commit & Push

1. **Ulož změny**
2. **Commit & Push**
3. **Netlify automaticky nasadí image-proxy funkci**
4. **Obrázek by se měl načíst! 📸**

---

## 🎯 Jak to funguje:
```
Prohlížeč → Netlify Proxy → AWS S3 → Netlify Proxy → Prohlížeč
           (obchází CORS)
