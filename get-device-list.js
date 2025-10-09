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
        '/v1.0/token?grant_type=1'
    ].join('\n');
    
    const signStr = clientId + timestamp + nonce + stringToSign;
    const signature = crypto.createHmac('sha256', clientSecret).update(signStr).digest('hex').toUpperCase();
    
    const headers = {
        'client_id': clientId,
        't': timestamp,
        'nonce': nonce,
        'sign': signature,
        'sign_method': 'HMAC-SHA256',
        'Content-Type': 'application/json'
    };
    
    const response = await axios.get('https://openapi.tuyaeu.com/v1.0/token?grant_type=1', { headers });
    
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
        crypto.createHash('sha256').update(body || '').digest('hex'),
        '',
        url
    ].join('\n');
    
    const signStr = headers.client_id + headers.access_token + timestamp + nonce + stringToSign;
    const signature = crypto.createHmac('sha256', clientSecret).update(signStr).digest('hex').toUpperCase();
    
    return {
        timestamp,
        nonce,
        signature
    };
}

// Funkce pro získání stavu zařízení
async function getDeviceStatus(deviceId, clientId, clientSecret, accessToken) {
    const url = `/v1.0/devices/${deviceId}/status`;
    
    const headers = {
        'client_id': clientId,
        'access_token': accessToken,
        'sign_method': 'HMAC-SHA256',
        'Content-Type': 'application/json'
    };
    
    const { timestamp, nonce, signature } = createSignatureWithToken('GET', url, headers, '', clientSecret);
    
    headers.t = timestamp;
    headers.nonce = nonce;
    headers.sign = signature;
    
    const response = await axios.get(`https://openapi.tuyaeu.com${url}`, { headers });
    
    if (!response.data.success) {
        throw new Error(`Failed to get device status: ${response.data.msg}`);
    }
    
    return response.data.result;
}

// Funkce pro získání informací o zařízení
async function getDeviceInfo(deviceId, clientId, clientSecret, accessToken) {
    const url = `/v1.0/devices/${deviceId}`;
    
    const headers = {
        'client_id': clientId,
        'access_token': accessToken,
        'sign_method': 'HMAC-SHA256',
        'Content-Type': 'application/json'
    };
    
    const { timestamp, nonce, signature } = createSignatureWithToken('GET', url, headers, '', clientSecret);
    
    headers.t = timestamp;
    headers.nonce = nonce;
    headers.sign = signature;
    
    const response = await axios.get(`https://openapi.tuyaeu.com${url}`, { headers });
    
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
                body: JSON.stringify({ error: "Missing environment variables" })
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
            { id: 'bf0f8692301eaff1f6', name: 'Temperature and humidity sensor' }
        ];
        
        console.log('Step 1: Getting access token...');
        const accessToken = await getTuyaAccessToken(clientId, clientSecret);
        console.log('Access token obtained successfully');
        
        console.log('Step 2: Trying automatic device discovery...');
        
        // Endpointy pro automatické získání seznamu
        const endpointsToTry = [
            // Oficiální Cloud Project endpointy
            '/v2.0/cloud/thing/device?page_size=50',
            '/v2.0/cloud/thing/device?page_size=20',
            '/v2.0/cloud/thing/device',
            
            // Smart Home Basic Service endpointy s UID
            `/v1.0/users/${userUID}/devices`,
            `/v2.0/users/${userUID}/devices`, 
            `/v1.0/devices?uid=${userUID}`,
            `/v2.0/devices?uid=${userUID}`,
            
            // Endpointy s Association ID
            `/v2.0/devices?schema=${associationId}`,
            `/v1.0/devices?schema=${associationId}`,
            `/v2.0/devices?source=${associationId}`,
            
            // Obecné endpointy
            '/v2.0/devices?page_size=50',
            '/v1.0/devices?page_size=50',
            '/v2.0/devices',
            '/v1.0/devices'
        ];
        
        let automaticDevices = [];
        let usedEndpoint = null;
        
        for (const url of endpointsToTry) {
            try {
                console.log(`Trying: ${url}`);
                
                const headers = {
                    'client_id': clientId,
                    'access_token': accessToken,
                    'sign_method': 'HMAC-SHA256',
                    'Content-Type': 'application/json'
                };
                
                const { timestamp, nonce, signature } = createSignatureWithToken('GET', url, headers, '', clientSecret);
                
                headers.t = timestamp;
                headers.nonce = nonce;
                headers.sign = signature;
                
                const response = await axios.get(`https://openapi.tuyaeu.com${url}`, { headers });
                
                console.log(`Response: success=${response.data.success}, result_length=${Array.isArray(response.data.result) ? response.data.result.length : 'not_array'}`);
                
                if (response.data.success && response.data.result) {
                    let devices = response.data.result;
                    
                    // Handle paginated results
                    if (devices.list && Array.isArray(devices.list)) {
                        devices = devices.list;
                    }
                    
                    if (Array.isArray(devices) && devices.length > 0) {
                        console.log(`SUCCESS! Found ${devices.length} devices with ${url}`);
                        automaticDevices = devices;
                        usedEndpoint = url;
                        break;
                    }
                }
                
            } catch (endpointError) {
                console.log(`Failed ${url}: ${endpointError.response?.data?.msg || endpointError.message}`);
            }
        }
        
        // Pokud automatické získání našlo zařízení, použij je
        if (automaticDevices.length > 0) {
            console.log(`Using automatic discovery: ${automaticDevices.length} devices`);
            
            // Získej stav pro první 10 zařízení
            const devicesWithStatus = [];
            for (let i = 0; i < Math.min(automaticDevices.length, 10); i++) {
                const device = automaticDevices[i];
                try {
                    const deviceId = device.id || device.device_id;
                    const status = await getDeviceStatus(deviceId, clientId, clientSecret, accessToken);
                    devicesWithStatus.push({ ...device, status });
                } catch (statusError) {
                    devicesWithStatus.push({ ...device, status: null, statusError: statusError.message });
                }
            }
            
            return {
                statusCode: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({
                    success: true,
                    method: 'automatic',
                    endpoint_used: usedEndpoint,
                    total_devices: automaticDevices.length,
                    devices: devicesWithStatus
                })
            };
        }
        
        // Fallback: použij známá device ID
        console.log('Automatic discovery failed, using known device IDs...');
        
        const devicesData = [];
        for (const deviceInfo of knownDeviceIds) {
            try {
                const deviceDetails = await getDeviceInfo(deviceInfo.id, clientId, clientSecret, accessToken);
                const deviceStatus = await getDeviceStatus(deviceInfo.id, clientId, clientSecret, accessToken);
                
                devicesData.push({
                    ...deviceDetails,
                    status: deviceStatus,
                    custom_name: deviceInfo.name
                });
                
                console.log(`Got data for: ${deviceInfo.name}`);
                
            } catch (deviceError) {
                console.warn(`Failed to get ${deviceInfo.name}: ${deviceError.message}`);
                devicesData.push({
                    id: deviceInfo.id,
                    name: deviceInfo.name,
                    custom_name: deviceInfo.name,
                    status: null,
                    error: deviceError.message,
                    online: false
                });
            }
        }
        
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                success: true,
                method: 'fallback_known_ids',
                total_devices: devicesData.length,
                devices: devicesData
            })
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
                details: error.response?.data
            })
        };
    }
};