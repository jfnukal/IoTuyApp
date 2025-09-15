import { useState, useEffect } from 'react';
import './App.css';

interface DeviceStatus {
  code: string;
  value: any;
}

function App() {
    const [deviceData, setDeviceData] = useState<DeviceStatus[] | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetch('/.netlify/functions/get-device-status')
            .then(res => {
                console.log('Response status:', res.status);
                console.log('Response headers:', [...res.headers.entries()]);
                
                // Přečteme response jako text, ne hned jako JSON
                return res.text().then(text => {
                    console.log('Raw response text:', text);
                    
                    if (!res.ok) {
                        throw new Error(`HTTP ${res.status}: ${text}`);
                    }
                    
                    // Teď zkusíme parsovat jako JSON
                    try {
                        return JSON.parse(text);
                    } catch (parseError) {
                        console.error('JSON parse error:', parseError);
                        throw new Error(`Invalid JSON response: ${text}`);
                    }
                });
            })
            .then((data: DeviceStatus[]) => {
                console.log('Parsed data:', data);
                setDeviceData(data);
                setIsLoading(false);
            })
            .catch(err => {
                console.error("Chyba při načítání dat:", err);
                setError(err.message);
                setIsLoading(false);
            });
    }, []);

    if (isLoading) {
        return <div className="container"><h1>Načítám...</h1></div>;
    }

    if (error) {
        return (
            <div className="container">
                <h1>Chyba</h1>
                <p>Nepodařilo se načíst data: {error}</p>
            </div>
        );
    }
    
    const switchStatus = deviceData?.find((item) => item.code === 'switch_1');
    
    return (
        <div className="container">
            <h1>Stav Zařízení</h1>
            <div className={`status-box ${switchStatus?.value ? 'on' : 'off'}`}>
                {switchStatus ? (switchStatus.value ? 'ZAPNUTO' : 'VYPNUTO') : 'Neznámý stav'}
            </div>
            
            <details style={{ marginTop: '20px', fontSize: '12px' }}>
                <summary>Debug info</summary>
                <pre>{JSON.stringify(deviceData, null, 2)}</pre>
            </details>
        </div>
    );
}

export default App;
