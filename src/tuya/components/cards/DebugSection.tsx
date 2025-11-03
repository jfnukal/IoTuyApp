// src/tuya/components/cards/DebugSection.tsx
import React, { useState } from 'react';
import type { TuyaDevice } from '../../../types';

interface DebugSectionProps {
  device: TuyaDevice;
  isVisible: boolean;
}

const DebugSection: React.FC<DebugSectionProps> = ({ device, isVisible }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!isVisible) return null;

  return (
    <div className="debug-section">
      <button 
        className="debug-toggle"
        onClick={() => setIsExpanded(!isExpanded)}
        title="Zobrazit/skrýt debug informace"
      >
        <span className="debug-icon">🔍</span>
        <span className="debug-label">Debug Info</span>
        <span className="expand-icon">{isExpanded ? '▼' : '▶'}</span>
      </button>

      {isExpanded && (
        <div className="debug-content">
          {/* Základní info */}
          <div className="debug-group">
            <h4 className="debug-group-title">📋 Základní info</h4>
            <div className="debug-item">
              <span className="debug-key">ID:</span>
              <span className="debug-value">{device.id}</span>
            </div>
            <div className="debug-item">
              <span className="debug-key">Category:</span>
              <span className="debug-value">{device.category}</span>
            </div>
            <div className="debug-item">
              <span className="debug-key">Product ID:</span>
              <span className="debug-value">{device.product_id}</span>
            </div>
            <div className="debug-item">
              <span className="debug-key">Product Name:</span>
              <span className="debug-value">{device.product_name}</span>
            </div>
            <div className="debug-item">
              <span className="debug-key">Zigbee (sub):</span>
              <span className="debug-value">
                {device.sub ? '✅ Ano' : '❌ Ne'}
              </span>
            </div>
            <div className="debug-item">
              <span className="debug-key">Online:</span>
              <span className="debug-value">
                {device.online ? '🟢 Online' : '⚫ Offline'}
              </span>
            </div>
          </div>

          {/* Status kódy */}
          <div className="debug-group">
            <h4 className="debug-group-title">⚡ Status kódy ({device.status?.length || 0})</h4>
            {device.status && device.status.length > 0 ? (
              <div className="debug-status-list">
                {device.status.map((status, index) => (
                  <div key={index} className="debug-status-item">
                    <div className="status-code-line">
                      <span className="status-code">{status.code}</span>
                      <span className="status-type">
                        {typeof status.value === 'boolean' ? '🔘 bool' :
                         typeof status.value === 'number' ? '🔢 number' :
                         typeof status.value === 'string' ? '📝 string' : '📦 object'}
                      </span>
                    </div>
                    <div className="status-value-line">
                      <span className="status-value">
                        {typeof status.value === 'object' 
                          ? JSON.stringify(status.value, null, 2)
                          : String(status.value)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="debug-empty">Žádné status kódy</div>
            )}
          </div>

          {/* Custom parametry */}
          {(device.customName || device.customIcon || device.customColor || device.notes) && (
            <div className="debug-group">
              <h4 className="debug-group-title">🎨 Custom parametry</h4>
              {device.customName && (
                <div className="debug-item">
                  <span className="debug-key">Custom Name:</span>
                  <span className="debug-value">{device.customName}</span>
                </div>
              )}
              {device.customIcon && (
                <div className="debug-item">
                  <span className="debug-key">Custom Icon:</span>
                  <span className="debug-value">{device.customIcon}</span>
                </div>
              )}
              {device.customColor && (
                <div className="debug-item">
                  <span className="debug-key">Custom Color:</span>
                  <span className="debug-value">{device.customColor}</span>
                </div>
              )}
              {device.notes && (
                <div className="debug-item">
                  <span className="debug-key">Notes:</span>
                  <span className="debug-value">{device.notes}</span>
                </div>
              )}
            </div>
          )}

          {/* Pokročilé */}
          <div className="debug-group">
            <h4 className="debug-group-title">🔧 Pokročilé</h4>
            <div className="debug-item">
              <span className="debug-key">UUID:</span>
              <span className="debug-value small">{device.uuid}</span>
            </div>
            <div className="debug-item">
              <span className="debug-key">Local Key:</span>
              <span className="debug-value small">{device.local_key}</span>
            </div>
            <div className="debug-item">
              <span className="debug-key">Owner ID:</span>
              <span className="debug-value small">{device.owner_id}</span>
            </div>
            {device.lastUpdated && (
              <div className="debug-item">
                <span className="debug-key">Last Updated:</span>
                <span className="debug-value">
                  {new Date(device.lastUpdated).toLocaleString('cs-CZ')}
                </span>
              </div>
            )}
          </div>

          {/* RAW JSON */}
          <div className="debug-group">
            <h4 className="debug-group-title">📦 RAW JSON</h4>
            <pre className="debug-json">
              {JSON.stringify(device, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};

export default DebugSection;