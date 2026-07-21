// src/components/Settings/SettingsPanel.tsx
import React from 'react';
import type { MenuSection } from './SettingsMenu';
import type { AppSettings } from '../../services/settingsService';
import { settingsService } from '../../services/settingsService';
import ToggleSwitch from './ToggleSwitch';
import NumberInput from './NumberInput';
import './SettingsPanel.css';
import ShoppingAliasesPanel from './ShoppingAliasesPanel';
import SettingsTuya from './SettingsTuya';
import SettingsWidgets from './SettingsWidgets';
import DaySummarySettings from './DaySummarySettings';

interface SettingsPanelProps {
  section: MenuSection;
  settings: AppSettings;
  onSettingsChange: (settings: AppSettings) => void;
}

// Mapování API sekce → klíč v apiStatuses + popis
const API_META: Record<
  string,
  {
    key: keyof AppSettings['apiStatuses'];
    title: string;
    icon: string;
    description: string;
  }
> = {
  'api-weather': {
    key: 'weather',
    title: 'Weather API',
    icon: '🌤️',
    description: 'Předpověď počasí (weatherapi.com). Klíč je uložen v konfiguraci aplikace.',
  },
  'api-unsplash': {
    key: 'unsplash',
    title: 'Unsplash API',
    icon: '🖼️',
    description: 'Obrázky na pozadí widgetu počasí.',
  },
  'api-vision': {
    key: 'googleVision',
    title: 'Google Vision',
    icon: '👁️',
    description: 'Rozpoznávání textu z ručně psaných poznámek (OCR).',
  },
  'api-bakalari': {
    key: 'bakalari',
    title: 'Bakaláři',
    icon: '🎓',
    description: 'Zdroj dat pro školní rozvrh.',
  },
};

