// src/components/Settings/SettingsPage.tsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import SettingsMenu, { type MenuSection } from './SettingsMenu';
import SettingsPanel from './SettingsPanel';
import {
  settingsService,
  type AppSettings,
} from '../../services/settingsService';
import './SettingsPage.css';

const SettingsPage: React.FC = () => {
  const { currentUser } = useAuth();
  const [activeSection, setActiveSection] = useState<MenuSection>('dashboard');
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Pouze "dad" má přístup
  const isDad = currentUser?.email === 'jarek.fuki@gmail.com'; // TODO: Změň na skutečný email

  useEffect(() => {
    loadSettings();
    
    // Spustit API check JEDNOU při otevření
    const checkAPIs = async () => {
      await settingsService.checkAllAPIs();
      await loadSettings();
    };
    
    setTimeout(checkAPIs, 1000);

    // 🆕 Automatická kontrola na pozadí
    let autoCheckInterval: NodeJS.Timeout | null = null;

    const setupAutoCheck = async () => {
      const currentSettings = await settingsService.loadSettings();
      
      // Zrušit předchozí interval
      if (autoCheckInterval) {
        clearInterval(autoCheckInterval);
      }

      // Pokud je automatická kontrola povolena
      if (currentSettings.systemSettings.autoCheckEnabled) {
        const intervalMs = currentSettings.systemSettings.apiCheckIntervalMinutes * 60 * 1000;
        
        console.log(`✅ Automatická kontrola API zapnuta (každých ${currentSettings.systemSettings.apiCheckIntervalMinutes} minut)`);
        
        autoCheckInterval = setInterval(async () => {
          console.log('🔄 Automatická kontrola API...');
          await settingsService.checkAllAPIs();
          await loadSettings();
        }, intervalMs);
      }
    };

    // Nastavit auto-check po načtení
    setTimeout(setupAutoCheck, 2000);

    // Cleanup
    return () => {
      if (autoCheckInterval) {
        clearInterval(autoCheckInterval);
      }
    };
  }, []); 

  const loadSettings = async () => {
    try {
      setIsLoading(true);
      const loadedSettings = await settingsService.loadSettings();
      setSettings(loadedSettings);
    } catch (error) {
      console.error('Chyba při načítání nastavení:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSettingsChange = async (newSettings: AppSettings) => {
    setSettings(newSettings);
    
    // Auto-save po 1 sekundě
    setIsSaving(true);
    setTimeout(async () => {
      try {
        await settingsService.saveSettings(newSettings);
        console.log('✅ Nastavení automaticky uloženo');
      } catch (error) {
        console.error('❌ Chyba při ukládání:', error);
      } finally {
        setIsSaving(false);
      }
    }, 1000);
  };

  // Redirect pokud není dad
  if (!isDad) {
    return <Navigate to="/" replace />;
  }

  if (isLoading || !settings) {
    return (
      <div className="settings-loading">
        <div className="spinner">🔄</div>
        <p>Načítám nastavení...</p>
      </div>
    );
  }

  return (
    <div className="settings-page">
      {/* Header s navigací */}
      <div className="settings-header">
        <button className="back-button" onClick={() => window.location.href = '/'}>
          ← Zpět na Dashboard
        </button>
        <h1>⚙️ Nastavení</h1>
      </div>
      <div className="settings-container">
        <div className="settings-sidebar">
          <SettingsMenu
            activeSection={activeSection}
            onSectionChange={setActiveSection}
          />
        </div>

        <div className="settings-content">
          {isSaving && <div className="saving-indicator">💾 Ukládám...</div>}

          <SettingsPanel
            section={activeSection}
            settings={settings}
            onSettingsChange={handleSettingsChange}
          />
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
