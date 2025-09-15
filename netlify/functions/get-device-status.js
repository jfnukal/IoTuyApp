const TuyaCloud = require('@tuyapi/cloud');

exports.handler = async function (event, context) {
    const cloud = new TuyaCloud({
        region: 'eu', // Zkontroluj svůj region: 'eu', 'us', 'cn', nebo 'in'
        auth: {
            accessKey: process.env.TUYA_ACCESS_ID,
            secretKey: process.env.TUYA_ACCESS_SECRET,
        },
    });

    const deviceId = '31311065c44f33b75eaf'; // Tady vyplň ID tvého zařízení

    try {
        const result = await cloud.getDeviceProperties(deviceId);
        return {
            statusCode: 200,
            body: JSON.stringify(result.result),
        };
    } catch (error) {
        return { 
            statusCode: 500, 
            body: JSON.stringify({ message: "Chyba API." }) 
        };
    }
};