// src/components/Widgets/SchoolSchedule/HolidayOverlay.tsx
import React from 'react';
import './HolidayOverlay.css';

const EMOJIS = ['🎉', '🏖️', '☀️', '🍦', '⚽', '🏊'];

const HolidayOverlay: React.FC = () => (
  <div className="holiday-overlay">
    <div className="holiday-emojis">
      {EMOJIS.map((e, i) => (
        <span key={i} style={{ animationDelay: `${i * 0.15}s` }}>
          {e}
        </span>
      ))}
    </div>
    <div className="holiday-text">
      HURÁÁÁ
      <br />
      PRÁZDNINY!
    </div>
    <div className="holiday-sub">Užijte si volno 😎</div>
  </div>
);

export default HolidayOverlay;
