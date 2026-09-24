// src/components/Settings/AiDiagnosticsSettings.tsx
// Přepínač ladicích ikon pod AI koulí (🗣️ výběr hlasu, 📋 diagnostický log).
// Self-contained: stav drží localStorage tohoto zařízení (useAiDiagnostics), ne appSettings.

import React from 'react';
import ToggleSwitch from './ToggleSwitch';
import {
  setAiDiagnosticsVisible,
  useAiDiagnosticsVisible,
} from '../../AI/hooks/useAiDiagnostics';

const AiDiagnosticsSettings: React.FC = () => {
  const visible = useAiDiagnosticsVisible();

  return (
    <div className="widget-group">
      <h3>🤖 AI asistent — ladicí ikony</h3>
      <ToggleSwitch
        label="Zobrazit ikony pod koulí (🗣️ hlas, 📋 log)"
        checked={visible}
        onChange={setAiDiagnosticsVisible}
      />
      <p className="setting-description">
        📝 Pro běžné používání nejsou potřeba, proto jsou schované. Zapni je, když chceš
        změnit hlas asistenta nebo se podívat do diagnostického logu. Platí jen pro toto
        zařízení.
      </p>
    </div>
  );
};

export default AiDiagnosticsSettings;
