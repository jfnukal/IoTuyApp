const crypto = require('crypto');

// Funkce pro HTTP požadavky pomocí fetch
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

// Funkce pro vytvoření signature s access tokenem
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

// Funkce pro alokaci video streamu
async function allocateStream(
  deviceId,
  streamType,
  clientId,
  clientSecret,
  accessToken
) {
  const url = `/v1.0/devices/${deviceId}/stream/actions/allocate`;
  const body = JSON.stringify({
    type: streamType,
  });

  const headers = {
    client_id: clientId,
    access_token: accessToken,
    sign_method: 'HMAC-SHA256',
    'Content-Type': 'application/json',
  };

  const { timestamp, nonce, signature } = createSignatureWithToken(
    'POST',
    url,
    headers,
    body,
    clientSecret
  );

  headers.t = timestamp;
  headers.nonce = nonce;
  headers.sign = signature;

  const response = await fetchWithTimeout(
    `https://openapi.tuyaeu.com${url}`,
    {
      method: 'POST',
      headers,
      body,
    }
  );

  const data = await response.json();

  if (!data.success) {
    throw new Error(`Failed to allocate stream: ${data.msg || JSON.stringify(data)}`);
  }

  return data.result;
}

exports.handler = async function (event, context) {
  console.log('=== DOORBELL STREAM REQUEST ===');

  // CORS pre-flight
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

    const { deviceId, streamType = 'hls' } = JSON.parse(event.body || '{}');

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
      console.error('Missing TUYA environment variables');
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
    console.log('Access token obtained');

    console.log('Allocating stream for device:', deviceId, 'Type:', streamType);
    const streamData = await allocateStream(
      deviceId,
      streamType,
      clientId,
      clientSecret,
      accessToken
    );

    console.log('Stream allocated successfully:', streamData);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
      body: JSON.stringify({
        success: true,
        stream: streamData,
      }),
    };
  } catch (error) {
    console.error('=== DOORBELL STREAM ERROR ===');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);

    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        success: false,
        error: 'Doorbell Stream Error',
        message: error.message,
        details: error.toString(),
      }),
    };
  }
};
