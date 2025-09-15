import { useState, useEffect } from 'react';
import './App.css';

interface DeviceStatus {
  code: string;
  value: any;
}

interface TuyaDevice {
  id: string;
  name: string;
  local_key: string;
  category: string;
  product_id: string;
  product_name: string;
  sub: boolean;
  uuid: string;
  online: boolean;
  active_time: number;
  create_time: number;
  update_time: number;
  time_zone: string;
  status: DeviceStatus[] | null;
  statusError?: string;
}

function App() {
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
            .then((data: TuyaDevice[]) => {
                setDevicesData(data);
                setIsLoading(false);
            })
            .catch(err => {
                console.error("Chyba při načítání dat:", err);
                setError(err.message);
                setIsLoading(false);
            });
    }, []);

    if (isLoading) {
        return <div className="container"><h1>Načítám zařízení...</h1></div>;
    }

    if (error) {
        return (
            <div className="container">
                <h1>Chyba</h1>
                <p>Nepodařilo se načíst data: {error}</p>
            </div>
        );
    }

    return (
        <div className="container">
            <h1>Tuya Smart Zařízení</h1>
            <p>Celkem zařízení: {devicesData?.length || 0}</p>
            
            <div className="devices-grid" style={{ display: 'grid', gap: '20px', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
                {devicesData?.map((device) => {
                    const isOnline = device.online;
                    const switches = device.status?.filter(item => item.code.startsWith('switch_')) || [];
                    const countdowns = device.status?.filter(item => item.code.startsWith('countdown_')) || [];
                    
                    return (
                        <div key={device.id} className="device-card" style={{
                            border: '1px solid #ddd',
                            borderRadius: '8px',
                            padding: '16px',
                            backgroundColor: isOnline ? '#f9f9f9' : '#ffeeee'
                        }}>
                            <h3>{device.name}</h3>
                            <div className="device-info">
                                <p><strong>ID:</strong> {device.id}</p>
                                <p><strong>Kategorie:</strong> {device.category}</p>
                                <p><strong>Produkt:</strong> {device.product_name}</p>
                                <p><strong>Stav:</strong> 
                                    <span className={`status-indicator ${isOnline ? 'online' : 'offline'}`} style={{
                                        marginLeft: '8px',
                                        padding: '2px 8px',
                                        borderRadius: '4px',
                                        color: 'white',
                                        backgroundColor: isOnline ? 'green' : 'red'
                                    }}>
                                        {isOnline ? 'ONLINE' : 'OFFLINE'}
                                    </span>
                                </p>
                                <p><strong>Vytvořeno:</strong> {new Date(device.create_time * 1000).toLocaleString('cs-CZ')}</p>
                            </div>

                            {/* Zobrazení switchů pokud existují */}
                            {switches.length > 0 && (
                                <div className="switches-section" style={{ marginTop: '16px' }}>
                                    <h4>Spínače:</h4>
                                    <div className="switches-list">
                                        {switches.map((switchItem) => {
                                            const switchNumber = switchItem.code.replace('switch_', '');
                                            const countdown = countdowns.find(c => c.code === `countdown_${switchNumber}`);
                                            
                                            return (
                                                <div key={switchItem.code} className="switch-item" style={{
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center',
                                                    padding: '8px',
                                                    margin: '4px 0',
                                                    backgroundColor: switchItem.value ? '#e8f5e8' : '#ffe8e8',
                                                    borderRadius: '4px'
                                                }}>
                                                    <span>Switch {switchNumber.toUpperCase()}</span>
                                                    <div>
                                                        <span className={`status-box ${switchItem.value ? 'on' : 'off'}`} style={{
                                                            padding: '2px 8px',
                                                            borderRadius: '4px',
                                                            color: 'white',
                                                            backgroundColor: switchItem.value ? 'green' : 'red',
                                                            marginRight: '8px'
                                                        }}>
                                                            {switchItem.value ? 'ZAP' : 'VYP'}
                                                        </span>
                                                        {countdown && countdown.value > 0 && (
                                                            <span className="countdown" style={{
                                                                fontSize: '12px',
                                                                color: '#666'
                                                            }}>
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
                                <div className="status-error" style={{
                                    marginTop: '16px',
                                    padding: '8px',
                                    backgroundColor: '#ffe6e6',
                                    borderRadius: '4px',
                                    fontSize: '12px',
                                    color: '#d63031'
                                }}>
                                    Chyba při načítání stavu: {device.statusError}
                                </div>
                            )}

                            {/* Detailní informace o stavu */}
                            {device.status && device.status.length > 0 && (
                                <details style={{ marginTop: '16px', fontSize: '12px' }}>
                                    <summary>Všechny stavy zařízení</summary>
                                    <pre style={{ 
                                        fontSize: '10px',
                                        overflow: 'auto',
                                        maxHeight: '200px',
                                        backgroundColor: '#f5f5f5',
                                        padding: '8px',
                                        borderRadius: '4px',
                                        marginTop: '8px'
                                    }}>
                                        {JSON.stringify(device.status, null, 2)}
                                    </pre>
                                </details>
                            )}
                        </div>
                    );
                })}
            </div>
            
            <details style={{ marginTop: '20px', fontSize: '12px' }}>
                <summary>Debug info - Raw data</summary>
                <pre style={{ 
                    fontSize: '10px',
                    overflow: 'auto',
                    maxHeight: '300px',
                    backgroundColor: '#f5f5f5',
                    padding: '16px',
                    borderRadius: '4px'
                }}>
                    {JSON.stringify(devicesData, null, 2)}
                </pre>
            </details>
        </div>
    );
}

export default App;
