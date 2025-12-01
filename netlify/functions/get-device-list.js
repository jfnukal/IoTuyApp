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

// Funkce pro získání stavu zařízení
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

// Funkce pro získání informací o zařízení
async function getDeviceInfo(deviceId, clientId, clientSecret, accessToken) {
  const url = `/v1.0/devices/${deviceId}`;

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
    throw new Error(`Failed to get device info: ${response.data.msg}`);
  }

  return response.data.result;
}

exports.handler = async function (event, context) {
  console.log('=== TUYA API - HYBRID APPROACH ===');

  try {
    if (!process.env.TUYA_ACCESS_ID || !process.env.TUYA_ACCESS_SECRET) {
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Missing environment variables' }),
      };
    }

    const clientId = process.env.TUYA_ACCESS_ID.trim();
    const clientSecret = process.env.TUYA_ACCESS_SECRET.trim();
    const projectId = process.env.TUYA_PROJECT_ID?.trim();

    // Známé informace z konzole
    const userUID = 'eu1619248628147R93Os';
    const associationId = 'gg-111788887190429558614';

    // Tvoje známá device ID jako fallback
    const knownDeviceIds = [
      { id: 'bfae2da6e578cdd1b0', name: 'Světlo chodba' },
      { id: 'bffbfe2dad8680b2a8a9', name: 'Garazove svetlo' },
      { id: '31311065c44f33b75eaf', name: 'Hl.zásuvka-roz' },
      { id: 'bf0f8692301eaff1f6', name: 'Temperature and humidity sensor' },
    ];

    console.log('Step 1: Getting access token...');
    const accessToken = await getTuyaAccessToken(clientId, clientSecret);
    console.log('Access token obtained successfully');

    console.log('Step 2: Trying automatic device discovery...');

    // Endpointy pro automatické získání seznamu
    const endpointsToTry = [
      // Oficiální Cloud Project endpointy
      '/v2.0/cloud/thing/device?page_size=100', // ← ZVÝŠENO
      '/v2.0/cloud/thing/device?page_size=50',

      // Smart Home Basic Service endpointy s UID
      `/v1.0/users/${userUID}/devices?page_size=100`, // ← PŘIDÁNO
      `/v2.0/users/${userUID}/devices?page_size=100`, // ← PŘIDÁNO
      `/v1.0/devices?uid=${userUID}&page_size=100`, // ← PŘIDÁNO
      `/v2.0/devices?uid=${userUID}&page_size=100`, // ← PŘIDÁNO

      // Endpointy s Association ID
      `/v2.0/devices?schema=${associationId}&page_size=100`, // ← PŘIDÁNO
      `/v1.0/devices?schema=${associationId}&page_size=100`, // ← PŘIDÁNO

      // Obecné endpointy
      '/v2.0/devices?page_size=100', // ← PŘIDÁNO
      '/v1.0/devices?page_size=100', // ← PŘIDÁNO
    ];

    let automaticDevices = [];
    let usedEndpoint = null;

    for (const url of endpointsToTry) {
      try {
        console.log(`Trying: ${url}`);

        const headers = {
          client_id: clientId,
          access_token: accessToken,
          sign_method: 'HMAC-SHA256',
          'Content-Type': 'application/json',
        };

        // ✅ NOVÉ: Paginace
        let allDevices = [];
        let currentUrl = url;
        let hasMore = true;

        while (hasMore) {
          const { timestamp, nonce, signature } = createSignatureWithToken(
            'GET',
            currentUrl,
            headers,
            '',
            clientSecret
          );

          headers.t = timestamp;
          headers.nonce = nonce;
          headers.sign = signature;

          const response = await axios.get(
            `https://openapi.tuyaeu.com${currentUrl}`,
            { headers }
          );

          if (response.data.success && response.data.result) {
            let result = response.data.result;
            let devices = Array.isArray(result) ? result : result.list || [];

            allDevices = allDevices.concat(devices);

            // ✅ Kontrola další stránky
            hasMore = result.has_more === true && result.last_row_key;
            if (hasMore) {
              const separator = currentUrl.includes('?') ? '&' : '?';
              currentUrl = `${url}${separator}last_row_key=${result.last_row_key}`;
              console.log(
                `Fetching next page... (${allDevices.length} so far)`
              );
            } else {
              break;
            }
          } else {
            break;
          }
        }

        if (allDevices.length > 0) {
          console.log(
            `SUCCESS! Found ${allDevices.length} devices with ${url}`
          );
          automaticDevices = allDevices;
          usedEndpoint = url;
          break;
        }
      } catch (endpointError) {
        console.log(
          `Failed ${url}: ${
            endpointError.response?.data?.msg || endpointError.message
          }`
        );
      }
    }

    // Pokud automatické získání našlo zařízení, použij je
    if (automaticDevices.length > 0) {
      console.log(
        `Using automatic discovery: ${automaticDevices.length} devices`
      );

      // Načti status JEN pro online zařízení (rychlejší)
      console.log('Step 3: Loading status for online devices...');
      const devicesWithStatus = await Promise.all(
          automaticDevices.map(async (device) => {
              // ✅ DEBUG LOG
              const isOnline = device.online;
              const isSub = device.sub;
              const deviceId = device.id || device.device_id;
              
              console.log(`🔍 Device: ${device.name}`, {
                  id: deviceId,
                  online: isOnline,
                  sub: isSub,
                  willFetchStatus: isOnline && !isSub
              });
              
              if (device.online) {
                  try {
                      console.log(`📡 Fetching status for: ${device.name} (${deviceId})`);
                      const status = await getDeviceStatus(deviceId, clientId, clientSecret, accessToken);
                      console.log(`✅ Status received for ${device.name}:`, status);
                      return { ...device, status };
                  } catch (error) {
                      console.log(`❌ Failed to get status for ${device.name}: ${error.message}`);
                      return { ...device, status: [] };
                  }
              }
              console.log(`⏭️ Skipping status fetch for ${device.name} (offline or sub)`);
              return { ...device, status: [] };
          })
      );

      console.log(
        `Status loaded for ${
          devicesWithStatus.filter((d) => d.status?.length > 0).length
        } devices`
      );

      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          success: true,
          method: 'automatic',
          endpoint_used: usedEndpoint,
          total_devices: automaticDevices.length,
          devices: devicesWithStatus,
        }),
      };
    }

    // Fallback: použij známá device ID
    console.log('Automatic discovery failed, using known device IDs...');

    const devicesData = [];
    for (const deviceInfo of knownDeviceIds) {
      try {
        const deviceDetails = await getDeviceInfo(
          deviceInfo.id,
          clientId,
          clientSecret,
          accessToken
        );
        const deviceStatus = await getDeviceStatus(
          deviceInfo.id,
          clientId,
          clientSecret,
          accessToken
        );

        devicesData.push({
          ...deviceDetails,
          status: deviceStatus,
          custom_name: deviceInfo.name,
        });

        console.log(`Got data for: ${deviceInfo.name}`);
      } catch (deviceError) {
        console.warn(
          `Failed to get ${deviceInfo.name}: ${deviceError.message}`
        );
        devicesData.push({
          id: deviceInfo.id,
          name: deviceInfo.name,
          custom_name: deviceInfo.name,
          status: null,
          error: deviceError.message,
          online: false,
        });
      }
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        success: true,
        method: 'fallback_known_ids',
        total_devices: devicesData.length,
        devices: devicesData,
      }),
    };
  } catch (error) {
    console.error('=== ERROR ===');
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }

    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: 'Tuya API Error',
        message: error.message,
        details: error.response?.data,
      }),
    };
  }
};
