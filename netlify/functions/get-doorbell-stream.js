const axios = require('axios');
const crypto = require('crypto');

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

  const response = await axios.get(
    'https://openapi.tuyaeu.com/v1.0/token?grant_type=1',
    { headers }
  );

  if (!response.data.success) {
    throw new Error(`Failed to get access token: ${response.data.msg}`);
  }

  return response.data.result.access_token;
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
    type: streamType, // 'rtsp' nebo 'hls'
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

  const response = await axios.post(
    `https://openapi.tuyaeu.com${url}`,
    { type: streamType },
    { headers }
  );

  if (!response.data.success) {
    throw new Error(`Failed to allocate stream: ${response.data.msg}`);
  }

  return response.data.result;
}

// Funkce pro získání snapshot (poslední snímek)
async function getSnapshot(deviceId, clientId, clientSecret, accessToken) {
  const url = `/v1.0/devices/${deviceId}/door-lock/door-records`;

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

  try {
    const response = await axios.get(`https://openapi.tuyaeu.com${url}`, {
      headers,
    });

    if (response.data.success && response.data.result) {
      return response.data.result;
    }
    return null;
  } catch (error) {
    console.warn('Failed to get snapshot:', error.message);
    return null;
  }
}

exports.handler = async function (event, context) {
  console.log('=== DOORBELL STREAM REQUEST ===');

  try {
    if (event.httpMethod !== 'POST') {
      return {
        statusCode: 405,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Method not allowed' }),
      };
    }

    const { deviceId, streamType = 'hls' } = JSON.parse(event.body);

    if (!deviceId) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Missing deviceId' }),
      };
    }

    if (!process.env.TUYA_ACCESS_ID || !process.env.TUYA_ACCESS_SECRET) {
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Missing environment variables' }),
      };
    }

    const clientId = process.env.TUYA_ACCESS_ID.trim();
    const clientSecret = process.env.TUYA_ACCESS_SECRET.trim();

    console.log('Getting access token...');
    const accessToken = await getTuyaAccessToken(clientId, clientSecret);

    console.log('Allocating stream for device:', deviceId);
    const streamData = await allocateStream(
      deviceId,
      streamType,
      clientId,
      clientSecret,
      accessToken
    );

    console.log('Getting snapshot...');
    const snapshot = await getSnapshot(
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
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
      body: JSON.stringify({
        success: true,
        stream: streamData,
        snapshot: snapshot,
      }),
    };
  } catch (error) {
    console.error('=== DOORBELL STREAM ERROR ===');
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }

    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        error: 'Doorbell Stream Error',
        message: error.message,
        details: error.response?.data,
      }),
    };
  }
};