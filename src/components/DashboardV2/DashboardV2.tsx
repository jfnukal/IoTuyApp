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
import { useWidgetSettings } from '../../hooks/useWidgetSettings';
import './DashboardV2.css';

const DashboardV2: React.FC = () => {
  const { settings } = useWidgetSettings();
  const w = settings?.widgets;

  // Widgety s vlastním přepínačem (dokud se nenačte nastavení, zobrazujeme)
  const showWeather = w?.weather?.enabled ?? true;
  const showCalendar = w?.calendar?.enabled ?? true;
  const showSchool = w?.schoolSchedule?.enabled ?? true;

  return (
    <div className="v2-layout">

      {/* ==================== PRVNÍ OBRAZOVKA — flat CSS Grid (100dvh) ==================== */}
      <div className="v2-screen">

        {/* LEVÝ SLOUPEC — col 1 */}
        <div id="widget-greeting" className="v2-slot v2-slot--greeting">
          <GreetingWidget />
        </div>
        <div id="widget-shopping" className="v2-slot v2-slot--shopping">
          <ShoppingWidget />
        </div>
        <div id="widget-recipes" className="v2-slot v2-slot--recipes">
          <RecipeMiniWidget />
        </div>

        {/* STŘED — col 2, celá výška */}
        {showCalendar && (
          <div id="widget-calendar" className="v2-slot v2-slot--calendar">
            <CalendarV2 />
          </div>
        )}

        {/* PRAVÝ SLOUPEC — col 3 */}
        {showWeather && (
          <div id="widget-weather" className="v2-slot v2-slot--weather">
            <WeatherMiniWidget />
          </div>
        )}
        {showSchool && (
          <div id="widget-schedule" className="v2-slot v2-slot--schedule">
            <SchoolScheduleHeaderWidget />
          </div>
        )}
        <div id="widget-dishwasher" className="v2-slot v2-slot--dishwasher">
          <DishwasherWidget />
        </div>

        {/* Nastavení — gear button v kontrolním slotu */}
        <div id="widget-controls" className="v2-slot v2-slot--controls">
          <GridConfigPanel />
        </div>

      </div>

      {/* Swipe hint — jemný indikátor navigace */}
      <div className="v2-swipe-hint v2-swipe-hint--bottom">
        ← zařízení · widgety →
      </div>

    </div>
  );
};

export default DashboardV2;
