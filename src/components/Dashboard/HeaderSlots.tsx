// src/components/Dashboard/HeaderSlots.tsx
import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useHeaderConfig } from '../../hooks/useHeaderConfig';
import HeaderInfo from './HeaderInfo';
import WeatherMiniWidget from '../Widgets/Weather/WeatherMiniWidget';
import UpcomingEventsWidget from '../Widgets/UpcomingEvents/UpcomingEventsWidget';

// 🆕 PŘIDEJTE IMPORT SKUTEČNÉHO WIDGETU
import SchoolScheduleWidget from '../Widgets/SchoolSchedule/SchoolScheduleWidget';

// 🆕 PŘIDEJTE IMPORT STYLŮ PRO MODÁL
import '../Widgets/SchoolSchedule/SchoolScheduleModal.css';
import SchoolScheduleHeaderWidget from '../Widgets/SchoolSchedule/SchoolScheduleHeaderWidget';

import type { FamilyMember, HeaderWidgetType } from '../../types';
import './styles/HeaderSlots.css';

interface HeaderSlotsProps {
  familyMembers: FamilyMember[];
}

const HeaderSlots: React.FC<HeaderSlotsProps> = ({ familyMembers }) => {
  const { headerConfig, loading } = useHeaderConfig();
  const [showScheduleModal, setShowScheduleModal] = useState(false);

  // Funkce pro vykreslení widgetu podle typu
  const renderWidget = (
    widgetType: HeaderWidgetType,
    position?: 'left' | 'center' | 'right'
  ) => {
    // Speciální případ: pravý slot má 2 widgety nad sebou
    // ...
    if (position === 'right' && window.innerWidth > 768) {
      return (
        <div className="header-widget-stack">
          {/* Počasí nahoře */}
          <div className="header-widget-wrapper weather-widget-header-compact">
            {/* TOTO JE FINÁLNÍ ZMĚNA */}
            <WeatherMiniWidget isVisible={true} compactMode={true} />
          </div>

      {/* Rozvrh dole */}
      <div className="header-widget-wrapper schedule-widget-header">
              <SchoolScheduleHeaderWidget />
            </div>
        </div>
      );
    }

    // Normální rendering pro ostatní sloty
    switch (widgetType) {
      case 'greeting':
        return <HeaderInfo familyMembers={familyMembers} />;

      case 'weather':
        return (
          <div className="header-widget-wrapper weather-widget-header">
            <WeatherMiniWidget isVisible={true} />
          </div>
        );

      case 'upcoming':
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

  if (loading) {
    return (
      <div className="header-slots loading">
        <div className="loading-spinner">⏳ Načítání hlavičky...</div>
      </div>
    );
  }

  // 🆕 TOTO JE OPRAVENÁ VERZE FUNKCE
  const renderScheduleModal = () => {
    // NENÍ potřeba 'modal-root', použijeme 'document.body'
    // Tím se opraví chyba "bez reakce"

    return createPortal(
      <div className="schedule-modal-overlay" onClick={() => setShowScheduleModal(false)}>
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
          <SchoolScheduleWidget />

        </div>
      </div>,
      document.body // <-- ZMĚNA BYLA ZDE (z 'modalRoot' na 'document.body')
    );
  };

  return (
    <div className="header-slots">
      {/* LEVÝ SLOT */}
      <div className="header-slot header-slot-left">
        {renderWidget(headerConfig.left, 'left')}
      </div>

      {/* PROSTŘEDNÍ SLOT */}
      <div className="header-slot header-slot-center">
        {renderWidget(headerConfig.center, 'center')}
      </div>

      {/* PRAVÝ SLOT */}
      <div className="header-slot header-slot-right">
        {renderWidget(headerConfig.right, 'right')}
      </div>

      {/* 🆕 PŘIDEJTE TENTO ŘÁDEK */}
      {showScheduleModal && renderScheduleModal()}
    </div>
  );
};

export default HeaderSlots;
