// src/components/Widgets/SchoolSchedule/SchoolScheduleWidget.tsx
import React, { useState, useEffect } from 'react';
import { bakalariAPI } from '../../../api/bakalariAPI';
import { scheduleService } from '../../../services/firestoreService';
import type { TimetableDay } from '../../../api/bakalariAPI';
import './SchoolSchedule.css';
import { SchoolScheduleModal } from './SchoolScheduleModal';

const SchoolScheduleWidget: React.FC = () => {
  const [selectedKid, setSelectedKid] = useState<'jarecek' | 'johanka'>(
    'jarecek'
  );
  const [selectedDay, setSelectedDay] = useState(0);
  const [johankaSchedule, setJohankaSchedule] = useState<TimetableDay[]>([]);
  // ZMĚNA: Načítání z localStorage odstraněno, data přijdou z useEffect
  const [jarecekSchedule, setJarecekSchedule] = useState<TimetableDay[]>([]);
  // SMAZÁNO: Nepotřebný a nepoužívaný stav 'timetable'
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleSaveSchedule = async (newSchedule: TimetableDay[]) => {
    try {
      await scheduleService.saveSchedule('jarecek', newSchedule);
      setJarecekSchedule(newSchedule); // Aktualizujeme stav v aplikaci
      setIsModalOpen(false); // PŘIDÁNO: Zavření modálního okna po úspěšném uložení
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
      const freshData = await bakalariAPI.getTimetable();
      if (freshData && freshData.length > 0) {
        await scheduleService.saveSchedule('johanka', freshData);
        setJohankaSchedule(freshData); // Ihned aktualizujeme stav
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
        // Paralelně načteme oba rozvrhy z Firestore
        const [johankaData, jarecekData] = await Promise.all([
          scheduleService.getSchedule('johanka'),
          scheduleService.getSchedule('jarecek'),
        ]);
        setJohankaSchedule(johankaData);
        setJarecekSchedule(jarecekData);
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

  if (currentTimetable.length === 0) {
    return (
      <>
        <div className="school-schedule-widget">
          <div className="schedule-header">
            <div className="schedule-title">
              <span className="schedule-icon">🎒</span>
              <span>Školní rozvrh</span>
            </div>
            <div className="schedule-kids-tabs">
              <button
                className={`kid-tab ${
                  selectedKid === 'jarecek' ? 'active' : ''
                }`}
                onClick={() => setSelectedKid('jarecek')}
              >
                Jareček
              </button>
              <button
                className={`kid-tab ${
                  selectedKid === 'johanka' ? 'active' : ''
                }`}
                onClick={() => setSelectedKid('johanka')}
              >
                Johanka
              </button>
            </div>
            {selectedKid === 'johanka' && (
              <button
                onClick={handleRefresh}
                className="edit-schedule-btn"
                style={{ marginTop: '10px' }}
              >
                🔄 Aktualizovat z Bakalářů
              </button>
            )}
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
              'Rozvrh není k dispozici. Zkuste jej aktualizovat.'
            )}
          </div>
        </div>

        {isModalOpen && (
          <SchoolScheduleModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            onSave={handleSaveSchedule}
            initialSchedule={jarecekSchedule}
          />
        )}
      </>
    );
  }

  const today = currentTimetable[selectedDay];

  return (
    <div className="school-schedule-widget">
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
        {selectedKid === 'johanka' && (
          <button
            onClick={handleRefresh}
            className="edit-schedule-btn"
            style={{ marginTop: '10px' }}
          >
            🔄 Aktualizovat z Bakalářů
          </button>
        )}
      </div>

      <div className="schedule-days-nav">
        {currentTimetable.map((day, index) => (
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
        {today ? (
          <>
            <h3 className="schedule-day-title">{today.dayDescription}</h3>
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
