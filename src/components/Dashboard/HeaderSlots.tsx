// src/components/Dashboard/HeaderSlots.tsx
import React, { useState, memo } from 'react';
import { createPortal } from 'react-dom';
import { useHeaderConfig } from '../../hooks/useHeaderConfig';
import { useWidgetSettings } from '../../hooks/useWidgetSettings';
import HeaderInfo from './HeaderInfo';
import WeatherMiniWidget from '../Widgets/Weather/WeatherMiniWidget';
import UpcomingEventsWidget from '../Widgets/UpcomingEvents/UpcomingEventsWidget';
import '../Widgets/SchoolSchedule/SchoolScheduleModal.css';
import SchoolScheduleHeaderWidget from '../Widgets/SchoolSchedule/SchoolScheduleHeaderWidget';
import type { FamilyMember, HeaderWidgetType } from '../../types';
import './styles/HeaderSlots.css';
import { ShoppingListProvider } from '../../contexts/ShoppingListContext';
import ShoppingListCompact from '../Widgets/ShoppingList/ShoppingListCompact';
import ShoppingListModal from '../Widgets/ShoppingList/ShoppingListModal';

interface HeaderSlotsProps {
  familyMembers: FamilyMember[];
}

const HeaderSlots: React.FC<HeaderSlotsProps> = ({ familyMembers }) => {
  const { headerConfig, loading } = useHeaderConfig();
  const { settings } = useWidgetSettings();
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showShoppingModal, setShowShoppingModal] = useState(false);

  // Funkce pro vykreslení widgetu podle typu
  const renderWidget = (
    widgetType: HeaderWidgetType,
    position?: 'left' | 'center' | 'right'
  ) => {
    // Speciální případ: pravý slot má 2 widgety nad sebou
    // ...
    if (position === 'right' && window.innerWidth > 768) {
      const showWeather = settings?.widgets?.weather?.enabled ?? true;
      const showSchedule = settings?.widgets?.schoolSchedule?.enabled ?? true;

      // Pokud jsou oba vypnuté, zobraz prázdný slot
      if (!showWeather && !showSchedule) {
        return <div className="header-widget-wrapper empty-slot"></div>;
      }

      return (
        <div className="header-widget-stack">
          {/* Počasí nahoře */}
          {showWeather && (
            <div className="header-widget-wrapper weather-widget-header-compact">
              <WeatherMiniWidget
                isVisible={true}
                compactMode={settings?.widgets?.weather?.compactMode ?? true}
              />
            </div>
          )}

          {/* Rozvrh dole */}
          {showSchedule && (
            <div className="header-widget-wrapper schedule-widget-header">
              <SchoolScheduleHeaderWidget />
            </div>
          )}
        </div>
      );
    }

    // Normální rendering pro ostatní sloty
    switch (widgetType) {
      case 'greeting':
        return <HeaderInfo familyMembers={familyMembers} />;

      case 'weather':
        if (!settings?.widgets?.weather?.enabled) {
          return <div className="header-widget-wrapper empty-slot"></div>;
        }
        return (
          <div className="header-widget-wrapper weather-widget-header">
            <WeatherMiniWidget
              isVisible={true}
              compactMode={settings?.widgets?.weather?.compactMode ?? false}
            />
          </div>
        );

      case 'upcoming':
        // Zkontroluj nastavení kalendáře
        if (!settings?.widgets.calendar.enabled) {
          return <div className="header-widget-wrapper empty-slot"></div>;
        }
        return (
          <div className="header-widget-wrapper upcoming-widget-header">
            <UpcomingEventsWidget
              familyMembers={familyMembers}
              compact={true}
            />
          </div>
        );

      case 'none':
        return <div className="header-widget-wrapper empty-slot"></div>;

      default:
        return null;
    }
  };
  // Pokud se hlavička ještě načítá, nevracej nic (null)
  if (loading) {
    return null;
  }

  const renderScheduleModal = () => {
    return createPortal(
      <div
        className="schedule-modal-overlay"
        onClick={() => setShowScheduleModal(false)}
      >
        {/* Použijeme .schedule-modal-content pro konzistentní vzhled, ale přidáme třídu pro rozvrh */}
        <div
          className="schedule-modal-content full-schedule-modal"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className="modal-close-btn"
            onClick={() => setShowScheduleModal(false)}
          >
            ×
          </button>

          {/* ZDE VOLÁME SKUTEČNÝ WIDGET */}
          <SchoolScheduleHeaderWidget />
        </div>
      </div>,
      document.body // <-- ZMĚNA BYLA ZDE (z 'modalRoot' na 'document.body')
    );
  };

  return (
    <div className="header-slots">
      {/* LEVÝ SLOT - obsahuje greeting + nákupní seznam */}
      <div className="header-slot header-slot-left">
        <div className="header-left-stack">
          {renderWidget(headerConfig.left, 'left')}

          {/* 🛒 Nákupní seznam - samostatný widget */}
          <ShoppingListProvider familyMembers={familyMembers}>
            <ShoppingListCompact
              maxItems={3}
              onOpenFull={() => setShowShoppingModal(true)}
            />
          </ShoppingListProvider>
        </div>
      </div>

      {/* PROSTŘEDNÍ SLOT */}
      <div className="header-slot header-slot-center">
        {renderWidget(headerConfig.center, 'center')}
      </div>

      {/* PRAVÝ SLOT */}
      <div className="header-slot header-slot-right">
        {renderWidget(headerConfig.right, 'right')}
      </div>

      {/* 🛒 Shopping List Modal */}
      {showShoppingModal && (
        <ShoppingListModal
          isOpen={showShoppingModal}
          onClose={() => setShowShoppingModal(false)}
          familyMembers={familyMembers}
        />
      )}

      {showScheduleModal && renderScheduleModal()}
    </div>
  );
};

export default memo(HeaderSlots);