const SettingsPanel: React.FC<SettingsPanelProps> = ({
  section,
  settings,
  onSettingsChange,
}) => {
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  const handleRefreshAPIs = async () => {
    setIsRefreshing(true);
    try {
      await settingsService.checkAllAPIs();
      await new Promise((resolve) => setTimeout(resolve, 2000));
      const updatedSettings = await settingsService.loadSettings();
      onSettingsChange(updatedSettings);
    } catch (error) {
      console.error('Chyba při kontrole API:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const renderDashboard = () => {
    return (
      <div className="settings-section">
        <div className="dashboard-header-row">
          <h2>📊 Dashboard - Přehled systému</h2>
          <div className="dashboard-actions">
            {settings.systemSettings.autoCheckEnabled && (
              <span className="auto-check-info">
                ⏰ Auto-check: každých{' '}
                {settings.systemSettings.apiCheckIntervalMinutes} min
              </span>
            )}
            <button
              className="btn-refresh"
              onClick={handleRefreshAPIs}
              disabled={isRefreshing}
            >
              {isRefreshing ? '🔄 Kontroluji...' : '🔄 Zkontrolovat teď'}
            </button>
          </div>
        </div>

        <div className="status-grid">
          <div className="status-card">
            <h3>🔥 Firebase</h3>
            <div
              className={`status-indicator ${settings.apiStatuses.firebase.status}`}
            >
              {settings.apiStatuses.firebase.status === 'online'
                ? '✅ Online'
                : '❌ Offline'}
            </div>
            <p className="status-time">
              Poslední kontrola:{' '}
              {new Date(settings.apiStatuses.firebase.lastCheck).toLocaleString(
                'cs-CZ'
              )}
            </p>
          </div>

          <div className="status-card">
            <h3>🌤️ Weather API</h3>
            <div
              className={`status-indicator ${settings.apiStatuses.weather.status}`}
            >
              {settings.apiStatuses.weather.status === 'online'
                ? '✅ Online'
                : '❌ Offline'}
            </div>
            <p className="status-time">
              Poslední kontrola:{' '}
              {new Date(settings.apiStatuses.weather.lastCheck).toLocaleString(
                'cs-CZ'
              )}
            </p>
          </div>

          <div className="status-card">
            <h3>👁️ Google Vision</h3>
            <div
              className={`status-indicator ${settings.apiStatuses.googleVision.status}`}
            >
              {settings.apiStatuses.googleVision.status === 'online'
                ? '✅ Online'
                : '❌ Offline'}
            </div>
            <p className="status-time">
              Poslední kontrola:{' '}
              {new Date(
                settings.apiStatuses.googleVision.lastCheck
              ).toLocaleString('cs-CZ')}
            </p>
          </div>

          <div className="status-card">
            <h3>🎓 Bakaláři</h3>
            <div
              className={`status-indicator ${settings.apiStatuses.bakalari.status}`}
            >
              {settings.apiStatuses.bakalari.status === 'online'
                ? '✅ Online'
                : '❌ Offline'}
            </div>
            <p className="status-time">
              Poslední kontrola:{' '}
              {new Date(settings.apiStatuses.bakalari.lastCheck).toLocaleString(
                'cs-CZ'
              )}
            </p>
          </div>
        </div>

        <div className="stats-section">
          <h3>📊 Statistiky FCM</h3>
          <div className="stats-grid">
            <div className="stat-item">
              <span className="stat-label">Zpráv tento měsíc:</span>
              <span className="stat-value">{settings.fcmStats.monthSent}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Zpráv celkem:</span>
              <span className="stat-value">{settings.fcmStats.totalSent}</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderNotifications = () => (
    <div className="settings-section">
      <h2>🔔 Notifikace (FCM)</h2>

      <div className="widget-group">
        <ToggleSwitch
          label="Firebase Cloud Messaging"
          checked={settings.systemSettings.fcmEnabled}
          onChange={(val) => {
            const newSettings = { ...settings };
            newSettings.systemSettings.fcmEnabled = val;
            onSettingsChange(newSettings);
          }}
        />
        <p className="setting-description">
          📝 Hlavní vypínač push notifikací (události v kalendáři, rodinné
          zprávy). Když je vypnuto, notifikace se neodesílají.
        </p>
      </div>

      {/* Souhrn dne — per-člen (self-contained, vlastní data z userSettings) */}
      <DaySummarySettings />

      <div className="stats-section">
        <h3>📊 Statistiky</h3>
        <div className="stats-grid">
          <div className="stat-item">
            <span className="stat-label">Zpráv tento měsíc:</span>
            <span className="stat-value">{settings.fcmStats.monthSent}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Zpráv celkem:</span>
            <span className="stat-value">{settings.fcmStats.totalSent}</span>
          </div>
        </div>
      </div>
    </div>
  );

  // Detail jedné API služby — status, poslední kontrola, tlačítko na test
  const renderApiDetail = (sectionId: string) => {
    const meta = API_META[sectionId];
    if (!meta) return renderDashboard();
    const status = settings.apiStatuses[meta.key];

    return (
      <div className="settings-section">
        <div className="dashboard-header-row">
          <h2>
            {meta.icon} {meta.title}
          </h2>
          <button
            className="btn-refresh"
            onClick={handleRefreshAPIs}
            disabled={isRefreshing}
          >
            {isRefreshing ? '🔄 Kontroluji...' : '🔄 Zkontrolovat teď'}
          </button>
        </div>

        <div className="status-card" style={{ maxWidth: 420 }}>
          <div className={`status-indicator ${status.status}`}>
            {status.status === 'online'
              ? '✅ Online'
              : status.status === 'offline'
              ? '❌ Offline'
              : '❔ Neznámý stav'}
          </div>
          <p className="status-time">
            Poslední kontrola:{' '}
            {status.lastCheck
              ? new Date(status.lastCheck).toLocaleString('cs-CZ')
              : '—'}
          </p>
          {status.errorMessage && (
            <p className="status-time" style={{ color: '#e74c3c' }}>
              ⚠️ {status.errorMessage}
            </p>
          )}
        </div>

        <p className="setting-description">{meta.description}</p>
      </div>
    );
  };

  const renderSystemSettings = () => (
    <div className="settings-section">
      <h2>🖥️ Systémová nastavení</h2>

      <div className="widget-group">
        <h3>🔄 Automatická kontrola API</h3>
        <ToggleSwitch
          label="Povolit automatickou kontrolu"
          checked={settings.systemSettings.autoCheckEnabled}
          onChange={(val) => {
            const newSettings = { ...settings };
            newSettings.systemSettings.autoCheckEnabled = val;
            onSettingsChange(newSettings);
          }}
        />

        {settings.systemSettings.autoCheckEnabled && (
          <NumberInput
            label="Interval kontroly"
            value={settings.systemSettings.apiCheckIntervalMinutes}
            onChange={(val) => {
              const newSettings = { ...settings };
              newSettings.systemSettings.apiCheckIntervalMinutes = val;
              onSettingsChange(newSettings);
            }}
            min={5}
            max={120}
            unit="minut"
          />
        )}

        <p className="setting-description">
          📝 Když je povoleno, systém bude automaticky kontrolovat dostupnost
          všech API služeb v nastaveném intervalu.
        </p>
      </div>
    </div>
  );

  switch (section) {
    case 'dashboard':
      return renderDashboard();
    case 'widget-weather':
    case 'widget-school':
    case 'widget-calendar':
    case 'widget-sticky':
    case 'widget-handwriting':
    case 'widget-messages':
    case 'widget-bus':
      return (
        <SettingsWidgets
          section={section}
          settings={settings}
          onSettingsChange={onSettingsChange}
        />
      );
    case 'shopping-aliases':
      return <ShoppingAliasesPanel />;
    case 'notifications':
      return renderNotifications();
    case 'system':
      return renderSystemSettings();
    case 'api-weather':
    case 'api-unsplash':
    case 'api-vision':
    case 'api-bakalari':
      return renderApiDetail(section);
    case 'tuya':
      return <SettingsTuya settings={settings} onSettingsChange={onSettingsChange} />;
    default:
      return renderDashboard();
  }
};

export default SettingsPanel;
