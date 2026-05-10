// src/components/DashboardV2/DashboardV2.tsx
// Hlavní rodinná obrazovka — /v2 (index route uvnitř V2Shell)
// Sekundární widgety (sticky, rozvrh, bus) jsou přesunuty do MorePage (/v2/more)

import React from 'react';
import GreetingWidget from './GreetingWidget';
import WeatherMiniWidget from '../Widgets/Weather/WeatherMiniWidget';
import ShoppingWidget from './ShoppingWidget';
import SchoolScheduleHeaderWidget from '../Widgets/SchoolSchedule/SchoolScheduleHeaderWidget';
import DishwasherWidget from '../Widgets/Dishwasher/DishwasherFAB';
import CalendarV2 from './CalendarV2';
import RecipeMiniWidget from '../Widgets/Recipes/RecipeMiniWidget';
import GridConfigPanel from './GridConfigPanel';
import './DashboardV2.css';

const DashboardV2: React.FC = () => {
  return (
    <div className="v2-layout">

      {/* ==================== PRVNÍ OBRAZOVKA — flat CSS Grid (100dvh) ==================== */}
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

      {/* Swipe hint — jemný indikátor navigace */}
      {/* Desktop/tablet: swipe nahoru + doleva */}
      <div className="v2-swipe-hint v2-swipe-hint--bottom v2-swipe-hint--desktop">
        přejeď nahoru pro zařízení · doleva pro widgety
      </div>
      {/* Mobil: jen doleva (vertikální swipe zakázán kvůli scrollu) */}
      <div className="v2-swipe-hint v2-swipe-hint--bottom v2-swipe-hint--mobile">
        přejeď doleva pro další widgety
      </div>

      <GridConfigPanel />

    </div>
  );
};

export default DashboardV2;
