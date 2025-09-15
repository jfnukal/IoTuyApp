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
    
    // Najdeme všechny switche
    const switches = deviceData?.filter(item => item.code.startsWith('switch_')) || [];
    const countdowns = deviceData?.filter(item => item.code.startsWith('countdown_')) || [];
    
    return (
        <div className="container">
            <h1>Tuya Smart Zásuvky</h1>
            
            <div className="switches-grid">
                {switches.map((switchItem) => {
                    const switchNumber = switchItem.code.replace('switch_', '');
                    const countdown = countdowns.find(c => c.code === `countdown_${switchNumber}`);
                    
                    return (
                        <div key={switchItem.code} className="switch-card">
                            <h3>Switch {switchNumber.toUpperCase()}</h3>
                            <div className={`status-box ${switchItem.value ? 'on' : 'off'}`}>
                                {switchItem.value ? 'ZAPNUTO' : 'VYPNUTO'}
                            </div>
                            {countdown && countdown.value > 0 && (
                                <div className="countdown">
                                    Odpočet: {countdown.value}s
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
            
            <details style={{ marginTop: '20px', fontSize: '12px' }}>
                <summary>Debug info</summary>
                <pre>{JSON.stringify(deviceData, null, 2)}</pre>
            </details>
        </div>
    );
}

export default App;
