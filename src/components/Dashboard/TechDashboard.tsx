// src/components/Dashboard/TechDashboard.tsx
import React from 'react';
import './styles/TechDashboard.css';

const TechDashboard: React.FC = () => {
  return (
    <div className="tech-dashboard">
      <div className="tech-dashboard-header">
        <h2 className="tech-title">🔧 Technický Dashboard</h2>
        <p className="tech-subtitle">Správa zařízení a systémů</p>
      </div>

      <div className="tech-widgets-grid">
        {/* Tuya zařízení - placeholder */}
        <div className="tech-widget tuya-widget">
          <div className="tech-widget-header">
            <div className="tech-widget-title">
              <span className="tech-widget-icon">🔌</span>
              <span>Tuya Zařízení</span>
            </div>
            <span className="tech-widget-count">0</span>
          </div>
          <div className="tech-widget-content">
            <p className="tech-placeholder-text">
              Připojení k Tuya zařízením bude dostupné brzy...
            </p>
          </div>
        </div>

        {/* Kamery - placeholder */}
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

        {/* Energie - placeholder */}
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

        {/* Systém - placeholder */}
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

      <div className="tech-coming-soon">
        <div className="coming-soon-icon">🚧</div>
        <h3>Technický dashboard v přípravě</h3>
        <p>Brzy zde najdete kompletní správu všech technických zařízení.</p>
      </div>
    </div>
  );
};

export default TechDashboard;