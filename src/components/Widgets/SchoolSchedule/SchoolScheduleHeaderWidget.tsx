// src/components/Widgets/SchoolSchedule/SchoolScheduleHeaderWidget.tsx
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { bakalariAPI } from '../../../api/bakalariAPI';
import { firestoreService } from '../../../services/firestoreService';
import type { TimetableDay, TimetableLesson } from '../../../types/index';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import './SchoolScheduleHeader.css';
import { SchoolScheduleModal } from './SchoolScheduleModal';
import { isSummerBreak } from './holidayMode';
import HolidayOverlay from './HolidayOverlay';

const DAYS_SHORT = ['Po', 'Út', 'St', 'Čt', 'Pá'];

// Emoji mapa pro předměty
const SUBJECT_EMOJI: { [key: string]: string } = {
  'Matematika': '📐',
  'Český jazyk': '📖',
  'Český jazyk a literatura': '📖',
  'Čeština': '📖',
  'Čtení / Psaní': '📖',
  'Čtení': '📖',
  'Psaní': '✏️',
  'Angličtina': '🇬🇧',
  'Anglický jazyk': '🇬🇧',
  'Fyzika': '⚡',
  'Chemie': '🧪',
  'Přírodopis': '🌿',
  'Biologie': '🌿',
  'Prvouka': '🌍',
  'Člověk a příroda': '🌿',
  'Člověk a příroda - teorie': '🌿',
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
  'Pracovní činnosti': '🔧',
  'PČ?': '🔧',
};

// Zkratky předmětů
const SUBJECT_ABBREV: { [key: string]: string } = {
  'Matematika': 'Mat',
  'Český jazyk': 'Čj',
  'Český jazyk a literatura': 'Čj',
  'Čeština': 'Čj',
  'Čtení / Psaní': 'Čt/Ps',
  'Čtení': 'Čt',
  'Psaní': 'Ps',
  'Angličtina': 'Aj',
  'Anglický jazyk': 'Aj',
  'Fyzika': 'Fy',
  'Chemie': 'Ch',
  'Přírodopis': 'Př',
  'Biologie': 'Bi',
  'Prvouka': 'Prv',
  'Člověk a příroda': 'ČaP',
  'Člověk a příroda - teorie': 'ČaP',
  'Dějepis': 'Dě',
  'Zeměpis': 'Ze',
  'Tělocvik': 'Tv',
  'Tělesná výchova': 'Tv',
  'Informatika': 'Inf',
  'Výtvarka': 'Vv',
  'Výtvarná výchova': 'Vv',
  'Hudební výchova': 'Hv',
  'Hudebka': 'Hv',
  'Občanská výchova': 'Ov',
  'Pracovní činnosti': 'Pč',
  'PČ?': 'Pč',
};

// Logika pro výběr správného dne
const getTargetDayIndex = (showNextDayHour: number = 14) => {
  const now = new Date();
  const currentDayOfWeek = now.getDay();
  const currentHour = now.getHours();

  let targetDayIndex = currentDayOfWeek - 1;

  if (currentHour >= showNextDayHour) {
    targetDayIndex++;
  }

  if (targetDayIndex < 0 || targetDayIndex > 4) {
    targetDayIndex = 0;
  }

  return targetDayIndex;
};

