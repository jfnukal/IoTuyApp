// src/components/Dashboard/TechDashboard.tsx
import React, { useState, useEffect } from 'react';
import { TuyaDeviceList, HouseVisualization, RoomManager } from '../../tuya';
import { useTuya } from '../../tuya/hooks/useTuya';
import { useNavigate } from 'react-router-dom';
import './styles/TechDashboard.css';

type ViewType = 'list' | 'visualization' | 'rooms';
type FilterType = 'all' | 'online' | 'offline';

const TechDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { onlineCount, deviceCount, syncDevices, isSyncing } = useTuya();
  const offlineCount = deviceCount - onlineCount;

  // Stavy
  const [view, setView] = useState<ViewType>('list');
  const [searchInput, setSearchInput] = useState('');  // Okamžitá hodnota inputu
  const [searchQuery, setSearchQuery] = useState('');  // Debounced hodnota pro filtrování
  const [filter, setFilter] = useState<FilterType>('online');
  const [showDebugInfo, setShowDebugInfo] = useState(false);
  const [isLayoutEditMode, setIsLayoutEditMode] = useState(false);

  // Debounce vyhledávání - počká 300ms po posledním znaku
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchInput);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchInput]);

  const viewOptions: { key: ViewType; icon: string; label: string }[] = [
    { key: 'list', icon: '📋', label: 'Seznam' },
    { key: 'visualization', icon: '🏗️', label: 'Vizualizace' },
    { key: 'rooms', icon: '🚪', label: 'Místnosti' },
  ];

  return (
    <div className="tech-dashboard">
      {/* ==================== NOVÁ HLAVIČKA ==================== */}
      <div className="tech-header-new">
        {/* Horní řádek: Logo + Statistiky + Akce */}
        <div className="header-top-row">
          {/* Logo a návrat */}
          <button 
            className="tech-logo-btn"
            onClick={() => navigate('/?mode=family')}
            title="Zpět na rodinný dashboard"
          >
            <span className="logo-icon">🔧</span>
            <span className="logo-text">Technika</span>
            <span className="logo-back">← zpět</span>
          </button>

          {/* Statistiky zařízení */}
          <div className="device-stats">
            <div 
              className={`stat-card ${filter === 'all' ? 'active' : ''}`}
              onClick={() => setFilter('all')}
            >
              <span className="stat-number">{deviceCount}</span>
              <span className="stat-label">Celkem</span>
            </div>
            <div 
              className={`stat-card online ${filter === 'online' ? 'active' : ''}`}
              onClick={() => setFilter('online')}
            >
              <span className="stat-indicator"></span>
              <span className="stat-number">{onlineCount}</span>
              <span className="stat-label">Online</span>
            </div>
            <div 
              className={`stat-card offline ${filter === 'offline' ? 'active' : ''}`}
              onClick={() => setFilter('offline')}
            >
              <span className="stat-indicator"></span>
              <span className="stat-number">{offlineCount}</span>
              <span className="stat-label">Offline</span>
            </div>
          </div>

          {/* Rychlé akce */}
          <div className="quick-actions">
            <button
              className={`quick-action-btn ${showDebugInfo ? 'active' : ''}`}
              onClick={() => setShowDebugInfo(!showDebugInfo)}
              title="Debug režim"
            >
              <span className="qa-icon">🐛</span>
            </button>
            <button
              className={`quick-action-btn ${isLayoutEditMode ? 'active edit-mode' : ''}`}
              onClick={() => setIsLayoutEditMode(!isLayoutEditMode)}
              title="Upravit rozložení"
            >
              <span className="qa-icon">✏️</span>
            </button>
            <button
              className="quick-action-btn floor-action"
              onClick={() => navigate('/floorplan')}
              title="Půdorys 1.NP"
            >
              <span className="qa-icon">🏠</span>
            </button>
            <button
              className={`quick-action-btn sync-action ${isSyncing ? 'syncing' : ''}`}
              onClick={syncDevices}
              disabled={isSyncing}
              title="Synchronizovat zařízení"
            >
              {isSyncing ? (
                <div className="spinner-mini"></div>
              ) : (
                <span className="qa-icon">🔄</span>
              )}
            </button>
          </div>
        </div>

        {/* Spodní řádek: Vyhledávání + Přepínač pohledů */}
        <div className="header-bottom-row">
          {/* Vyhledávání */}
          <div className="search-container">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="Hledat zařízení..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="search-input-new"
            />
            {searchInput && (
              <button 
                className="search-clear"
                onClick={() => {
                  setSearchInput('');
                  setSearchQuery('');
                }}
              >
                ✕
              </button>
            )}
          </div>

          {/* Přepínač pohledů */}
          <div className="view-switcher">
            {viewOptions.map((option) => (
              <button
                key={option.key}
                className={`view-btn ${view === option.key ? 'active' : ''}`}
                onClick={() => setView(option.key)}
              >
                <span className="view-icon">{option.icon}</span>
                <span className="view-label">{option.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ==================== HLAVNÍ OBSAH ==================== */}
      <div className="tech-main-content">
        {view === 'list' && (
          <TuyaDeviceList
            searchQuery={searchQuery}
            filter={filter}
            showDebugInfo={showDebugInfo}
            isLayoutEditMode={isLayoutEditMode}
          />
        )}

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

      {/* ==================== WIDGETY ==================== */}
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