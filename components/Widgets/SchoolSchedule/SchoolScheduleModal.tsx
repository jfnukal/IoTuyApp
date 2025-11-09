// src/components/Widgets/SchoolSchedule/SchoolScheduleModal.tsx
import React, { useState } from 'react';
import type { TimetableDay } from '../../../types/index';
import './SchoolScheduleModal.css';
import { createPortal } from 'react-dom';

interface SchoolScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (schedule: TimetableDay[]) => void;
  initialSchedule?: TimetableDay[];
}

const DAYS = ['Pondělí', 'Úterý', 'Středa', 'Čtvrtek', 'Pátek'];
const HOURS = [
  { begin: '07:30', end: '08:15' },
  { begin: '08:30', end: '09:15' },
  { begin: '09:30', end: '10:15' },
  { begin: '10:25', end: '11:10' },
  { begin: '11:20', end: '12:05' },
];

export const SchoolScheduleModal: React.FC<SchoolScheduleModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialSchedule,
}) => {
  const [schedule, setSchedule] = useState<TimetableDay[]>(() => {
    if (initialSchedule && initialSchedule.length > 0) return initialSchedule;
    
    // Vytvoř prázdný rozvrh
    return DAYS.map((day, index) => ({
      date: new Date().toISOString(),
      dayOfWeek: index + 1,
      dayDescription: day,
      lessons: HOURS.map(hour => ({
        subjecttext: '',
        teacher: '',
        room: '',
        begintime: hour.begin,
        endtime: hour.end,
      })),
    }));
  });

  const updateLesson = (dayIndex: number, lessonIndex: number, subject: string) => {
    const newSchedule = [...schedule];
    newSchedule[dayIndex].lessons[lessonIndex].subjecttext = subject;
    setSchedule(newSchedule);
  };

  const handleSave = () => {
    onSave(schedule);
    onClose();
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="schedule-modal-overlay" onClick={onClose}>
      <div className="schedule-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="schedule-modal-header">
          <h2>Rozvrh pro Jarečka</h2>
          <button className="modal-close-btn" onClick={onClose}>×</button>
        </div>

        <div className="schedule-modal-grid">
          <div className="grid-corner"></div>
          {DAYS.map(day => (
            <div key={day} className="grid-day-header">{day}</div>
          ))}

          {HOURS.map((hour, hourIndex) => (
            <React.Fragment key={hourIndex}>
              <div className="grid-time">{hour.begin}</div>
              {schedule.map((day, dayIndex) => (
                <input
                  key={`${dayIndex}-${hourIndex}`}
                  type="text"
                  className="grid-input"
                  value={day.lessons[hourIndex]?.subjecttext || ''}
                  onChange={(e) => updateLesson(dayIndex, hourIndex, e.target.value)}
                  placeholder="Předmět"
                />
              ))}
            </React.Fragment>
          ))}
        </div>

        <div className="schedule-modal-footer">
          <button className="modal-cancel-btn" onClick={onClose}>Zrušit</button>
          <button className="modal-save-btn" onClick={handleSave}>Uložit rozvrh</button>
        </div>
      </div>
    </div>,
    document.body
  );
};