// src/components/Dashboard/TechDashboard.tsx
import React, { useState } from 'react';
import { TuyaDeviceList, HouseVisualization, RoomManager } from '../../tuya';
import './styles/TechDashboard.css';

const TechDashboard: React.FC = () => {
  const [view, setView] = useState<'list' | 'visualization' | 'rooms'>('list');

  return (
    <div className="tech-dashboard">
      <div className="tech-dashboard-header">
        <div>
          <h2 className="tech-title">🔧 Technický Dashboard</h2>
          <p className="tech-subtitle">Správa zařízení a systémů</p>
        </div>

        {/* Přepínač zobrazení */}
        <div className="view-toggle">
          <button
            className={`toggle-button ${view === 'list' ? 'active' : ''}`}
            onClick={() => setView('list')}
          >
            📋 Seznam
          </button>
          <button
            className={`toggle-button ${view === 'visualization' ? 'active' : ''}`}
            onClick={() => setView('visualization')}
          >
            🏠 Vizualizace
          </button>
          <button
            className={`toggle-button ${view === 'rooms' ? 'active' : ''}`}
            onClick={() => setView('rooms')}
          >
            🚪 Místnosti
          </button>
        </div>
      </div>

      {/* Hlavní obsah */}
      <div className="tech-main-content">
        {view === 'list' && <TuyaDeviceList />}

        {view === 'visualization' && (
          <div className="visualization-layout">
            <div className="devices-sidebar">
              <TuyaDeviceList />
            </div>
            <div className="visualization-main">
              <HouseVisualization />
            </div>
          </div>
        )}

        {view === 'rooms' && <RoomManager />}
      </div>

      {/* Další widgety */}
      <div className="tech-widgets-grid secondary">
        <div className="tech-widget cameras-widget">
          <div className="tech-widget-header">
            <div className="tech-widget-title">
              <span className="tech-widget-icon">📹</span>
              <span>Bezpečnostní kamery</span>
            </div>
            <span className="tech-widget-count">0</span>
          </div>
          <div className="tech-widget-content">
            <p className="tech-placeholder-text">
              Připojení ke kamerám bude dostupné brzy...
            </p>
          </div>
        </div>

        <div className="tech-widget energy-widget">
          <div className="tech-widget-header">
            <div className="tech-widget-title">
              <span className="tech-widget-icon">⚡</span>
              <span>Spotřeba energie</span>
            </div>
          </div>
          <div className="tech-widget-content">
            <p className="tech-placeholder-text">
              Monitoring energie bude dostupný brzy...
            </p>
          </div>
        </div>

        <div className="tech-widget system-widget">
          <div className="tech-widget-header">
            <div className="tech-widget-title">
              <span className="tech-widget-icon">🖥️</span>
              <span>Systémový stav</span>
            </div>
          </div>
          <div className="tech-widget-content">
            <p className="tech-placeholder-text">
              Systémové informace budou dostupné brzy...
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TechDashboard;
