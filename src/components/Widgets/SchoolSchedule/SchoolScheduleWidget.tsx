// src/components/Widgets/SchoolSchedule/SchoolScheduleWidget.tsx
import React, { useState, useEffect } from 'react';
import { bakalariAPI } from '../../../api/bakalariAPI';
import type { TimetableDay, LunchMenu } from '../../../api/bakalariAPI';
import './SchoolSchedule.css';

const SchoolScheduleWidget: React.FC = () => {
  const [selectedKid, setSelectedKid] = useState<'jarecek' | 'johanka'>('jarecek');
  const [selectedDay, setSelectedDay] = useState(0);
  const [timetable, setTimetable] = useState<TimetableDay[]>([]);
  const [lunchMenu, setLunchMenu] = useState<LunchMenu[]>([]);
  const [loading, setLoading] = useState(true);

  // Načtení dat z API
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [timetableData, lunchData] = await Promise.all([
          bakalariAPI.getTimetable(),
          bakalariAPI.getLunchMenu(),
        ]);
        setTimetable(timetableData);
        setLunchMenu(lunchData);
      } catch (error) {
        console.error('Chyba při načítání dat:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Mapování emoji pro předměty
  const getSubjectEmoji = (subject: string): string => {
    const emojiMap: { [key: string]: string } = {
      'Matematika': '📐',
      'Čeština': '📖',
      'Český jazyk': '📖',
      'Angličtina': '🇬🇧',
      'Anglický jazyk': '🇬🇧',
      'Fyzika': '⚡',
      'Chemie': '🧪',
      'Přírodopis': '🌿',
      'Biologie': '🌿',
      'Dějepis': '🏛️',
      'Zeměpis': '🌍',
      'Tělocvik': '⚽',
      'Tělesná výchova': '⚽',
      'Informatika': '💻',
      'Výtvarka': '🎨',
      'Výtvarná výchova': '🎨',
      'Hudební výchova': '🎵',
      'Hudebka': '🎵',
      'Občanská výchova': '⚖️',
      'Přestávka': '☕',
    };
    return emojiMap[subject] || '📚';
  };

  // Najdi jídlo pro konkrétní den
  const getLunchForDay = (date: string): LunchMenu | undefined => {
    return lunchMenu.find(menu => menu.date === date);
  };

  if (loading) {
    return (
      <div className="school-schedule-widget">
        <div className="schedule-loading">Načítání rozvrhu...</div>
      </div>
    );
  }

  if (timetable.length === 0) {
    return (
      <div className="school-schedule-widget">
        <div className="schedule-error">Rozvrh není k dispozici</div>
      </div>
    );
  }

  const today = timetable[selectedDay];
  const todayLunch = today ? getLunchForDay(today.date) : undefined;

  return (
    <div className="school-schedule-widget">
      <div className="schedule-header">
        <div className="schedule-title">
          <span className="schedule-icon">🎒</span>
          <span>Školní rozvrh</span>
        </div>
        <div className="schedule-kids-tabs">
          <button
            className={`kid-tab ${selectedKid === 'jarecek' ? 'active' : ''}`}
            onClick={() => setSelectedKid('jarecek')}
          >
            👦 Jareček
          </button>
          <button
            className={`kid-tab ${selectedKid === 'johanka' ? 'active' : ''}`}
            onClick={() => setSelectedKid('johanka')}
          >
            👧 Johanka
          </button>
        </div>
      </div>

      <div className="schedule-days-nav">
        {timetable.map((day, index) => (
          <button
            key={index}
            className={`day-nav-btn ${selectedDay === index ? 'active' : ''}`}
            onClick={() => setSelectedDay(index)}
          >
            {day.dayDescription}
          </button>
        ))}
      </div>

      <div className="schedule-content">
        <h3 className="schedule-day-title">{today.dayDescription}</h3>

        {/* JÍDELNÍČEK NAD ROZVRHEM */}
        {todayLunch && todayLunch.meals.length > 0 && (
          <div className="lunch-menu-section">
            <div className="lunch-menu-title">
              <span className="lunch-icon">🍽️</span>
              <span>Oběd</span>
            </div>
            <div className="lunch-menu-list">
              {todayLunch.meals.map((meal, index) => (
                <div key={index} className="lunch-menu-item">
                  <span className="meal-number">{index + 1}.</span>
                  <span className="meal-name">{meal.name}</span>
                  {meal.allergens && meal.allergens.length > 0 && (
                    <span className="meal-allergens">
                      ({meal.allergens.join(', ')})
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ROZVRH HODIN */}
        <div className="lessons-list">
          {today.lessons.map((lesson, index) => (
            <div
              key={index}
              className="lesson-item"
            >
              <div className="lesson-time">{lesson.begintime}</div>
              <div className="lesson-details">
                <span className="lesson-emoji">{getSubjectEmoji(lesson.subjecttext)}</span>
                <span className="lesson-subject">{lesson.subjecttext}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SchoolScheduleWidget;