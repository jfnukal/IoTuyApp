import { useState, useEffect } from 'react';
import './App.css';

interface DeviceStatus {
  code: string;
  value: any;
}

interface TuyaDevice {
  id: string;
  name: string;
  local_key?: string;
  category: string;
  product_id?: string;
  product_name?: string;
  sub?: boolean;
  uuid?: string;
  online: boolean;
  active_time?: number;
  create_time?: number;
  update_time?: number;
  time_zone?: string;
  status: DeviceStatus[] | null;
  statusError?: string;
  custom_name?: string;
  error?: string;
}

function App() {
  console.log("APP COMPONENT LOADED - VERSION 2.0");
    const [devicesData, setDevicesData] = useState<TuyaDevice[] | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetch('/.netlify/functions/get-devices-list')
            .then(res => {
                if (!res.ok) {
                    throw new Error(`HTTP ${res.status}: ${res.statusText}`);
                }
                return res.json();
            })
            .then((data) => {
                console.log('Received data:', data);
                // Handle different response formats
                let devices = [];
                if (data.devices && Array.isArray(data.devices)) {
                    devices = data.devices;
                } else if (Array.isArray(data)) {
                    devices = data;
                } else if (data.result && Array.isArray(data.result)) {
                    devices = data.result;
                } else {
                    console.warn('Unexpected data format:', data);
                    devices = [];
                }
                setDevicesData(devices);
                setIsLoading(false);
            })
            .catch(err => {
                console.error("Chyba při načítání dat:", err);
                setError(err.message);
                setIsLoading(false);
            });
    }, []);

    if (isLoading) {
        return (
            <div className="container">
                <div className="loading">
                    <h1>Načítám zařízení...</h1>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="container">
                <div className="error">
                    <h1>Chyba</h1>
                    <p>Nepodařilo se načíst data: {error}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="container">
            <h1 style={{ color: '#2c3e50', textAlign: 'center' }}>
                  NOVÁ VERZE - Tuya Smart Zařízení
              </h1>
            <p className="device-count">
                Celkem zařízení: {devicesData?.length || 0}
            </p>
            
            <div className="devices-grid">
                {devicesData?.map((device) => {
                    const isOnline = device.online;
                    const switches = device.status?.filter(item => item.code.startsWith('switch_')) || [];
                    const countdowns = device.status?.filter(item => item.code.startsWith('countdown_')) || [];
                    
                    return (
                        <div key={device.id} className={`device-card ${isOnline ? 'online' : 'offline'}`}>
                            <h3 className="device-title">
                                {device.custom_name || device.name}
                            </h3>
                            
                            <div className="device-info">
                                <p><strong>ID:</strong> {device.id}</p>
                                <p><strong>Kategorie:</strong> {device.category}</p>
                                <p><strong>Produkt:</strong> {device.product_name || 'Neznámý'}</p>
                                <p>
                                    <strong>Stav:</strong> 
                                    <span className={`status-badge ${isOnline ? 'online' : 'offline'}`}>
                                        {isOnline ? 'ONLINE' : 'OFFLINE'}
                                    </span>
                                </p>
                                <p><strong>Vytvořeno:</strong> {device.create_time ? new Date(device.create_time * 1000).toLocaleString('cs-CZ') : 'Neznámé'}</p>
                            </div>

                            {/* Zobrazení switchů pokud existují */}
                            {switches.length > 0 && (
                                <div className="switches-section">
                                    <h4 className="switches-title">Spínače:</h4>
                                    <div className="switches-list">
                                        {switches.map((switchItem) => {
                                            const switchNumber = switchItem.code.replace('switch_', '');
                                            const countdown = countdowns.find(c => c.code === `countdown_${switchNumber}`);
                                            
                                            return (
                                                <div key={switchItem.code} className={`switch-item ${switchItem.value ? 'on' : 'off'}`}>
                                                    <span className="switch-label">
                                                        Switch {switchNumber.toUpperCase()}
                                                    </span>
                                                    <div className="switch-controls">
                                                        <span className={`switch-status ${switchItem.value ? 'on' : 'off'}`}>
                                                            {switchItem.value ? 'ZAP' : 'VYP'}
                                                        </span>
                                                        {countdown && countdown.value > 0 && (
                                                            <span className="countdown">
                                                                ({countdown.value}s)
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Chyba při načítání stavu */}
                            {device.statusError && (
                                <div className="error-section">
                                    Chyba při načítání stavu: {device.statusError}
                                </div>
                            )}

                            {/* Chyba při načítání zařízení */}
                            {device.error && (
                                <div className="error-section">
                                    Chyba: {device.error}
                                </div>
                            )}

                            {/* Detailní informace o stavu */}
                            {device.status && device.status.length > 0 && (
                                <details className="debug-section">
                                    <summary>Všechny stavy zařízení</summary>
                                    <div className="debug-content">
                                        {JSON.stringify(device.status, null, 2)}
                                    </div>
                                </details>
                            )}
                        </div>
                    );
                })}
            </div>
            
            {/* Skrytý debug pro celková data */}
            {/* 
            <details className="debug-section">
                <summary>Debug info - Raw data</summary>
                <div className="debug-content">
                    {JSON.stringify(devicesData, null, 2)}
                </div>
            </details> 
            */}
        </div>
    );
}

export default App;
