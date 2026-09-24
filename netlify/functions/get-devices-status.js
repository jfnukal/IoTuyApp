const axios = require('axios');
const crypto = require('crypto');
const { protect } = require('../lib/familyAuth.cjs');

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

// GET na Tuya API podepsaný access tokenem
async function tuyaGet(url, clientId, clientSecret, accessToken) {
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
    const error = new Error(`${url}: ${response.data.msg}`);
    error.code = response.data.code;
    throw error;
  }

  return response.data.result;
}

// Tuya kódy „tenhle projekt na to API nemá oprávnění"
const PERMISSION_CODES = [1106, 28841105];
// Když detail zařízení v projektu nejde, ať se na něj teplá instance funkce
// neptá u každého zařízení znovu (každý pokus = volání Tuya API navíc)
let detailNotAllowed = false;

// Stav zařízení i s příznakem online.
// Detail zařízení (/v1.0/devices/{id}) vrací status I online jedním voláním,
// takže je stejně drahý jako samotné /status. Bez příznaku online appka
// nepoznala, že zařízení vypadlo nebo zase naskočilo — opravovala ho jen
// ruční plná synchronizace. Když detail nejde, spadne to na staré /status.
// Ven jde JEN status a online: funkce je veřejná a detail obsahuje i
// local_key, IP a polohu.
async function getDeviceState(deviceId, clientId, clientSecret, accessToken) {
  if (!detailNotAllowed) {
    try {
      const detail = await tuyaGet(
        `/v1.0/devices/${deviceId}`,
        clientId,
        clientSecret,
        accessToken
      );
      if (Array.isArray(detail?.status)) {
        return {
          status: detail.status,
          online: typeof detail.online === 'boolean' ? detail.online : undefined,
        };
      }
      console.log(`⚠️ Detail ${deviceId} je bez statusu, zkouším /status`);
    } catch (error) {
      if (PERMISSION_CODES.includes(error.code)) detailNotAllowed = true;
      console.log(`⚠️ Detail ${deviceId} nevyšel (${error.message}), zkouším /status`);
    }
  }

  const status = await tuyaGet(
    `/v1.0/devices/${deviceId}/status`,
    clientId,
    clientSecret,
    accessToken
  );
  return { status };
}

/**
 * 🆕 Batch endpoint pro získání statusu více zařízení najednou
 * POST body: { deviceIds: ['id1', 'id2', ...] }
 */
async function handler(event, context) {
  console.log('=== GET DEVICES STATUS (BATCH) ===');

  try {
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
          const { status, online } = await getDeviceState(deviceId, clientId, clientSecret, accessToken);
          console.log(`✅ Status for ${deviceId}: OK (online: ${online})`);
          return {
            deviceId,
            success: true,
            status,
            online,
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
      headers: { 'Content-Type': 'application/json' },
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
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: false,
        error: 'Batch Status Error',
        message: error.message,
      }),
    };
  }
}

// Jen pro přihlášenou rodinu, CORS jen pro vlastní web (netlify/lib/familyAuth.cjs)
exports.handler = protect(handler, { methods: 'POST' });