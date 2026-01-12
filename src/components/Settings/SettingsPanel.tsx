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

  const renderTuya = () => {
    // 🏷️ Legenda kategorií zařízení
    const categoryLegend: Record<string, string> = {
      wsdcg: '🌡️ Teploměr',
      wk: '🔥 Topení',
      pir: '👁️ PIR senzor',
      dj: '💡 Chytré světlo',
      kg: '🔘 Vypínač',
      cz: '🔌 Zásuvka',
      pc: '🔌 Zásuvka (PC)',
      mcs: '🚪 Dveřní senzor',
      wfcon: '🌐 Gateway',
      sp: '📹 Kamera/Zvonek',
      sfkzq: '💧 Ventil',
      zwjcy: '🌱 Půdní senzor',
    };

    const tuyaSync = settings.systemSettings.tuyaSync;

    const updateTuyaSyncSetting = (key: string, value: any) => {
      const newSettings = { ...settings };

      // 🆕 Zajisti že tuyaSync existuje (pro stará data ve Firestore)
      if (!newSettings.systemSettings.tuyaSync) {
        newSettings.systemSettings.tuyaSync = {
          enabled: false,
          intervals: {
            critical: 5,
            standard: 15,
            passive: 60,
            discovery: 10080,
          },
          criticalCategories: ['wsdcg', 'wk', 'pir'],
          standardCategories: ['dj', 'kg', 'cz', 'pc'],
          syncOnlyOnline: true,
          nightModeEnabled: false,
          nightModeStart: 23,
          nightModeEnd: 6,
        };
      }

      if (key.includes('.')) {
        // Pro vnořené hodnoty jako 'intervals.critical'
        const [parent, child] = key.split('.');

        // 🆕 Zajisti že parent objekt existuje
        if (!(newSettings.systemSettings.tuyaSync as any)[parent]) {
          (newSettings.systemSettings.tuyaSync as any)[parent] = {};
        }

        (newSettings.systemSettings.tuyaSync as any)[parent][child] = value;
      } else {
        (newSettings.systemSettings.tuyaSync as any)[key] = value;
      }
      onSettingsChange(newSettings);
    };

    return (
      <div className="settings-section">
        <h2>🏠 TUYA - Automatická synchronizace</h2>

        <p className="setting-description">
          📡 Automatická synchronizace zajišťuje aktuální data ze zařízení bez
          nutnosti manuálního refreshe. Různé typy zařízení mají různé intervaly
          podle důležitosti.
        </p>

        {/* Hlavní přepínač */}
        <div className="widget-group">
          <h3>⚡ Základní nastavení</h3>
          <ToggleSwitch
            label="Povolit automatickou synchronizaci"
            checked={tuyaSync?.enabled ?? false}
            onChange={(val) => updateTuyaSyncSetting('enabled', val)}
          />
        </div>

        {/* Intervaly - zobrazí se pouze pokud je sync povolen */}
        {tuyaSync?.enabled && (
          <>
            <div className="widget-group">
              <h3>⏱️ Intervaly synchronizace</h3>

              <NumberInput
                label="🔴 Kritická zařízení (teploměry, topení)"
                value={tuyaSync?.intervals?.critical ?? 5}
                onChange={(val) =>
                  updateTuyaSyncSetting('intervals.critical', val)
                }
                min={1}
                max={30}
                unit="minut"
              />
              <p className="setting-description">
                Zařízení kde potřebuješ aktuální data - teploměry, topení, PIR
                senzory.
              </p>

              <NumberInput
                label="🟡 Standardní zařízení (světla, zásuvky)"
                value={tuyaSync?.intervals?.standard ?? 15}
                onChange={(val) =>
                  updateTuyaSyncSetting('intervals.standard', val)
                }
                min={5}
                max={60}
                unit="minut"
              />
              <p className="setting-description">
                Běžná zařízení - světla, vypínače, zásuvky.
              </p>

              <NumberInput
                label="🟢 Pasivní zařízení (kamery, senzory)"
                value={tuyaSync?.intervals?.passive ?? 60}
                onChange={(val) =>
                  updateTuyaSyncSetting('intervals.passive', val)
                }
                min={15}
                max={180}
                unit="minut"
              />
              <p className="setting-description">
                Zařízení která se mění zřídka - kamery, dveřní senzory, gateway.
              </p>
            </div>

            {/* Discovery - hledání nových zařízení */}
            <div className="widget-group">
              <h3>🔍 Discovery (hledání nových zařízení)</h3>

              <NumberInput
                label="Interval plné synchronizace"
                value={tuyaSync?.intervals?.discovery ?? 10080}
                onChange={(val) =>
                  updateTuyaSyncSetting('intervals.discovery', val)
                }
                min={60}
                max={20160}
                unit="minut"
              />
              <p className="setting-description">
                📡 Plná synchronizace stáhne všechna zařízení z Tuya a objeví
                nová. Doporučeno: 1x týdně (10080 min) nebo 1x denně (1440 min).
                <br />
                <strong>Tip:</strong> 1440 = 1 den, 10080 = 1 týden
              </p>
            </div>

            {/* Optimalizace */}
            <div className="widget-group">
              <h3>🔧 Optimalizace</h3>

              <ToggleSwitch
                label="Synchronizovat pouze online zařízení"
                checked={tuyaSync?.syncOnlyOnline ?? true}
                onChange={(val) => updateTuyaSyncSetting('syncOnlyOnline', val)}
              />
              <p className="setting-description">
                💡 Šetří API volání - offline zařízení se přeskočí.
              </p>

              <ToggleSwitch
                label="Noční režim (méně časté sync)"
                checked={tuyaSync?.nightModeEnabled ?? false}
                onChange={(val) =>
                  updateTuyaSyncSetting('nightModeEnabled', val)
                }
              />

              {tuyaSync?.nightModeEnabled && (
                <div className="night-mode-times">
                  <NumberInput
                    label="Začátek nočního režimu"
                    value={tuyaSync?.nightModeStart ?? 23}
                    onChange={(val) =>
                      updateTuyaSyncSetting('nightModeStart', val)
                    }
                    min={0}
                    max={23}
                    unit="h"
                  />
                  <NumberInput
                    label="Konec nočního režimu"
                    value={tuyaSync?.nightModeEnd ?? 6}
                    onChange={(val) =>
                      updateTuyaSyncSetting('nightModeEnd', val)
                    }
                    min={0}
                    max={23}
                    unit="h"
                  />
                </div>
              )}
              <p className="setting-description">
                🌙 V nočním režimu se intervaly automaticky zdvojnásobí.
              </p>
            </div>

            {/* Legenda kategorií */}
            <div className="widget-group">
              <h3>📋 Legenda kategorií zařízení</h3>
              <div className="category-legend">
                <div className="legend-group">
                  <h4>
                    🔴 Kritické ({tuyaSync?.intervals?.critical ?? 5} min)
                  </h4>
                  <div className="legend-items">
                    {(tuyaSync?.criticalCategories ?? []).map((cat) => (
                      <span key={cat} className="legend-item critical">
                        {categoryLegend[cat] || cat}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="legend-group">
                  <h4>
                    🟡 Standardní ({tuyaSync?.intervals?.standard ?? 15} min)
                  </h4>
                  <div className="legend-items">
                    {(tuyaSync?.standardCategories ?? []).map((cat) => (
                      <span key={cat} className="legend-item standard">
                        {categoryLegend[cat] || cat}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="legend-group">
                  <h4>🟢 Pasivní ({tuyaSync?.intervals?.passive ?? 60} min)</h4>
                  <div className="legend-items">
                    {Object.keys(categoryLegend)
                      .filter(
                        (cat) =>
                          !(tuyaSync?.criticalCategories ?? []).includes(cat) &&
                          !(tuyaSync?.standardCategories ?? []).includes(cat)
                      )
                      .map((cat) => (
                        <span key={cat} className="legend-item passive">
                          {categoryLegend[cat]}
                        </span>
                      ))}
                  </div>
                </div>
              </div>
              <p className="setting-description">
                ℹ️ Rozdělení kategorií lze změnit v kódu (deviceHelpers.ts). V
                budoucnu přidáme možnost editace přímo zde.
              </p>
            </div>
          </>
        )}
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
