// src/components/Widgets/Calendar/ReminderSelector.tsx

import React from 'react';
import type {
  ReminderItem,
  ReminderUnit,
  ReminderNotificationType,
} from '../../../types';
import './styles/ReminderSelector.css';

interface ReminderSelectorProps {
  reminders: ReminderItem[];
  onChange: (reminders: ReminderItem[]) => void;
  maxReminders?: number;
}

const ReminderSelector: React.FC<ReminderSelectorProps> = ({
  reminders,
  onChange,
  maxReminders = 5,
}) => {
  // Pomocná funkce pro generování ID
  const generateId = () =>
    `reminder_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Možnosti hodnot podle jednotky
  const getValueOptions = (unit: ReminderUnit): number[] => {
    switch (unit) {
      case 'minutes':
        return [10, 20, 30, 40, 50, 60];
      case 'hours':
        return [1, 2, 3, 4, 5, 6];
      case 'days':
        return [1, 2, 3, 4, 5, 6];
      case 'weeks':
        return [1, 2, 3, 4];
      case 'ontime':
        return [0]; // Speciální případ - včas
      default:
        return [1];
    }
  };

  // Jednotky
  const units: { value: ReminderUnit; label: string }[] = [
    { value: 'ontime', label: 'Včas' },
    { value: 'minutes', label: 'minut' },
    { value: 'hours', label: 'hodin' },
    { value: 'days', label: 'dní' },
    { value: 'weeks', label: 'týdnů' },
  ];

  // Přidání nové připomínky
  const handleAddReminder = () => {
    if (reminders.length >= maxReminders) return;

    const newReminder: ReminderItem = {
      id: generateId(),
      value: 10,
      unit: 'minutes',
      type: 'push',
    };

    onChange([...reminders, newReminder]);
  };

  // Smazání připomínky
  const handleDeleteReminder = (id: string) => {
    onChange(reminders.filter((r) => r.id !== id));
  };

  // Změna hodnoty
  const handleValueChange = (id: string, value: number) => {
    onChange(reminders.map((r) => (r.id === id ? { ...r, value } : r)));
  };

  // Změna jednotky
  const handleUnitChange = (id: string, unit: ReminderUnit) => {
    const newValue = getValueOptions(unit)[0]; // První hodnota pro danou jednotku
    onChange(
      reminders.map((r) => (r.id === id ? { ...r, unit, value: newValue } : r))
    );
  };

  // Změna typu notifikace
  const handleTypeChange = (id: string, type: ReminderNotificationType) => {
    onChange(reminders.map((r) => (r.id === id ? { ...r, type } : r)));
  };

  return (
    <div className="reminder-selector">
      <div className="reminder-header">
        <label className="form-label">
          ⏰ Připomínky ({reminders.length}/{maxReminders})
        </label>
      </div>

      <div className="reminder-list">
        {reminders.map((reminder) => (
          <div key={reminder.id} className="reminder-item">
            {/* Výběr času */}
            <div className="reminder-time">
              {reminder.unit === 'ontime' ? (
                <div className="ontime-label">Včas</div>
              ) : (
                <>
                  <select
                    className="reminder-value-select"
                    value={reminder.value}
                    onChange={(e) =>
                      handleValueChange(reminder.id, Number(e.target.value))
                    }
                  >
                    {getValueOptions(reminder.unit).map((val) => (
                      <option key={val} value={val}>
                        {val}
                      </option>
                    ))}
                  </select>
                  <select
                    className="reminder-unit-select"
                    value={reminder.unit}
                    onChange={(e) =>
                      handleUnitChange(
                        reminder.id,
                        e.target.value as ReminderUnit
                      )
                    }
                  >
                    {units
                      .filter((u) => u.value !== 'ontime')
                      .map((unit) => (
                        <option key={unit.value} value={unit.value}>
                          {unit.label}
                        </option>
                      ))}
                  </select>
                  <span className="before-label">před</span>
                </>
              )}
            </div>

            {/* Výběr typu notifikace */}
            <div className="reminder-type">
              <button
                type="button"
                className={`type-btn ${
                  reminder.type === 'email' ? 'active' : ''
                }`}
                onClick={() => handleTypeChange(reminder.id, 'email')}
                title="Email"
              >
                📧
              </button>
              <button
                type="button"
                className={`type-btn ${
                  reminder.type === 'push' ? 'active' : ''
                }`}
                onClick={() => handleTypeChange(reminder.id, 'push')}
                title="Push notifikace"
              >
                📱
              </button>
              <button
                type="button"
                className={`type-btn ${
                  reminder.type === 'both' ? 'active' : ''
                }`}
                onClick={() => handleTypeChange(reminder.id, 'both')}
                title="Email i Push"
              >
                📧📱
              </button>
            </div>

            {/* Tlačítko smazat */}
            <button
              type="button"
              className="reminder-delete-btn"
              onClick={() => handleDeleteReminder(reminder.id)}
              title="Smazat připomínku"
            >
              ×
            </button>
          </div>
        ))}
      </div>

      {/* Tlačítko přidat */}
      {reminders.length < maxReminders && (
        <button
          type="button"
          className="add-reminder-btn"
          onClick={handleAddReminder}
        >
          ➕ Přidat připomínku
        </button>
      )}

      {reminders.length >= maxReminders && (
        <div className="max-reminders-note">
          Maximální počet připomínek: {maxReminders}
        </div>
      )}
    </div>
  );
};

export default ReminderSelector;
