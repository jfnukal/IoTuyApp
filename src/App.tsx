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
                if (!res.ok) {
                    throw new Error(`HTTP ${res.status}: ${res.statusText}`);
                }
                return res.json();
            })
            .then((data: DeviceStatus[]) => {
                console.log('Received data:', data);
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
            
            {/* Debug info */}
            <details style={{ marginTop: '20px', fontSize: '12px' }}>
                <summary>Debug info</summary>
                <pre>{JSON.stringify(deviceData, null, 2)}</pre>
            </details>
        </div>
    );
}

export default App;
