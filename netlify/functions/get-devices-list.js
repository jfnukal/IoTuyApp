const axios = require('axios');
const crypto = require('crypto');

// Funkce pro získání access tokenu
async function getTuyaAccessToken(clientId, clientSecret) {
    const timestamp = Date.now().toString();
    const nonce = Math.random().toString(36).substring(2, 15);
    
    // Signature pro získání tokenu
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
    console.log('=== TUYA API - GET DEVICES LIST ===');
    
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
        
        console.log('Step 1: Getting access token...');
        const accessToken = await getTuyaAccessToken(clientId, clientSecret);
        console.log('Access token obtained successfully');
        
        console.log('Step 2: Getting devices list...');
        // Zkusíme jiný endpoint - token-based approach
        const url = '/v1.0/token/devices';
        
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
        
        console.log('Devices list response:', JSON.stringify(response.data, null, 2));
        
        if (!response.data.success) {
            throw new Error(`API Error: ${response.data.msg}`);
        }
        
        // Pokud chceš získat i detailní stav každého zařízení, můžeš přidat další volání
        const devices = response.data.result;
        const devicesWithStatus = [];
        
        // Pro každé zařízení získej jeho aktuální stav
        for (const device of devices) {
            try {
                const statusUrl = `/v1.0/devices/${device.id}/status`;
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
                    status: statusResponse.data.success ? statusResponse.data.result : null
                });
                
            } catch (statusError) {
                console.warn(`Failed to get status for device ${device.id}:`, statusError.message);
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
            body: JSON.stringify(devicesWithStatus)
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
