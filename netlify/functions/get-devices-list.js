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

exports.handler = async function (event, context) {
    console.log('=== TUYA SAAS API - TRYING MULTIPLE ENDPOINTS ===');
    
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
        
        console.log('Project ID:', projectId || 'Not set');
        
        console.log('Step 1: Getting access token...');
        const accessToken = await getTuyaAccessToken(clientId, clientSecret);
        console.log('Access token obtained successfully');
        
        console.log('Step 2: Trying different endpoints...');
        
        // Seznam endpointů k testování (bez OEM/users endpointů)
        const endpointsToTry = [
            // SAAS/Project specific endpointy
            projectId ? `/v1.0/expand/devices?project_id=${projectId}&page_no=1&page_size=50` : null,
            projectId ? `/v1.0/iot-03/apps/${projectId}/devices` : null,
            projectId ? `/v1.3/iot-03/devices?project_id=${projectId}` : null,
            
            // Funkční endpoint s různými parametry
            '/v1.3/iot-03/devices',
            '/v1.3/iot-03/devices?page_size=50',
            '/v1.3/iot-03/devices?page_no=1&page_size=50',
            
            // Obecné device endpointy
            '/v1.0/devices',
            '/v1.0/iot-03/devices',
            '/v2.0/cloud/thing/device/list',
            '/v1.0/token/devices',
            
            // Fallback endpointy
            '/v1.0/cloud/thing/device/list'
        ].filter(Boolean);
        
        let successResponse = null;
        let usedEndpoint = null;
        const failedEndpoints = [];
        
        for (const url of endpointsToTry) {
            try {
                console.log(`\n--- Trying endpoint: ${url} ---`);
                
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
                
                console.log(`Response from ${url}:`, JSON.stringify({
                    success: response.data.success,
                    code: response.data.code,
                    msg: response.data.msg,
                    result_type: typeof response.data.result,
                    result_length: Array.isArray(response.data.result) ? response.data.result.length : 'not_array',
                    result_preview: response.data.result ? JSON.stringify(response.data.result).substring(0, 200) + '...' : 'null'
                }, null, 2));
                
                if (response.data.success && response.data.result) {
                    console.log(`✅ SUCCESS with endpoint: ${url}`);
                    successResponse = response.data;
                    usedEndpoint = url;
                    break;
                }
                
                failedEndpoints.push({
                    endpoint: url,
                    code: response.data.code,
                    msg: response.data.msg
                });
                
            } catch (endpointError) {
                console.log(`❌ Failed with endpoint ${url}:`, endpointError.response?.data || endpointError.message);
                failedEndpoints.push({
                    endpoint: url,
                    error: endpointError.response?.data || endpointError.message
                });
            }
        }
        
        if (!successResponse) {
            return {
                statusCode: 500,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    error: 'All endpoints failed',
                    message: 'No endpoint returned device list successfully',
                    failed_endpoints: failedEndpoints,
                    suggestion: 'You might need to register for OEM app or check Project ID'
                })
            };
        }
        
        // Zpracuj úspěšnou response
        let devices = successResponse.result;
        
        // Různé endpointy vracejí data v různých strukturách
        if (devices && devices.list) {
            devices = devices.list; // pro paginated výsledky
        }
        
        if (!Array.isArray(devices)) {
            if (devices) {
                devices = [devices]; // pokud je to single device
            } else {
                devices = [];
            }
        }
        
        console.log(`\n🎉 Found ${devices.length} devices using endpoint: ${usedEndpoint}`);
        
        // Získej stav pro první 5 zařízení (kvůli rate limiting)
        const devicesWithStatus = [];
        const maxDevicesToProcess = Math.min(devices.length, 5);
        
        for (let i = 0; i < maxDevicesToProcess; i++) {
            const device = devices[i];
            try {
                const deviceId = device.id || device.device_id;
                if (!deviceId) {
                    console.log(`Skipping device without ID:`, device);
                    continue;
                }
                
                console.log(`Getting status for device: ${deviceId}`);
                
                const statusUrl = `/v1.0/devices/${deviceId}/status`;
                const statusHeaders = {
                    'client_id': clientId,
                    'access_token': accessToken,
                    'sign_method': 'HMAC-SHA256',
                    'Content-Type': 'application/json'
                };
                
                const statusSig = createSignatureWithToken('GET', statusUrl, statusHeaders, '', clientSecret);
                statusHeaders.t = statusSig.timestamp;
                statusHeaders.nonce = statusSig.nonce;
                statusHeaders.sign = statusSig.signature;
                
                const statusResponse = await axios.get(`https://openapi.tuyaeu.com${statusUrl}`, { headers: statusHeaders });
                
                devicesWithStatus.push({
                    ...device,
                    status: statusResponse.data.success ? statusResponse.data.result : null,
                    statusError: !statusResponse.data.success ? statusResponse.data.msg : null
                });
                
            } catch (statusError) {
                console.warn(`Failed to get status for device ${device.id || device.device_id}:`, statusError.message);
                devicesWithStatus.push({
                    ...device,
                    status: null,
                    statusError: statusError.message
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
                endpoint_used: usedEndpoint,
                total_devices_found: devices.length,
                processed_devices: devicesWithStatus.length,
                devices: devicesWithStatus,
                debug: {
                    project_id: projectId,
                    failed_endpoints: failedEndpoints
                }
            })
        };
        
    } catch (error) {
        console.error('=== MAIN ERROR ===');
        console.error('Error:', error.message);
        if (error.response) {
            console.error('Response status:', error.response.status);
            console.error('Response data:', error.response.data);
        }
        
        return {
            statusCode: 500,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                error: 'Tuya SAAS API Error',
                message: error.message,
                details: error.response?.data
            })
        };
    }
};
