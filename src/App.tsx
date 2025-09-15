import { useState, useEffect } from 'react';
import './App.css';

// Řekneme TypeScriptu, jak vypadá jeden záznam o stavu zařízení
interface DeviceStatus {
  code: string;
  value: any; // 'any' znamená, že hodnota může být cokoliv (číslo, text, true/false)
}

function App() {
    // Řekneme, že náš stav bude buď 'null', nebo pole objektů DeviceStatus
    const [deviceData, setDeviceData] = useState<DeviceStatus[] | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetch('/.netlify/functions/get-device-status')
            .then(res => res.json())
            .then((data: DeviceStatus[]) => { // Řekneme, že 'data' jsou pole DeviceStatus
                setDeviceData(data);
                setIsLoading(false);
            })
            .catch(err => {
                console.error("Chyba při načítání dat:", err); // Využijeme proměnnou 'err'
                setIsLoading(false);
            });
    }, []);

    if (isLoading) {
        return <div className="container"><h1>Načítám...</h1></div>;
    }
    
    // Protože TypeScript teď ví, co je deviceData, tak ví, že má metodu .find()
    const switchStatus = deviceData?.find((item) => item.code === 'switch_1');

    return (
        <div className="container">
            <h1>Stav Zařízení</h1>
            <div className={`status-box ${switchStatus?.value ? 'on' : 'off'}`}>
                {switchStatus ? (switchStatus.value ? 'ZAPNUTO' : 'VYPNUTO') : 'Neznámý stav'}
            </div>
        </div>
    );
}

export default App;
