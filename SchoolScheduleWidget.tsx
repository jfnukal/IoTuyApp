// src/components/Widgets/SchoolSchedule/SchoolScheduleWidget.tsx
import React, { useState, useEffect } from 'react';
import { bakalariAPI } from '../../../api/bakalariAPI';
import type { TimetableDay } from '../../../api/bakalariAPI';
import './SchoolSchedule.css';
import { SchoolScheduleModal } from './SchoolScheduleModal';

const SchoolScheduleWidget: React.FC = () => {
  const [selectedKid, setSelectedKid] = useState<'jarecek' | 'johanka'>('jarecek');
  const [selectedDay, setSelectedDay] = useState(0);
  const [timetable, setTimetable] = useState<TimetableDay[]>([]);
  const [jarecekSchedule, setJarecekSchedule] = useState<TimetableDay[]>(() => {
    const saved = localStorage.getItem('jarecek_schedule');
    return saved ? JSON.parse(saved) : [];
  });
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      // Načti Jarečkův rozvrh z localStorage
      const savedJarecek = localStorage.getItem('jarecek_schedule');
      if (savedJarecek) {
        setJarecekSchedule(JSON.parse(savedJarecek));
      }
  
      // Johanka - API
      setLoading(true);
      try {
        const timetableData = await bakalariAPI.getTimetable();
        setTimetable(timetableData); // Johanka
      } catch (error) {
        console.error('Chyba při načítání dat:', error);
      } finally {
        setLoading(false);
      }
    };
  
    fetchData();
  }, []);

  const handleSaveSchedule = (newSchedule: TimetableDay[]) => {
    setJarecekSchedule(newSchedule);
    localStorage.setItem('jarecek_schedule', JSON.stringify(newSchedule));
  };

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

  if (loading) {
    return (
      <div className="school-schedule-widget">
        <div className="schedule-loading">Načítání rozvrhu...</div>
      </div>
    );
  }

// Vyber rozvrh podle vybraného dítěte
const currentTimetable = selectedKid === 'johanka' ? timetable : jarecekSchedule;

// První return - prázdný rozvrh (s modálem)
if (currentTimetable.length === 0) {
  return (
    <>
      <div className="school-schedule-widget">
        <div className="schedule-error">
          {selectedKid === 'jarecek' 
            ? (
              <div>
                <p>Nastavte rozvrh pro Jarečka</p>
                <button 
                  className="setup-button"
                  onClick={() => setIsModalOpen(true)}
                >
                  ⚙️ Nastavit rozvrh
                </button>
              </div>
            )
            : 'Rozvrh není k dispozici'}
        </div>
      </div>

      {/* Modal i tady */}
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

// Druhý return - normální zobrazení
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
      <h3 className="schedule-day-title">{today.dayDescription}</h3>

      <div className="lessons-list">
        {today.lessons.map((lesson, index) => (
          <div key={index} className="lesson-item">
            <div className="lesson-time">{lesson.begintime}</div>
            <div className="lesson-details">
              <span className="lesson-emoji">{getSubjectEmoji(lesson.subjecttext)}</span>
              <span className="lesson-subject">{lesson.subjecttext}</span>
            </div>
          </div>
        ))}
      </div>
    </div>

    {/* Modal i tady */}
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