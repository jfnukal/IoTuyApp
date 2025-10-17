// src/components/Widgets/Calendar/EventForm.tsx

import React, { useState, useEffect } from 'react';
import type {
  CalendarEventData,
  EventType,
  FamilyMember,
} from '../../../types/index';
import ReminderSelector from './ReminderSelector';
import RecipientSelector from '../../Notifications/RecipientSelector';

interface EventFormProps {
  event: CalendarEventData | null;
  date: Date | null;
  familyMembers: FamilyMember[];
  onSave: (eventData: Partial<CalendarEventData>) => void;
  onDelete?: () => void;
  onClose: () => void;
  defaultMemberId?: string;
}

const EventForm: React.FC<EventFormProps> = ({
  event,
  date,
  familyMembers,
  onSave,
  onDelete,
  onClose,
  defaultMemberId,
}) => {
  const getRoundedTime = () => {
    const now = new Date();
    const minutes = now.getMinutes();
    const roundedMinutes = Math.ceil(minutes / 15) * 15;
    if (roundedMinutes >= 60) {
      now.setHours(now.getHours() + 1);
      now.setMinutes(0);
    } else {
      now.setMinutes(roundedMinutes);
    }
    return `${now.getHours().toString().padStart(2, '0')}:${now
      .getMinutes()
      .toString()
      .padStart(2, '0')}`;
  };

  const getEndTime = (startTime: string) => {
    const [hours, minutes] = startTime.split(':').map(Number);
    const d = new Date();
    d.setHours(hours, minutes + 30);
    return `${d.getHours().toString().padStart(2, '0')}:${d
      .getMinutes()
      .toString()
      .padStart(2, '0')}`;
  };

  const [formData, setFormData] = useState(() => {
    if (event) {
      return {
        title: event.title,
        description: event.description || '',
        date: new Date(event.date + 'T00:00:00'),
        time: event.time || '',
        endTime: event.endTime || '',
        type: event.type,
        familyMemberId: event.familyMemberId || '',
        color: event.color || '#667eea',
        reminders: event.reminders || [],
        isAllDay: event.isAllDay || false,
      };
    }
    const initialDate = date || new Date();
    const roundedStartTime = getRoundedTime();
    const calculatedEndTime = getEndTime(roundedStartTime);
    return {
      title: '',
      description: '',
      date: initialDate,
      time: roundedStartTime,
      endTime: calculatedEndTime,
      type: 'personal' as EventType,
      familyMemberId: defaultMemberId || '',
      color: '#667eea',
      reminders: [],
      isAllDay: false,
    };
  });

  useEffect(() => {
    if (event) {
      setFormData({
        title: event.title,
        description: event.description || '',
        date: new Date(event.date + 'T00:00:00'),
        time: event.time || '',
        endTime: event.endTime || '',
        type: event.type,
        familyMemberId: event.familyMemberId || '',
        color: event.color || '#667eea',
        reminders: event.reminders || [],
        isAllDay: event.isAllDay || false,
      });
    }
  }, [event]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) return;
    onSave({
      ...formData,
      date: `${formData.date.getFullYear()}-${(formData.date.getMonth() + 1)
        .toString()
        .padStart(2, '0')}-${formData.date
        .getDate()
        .toString()
        .padStart(2, '0')}`,
      time: formData.isAllDay ? undefined : formData.time,
      endTime: formData.isAllDay ? undefined : formData.endTime,
    });
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => {
      const newFormData = { ...prev, [field]: value };

      if (field === 'familyMemberId') {
        const selectedMember = familyMembers.find(
          (member) => member.id === value
        );
        newFormData.color = selectedMember ? selectedMember.color : '#667eea';
      }

      return newFormData;
    });
  };

  // ✅ POMOCNÁ FUNKCE: Převod familyMemberId na selectedRecipients
  const getSelectedRecipients = (): string[] => {
    if (!formData.familyMemberId || formData.familyMemberId === 'nikdo' || formData.familyMemberId === 'personal') {
      return [];
    }
    if (formData.familyMemberId === 'all') {
      return familyMembers.map(m => m.id);
    }
    if (formData.familyMemberId === 'parents') {
      return familyMembers.filter(m => m.role === 'parent').map(m => m.id);
    }
    if (formData.familyMemberId === 'children') {
      return familyMembers.filter(m => m.role === 'child').map(m => m.id);
    }
    return [formData.familyMemberId];
  };

  // ✅ POMOCNÁ FUNKCE: Převod selectedRecipients na familyMemberId
  const handleRecipientsChange = (recipients: string[]) => {
    if (recipients.length === 0) {
      handleInputChange('familyMemberId', 'nikdo');
      return;
    }

    const allMemberIds = familyMembers.map(m => m.id);
    const parentIds = familyMembers.filter(m => m.role === 'parent').map(m => m.id);
    const childIds = familyMembers.filter(m => m.role === 'child').map(m => m.id);

    // Všichni?
    if (recipients.length === allMemberIds.length && 
        recipients.every(r => allMemberIds.includes(r))) {
      handleInputChange('familyMemberId', 'all');
      return;
    }

    // Rodiče?
    if (parentIds.length > 0 && 
        recipients.length === parentIds.length && 
        recipients.every(r => parentIds.includes(r))) {
      handleInputChange('familyMemberId', 'parents');
      return;
    }

    // Děti?
    if (childIds.length > 0 && 
        recipients.length === childIds.length && 
        recipients.every(r => childIds.includes(r))) {
      handleInputChange('familyMemberId', 'children');
      return;
    }

    // Jeden člen?
    if (recipients.length === 1) {
      handleInputChange('familyMemberId', recipients[0]);
      return;
    }

    // Více členů (ale ne celá skupina) - uložíme jako první vybraný
    handleInputChange('familyMemberId', recipients[0]);
  };

  const eventTypes = [
    { value: 'personal', label: 'Osobní', icon: '👤' },
    { value: 'work', label: 'Pracovní', icon: '💼' },
    { value: 'family', label: 'Rodina', icon: '👨‍👩‍👧‍👦' },
    { value: 'birthday', label: 'Narozeniny', icon: '🎂' },
    { value: 'reminder', label: 'Připomínka', icon: '⏰' },
  ];

  const colorOptions = [
    '#667eea',
    '#764ba2',
    '#ff6b6b',
    '#4ecdc4',
    '#45b7d1',
    '#96ceb4',
    '#feca57',
    '#ff9ff3',
    '#54a0ff',
    '#5f27cd',
    '#00d2d3',
    '#ff9f43',
    '#8395a7',
    '#10ac84',
    '#ee5a24',
    '#0abde3',
  ];

  return (
    <div
      className="event-form-overlay"
      onClick={(e) => {
        e.stopPropagation();
        onClose();
      }}
    >
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

          {/* Datum */}
          <div className="form-group">
            <label className="form-label">Datum</label>
            <input
              type="date"
              className="form-input"
              value={`${formData.date.getFullYear()}-${(
                formData.date.getMonth() + 1
              )
                .toString()
                .padStart(2, '0')}-${formData.date
                .getDate()
                .toString()
                .padStart(2, '0')}`}
              onChange={(e) =>
                handleInputChange(
                  'date',
                  new Date(e.target.value + 'T00:00:00')
                )
              }
            />
          </div>

          {/* Celodenní událost */}
          <div className="form-group">
            <label className="form-label">
              <input
                type="checkbox"
                checked={formData.isAllDay}
                onChange={(e) =>
                  handleInputChange('isAllDay', e.target.checked)
                }
                style={{ marginRight: '8px' }}
              />
              Celodenní událost
            </label>
          </div>

          {/* Časy */}
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
              onChange={(e) =>
                handleInputChange('type', e.target.value as EventType)
              }
            >
              {eventTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.icon} {type.label}
                </option>
              ))}
            </select>
          </div>

          {/* ✅ NOVÝ: Příjemci připomínky */}
          {familyMembers.length > 0 && (
            <div className="form-group">
              <label className="form-label">Příjemci připomínky:</label>
              <RecipientSelector
                selectedRecipients={getSelectedRecipients()}
                onChange={handleRecipientsChange}
                familyMembers={familyMembers}
              />
              
              {/* ✅ Speciální volby: Nikdo a Jen mně */}
              <div style={{ marginTop: '12px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className={`recipient-chip ${formData.familyMemberId === 'nikdo' ? 'selected' : ''}`}
                  onClick={() => handleInputChange('familyMemberId', 'nikdo')}
                  style={{
                    padding: '8px 16px',
                    border: '2px solid',
                    borderColor: formData.familyMemberId === 'nikdo' ? '#667eea' : '#ddd',
                    borderRadius: '20px',
                    background: formData.familyMemberId === 'nikdo' ? '#667eea' : 'white',
                    color: formData.familyMemberId === 'nikdo' ? 'white' : '#333',
                    cursor: 'pointer',
                    fontSize: '14px',
                  }}
                >
                  🚫 Nikdo (bez připomínek)
                </button>
                <button
                  type="button"
                  className={`recipient-chip ${formData.familyMemberId === 'personal' ? 'selected' : ''}`}
                  onClick={() => handleInputChange('familyMemberId', 'personal')}
                  style={{
                    padding: '8px 16px',
                    border: '2px solid',
                    borderColor: formData.familyMemberId === 'personal' ? '#667eea' : '#ddd',
                    borderRadius: '20px',
                    background: formData.familyMemberId === 'personal' ? '#667eea' : 'white',
                    color: formData.familyMemberId === 'personal' ? 'white' : '#333',
                    cursor: 'pointer',
                    fontSize: '14px',
                  }}
                >
                  🔒 Jen mně (osobní)
                </button>
              </div>
            </div>
          )}

          {/* Barva */}
          <div className="form-group">
            <label className="form-label">Barva</label>
            <div className="color-picker">
              {colorOptions.map((color) => (
                <button
                  key={color}
                  type="button"
                  className={`color-option ${
                    formData.color === color ? 'selected' : ''
                  }`}
                  style={{ backgroundColor: color }}
                  onClick={() => handleInputChange('color', color)}
                  title={color}
                />
              ))}
            </div>
          </div>

          {/* Připomínky */}
          <ReminderSelector
            reminders={formData.reminders}
            onChange={(newReminders) =>
              handleInputChange('reminders', newReminders)
            }
            maxReminders={5}
          />

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
            <button type="button" className="btn btn-outline" onClick={onClose}>
              Zrušit
            </button>
            <button type="submit" className="btn btn-primary">
              💾 {event ? 'Uložit' : 'Vytvořit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EventForm;