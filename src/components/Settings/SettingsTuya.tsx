// src/components/Settings/SettingsTuya.tsx
import React from 'react';
import type { AppSettings } from '../../services/settingsService';
import ToggleSwitch from './ToggleSwitch';
import NumberInput from './NumberInput';

interface SettingsTuyaProps {
  settings: AppSettings;
  onSettingsChange: (settings: AppSettings) => void;
}

// 🏷️ Legenda kategorií zařízení
const categoryLegend: Record<string, string> = {
  wsdcg: '🌡️ Teploměr',
  wk: '🔥 Topení',
  pir: '👁 PIR senzor',
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

const SettingsTuya: React.FC<SettingsTuyaProps> = ({
  settings,
  onSettingsChange,
}) => {
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

export default SettingsTuya;