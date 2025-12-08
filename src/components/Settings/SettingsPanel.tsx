// src/components/Settings/SettingsPanel.tsx
import React from 'react';
import type { MenuSection } from './SettingsMenu';
import type { AppSettings } from '../../services/settingsService';
import { settingsService } from '../../services/settingsService';
import ToggleSwitch from './ToggleSwitch';
import NumberInput from './NumberInput';
import './SettingsPanel.css';
import ShoppingAliasesPanel from './ShoppingAliasesPanel';

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
    <div className="settings-section">
      <h2>🧩 Nastavení Widgetů</h2>

      <div className="widget-group">
        <h3>🌤️ Weather Widget</h3>
        <ToggleSwitch
          label="Zobrazit widget"
          checked={settings.widgets?.weather?.enabled ?? true}
          onChange={(val) => updateWidgetSetting('weather', 'enabled', val)}
        />
        <ToggleSwitch
          label="Kompaktní režim"
          checked={settings.widgets?.weather?.compactMode ?? true}
          onChange={(val) => updateWidgetSetting('weather', 'compactMode', val)}
        />
      </div>

      <div className="widget-group">
        <div className="widget-group">
          <h3>📚 Školní rozvrh</h3>
          <ToggleSwitch
            label="Zobrazit widget"
            checked={settings.widgets?.schoolSchedule?.enabled ?? true}
            onChange={(val) =>
              updateWidgetSetting('schoolSchedule', 'enabled', val)
            }
          />
          <NumberInput
            label="Interval kontroly aktuální hodiny"
            value={
              settings.widgets?.schoolSchedule?.currentLessonCheckInterval ?? 60
            }
            onChange={(val) =>
              updateWidgetSetting(
                'schoolSchedule',
                'currentLessonCheckInterval',
                val
              )
            }
            min={10}
            max={300}
            unit="sekund"
          />
          <p className="setting-description">
            ⏰ Jak často kontrolovat, která hodina právě probíhá. Nižší hodnota
            = přesnější aktualizace, ale vyšší zatížení. Doporučeno: 60 sekund.
          </p>
          <NumberInput
            label="Zobrazit hodin dopředu"
            value={settings.widgets?.schoolSchedule?.displayHours ?? 3}
            onChange={(val) =>
              updateWidgetSetting('schoolSchedule', 'displayHours', val)
            }
            min={1}
            max={8}
            unit="hodin"
          />
          <p className="setting-description">
            📅 Kolik hodin rozvrhu zobrazit do budoucna. Například hodnota 3 =
            ukazuje hodiny na příští 3 hodiny.
          </p>
          <NumberInput
            label="Přepínání mezi dětmi"
            value={settings.widgets?.schoolSchedule?.kidRotationInterval ?? 10}
            onChange={(val) =>
              updateWidgetSetting('schoolSchedule', 'kidRotationInterval', val)
            }
            min={5}
            max={60}
            unit="sekund"
          />
          <p className="setting-description">
            👶 Jak často automaticky přepínat mezi rozvrhy dětí (Jareček ↔
            Johanka). Doporučeno: 10 sekund.
          </p>
          <NumberInput
            label="Zobrazit příští den od hodiny"
            value={settings.widgets?.schoolSchedule?.showNextDayAfterHour ?? 14}
            onChange={(val) =>
              updateWidgetSetting('schoolSchedule', 'showNextDayAfterHour', val)
            }
            min={0}
            max={23}
            unit="h"
          />
          <p className="setting-description">
            🕐 Od které hodiny během dne zobrazit rozvrh na příští den.
            Například hodnota 14 = po 14:00 se zobrazí zítřejší rozvrh.
          </p>
        </div>
      </div>

      <div className="widget-group">
        <h3>📅 Calendar Widget</h3>
        <ToggleSwitch
          label="Zobrazit widget"
          checked={settings.widgets.calendar.enabled}
          onChange={(val) => updateWidgetSetting('calendar', 'enabled', val)}
        />
        <NumberInput
          label="Mazat události starší než"
          value={settings.widgets.calendar.deleteAfterMonths}
          onChange={(val) =>
            updateWidgetSetting('calendar', 'deleteAfterMonths', val)
          }
          min={1}
          max={24}
          unit="měsíců"
        />
        <NumberInput
          label="Maximální počet událostí"
          value={settings.widgets.calendar.maxEvents}
          onChange={(val) => updateWidgetSetting('calendar', 'maxEvents', val)}
          min={1}
          max={20}
        />
        <NumberInput
          label="Připomínky dopředu"
          value={settings.widgets.calendar.reminderDays}
          onChange={(val) =>
            updateWidgetSetting('calendar', 'reminderDays', val)
          }
          min={0}
          max={7}
          unit="dní"
        />
        <NumberInput
          label="Nadcházející události"
          value={settings.widgets?.calendar?.upcomingEventsDays ?? 30}
          onChange={(val) =>
            updateWidgetSetting('calendar', 'upcomingEventsDays', val)
          }
          min={7}
          max={90}
          unit="dní dopředu"
        />
        <ToggleSwitch
          label="Barevné kategorie"
          checked={settings.widgets.calendar.colorCategories}
          onChange={(val) =>
            updateWidgetSetting('calendar', 'colorCategories', val)
          }
        />
      </div>

      <div className="widget-group">
        <h3>📝 Sticky Notes</h3>
        <ToggleSwitch
          label="Zobrazit widget"
          checked={settings.widgets.stickyNotes.enabled}
          onChange={(val) => updateWidgetSetting('stickyNotes', 'enabled', val)}
        />
        <NumberInput
          label="Mazat poznámky starší než"
          value={settings.widgets.stickyNotes.deleteAfterDays}
          onChange={(val) =>
            updateWidgetSetting('stickyNotes', 'deleteAfterDays', val)
          }
          min={7}
          max={365}
          unit="dní"
        />
        <NumberInput
          label="Maximální počet poznámek"
          value={settings.widgets.stickyNotes.maxNotes}
          onChange={(val) =>
            updateWidgetSetting('stickyNotes', 'maxNotes', val)
          }
          min={5}
          max={100}
        />
      </div>

      <div className="widget-group">
        <h3>✍️ Handwriting Notes</h3>
        <ToggleSwitch
          label="Zobrazit widget"
          checked={settings.widgets.handwritingNotes.enabled}
          onChange={(val) =>
            updateWidgetSetting('handwritingNotes', 'enabled', val)
          }
        />
        <NumberInput
          label="Mazat poznámky starší než"
          value={settings.widgets.handwritingNotes.deleteAfterDays}
          onChange={(val) =>
            updateWidgetSetting('handwritingNotes', 'deleteAfterDays', val)
          }
          min={7}
          max={365}
          unit="dní"
        />
        <NumberInput
          label="Maximální počet poznámek"
          value={settings.widgets.handwritingNotes.maxNotes}
          onChange={(val) =>
            updateWidgetSetting('handwritingNotes', 'maxNotes', val)
          }
          min={10}
          max={200}
        />
      </div>

      <div className="widget-group">
        <h3>💬 Message History</h3>
        <ToggleSwitch
          label="Zobrazit widget"
          checked={settings.widgets.messageHistory.enabled}
          onChange={(val) =>
            updateWidgetSetting('messageHistory', 'enabled', val)
          }
        />
        <NumberInput
          label="Mazat zprávy starší než"
          value={settings.widgets.messageHistory.deleteAfterDays}
          onChange={(val) =>
            updateWidgetSetting('messageHistory', 'deleteAfterDays', val)
          }
          min={7}
          max={365}
          unit="dní"
        />
        <p className="setting-description">
          💡 Automatické mazání starých zpráv z historie. Spouští se 1× denně
          při startu aplikace. Nastavením vyššího počtu dní uchováš delší
          historii (užitečné pro zpětné vyhledávání), nižší hodnota šetří místo
          v databázi.
        </p>
        <NumberInput
          label="Maximální počet zpráv"
          value={settings.widgets.messageHistory.maxMessages}
          onChange={(val) =>
            updateWidgetSetting('messageHistory', 'maxMessages', val)
          }
          min={10}
          max={500}
        />
      </div>

      <div className="widget-group">
        <h3>🚌 Bus Schedule</h3>
        <ToggleSwitch
          label="Zobrazit widget"
          checked={settings.widgets.busSchedule.enabled}
          onChange={(val) => updateWidgetSetting('busSchedule', 'enabled', val)}
        />
        <ToggleSwitch
          label="Zobrazit víkendy"
          checked={settings.widgets.busSchedule.showWeekend}
          onChange={(val) =>
            updateWidgetSetting('busSchedule', 'showWeekend', val)
          }
        />
      </div>
    </div>
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
    <div className="settings-section">
      <h2>🏠 TUYA</h2>
      <p className="placeholder-text">TUYA nastavení - připravujeme</p>
    </div>
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
