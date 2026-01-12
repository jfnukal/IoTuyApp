// src/components/Widgets/Calendar/EventForm.tsx

import React, { useState, useEffect } from 'react';
import type {
  CalendarEventData,
  EventType,
  FamilyMember,
} from '../../../types/index';
import { useAuth } from '../../../contexts/AuthContext';
import ReminderSelector from './ReminderSelector';
import RecipientSelector from '../../Notifications/RecipientSelector';
import RecurrenceSelector from './RecurrenceSelector';
import './styles/RecurrenceSelector.css';

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
        familyMemberId: defaultMemberId || '', // Nastavíme v useEffect
        color: event.color || '#667eea',
        icon: event.icon || '',
        reminders: event.reminders || [],
        isAllDay: event.isAllDay || false,
        isMultiDay: !!event.endDate,
        endDate: event.endDate ? new Date(event.endDate + 'T00:00:00') : null,
        reminderRecipients: event.reminderRecipients || [],
        recurring: event.recurring || null,
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
      icon: '',
      reminders: [],
      isAllDay: false,
      isMultiDay: false,
      endDate: initialDate,
      reminderRecipients: [],
      recurring: null,
    };
  });

  const { currentUser } = useAuth();

  // Automatický default: přihlášený uživatel nebo "Rodina"
  useEffect(() => {
    if (!event && !defaultMemberId && currentUser) {
      const myMember = familyMembers.find((m) => m.authUid === currentUser.uid);
      setFormData((prev) => ({
        ...prev,
        familyMemberId: myMember?.id || 'all',
      }));
    }
  }, [event, defaultMemberId, currentUser, familyMembers]);

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
        icon: event.icon || '',
        reminders: event.reminders || [],
        isAllDay: event.isAllDay || false,
        isMultiDay: !!event.endDate,
        endDate: event.endDate ? new Date(event.endDate + 'T00:00:00') : null,
        reminderRecipients: event.reminderRecipients || [],
        recurring: event.recurring || null,
      });
    }
  }, [event]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) return;

    // ✅ Vytvoř objekt s daty
    const eventData: any = {
      ...formData,
      date: `${formData.date.getFullYear()}-${(formData.date.getMonth() + 1)
        .toString()
        .padStart(2, '0')}-${formData.date
        .getDate()
        .toString()
        .padStart(2, '0')}`,
    };

    // ✅ Přidej endDate pouze pokud existuje
    if (formData.isMultiDay && formData.endDate) {
      eventData.endDate = `${formData.endDate.getFullYear()}-${(
        formData.endDate.getMonth() + 1
      )
        .toString()
        .padStart(2, '0')}-${formData.endDate
        .getDate()
        .toString()
        .padStart(2, '0')}`;
    }

    // ✅ Přidej time a endTime pouze pokud NENÍ celodenní
    if (!formData.isAllDay) {
      if (formData.time) eventData.time = formData.time;
      if (formData.endTime) eventData.endTime = formData.endTime;
    }

    // ✅ Přidej reminderRecipients (pole ID členů, kteří dostanou připomínku)
    if (formData.reminderRecipients && formData.reminderRecipients.length > 0) {
      eventData.reminderRecipients = formData.reminderRecipients;
    }

    // ✅ Přidej recurring pattern - vyčisti undefined hodnoty
    if (formData.recurring) {
      const cleanRecurring: any = {
        frequency: formData.recurring.frequency,
        interval: formData.recurring.interval,
        endType: formData.recurring.endType,
      };

      // Přidej pouze definované hodnoty
      if (
        formData.recurring.daysOfWeek &&
        formData.recurring.daysOfWeek.length > 0
      ) {
        cleanRecurring.daysOfWeek = formData.recurring.daysOfWeek;
      }
      if (formData.recurring.dayOfMonth !== undefined) {
        cleanRecurring.dayOfMonth = formData.recurring.dayOfMonth;
      }
      if (formData.recurring.endDate) {
        cleanRecurring.endDate = formData.recurring.endDate;
      }
      if (formData.recurring.endCount) {
        cleanRecurring.endCount = formData.recurring.endCount;
      }
      if (
        formData.recurring.exceptions &&
        formData.recurring.exceptions.length > 0
      ) {
        cleanRecurring.exceptions = formData.recurring.exceptions;
      }

      eventData.recurring = cleanRecurring;
    } else {
      eventData.recurring = null;
    }

    onSave(eventData);
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

  // ✅ POMOCNÁ FUNKCE: Vrátí seznam příjemců připomínek
  const getSelectedRecipients = (): string[] => {
    return formData.reminderRecipients || [];
  };

  // ✅ POMOCNÁ FUNKCE: Nastaví příjemce připomínek
  const handleRecipientsChange = (recipients: string[]) => {
    handleInputChange('reminderRecipients', recipients);
  };

  // Kontrola, zda opakování nepřekračuje limity
  const hasRecurrenceError = (): boolean => {
    if (!formData.recurring) return false;

    const limits: Record<string, number> = {
      daily: 365,
      weekly: 104,
      biweekly: 52,
      monthly: 48,
      yearly: 4,
      custom: 104,
    };

    const limit = limits[formData.recurring.frequency] || 100;

    if (formData.recurring.endType === 'count' && formData.recurring.endCount) {
      return formData.recurring.endCount > limit;
    }

    if (formData.recurring.endType === 'date' && formData.recurring.endDate) {
      const start = formData.date;
      const end = new Date(formData.recurring.endDate);
      const diffDays = Math.ceil(
        (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
      );

      let estimated = 0;
      switch (formData.recurring.frequency) {
        case 'daily':
          estimated = diffDays;
          break;
        case 'weekly':
          estimated = Math.ceil(diffDays / 7);
          break;
        case 'biweekly':
          estimated = Math.ceil(diffDays / 14);
          break;
        case 'monthly':
          estimated = Math.ceil(diffDays / 30);
          break;
        case 'yearly':
          estimated = Math.ceil(diffDays / 365);
          break;
        case 'custom':
          estimated = Math.ceil(diffDays / 7);
          break;
      }

      return estimated > limit;
    }

    return false;
  };

  const eventTypes = [
    { value: 'personal', label: 'Osobní', icon: '👤' },
    { value: 'work', label: 'Pracovní', icon: '💼' },
    { value: 'family', label: 'Rodina', icon: '👨‍👩‍👧‍👦' },
    { value: 'birthday', label: 'Narozeniny', icon: '🎂' },
    { value: 'reminder', label: 'Připomínka', icon: '⏰' },
  ];

  const colorOptions = [
    '#667eea', // fialová
    '#ff6b6b', // červená
    '#4ecdc4', // tyrkysová
    '#feca57', // žlutá
    '#54a0ff', // modrá
    '#10ac84', // zelená
  ];

  // Emoji ikony pro události
  const iconOptions = [
    // Běžné
    { emoji: '📅', label: 'Kalendář' },
    { emoji: '📌', label: 'Připnuté' },
    { emoji: '⭐', label: 'Důležité' },
    { emoji: '❗', label: 'Urgentní' },
    { emoji: '✅', label: 'Úkol' },
    // Rodina
    { emoji: '👶', label: 'Dítě' },
    { emoji: '🎒', label: 'Škola' },
    { emoji: '🚗', label: 'Cesta' },
    { emoji: '🎂', label: 'Narozeniny' },
    { emoji: '👨‍👩‍👧', label: 'Rodina' },
    // Koníčky/Sport
    { emoji: '⚽', label: 'Fotbal' },
    { emoji: '🎨', label: 'Kreslení' },
    { emoji: '🎸', label: 'Hudba' },
    { emoji: '🎮', label: 'Hry' },
    { emoji: '📚', label: 'Čtení' },
    { emoji: '🤸', label: 'Parkour' },
    // Cestování
    { emoji: '✈️', label: 'Letadlo' },
    { emoji: '🏖️', label: 'Pláž' },
    { emoji: '⛷️', label: 'Lyže' },
    { emoji: '🏕️', label: 'Kemp' },
    // Svátky
    { emoji: '🎄', label: 'Vánoce' },
    { emoji: '🎃', label: 'Halloween' },
    { emoji: '🐣', label: 'Velikonoce' },
    { emoji: '🎁', label: 'Dárek' },
    // Práce/Zdraví
    { emoji: '💼', label: 'Práce' },
    { emoji: '💊', label: 'Léky' },
    { emoji: '🦷', label: 'Zubař' },
    { emoji: '🏥', label: 'Doktor' },
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

          {/* Datum od a do */}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Datum od:</label>
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
                onChange={(e) => {
                  const newStartDate = new Date(e.target.value + 'T00:00:00');
                  handleInputChange('date', newStartDate);
                  // Pokud je endDate menší než nové startDate, nastav endDate na startDate
                  if (formData.endDate && formData.endDate < newStartDate) {
                    handleInputChange('endDate', newStartDate);
                  }
                }}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Datum do: (nepovinné)</label>
              <input
                type="date"
                className="form-input"
                value={
                  formData.endDate
                    ? `${formData.endDate.getFullYear()}-${(
                        formData.endDate.getMonth() + 1
                      )
                        .toString()
                        .padStart(2, '0')}-${formData.endDate
                        .getDate()
                        .toString()
                        .padStart(2, '0')}`
                    : ''
                }
                onChange={(e) => {
                  if (e.target.value) {
                    const newEndDate = new Date(e.target.value + 'T00:00:00');
                    // Validace: endDate nesmí být menší než startDate
                    if (newEndDate >= formData.date) {
                      handleInputChange('endDate', newEndDate);
                      handleInputChange('isMultiDay', true);

                      // ✅ NOVÉ: Pokud je víc než jeden den, automaticky nastav celodenní
                      if (
                        newEndDate.toDateString() !==
                        formData.date.toDateString()
                      ) {
                        handleInputChange('isAllDay', true);
                      }
                    } else {
                      alert('Datum do nemůže být dřívější než datum od!');
                    }
                  } else {
                    handleInputChange('endDate', null);
                    handleInputChange('isMultiDay', false);
                  }
                }}
                min={`${formData.date.getFullYear()}-${(
                  formData.date.getMonth() + 1
                )
                  .toString()
                  .padStart(2, '0')}-${formData.date
                  .getDate()
                  .toString()
                  .padStart(2, '0')}`}
              />
            </div>
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

          {/* Opakování */}
          <RecurrenceSelector
            value={formData.recurring}
            onChange={(pattern) => handleInputChange('recurring', pattern)}
            startDate={formData.date}
          />

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

          {/* Pro koho (přiřazení člena rodiny) */}
          {familyMembers.length > 0 && (
            <div className="form-group">
              <label className="form-label">Pro koho je událost?:</label>
              <select
                className="form-select"
                value={formData.familyMemberId || 'all'}
                onChange={(e) =>
                  handleInputChange('familyMemberId', e.target.value)
                }
              >
                <option value="all">👨‍👩‍👧‍👦 Celá rodina</option>
                {familyMembers.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.icon || '👤'} {member.name}
                  </option>
                ))}
              </select>
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

          {/* ✅ Příjemci připomínky */}
          {familyMembers.length > 0 && (
            <div className="form-group">
              <label className="form-label">
                Příjemci připomínky:
                <span
                  style={{
                    fontSize: '0.85rem',
                    color: '#6c757d',
                    marginLeft: '8px',
                  }}
                >
                  (Nevyber nikoho = žádné připomínky)
                </span>
              </label>
              <RecipientSelector
                selectedRecipients={getSelectedRecipients()}
                onChange={handleRecipientsChange}
                familyMembers={familyMembers}
              />
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

          {/* Ikona */}
          <div className="form-group">
            <label className="form-label">Ikona (volitelné)</label>
            <div className="icon-picker">
              {/* Tlačítko pro zrušení ikony */}
              <button
                type="button"
                className={`icon-option ${
                  formData.icon === '' ? 'selected' : ''
                }`}
                onClick={() => handleInputChange('icon', '')}
                title="Bez ikony"
                style={{
                  fontSize: '14px',
                  color: '#999',
                }}
              >
                ✕
              </button>
              {iconOptions.map((item) => (
                <button
                  key={item.emoji}
                  type="button"
                  className={`icon-option ${
                    formData.icon === item.emoji ? 'selected' : ''
                  }`}
                  onClick={() => handleInputChange('icon', item.emoji)}
                  title={item.label}
                >
                  {item.emoji}
                </button>
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
            <button
              type="submit"
              className="btn btn-primary"
              disabled={hasRecurrenceError()}
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