const SchoolScheduleHeaderWidget: React.FC = () => {
  const [selectedDay, setSelectedDay] = useState(getTargetDayIndex(14));
  const [johankaSchedule, setJohankaSchedule] = useState<TimetableDay[]>([]);
  const [jarecekSchedule, setJarecekSchedule] = useState<TimetableDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);
  const [showLunchDetail, setShowLunchDetail] = useState(false);
  const [mealOrders, setMealOrders] = useState<Record<string, Array<{type: string, name: string, price: number}>>>({});

  // Načtení dat
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [johankaData, jarecekData, mealDoc] = await Promise.all([
          firestoreService.getSchedule('johanka'),
          firestoreService.getSchedule('jarecek'),
          getDoc(doc(db, 'mealOrders', 'johanka')),
        ]);
        
        if (mealDoc.exists()) {
          const data = mealDoc.data();
          setMealOrders(data.orders || {});
        }
        
        setJohankaSchedule(johankaData);
        setJarecekSchedule(jarecekData);
        setSelectedDay(getTargetDayIndex(14));
      } catch (error) {
        console.error('Chyba při načítání rozvrhu:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Uložení Jarečkova rozvrhu
  const handleSaveSchedule = async (newSchedule: TimetableDay[]) => {
    try {
      const sortedSchedule = newSchedule.map((day) => ({
        ...day,
        lessons: day.lessons.sort((a, b) => {
          const timeA = parseInt(a.begintime.replace(':', ''), 10);
          const timeB = parseInt(b.begintime.replace(':', ''), 10);
          return timeA - timeB;
        }),
      }));

      await firestoreService.saveSchedule('jarecek', sortedSchedule);
      setJarecekSchedule(sortedSchedule);
      setIsModalOpen(false);
    } catch (error) {
      console.error('Nepodařilo se uložit rozvrh:', error);
      alert('Chyba: Rozvrh se nepodařilo uložit.');
    }
  };

  // Refresh jídel ze strava.cz
  const handleMealRefresh = async () => {
    if (!window.confirm('Chcete aktualizovat jídelníček ze strava.cz?')) {
      return;
    }
    try {
      const resp = await fetch('https://europe-west1-iotuyapp.cloudfunctions.net/sync-strava-meals');
      const data = await resp.json();
      if (data.success) {
        setMealOrders(data.orders || {});
        alert(`Jídelníček aktualizován (${data.orderedDays} dnů).`);
      } else {
        alert('Chyba: ' + (data.error || 'Neznámá chyba'));
      }
    } catch (error) {
      console.error('Chyba při refresh jídel:', error);
      alert('Nepodařilo se aktualizovat jídelníček.');
    }
  };

  // Refresh Johanky z Bakalářů
  const handleRefresh = async () => {
    if (!window.confirm('Chcete aktualizovat rozvrh z Bakalářů?')) {
      return;
    }
    setLoading(true);
    try {
      const freshData = await bakalariAPI.getTimetable(true);
      if (freshData && freshData.length > 0) {
        await firestoreService.saveSchedule('johanka', freshData);
        setJohankaSchedule(freshData);
        alert('Rozvrh aktualizován.');
      } else {
        alert('Nepodařilo se načíst data z Bakalářů.');
      }
    } catch (error) {
      console.error('Chyba při refresh:', error);
      alert('Došlo k chybě při aktualizaci.');
    } finally {
      setLoading(false);
    }
  };

  // Časy pouze pro jedno dítě
  const getTimesForKid = (schedule: TimetableDay[]): string[] => {
    const day = schedule[selectedDay];
    if (!day) return [];
    return day.lessons
      .map(l => l.begintime)
      .sort((a, b) => parseInt(a.replace(':', ''), 10) - parseInt(b.replace(':', ''), 10));
  };

  // Najít předmět pro daný čas
  const getLessonAtTime = (lessons: TimetableLesson[] | undefined, time: string): TimetableLesson | null => {
    if (!lessons) return null;
    return lessons.find(l => l.begintime === time) || null;
  };

  // Získání data pro vybraný den (Po=0 ... Pá=4)
  const getDateForDay = (dayIndex: number): string => {
    const now = new Date();
    const currentDayOfWeek = now.getDay(); // 0=Ne, 1=Po ... 6=So
    const mondayOffset = currentDayOfWeek === 0 ? -6 : 1 - currentDayOfWeek;
    const monday = new Date(now);
    monday.setDate(now.getDate() + mondayOffset);
    const targetDate = new Date(monday);
    targetDate.setDate(monday.getDate() + dayIndex);
    const yyyy = targetDate.getFullYear();
    const mm = String(targetDate.getMonth() + 1).padStart(2, '0');
    const dd = String(targetDate.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  // Kontrola zda existují vůbec nějaká jídla
  const hasMeals = Object.keys(mealOrders).length > 0;

  // Ikona pro DNEŠNÍ den — signalizuje, zda má Johanka dnes svačinu ve škole
  // (ne celý týden — jinak by byla ikona 🥪 pořád, když je objednáno kdekoliv v týdnu)
  const todayActualIndex = (() => {
    const d = new Date().getDay(); // 0=Ne, 1=Po ... 6=So
    if (d === 0 || d === 6) return -1; // víkend → žádná svačina
    return d - 1; // 0=Po, 4=Pá
  })();
  const hasTodaySnack = todayActualIndex >= 0
    ? (mealOrders[getDateForDay(todayActualIndex)] || []).some(m => m.type === 'Svačina')
    : false;

  // Emoji pro předmět
  const getEmoji = (subject: string): string => {
    return SUBJECT_EMOJI[subject] || '📚';
  };

  // Zkratka předmětu
  const getAbbrev = (subject: string): string => {
    return SUBJECT_ABBREV[subject] || subject.substring(0, 3);
  };

  // Toggle tooltip
  const handleCellClick = (cellId: string) => {
    setActiveTooltip(activeTooltip === cellId ? null : cellId);
  };

  // Zavření tooltip a jídelníčku při kliknutí mimo nebo Escape
  useEffect(() => {
    const handleClickOutside = () => {
      if (activeTooltip) setActiveTooltip(null);
      if (showLunchDetail) setShowLunchDetail(false);
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActiveTooltip(null);
        setShowLunchDetail(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('click', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeTooltip, showLunchDetail]);

  // 🏖️ Prázdninový režim — přes rozvrh sváteční nápis
  if (isSummerBreak()) {
    return (
      <div className="school-schedule-widget compact">
        <HolidayOverlay />
      </div>
    );
  }

  // Loading stav
  if (loading) {
    return (
      <div className="school-schedule-widget compact">
        <div className="schedule-loading">Načítání...</div>
      </div>
    );
  }

  const jarTimes = getTimesForKid(jarecekSchedule);
  const johTimes = getTimesForKid(johankaSchedule);
  const johankaDay = johankaSchedule[selectedDay];
  const jarecekDay = jarecekSchedule[selectedDay];

  return (
    <div className="school-schedule-widget compact">
      {/* Header - kompaktní */}
      <div className="schedule-header-compact">
        <div className="schedule-title-row">
          <span className="schedule-icon">🎒</span>
          {/* Tabs pro dny - rovnou vedle batohu */}
          <div className="schedule-days-tabs">
            {DAYS_SHORT.map((day, index) => (
              <button
                key={day}
                className={`day-tab ${selectedDay === index ? 'active' : ''}`}
                onClick={() => { setSelectedDay(index); setShowLunchDetail(false); }}
              >
                {day}
              </button>
            ))}
          </div>
          <button
            onClick={handleRefresh}
            className="schedule-refresh-btn-mini"
            title="Aktualizovat z Bakalářů"
          >
            🔄
          </button>
          <button
            onClick={handleMealRefresh}
            className="schedule-refresh-btn-mini"
            title="Aktualizovat jídelníček ze strava.cz"
          >
            🍽️
          </button>
        </div>
      </div>

      {/* Horizontální tabulka */}
      <div className="schedule-table-wrapper">
      <table className="schedule-table">
          <tbody>
            {/* Řádek Jarečka — hlavička + data */}
            <tr className="row-times">
              <th className="col-kid"></th>
              {jarTimes.map(time => (
                <th key={time} className="col-time">{time}</th>
              ))}
            </tr>
            <tr className="row-jarecek">
              <td 
                className="cell-kid clickable"
                onClick={() => setIsModalOpen(true)}
                title="Klikni pro úpravu rozvrhu"
              >
                <span className="kid-icon">👦</span>
                <span className="kid-name">JAR</span>
              </td>
              {jarTimes.map(time => {
                const lesson = getLessonAtTime(jarecekDay?.lessons, time);
                const cellId = `jar-${time}`;
                return (
                  <td 
                    key={time} 
                    className={`cell-lesson ${lesson ? 'has-lesson' : 'empty'}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (lesson) handleCellClick(cellId);
                    }}
                  >
                    {lesson ? (
                      <div className="lesson-cell">
                        <span className="lesson-emoji">{getEmoji(lesson.subjecttext)}</span>
                        <span className="lesson-abbrev">{getAbbrev(lesson.subjecttext)}</span>
                        {activeTooltip === cellId && (
                          <div className="lesson-tooltip">
                            {lesson.subjecttext}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="empty-cell">--</span>
                    )}
                  </td>
                );
              })}
            </tr>

            {/* Oddělovací řádek + hlavička Johanky */}
            <tr className="row-spacer"><td colSpan={johTimes.length + 1}></td></tr>
            <tr className="row-times">
              <th className="col-kid"></th>
              {johTimes.map(time => (
                <th key={time} className="col-time">{time}</th>
              ))}
            </tr>

            {/* Řádek Johanky */}
            <tr className="row-johanka">
            <td className="cell-kid">
                <div className="kid-info">
                  <span className="kid-icon">👧</span>
                  <span className="kid-name">JOH</span>
                  {hasMeals && (
                    <span
                      className={`lunch-icon ${hasTodaySnack ? 'has-snack' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowLunchDetail(true);
                      }}
                      title={hasTodaySnack ? 'Dnes má svačinu ve škole 🥪' : 'Jídelníček celý týden'}
                    >
                      {hasTodaySnack ? '🥪' : '🍴'}
                    </span>
                  )}
                </div>
              </td>
              {johTimes.map(time => {
                const lesson = getLessonAtTime(johankaDay?.lessons, time);
                const cellId = `joh-${time}`;
                return (
                  <td 
                    key={time} 
                    className={`cell-lesson ${lesson ? 'has-lesson' : 'empty'}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (lesson) handleCellClick(cellId);
                    }}
                  >
                    {lesson ? (
                      <div className="lesson-cell">
                        <span className="lesson-emoji">{getEmoji(lesson.subjecttext)}</span>
                        <span className="lesson-abbrev">{getAbbrev(lesson.subjecttext)}</span>
                        {activeTooltip === cellId && (
                          <div className="lesson-tooltip">
                            {lesson.subjecttext}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="empty-cell">--</span>
                    )}
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>

      {/* Modal pro editaci Jarečka */}
      {isModalOpen && (
        <SchoolScheduleModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSaveSchedule}
          initialSchedule={jarecekSchedule}
        />
      )}

      {/* Týdenní jídelníček */}
      {showLunchDetail && hasMeals && createPortal(
        <div
          className="lunch-week-overlay"
          onClick={() => setShowLunchDetail(false)}
        >
          <div
            className="lunch-week-modal"
            onClick={e => e.stopPropagation()}
          >
            <div className="lunch-week-header">
              <span className="lunch-week-title">🍽️ Jídelníček Johanky</span>
              <button
                className="lunch-week-close"
                onClick={() => setShowLunchDetail(false)}
              >✕</button>
            </div>

            <div className="lunch-week-days">
              {[0,1,2,3,4].map(dayIdx => {
                const date = getDateForDay(dayIdx);
                const meals = mealOrders[date] || [];
                const daySnack = meals.find(m => m.type === 'Svačina');
                const dayLunch = meals.find(m => m.type.toLowerCase().startsWith('oběd'));
                const isToday = dayIdx === selectedDay;

                return (
                  <div
                    key={dayIdx}
                    className={`lunch-day-card ${isToday ? 'lunch-day-card--today' : ''} ${!meals.length ? 'lunch-day-card--empty' : ''}`}
                  >
                    <div className="lunch-day-label">
                      {DAYS_SHORT[dayIdx]}
                      {isToday && <span className="lunch-day-today-dot" />}
                    </div>

                    {daySnack ? (
                      <div className="lunch-meal lunch-meal--snack">
                        <span className="lunch-meal-type">🥪 Svačina</span>
                        <span className="lunch-meal-name">{daySnack.name}</span>
                      </div>
                    ) : (
                      <div className="lunch-meal lunch-meal--none">
                        <span className="lunch-meal-type">🥪</span>
                        <span className="lunch-meal-name lunch-meal-name--empty">—</span>
                      </div>
                    )}

                    {dayLunch ? (
                      <div className="lunch-meal lunch-meal--lunch">
                        <span className="lunch-meal-type">🍽️ Oběd</span>
                        <span className="lunch-meal-name">{dayLunch.name}</span>
                      </div>
                    ) : (
                      <div className="lunch-meal lunch-meal--none">
                        <span className="lunch-meal-type">🍽️</span>
                        <span className="lunch-meal-name lunch-meal-name--empty">—</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>,
        document.getElementById('modal-root') ?? document.body,
      )}
    </div>
  );
};

export default SchoolScheduleHeaderWidget;
