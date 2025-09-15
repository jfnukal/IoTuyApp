const TuyaCloud = require('@tuyapi/cloud');

exports.handler = async function (event, context) {
    // Debug výpis pro kontrolu env variables
    console.log('=== TUYA DEBUG INFO ===');
    console.log('Access ID exists:', !!process.env.TUYA_ACCESS_ID);
    console.log('Access Secret exists:', !!process.env.TUYA_ACCESS_SECRET);
    console.log('Access ID length:', process.env.TUYA_ACCESS_ID?.length);
    console.log('Access Secret length:', process.env.TUYA_ACCESS_SECRET?.length);
    
    // Zobraz první a poslední 3 znaky pro identifikaci (bezpečně)
    if (process.env.TUYA_ACCESS_ID) {
        const accessId = process.env.TUYA_ACCESS_ID;
        console.log('Access ID preview:', `${accessId.substring(0, 3)}...${accessId.substring(accessId.length - 3)}`);
    }
    
    if (process.env.TUYA_ACCESS_SECRET) {
        const secret = process.env.TUYA_ACCESS_SECRET;
        console.log('Secret preview:', `${secret.substring(0, 3)}...${secret.substring(secret.length - 3)}`);
    }

    // Kontrola existence env variables
    if (!process.env.TUYA_ACCESS_ID || !process.env.TUYA_ACCESS_SECRET) {
        console.error('Missing environment variables');
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                error: "Missing environment variables",
                hasAccessId: !!process.env.TUYA_ACCESS_ID,
                hasSecret: !!process.env.TUYA_ACCESS_SECRET
            })
        };
    }

    try {
        console.log('Creating TuyaCloud instance...');
        const cloud = new TuyaCloud({
            region: 'eu',
            auth: {
                accessKey: process.env.TUYA_ACCESS_ID.trim(),
                secretKey: process.env.TUYA_ACCESS_SECRET.trim(),
            },
        });

        console.log('Fetching device properties...');
        const deviceId = '31311065c44f33b75eaf';
        const result = await cloud.getDeviceProperties(deviceId);
        
        console.log('Success! Device data received');
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*', // Pro CORS
            },
            body: JSON.stringify(result.result),
        };
    } catch (error) {
        console.error('=== TUYA API ERROR ===');
        console.error('Error type:', error.constructor.name);
        console.error('Error message:', error.message);
        console.error('Full error:', error);
        
        return { 
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                message: "Chyba Tuya API", 
                error: error.message,
                errorType: error.constructor.name
            }) 
        };
    }
};
