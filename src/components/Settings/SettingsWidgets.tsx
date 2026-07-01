// src/components/Settings/SettingsWidgets.tsx
import React from 'react';
import type { AppSettings } from '../../services/settingsService';
import type { MenuSection } from './SettingsMenu';
import ToggleSwitch from './ToggleSwitch';
import NumberInput from './NumberInput';

interface SettingsWidgetsProps {
  section: MenuSection;
  settings: AppSettings;
  onSettingsChange: (settings: AppSettings) => void;
}

const SettingsWidgets: React.FC<SettingsWidgetsProps> = ({
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

  // ==================== POČASÍ ====================
  const renderWeather = () => (
    <div className="settings-section">
      <h2>🌤️ Počasí</h2>
      <div className="widget-group">
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
    </div>
  );

  // ==================== ŠKOLNÍ ROZVRH ====================
  const renderSchool = () => (
    <div className="settings-section">
      <h2>📚 Školní rozvrh</h2>
      <div className="widget-group">
        <ToggleSwitch
          label="Zobrazit widget"
          checked={settings.widgets?.schoolSchedule?.enabled ?? true}
          onChange={(val) =>
            updateWidgetSetting('schoolSchedule', 'enabled', val)
          }
        />
        <ToggleSwitch
          label="Zachovat JEN na hlavní stránce"
          checked={settings.widgets?.schoolSchedule?.keepOnMain ?? false}
          onChange={(val) =>
            updateWidgetSetting('schoolSchedule', 'keepOnMain', val)
          }
        />
        <p className="setting-description">
          🏠 Když zapneš, rozvrh bude JEN na hlavním dashboardu a zmizí ze
          stránky „widgety". Vypnutím „Zobrazit widget" se skryje úplně všude
          (to má absolutní přednost).
        </p>
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
  );

  // ==================== KALENDÁŘ ====================
  const renderCalendar = () => (
    <div className="settings-section">
      <h2>📅 Kalendář</h2>
      <div className="widget-group">
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
    </div>
  );

  // ==================== STICKY NOTES ====================
  const renderSticky = () => (
    <div className="settings-section">
      <h2>📝 Sticky Notes</h2>
      <div className="widget-group">
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
    </div>
  );

  // ==================== HANDWRITING ====================
  const renderHandwriting = () => (
    <div className="settings-section">
      <h2>✏️ Ruční poznámky</h2>
      <div className="widget-group">
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
    </div>
  );

  // ==================== HISTORIE ZPRÁV ====================
  const renderMessages = () => (
    <div className="settings-section">
      <h2>💬 Historie zpráv</h2>
      <div className="widget-group">
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
    </div>
  );

  // ==================== AUTOBUSY ====================
  const renderBus = () => (
    <div className="settings-section">
      <h2>🚌 Autobusy</h2>
      <div className="widget-group">
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

  switch (section) {
    case 'widget-weather':
      return renderWeather();
    case 'widget-school':
      return renderSchool();
    case 'widget-calendar':
      return renderCalendar();
    case 'widget-sticky':
      return renderSticky();
    case 'widget-handwriting':
      return renderHandwriting();
    case 'widget-messages':
      return renderMessages();
    case 'widget-bus':
      return renderBus();
    default:
      return renderWeather();
  }
};

export default SettingsWidgets;
