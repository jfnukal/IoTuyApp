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

// Funkce pro získání stavu jednoho zařízení
async function getDeviceStatus(deviceId, clientId, clientSecret, accessToken) {
  const url = `/v1.0/devices/${deviceId}/status`;

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

  const response = await axios.get(`https://openapi.tuyaeu.com${url}`, {
    headers,
  });

  if (!response.data.success) {
    throw new Error(`Failed to get device status: ${response.data.msg}`);
  }

  return response.data.result;
}

/**
 * 🆕 Batch endpoint pro získání statusu více zařízení najednou
 * POST body: { deviceIds: ['id1', 'id2', ...] }
 */
exports.handler = async function (event, context) {
  console.log('=== GET DEVICES STATUS (BATCH) ===');

  try {
    // Povolíme GET i POST
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

    if (event.httpMethod !== 'POST') {
      return {
        statusCode: 405,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Method not allowed. Use POST.' }),
      };
    }

    const { deviceIds } = JSON.parse(event.body || '{}');

    if (!deviceIds || !Array.isArray(deviceIds) || deviceIds.length === 0) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          error: 'Missing or invalid deviceIds array',
          example: { deviceIds: ['device1', 'device2'] }
        }),
      };
    }

    // Limit na max 20 zařízení najednou (ochrana proti zneužití)
    if (deviceIds.length > 20) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          error: 'Too many devices. Maximum is 20 per request.',
          received: deviceIds.length
        }),
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

    console.log(`Fetching status for ${deviceIds.length} devices...`);
    
    // Paralelní načtení statusů
    const results = await Promise.all(
      deviceIds.map(async (deviceId) => {
        try {
          const status = await getDeviceStatus(deviceId, clientId, clientSecret, accessToken);
          console.log(`✅ Status for ${deviceId}: OK`);
          return {
            deviceId,
            success: true,
            status,
            lastUpdated: Date.now(),
          };
        } catch (error) {
          console.log(`❌ Status for ${deviceId}: ${error.message}`);
          return {
            deviceId,
            success: false,
            error: error.message,
            status: [],
          };
        }
      })
    );

    const successCount = results.filter(r => r.success).length;
    console.log(`Completed: ${successCount}/${deviceIds.length} successful`);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        success: true,
        total: deviceIds.length,
        successful: successCount,
        failed: deviceIds.length - successCount,
        results,
      }),
    };

  } catch (error) {
    console.error('=== BATCH STATUS ERROR ===');
    console.error('Error:', error.message);

    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        success: false,
        error: 'Batch Status Error',
        message: error.message,
      }),
    };
  }
};