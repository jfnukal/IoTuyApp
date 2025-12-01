const crypto = require('crypto');

// Funkce pro HTTP požadavky
async function fetchWithTimeout(url, options, timeout = 10000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
}

// Funkce pro získání access tokenu
async function getTuyaAccessToken(clientId, clientSecret) {
  const timestamp = Date.now().toString();
  const nonce = Math.random().toString(36).substring(2, 15);

  const stringToSign = [
    'GET',
    crypto.createHash('sha256').update('').digest('hex'),
    '',
    '/v1.0/token?grant_type=1',
  ].join('\n');

  const signStr = clientId + timestamp + nonce + stringToSign;
  const signature = crypto
    .createHmac('sha256', clientSecret)
    .update(signStr)
    .digest('hex')
    .toUpperCase();

  const headers = {
    client_id: clientId,
    t: timestamp,
    nonce: nonce,
    sign: signature,
    sign_method: 'HMAC-SHA256',
    'Content-Type': 'application/json',
  };

  const response = await fetchWithTimeout(
    'https://openapi.tuyaeu.com/v1.0/token?grant_type=1',
    { 
      method: 'GET',
      headers 
    }
  );

  const data = await response.json();

  if (!data.success) {
    throw new Error(`Failed to get access token: ${data.msg}`);
  }

  return data.result.access_token;
}

// Funkce pro vytvoření signature
function createSignatureWithToken(method, url, headers, body, clientSecret) {
  const timestamp = Date.now().toString();
  const nonce = Math.random().toString(36).substring(2, 15);

  const stringToSign = [
    method.toUpperCase(),
    crypto
      .createHash('sha256')
      .update(body || '')
      .digest('hex'),
    '',
    url,
  ].join('\n');

  const signStr =
    headers.client_id + headers.access_token + timestamp + nonce + stringToSign;
  const signature = crypto
    .createHmac('sha256', clientSecret)
    .update(signStr)
    .digest('hex')
    .toUpperCase();

  return {
    timestamp,
    nonce,
    signature,
  };
}

// Funkce pro získání snapshot
async function getSnapshot(deviceId, clientId, clientSecret, accessToken) {
  // Zkusíme několik možných endpointů
  const endpoints = [
    `/v1.0/devices/${deviceId}/door-lock/photo`,
    `/v1.0/devices/${deviceId}/snapshot`,
    `/v1.0/ipc/devices/${deviceId}/snapshot`,
  ];

  for (const url of endpoints) {
    try {
      console.log(`Trying endpoint: ${url}`);
      
      const headers = {
        client_id: clientId,
        access_token: accessToken,
        sign_method: 'HMAC-SHA256',
        'Content-Type': 'application/json',
      };

      const { timestamp, nonce, signature } = createSignatureWithToken(
        'GET',
        url,
        headers,
        '',
        clientSecret
      );

      headers.t = timestamp;
      headers.nonce = nonce;
      headers.sign = signature;

      const response = await fetchWithTimeout(
        `https://openapi.tuyaeu.com${url}`,
        { 
          method: 'GET',
          headers 
        }
      );

      const data = await response.json();

      if (data.success && data.result) {
        console.log(`✅ Success with endpoint: ${url}`);
        return data.result;
      }
    } catch (error) {
      console.log(`Failed endpoint ${url}:`, error.message);
      continue;
    }
  }

  throw new Error('No working snapshot endpoint found');
}

exports.handler = async function (event, context) {
  console.log('=== DOORBELL SNAPSHOT REQUEST ===');

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
      body: '',
    };
  }

  try {
    if (event.httpMethod !== 'POST') {
      return {
        statusCode: 405,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          success: false,
          error: 'Method not allowed' 
        }),
      };
    }

    const { deviceId } = JSON.parse(event.body || '{}');

    if (!deviceId) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          success: false,
          error: 'Missing deviceId' 
        }),
      };
    }

    if (!process.env.TUYA_ACCESS_ID || !process.env.TUYA_ACCESS_SECRET) {
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          success: false,
          error: 'Missing environment variables' 
        }),
      };
    }

    const clientId = process.env.TUYA_ACCESS_ID.trim();
    const clientSecret = process.env.TUYA_ACCESS_SECRET.trim();

    console.log('Getting access token...');
    const accessToken = await getTuyaAccessToken(clientId, clientSecret);

    console.log('Getting snapshot for device:', deviceId);
    const snapshotData = await getSnapshot(
      deviceId,
      clientId,
      clientSecret,
      accessToken
    );

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        success: true,
        snapshot: snapshotData,
      }),
    };
  } catch (error) {
    console.error('=== SNAPSHOT ERROR ===');
    console.error('Error:', error.message);

    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        success: false,
        error: error.message,
      }),
    };
  }
};