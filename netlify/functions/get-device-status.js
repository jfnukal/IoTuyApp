const axios = require('axios');
const crypto = require('crypto');

// Funkce pro vytvoření Tuya API signature
function createSignature(method, url, headers, body, clientSecret) {
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
    console.log('=== TUYA DEBUG INFO ===');
    console.log('Access ID exists:', !!process.env.TUYA_ACCESS_ID);
    console.log('Access Secret exists:', !!process.env.TUYA_ACCESS_SECRET);
    console.log('Access ID length:', process.env.TUYA_ACCESS_ID?.length);
    console.log('Access Secret length:', process.env.TUYA_ACCESS_SECRET?.length);

    if (!process.env.TUYA_ACCESS_ID || !process.env.TUYA_ACCESS_SECRET) {
        return {
            statusCode: 500,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: "Missing environment variables" })
        };
    }

    try {
        const clientId = process.env.TUYA_ACCESS_ID.trim();
        const clientSecret = process.env.TUYA_ACCESS_SECRET.trim();
        const deviceId = '31311065c44f33b75eaf';
        
        // Tuya API endpoint pro EU region
        const baseUrl = 'https://openapi.tuyaeu.com';
        const url = `/v1.0/devices/${deviceId}/status`;
        
        const headers = {
            'client_id': clientId,
            'access_token': '', // Pro device status nepotřebujeme access token
            'sign_method': 'HMAC-SHA256',
            'Content-Type': 'application/json'
        };
        
        const { timestamp, nonce, signature } = createSignature('GET', url, headers, '', clientSecret);
        
        headers.t = timestamp;
        headers.nonce = nonce;
        headers.sign = signature;
        
        console.log('Making request to Tuya API...');
        
        const response = await axios.get(`${baseUrl}${url}`, { headers });
        
        console.log('Success! Response:', response.data);
        
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify(response.data.result)
        };
        
    } catch (error) {
        console.error('=== TUYA API ERROR ===');
        console.error('Error:', error.response?.data || error.message);
        
        return {
            statusCode: 500,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                error: 'Tuya API Error',
                message: error.response?.data || error.message
            })
        };
    }
};
