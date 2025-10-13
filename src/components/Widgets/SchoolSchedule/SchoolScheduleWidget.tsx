// src/components/Widgets/SchoolSchedule/SchoolScheduleWidget.tsx
import React, { useState, useEffect } from 'react';
import { bakalariAPI } from '../../../api/bakalariAPI';
import { firestoreService } from '../../../services/firestoreService';
import type { TimetableDay } from '../../../types/index';
import './SchoolSchedule.css';
import { SchoolScheduleModal } from './SchoolScheduleModal';

const DAYS_OF_WEEK = [
  'Pondělí',
  'Úterý',
  'Středa',
  'Čtvrtek',
  'Pátek',
  'Sobota',
  'Neděle',
];

const SchoolScheduleWidget: React.FC = () => {
  const [selectedKid, setSelectedKid] = useState<'jarecek' | 'johanka'>(
    'johanka'
  );
  const [selectedDay, setSelectedDay] = useState(new Date().getDay() - 1); // Nastaví aktuální den v týdnu
  const [johankaSchedule, setJohankaSchedule] = useState<TimetableDay[]>([]);
  const [jarecekSchedule, setJarecekSchedule] = useState<TimetableDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

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
      setJarecekSchedule(sortedSchedule); // Uložíme seřazenou verzi
      setIsModalOpen(false);
    } catch (error) {
      console.error('Nepodařilo se uložit Jarečkův rozvrh:', error);
      alert('Chyba: Rozvrh se nepodařilo uložit.');
    }
  };

  const handleRefresh = async () => {
    if (
      !window.confirm(
        'Chcete aktualizovat rozvrh z Bakalářů? Tato akce přepíše stávající data pro Johanku.'
      )
    ) {
      return;
    }
    setLoading(true);
    try {
      const freshData = await bakalariAPI.getTimetable(true);
      if (freshData && freshData.length > 0) {
        // Řazení už proběhlo uvnitř getTimetable(), není třeba ho dělat znovu
        await firestoreService.saveSchedule('johanka', freshData);
        setJohankaSchedule(freshData);
        alert('Rozvrh pro Johanku byl úspěšně aktualizován.');
      } else {
        alert('Nepodařilo se načíst nová data z Bakalářů.');
      }
    } catch (error) {
      console.error('Chyba při manuálním refresh:', error);
      alert('Došlo k chybě při aktualizaci.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [johankaData, jarecekData] = await Promise.all([
          firestoreService.getSchedule('johanka'),
          firestoreService.getSchedule('jarecek'),
        ]);
       
        setJohankaSchedule(johankaData);
        setJarecekSchedule(jarecekData);

        // Automaticky vybere aktuální den v týdnu, pokud je to možné (0 = Po, 4 = Pá)
        const currentDayIndex = new Date().getDay() - 1;
        if (currentDayIndex >= 0 && currentDayIndex < 5) {
          setSelectedDay(currentDayIndex);
        } else {
          setSelectedDay(0); // O víkendu zobrazí pondělí
        }
      } catch (error) {
        console.error('Chyba při načítání dat pro widget:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const getSubjectEmoji = (subject: string): string => {
    const emojiMap: { [key: string]: string } = {
      Matematika: '📐',
      'Český jazyk a literatura': '📖',
      Čeština: '📖',
      'Český jazyk': '📖',
      Angličtina: '🇬🇧',
      'Anglický jazyk': '🇬🇧',
      Fyzika: '⚡',
      Chemie: '🧪',
      Přírodopis: '🌿',
      Biologie: '🌿',
      Dějepis: '🏛️',
      Zeměpis: '🌍',
      Tělocvik: '⚽',
      'Tělesná výchova': '⚽',
      Informatika: '💻',
      Výtvarka: '🎨',
      'Výtvarná výchova': '🎨',
      'Hudební výchova': '🎵',
      Hudebka: '🎵',
      'Občanská výchova': '⚖️',
      Přestávka: '☕',
    };
    return emojiMap[subject] || '📚';
  };

  if (loading) {
    return (
      <div className="school-schedule-widget">
        <div className="schedule-loading">Načítání rozvrhu...</div>
      </div>
    );
  }

  const currentTimetable =
    selectedKid === 'johanka' ? johankaSchedule : jarecekSchedule;

  // Zobrazení pro prázdný rozvrh
  if (currentTimetable.length === 0) {
    return (
      <div className="school-schedule-widget">
        {/* ZMĚNA: Refresh tlačítko je teď malé a v rohu */}
        {selectedKid === 'johanka' && (
          <button
            onClick={handleRefresh}
            className="schedule-refresh-btn"
            title="Aktualizovat z Bakalářů"
          >
            🔄
          </button>
        )}
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
              Jareček
            </button>
            <button
              className={`kid-tab ${selectedKid === 'johanka' ? 'active' : ''}`}
              onClick={() => setSelectedKid('johanka')}
            >
              Johanka
            </button>
          </div>
        </div>
        <div className="schedule-error">
          {selectedKid === 'jarecek' ? (
            <div>
              <p>Nastavte rozvrh pro Jarečka</p>
              <button
                className="setup-button"
                onClick={() => setIsModalOpen(true)}
              >
                ⚙️ Nastavit rozvrh
              </button>
            </div>
          ) : (
            'Rozvrh není k dispozici. Zkuste jej aktualizovat pomocí 🔄.'
          )}
        </div>
        {isModalOpen && (
          <SchoolScheduleModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            onSave={handleSaveSchedule}
            initialSchedule={jarecekSchedule}
          />
        )}
      </div>
    );
  }

  const today = currentTimetable[selectedDay];

  // Plné zobrazení s daty
  return (
    <div className="school-schedule-widget">
      {/* ZMĚNA: Refresh tlačítko je teď malé a v rohu */}
      {selectedKid === 'johanka' && (
        <button
          onClick={handleRefresh}
          className="schedule-refresh-btn"
          title="Aktualizovat z Bakalářů"
        >
          🔄
        </button>
      )}
      <div className="schedule-header">
        {selectedKid === 'jarecek' && (
          <button
            className="edit-schedule-btn"
            onClick={() => setIsModalOpen(true)}
          >
            ✏️ Upravit rozvrh
          </button>
        )}
        <div className="schedule-title">
          <span className="schedule-icon">🎒</span>
          <span>Školní rozvrh</span>
        </div>
        <div className="schedule-kids-tabs">
          <button
            className={`kid-tab ${selectedKid === 'jarecek' ? 'active' : ''}`}
            onClick={() => setSelectedKid('jarecek')}
          >
            Jareček
          </button>
          <button
            className={`kid-tab ${selectedKid === 'johanka' ? 'active' : ''}`}
            onClick={() => setSelectedKid('johanka')}
          >
            Johanka
          </button>
        </div>
      </div>
      <div className="schedule-days-nav">
        {currentTimetable.map((day, index) => (
          <button
            key={index}
            className={`day-nav-btn ${selectedDay === index ? 'active' : ''}`}
            onClick={() => setSelectedDay(index)}
          >
            {/* ZMĚNA: Pokud chybí popisek dne, použijeme záložní pole */}
            {day.dayDescription ||
              DAYS_OF_WEEK[day.dayOfWeek - 1] ||
              `Den ${index + 1}`}
          </button>
        ))}
      </div>
      <div className="schedule-content">
        {today ? (
          <>
            <h3 className="schedule-day-title">
              {today.dayDescription || DAYS_OF_WEEK[today.dayOfWeek - 1]}
            </h3>
            <div className="lessons-list">
              {today.lessons.map((lesson, index) => (
                <div key={index} className="lesson-item">
                  <div className="lesson-time">{lesson.begintime}</div>
                  <div className="lesson-details">
                    <span className="lesson-emoji">
                      {getSubjectEmoji(lesson.subjecttext)}
                    </span>
                    <span className="lesson-subject">{lesson.subjecttext}</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="schedule-error">Vyberte den</div>
        )}
      </div>
      {isModalOpen && (
        <SchoolScheduleModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSaveSchedule}
          initialSchedule={jarecekSchedule}
        />
      )}
    </div>
  );
};

export default SchoolScheduleWidget;
