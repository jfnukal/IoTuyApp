// src/components/DashboardV2/DashboardV2.tsx
import React from 'react';
import GreetingWidget from './GreetingWidget';
import WeatherMiniWidget from '../Widgets/Weather/WeatherMiniWidget';
import ShoppingWidget from './ShoppingWidget';
import SchoolScheduleHeaderWidget from '../Widgets/SchoolSchedule/SchoolScheduleHeaderWidget';
import DishwasherWidget from '../Widgets/Dishwasher/DishwasherFAB';
import CalendarV2 from './CalendarV2';
import RecipeMiniWidget from '../Widgets/Recipes/RecipeMiniWidget';
import GridConfigPanel from './GridConfigPanel';
import StickyNotesWidget from '../Widgets/StickyNotes/StickyNotesWidget';
import SchoolScheduleWidget from '../Widgets/SchoolSchedule/SchoolScheduleWidget';
import BusScheduleWidget from '../Widgets/SchoolSchedule/BusScheduleWidget';
import { applyGridConfig, loadGridConfig } from './gridConfig';
import './DashboardV2.css';

// Načti uložený grid config při startu
applyGridConfig(loadGridConfig());

const DashboardV2: React.FC = () => {
  return (
    <div className="v2-layout">

      {/* ==================== PRVNÍ OBRAZOVKA — flat CSS Grid (100dvh) ==================== */}
      {/*
        Grid: 3 sloupce × 10 řádků, vše v 100dvh.
        Každý slot ví svůj grid-column + grid-row → žádné flex kolony.
        Chceš přeskupit? Změň jen řádky v DashboardV2.css sekci GRID POZICE.
      */}
      <div className="v2-screen">

        {/* LEVÝ SLOUPEC — col 1 */}
        <div className="v2-slot v2-slot--greeting">
          <GreetingWidget />
        </div>
        <div className="v2-slot v2-slot--shopping">
          <ShoppingWidget />
        </div>
        <div className="v2-slot v2-slot--recipes">
          <RecipeMiniWidget />
        </div>

        {/* STŘED — col 2, celá výška */}
        <div className="v2-slot v2-slot--calendar">
          <CalendarV2 />
        </div>

        {/* PRAVÝ SLOUPEC — col 3 */}
        <div className="v2-slot v2-slot--weather">
          <WeatherMiniWidget />
        </div>
        <div className="v2-slot v2-slot--schedule">
          <SchoolScheduleHeaderWidget />
        </div>
        <div className="v2-slot v2-slot--dishwasher">
          <DishwasherWidget />
        </div>

        {/* Placeholder pro budoucí ovládací prvky */}
        <div className="v2-slot v2-slot--controls" />

      </div>

      {/* ==================== SEKUNDÁRNÍ WIDGETY (scroll dolů) ==================== */}
      <section className="v2-secondary">
        <div className="v2-secondary-grid">

          <div className="v2-slot v2-slot--sticky">
            <StickyNotesWidget selectedMember={null} />
          </div>

          <div className="v2-slot v2-slot--full-schedule">
            <SchoolScheduleWidget />
          </div>

          <div className="v2-slot v2-slot--bus">
            <BusScheduleWidget />
          </div>

        </div>
      </section>

      <GridConfigPanel />

    </div>
  );
};

export default DashboardV2;
