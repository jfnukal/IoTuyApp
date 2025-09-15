import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
    const [deviceData, setDeviceData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetch('/.netlify/functions/get-device-status')
            .then(res => res.json())
            .then(data => {
                setDeviceData(data);
                setIsLoading(false);
            })
            .catch(err => setIsLoading(false));
    }, []);

    if (isLoading) {
        return <div className="container"><h1>Načítám...</h1></div>;
    }

    const switchStatus = deviceData?.find(item => item.code === 'switch_1');

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