import React, { useState, useEffect } from 'react';
import type { CalendarEvent, EventType, ReminderType, FamilyMember } from './types';

interface EventFormProps {
  event: CalendarEvent | null;
  date: Date | null;
  familyMembers: FamilyMember[];
  onSave: (eventData: Partial<CalendarEvent>) => void;
  onDelete?: (eventId: string) => void;
  onClose: () => void;
  defaultMemberId?: string; // <-- PŘIDEJTE TENTO ŘÁDEK
}

const EventForm: React.FC<EventFormProps> = ({
  event,
  date,
  familyMembers,
  onSave,
  onDelete,
  onClose
}) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: date || new Date(),
    time: '',
    endTime: '',
    type: 'personal' as EventType,
    familyMember: '',
    color: '#667eea',
    reminder: 'none' as ReminderType,
    isAllDay: false
  });

  // Naplň formulář při editaci
  useEffect(() => {
    if (event) {
      setFormData({
        title: event.title,
        description: event.description || '',
        date: event.date,
        time: event.time || '',
        endTime: event.endTime || '',
        type: event.type,
        familyMember: event.familyMember || '',
        color: event.color || '#667eea',
        reminder: event.reminder || 'none',
        isAllDay: event.isAllDay || false
      });
    }
  }, [event]);

  // Typy událostí
  const eventTypes = [
    { value: 'personal', label: 'Osobní', icon: '👤' },
    { value: 'work', label: 'Pracovní', icon: '💼' },
    { value: 'family', label: 'Rodina', icon: '👨‍👩‍👧‍👦' },
    { value: 'birthday', label: 'Narozeniny', icon: '🎂' },
    { value: 'reminder', label: 'Připomínka', icon: '⏰' }
  ];

  // Možnosti připomenutí
  const reminderOptions = [
    { value: 'none', label: 'Bez připomínky' },
    { value: '5min', label: '5 minut před' },
    { value: '15min', label: '15 minut před' },
    { value: '30min', label: '30 minut před' },
    { value: '1hour', label: '1 hodinu před' },
    { value: '1day', label: '1 den před' },
    { value: '1week', label: '1 týden před' },
    { value: 'email', label: 'Email' },
    { value: 'push', label: 'Push notifikace' }
  ];

  // Předefinované barvy
  const colorOptions = [
    '#667eea', '#764ba2', '#ff6b6b', '#4ecdc4',
    '#45b7d1', '#96ceb4', '#feca57', '#ff9ff3',
    '#54a0ff', '#5f27cd', '#00d2d3', '#ff9f43',
    '#8395a7', '#10ac84', '#ee5a24', '#0abde3'
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) return;

    onSave({
      ...formData,
      date: formData.date,
      time: formData.isAllDay ? undefined : formData.time,
      endTime: formData.isAllDay ? undefined : formData.endTime
    });
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <div className="event-form-overlay" onClick={onClose}>
      <div className="event-form" onClick={(e) => e.stopPropagation()}>
        <div className="event-form-header">
          <h3 className="event-form-title">
            {event ? 'Upravit událost' : 'Nová událost'}
          </h3>
          <button className="close-button" onClick={onClose}>
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Název události */}
          <div className="form-group">
            <label className="form-label">Název události *</label>
            <input
              type="text"
              className="form-input"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              placeholder="Zadejte název události"
              required
            />
          </div>

          {/* Popis */}
          <div className="form-group">
            <label className="form-label">Popis</label>
            <textarea
              className="form-textarea"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Zadejte popis události"
              rows={3}
            />
          </div>

          {/* Datum a čas */}
          <div className="form-group">
            <label className="form-label">Datum</label>
            <input
              type="date"
              className="form-input"
              value={formData.date.toISOString().split('T')[0]}
              onChange={(e) => handleInputChange('date', new Date(e.target.value))}
            />
          </div>

          {/* Celodenní událost */}
          <div className="form-group">
            <label className="form-label">
              <input
                type="checkbox"
                checked={formData.isAllDay}
                onChange={(e) => handleInputChange('isAllDay', e.target.checked)}
                style={{ marginRight: '8px' }}
              />
              Celodenní událost
            </label>
          </div>

          {/* Časy - pouze pokud není celodenní */}
          {!formData.isAllDay && (
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Začátek</label>
                <input
                  type="time"
                  className="form-input"
                  value={formData.time}
                  onChange={(e) => handleInputChange('time', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Konec</label>
                <input
                  type="time"
                  className="form-input"
                  value={formData.endTime}
                  onChange={(e) => handleInputChange('endTime', e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Typ události */}
          <div className="form-group">
            <label className="form-label">Typ události</label>
            <select
              className="form-select"
              value={formData.type}
              onChange={(e) => handleInputChange('type', e.target.value as EventType)}
            >
              {eventTypes.map(type => (
                <option key={type.value} value={type.value}>
                  {type.icon} {type.label}
                </option>
              ))}
            </select>
          </div>

          {/* Člen rodiny */}
          {familyMembers.length > 0 && (
            <div className="form-group">
              <label className="form-label">Člen rodiny</label>
              <div className="family-member-selector">
                <button
                  type="button"
                  className={`family-member-option ${!formData.familyMember ? 'selected' : ''}`}
                  onClick={() => handleInputChange('familyMember', '')}
                >
                  Nikdo
                </button>
                {familyMembers.map(member => (
                  <button
                    key={member.id}
                    type="button"
                    className={`family-member-option ${formData.familyMember === member.id ? 'selected' : ''}`}
                    style={{ 
                      backgroundColor: formData.familyMember === member.id ? member.color : 'transparent',
                      borderColor: member.color,
                      color: formData.familyMember === member.id ? 'white' : member.color
                    }}
                    onClick={() => handleInputChange('familyMember', member.id)}
                  >
                    {member.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Barva */}
          <div className="form-group">
            <label className="form-label">Barva</label>
            <div className="color-picker">
              {colorOptions.map(color => (
                <button
                  key={color}
                  type="button"
                  className={`color-option ${formData.color === color ? 'selected' : ''}`}
                  style={{ backgroundColor: color }}
                  onClick={() => handleInputChange('color', color)}
                  title={color}
                />
              ))}
            </div>
          </div>

          {/* Připomínka */}
          <div className="form-group">
            <label className="form-label">Připomínka</label>
            <div className="reminder-options">
              {reminderOptions.map(option => (
                <button
                  key={option.value}
                  type="button"
                  className={`reminder-option ${formData.reminder === option.value ? 'selected' : ''}`}
                  onClick={() => handleInputChange('reminder', option.value as ReminderType)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Akce */}
          <div className="form-actions">
            {onDelete && (
              <button
                type="button"
                className="btn btn-danger"
                onClick={onDelete}
              >
                🗑️ Smazat
              </button>
            )}
            <button
              type="button"
              className="btn btn-outline"
              onClick={onClose}
            >
              Zrušit
            </button>
            <button
              type="submit"
              className="btn btn-primary"
            >
              💾 {event ? 'Uložit' : 'Vytvořit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EventForm;