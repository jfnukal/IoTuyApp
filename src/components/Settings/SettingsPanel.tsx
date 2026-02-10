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

interface SettingsPanelProps {
  section: MenuSection;
  settings: AppSettings;
  onSettingsChange: (settings: AppSettings) => void;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({
  section,
  settings,
  onSettingsChange,
}) => {
  const updateWidgetSetting = (
    widget: keyof AppSettings['widgets'],
    key: string,
    value: any
  ) => {
    const newSettings = { ...settings };

    // Pokud widget objekt neexistuje, vytvoř ho
    if (!newSettings.widgets[widget]) {
      newSettings.widgets[widget] = {} as any;
    }

    (newSettings.widgets[widget] as any)[key] = value;
    onSettingsChange(newSettings);
  };

  const renderDashboard = () => {
    const [isRefreshing, setIsRefreshing] = React.useState(false);

    const handleRefreshAPIs = async () => {
      setIsRefreshing(true);
      try {
        await settingsService.checkAllAPIs();
        // Počkat 2 sekundy a jen refreshnout data
        await new Promise((resolve) => setTimeout(resolve, 2000));
        // Reload settings bez page refresh
        const updatedSettings = await settingsService.loadSettings();
        onSettingsChange(updatedSettings);
        setIsRefreshing(false);
      } catch (error) {
        console.error('Chyba při kontrole API:', error);
        setIsRefreshing(false);
      }
    };

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

  const renderFamilyWidgets = () => (
    <SettingsWidgets settings={settings} onSettingsChange={onSettingsChange} />
  );

  const renderFamilyGeneral = () => (
    <div className="settings-section">
      <h2>⚙️ Obecné nastavení</h2>
      <p className="placeholder-text">Zatím žádná obecná nastavení</p>
    </div>
  );

  const renderNotifications = () => (
    <div className="settings-section">
      <h2>🔔 Notifikace (FCM)</h2>
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

  const renderAPIServices = () => (
    <div className="settings-section">
      <h2>🌐 API Služby</h2>
      <p className="placeholder-text">Status jednotlivých API služeb</p>
    </div>
  );

  const renderTuya = () => (
    <SettingsTuya settings={settings} onSettingsChange={onSettingsChange} />
  );

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

      <div className="widget-group">
        <h3>🔔 Firebase & Tuya</h3>

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
          📝 Zapnout/vypnout Firebase notifikace
        </p>
      </div>
    </div>
  );

  switch (section) {
    case 'dashboard':
      return renderDashboard();
    case 'family-widgets':
      return renderFamilyWidgets();
    case 'family-general':
      return renderFamilyGeneral();
    case 'notifications':
      return renderNotifications();
    case 'system':
      return renderSystemSettings();
    case 'api-weather':
    case 'api-unsplash':
    case 'api-vision':
    case 'api-bakalari':
      return renderAPIServices();
    case 'tuya':
      return renderTuya();
    default:
      return renderDashboard();
    case 'shopping-aliases':
      return <ShoppingAliasesPanel />;
  }
};

export default SettingsPanel;
