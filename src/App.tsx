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
    console.log("APP LOADED - FINAL VERSION");
    
    const [devicesData, setDevicesData] = useState<TuyaDevice[] | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedDevice, setSelectedDevice] = useState<TuyaDevice | null>(null);

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
            <div style={{ textAlign: 'center', padding: '50px' }}>
                <h1>Načítám zařízení...</h1>
            </div>
        );
    }

    if (error) {
        return (
            <div style={{ textAlign: 'center', padding: '50px' }}>
                <h1>Chyba</h1>
                <p>Nepodařilo se načíst data: {error}</p>
            </div>
        );
    }

    return (
        <div style={{ 
            maxWidth: '1200px', 
            margin: '0 auto', 
            padding: '20px',
            backgroundColor: '#ffffff',
            minHeight: '100vh'
        }}>
            <h1 style={{ 
                textAlign: 'center', 
                color: '#000000',
                marginBottom: '10px'
            }}>
                FINÁLNÍ VERZE - Tuya Smart Zařízení
            </h1>
            
            <p style={{ 
                textAlign: 'center', 
                fontSize: '18px', 
                color: '#000000',
                marginBottom: '30px'
            }}>
                Celkem zařízení: {devicesData?.length || 0}
            </p>
            
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                gap: '20px'
            }}>
                {devicesData?.map((device) => {
                    const isOnline = device.online;
                    const switches = device.status?.filter(item => item.code.startsWith('switch_')) || [];
                    
                    return (
                        <div key={device.id} style={{
                            border: `2px solid ${isOnline ? '#27ae60' : '#e74c3c'}`,
                            borderRadius: '8px',
                            padding: '16px',
                            backgroundColor: '#ffffff',
                            minHeight: '200px',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                        }}>
                            <div>
                                <h3 style={{ 
                                    margin: '0 0 15px 0',
                                    color: '#000000',
                                    fontSize: '18px'
                                }}>
                                    {device.custom_name || device.name}
                                </h3>
                                
                                <div style={{ marginBottom: '15px' }}>
                                    <p style={{ margin: '5px 0', fontSize: '14px', color: '#000000' }}>
                                        <strong>Stav:</strong>
                                        <span style={{
                                            marginLeft: '8px',
                                            padding: '3px 8px',
                                            borderRadius: '12px',
                                            backgroundColor: isOnline ? '#27ae60' : '#e74c3c',
                                            color: 'white',
                                            fontSize: '12px'
                                        }}>
                                            {isOnline ? 'ONLINE' : 'OFFLINE'}
                                        </span>
                                    </p>
                                    <p style={{ margin: '5px 0', fontSize: '14px', color: '#000000' }}>
                                        <strong>Kategorie:</strong> {device.category}
                                    </p>
                                    {switches.length > 0 && (
                                        <p style={{ margin: '5px 0', fontSize: '14px', color: '#000000' }}>
                                            <strong>Spínače:</strong> {switches.length}
                                        </p>
                                    )}
                                </div>

                                {/* Kompaktní zobrazení switchů */}
                                {switches.length > 0 && switches.length <= 3 && (
                                    <div style={{ marginBottom: '10px' }}>
                                        {switches.map((switchItem) => {
                                            const switchNumber = switchItem.code.replace('switch_', '');
                                            return (
                                                <div key={switchItem.code} style={{
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center',
                                                    padding: '6px 10px',
                                                    margin: '4px 0',
                                                    backgroundColor: switchItem.value ? '#d4edda' : '#f8d7da',
                                                    borderRadius: '4px',
                                                    fontSize: '13px',
                                                    color: '#000000'
                                                }}>
                                                    <span>{switchNumber.toUpperCase()}</span>
                                                    <span style={{
                                                        padding: '2px 8px',
                                                        borderRadius: '10px',
                                                        backgroundColor: switchItem.value ? '#28a745' : '#dc3545',
                                                        color: 'white',
                                                        fontSize: '11px'
                                                    }}>
                                                        {switchItem.value ? 'ZAP' : 'VYP'}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            <button 
                                onClick={() => setSelectedDevice(device)}
                                style={{
                                    backgroundColor: '#007bff',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    padding: '10px',
                                    cursor: 'pointer',
                                    fontSize: '14px',
                                    fontWeight: 'bold',
                                    marginTop: 'auto'
                                }}
                            >
                                ZOBRAZIT DETAILY
                            </button>
                        </div>
                    );
                })}
            </div>

            {/* Modal pro detaily */}
            {selectedDevice && (
                <div style={{
                    position: 'fixed',
                    top: '0',
                    left: '0',
                    right: '0',
                    bottom: '0',
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    zIndex: 1000
                }} onClick={() => setSelectedDevice(null)}>
                    <div style={{
                        backgroundColor: 'white',
                        borderRadius: '8px',
                        maxWidth: '600px',
                        maxHeight: '80vh',
                        overflow: 'auto',
                        padding: '20px',
                        margin: '20px'
                    }} onClick={(e) => e.stopPropagation()}>
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '20px',
                            borderBottom: '1px solid #eee',
                            paddingBottom: '10px'
                        }}>
                            <h2 style={{ margin: 0 }}>
                                {selectedDevice.custom_name || selectedDevice.name}
                            </h2>
                            <button 
                                onClick={() => setSelectedDevice(null)}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    fontSize: '24px',
                                    cursor: 'pointer'
                                }}
                            >
                                ×
                            </button>
                        </div>
                        
                        <div style={{ marginBottom: '20px' }}>
                            <p><strong>ID:</strong> {selectedDevice.id}</p>
                            <p><strong>Kategorie:</strong> {selectedDevice.category}</p>
                            <p><strong>Produkt:</strong> {selectedDevice.product_name || 'Neznámý'}</p>
                            <p><strong>Online:</strong> {selectedDevice.online ? 'Ano' : 'Ne'}</p>
                        </div>

                        {selectedDevice.status && (
                            <div>
                                <h4>Všechny stavy:</h4>
                                <pre style={{
                                    backgroundColor: '#f8f9fa',
                                    padding: '10px',
                                    borderRadius: '4px',
                                    fontSize: '12px',
                                    overflow: 'auto',
                                    maxHeight: '300px'
                                }}>
                                    {JSON.stringify(selectedDevice.status, null, 2)}
                                </pre>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default App;
