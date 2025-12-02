// src/components/Widgets/Calendar/RecurrenceSelector.tsx
import React from 'react';
import type { RecurringPattern, RecurrenceFrequency } from '../../../types';
import './styles/RecurrenceSelector.css';

interface RecurrenceSelectorProps {
  value: RecurringPattern | null;
  onChange: (pattern: RecurringPattern | null) => void;
  startDate: Date;
}

const DAYS_OF_WEEK = [
  { value: 1, label: 'Po', fullLabel: 'Pondělí' },
  { value: 2, label: 'Út', fullLabel: 'Úterý' },
  { value: 3, label: 'St', fullLabel: 'Středa' },
  { value: 4, label: 'Čt', fullLabel: 'Čtvrtek' },
  { value: 5, label: 'Pá', fullLabel: 'Pátek' },
  { value: 6, label: 'So', fullLabel: 'Sobota' },
  { value: 0, label: 'Ne', fullLabel: 'Neděle' },
];

// Limity pro opakování
const RECURRENCE_LIMITS: Record<
  string,
  { max: number; label: string; unit: string }
> = {
  daily: { max: 365, label: 'Max 365 dní', unit: 'dní' },
  weekly: { max: 104, label: 'Max 104 týdnů (2 roky)', unit: 'týdnů' },
  biweekly: { max: 52, label: 'Max 52× (2 roky)', unit: 'opakování' },
  monthly: { max: 48, label: 'Max 48 měsíců (4 roky)', unit: 'měsíců' },
  yearly: { max: 4, label: 'Max 4 roky', unit: 'let' },
  custom: { max: 104, label: 'Max 104 týdnů (2 roky)', unit: 'týdnů' },
};

const FREQUENCY_OPTIONS: {
  value: RecurrenceFrequency | 'none';
  label: string;
  icon: string;
}[] = [
  { value: 'none', label: 'Neopakovat', icon: '📅' },
  { value: 'daily', label: 'Každý den', icon: '📆' },
  { value: 'weekly', label: 'Každý týden', icon: '🗓️' },
  { value: 'biweekly', label: 'Každé 2 týdny', icon: '📋' },
  { value: 'monthly', label: 'Každý měsíc', icon: '📅' },
  { value: 'yearly', label: 'Každý rok', icon: '🎂' },
  { value: 'custom', label: 'Vlastní...', icon: '⚙️' },
];

const RecurrenceSelector: React.FC<RecurrenceSelectorProps> = ({
  value,
  onChange,
  startDate,
}) => {
  const handleFrequencyChange = (frequency: RecurrenceFrequency | 'none') => {
    if (frequency === 'none') {
      onChange(null);
      return;
    }

    const dayOfWeek = startDate.getDay();
    const dayOfMonth = startDate.getDate();

    // Vytvoř základní pattern BEZ undefined hodnot
    const newPattern: RecurringPattern = {
      frequency,
      interval: frequency === 'biweekly' ? 2 : 1,
      endType: 'never',
    };

    // Přidej pouze pokud jsou relevantní
    if (frequency === 'weekly' || frequency === 'custom') {
      newPattern.daysOfWeek = [dayOfWeek];
    }

    if (frequency === 'monthly') {
      newPattern.dayOfMonth = dayOfMonth;
    }

    onChange(newPattern);
  };

  const handleDayToggle = (day: number) => {
    if (!value) return;

    const currentDays = value.daysOfWeek || [];
    const newDays = currentDays.includes(day)
      ? currentDays.filter((d) => d !== day)
      : [...currentDays, day].sort((a, b) => a - b);

    // Musí být vybrán alespoň jeden den
    if (newDays.length === 0) return;

    onChange({
      ...value,
      daysOfWeek: newDays,
    });
  };

  const handleEndTypeChange = (endType: 'never' | 'date' | 'count') => {
    if (!value) return;

    const updates: Partial<RecurringPattern> = { endType };

    if (endType === 'date' && !value.endDate) {
      // Výchozí: 3 měsíce od startu
      const defaultEnd = new Date(startDate);
      defaultEnd.setMonth(defaultEnd.getMonth() + 3);
      updates.endDate = defaultEnd.toISOString().split('T')[0];
    }

    if (endType === 'count' && !value.endCount) {
      updates.endCount = 10;
    }

    onChange({ ...value, ...updates });
  };

  const handleEndDateChange = (dateStr: string) => {
    if (!value) return;
    onChange({ ...value, endDate: dateStr });
  };

  const handleEndCountChange = (count: number) => {
    if (!value) return;
    onChange({ ...value, endCount: Math.max(1, Math.min(100, count)) });
  };

  const currentFrequency = value?.frequency || 'none';

  // Stav pro info modal
  const [showInfoModal, setShowInfoModal] = React.useState(false);

  // Stav pro chybovou hlášku
  const [validationError, setValidationError] = React.useState<string | null>(
    null
  );

  // Validace limitu
  const validateRecurrence = React.useCallback(
    (pattern: RecurringPattern, start: Date): string | null => {
      const limit = RECURRENCE_LIMITS[pattern.frequency];
      if (!limit) return null;

      if (pattern.endType === 'count' && pattern.endCount) {
        if (pattern.endCount > limit.max) {
          return `Překročen limit: maximum je ${limit.max} ${limit.unit}`;
        }
      }

      if (pattern.endType === 'date' && pattern.endDate) {
        const endDate = new Date(pattern.endDate);
        const diffTime = endDate.getTime() - start.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        let estimatedCount = 0;
        switch (pattern.frequency) {
          case 'daily':
            estimatedCount = diffDays;
            break;
          case 'weekly':
            estimatedCount = Math.ceil(diffDays / 7);
            break;
          case 'biweekly':
            estimatedCount = Math.ceil(diffDays / 14);
            break;
          case 'monthly':
            estimatedCount = Math.ceil(diffDays / 30);
            break;
          case 'yearly':
            estimatedCount = Math.ceil(diffDays / 365);
            break;
          case 'custom':
            const daysPerWeek = pattern.daysOfWeek?.length || 1;
            estimatedCount = Math.ceil((diffDays / 7) * daysPerWeek);
            break;
        }

        if (estimatedCount > limit.max) {
          return `Překročen limit: koncové datum vytvoří ~${estimatedCount} opakování, maximum je ${limit.max}`;
        }
      }

      return null;
    },
    []
  );

  // Validuj při změně
  React.useEffect(() => {
    if (value) {
      const error = validateRecurrence(value, startDate);
      setValidationError(error);
    } else {
      setValidationError(null);
    }
  }, [value, startDate, validateRecurrence]);

  return (
    <div className="recurrence-selector">
      <div className="recurrence-header">
        <label className="form-label">
          🔄 Opakování
          <button
            type="button"
            className="recurrence-info-btn"
            onClick={() => setShowInfoModal(true)}
            aria-label="Zobrazit limity opakování"
          >
            ℹ️
          </button>
        </label>
      </div>

      {/* Výběr frekvence */}
      <div className="recurrence-frequency">
        <select
          className="form-select recurrence-select"
          value={currentFrequency}
          onChange={(e) =>
            handleFrequencyChange(
              e.target.value as RecurrenceFrequency | 'none'
            )
          }
        >
          {FREQUENCY_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.icon} {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Vlastní dny v týdnu */}
      {value?.frequency === 'custom' && (
        <div className="recurrence-custom">
          <label className="form-label-small">Opakovat ve dnech:</label>
          <div className="days-of-week">
            {DAYS_OF_WEEK.map((day) => (
              <button
                key={day.value}
                type="button"
                className={`day-button ${
                  value.daysOfWeek?.includes(day.value) ? 'selected' : ''
                }`}
                onClick={() => handleDayToggle(day.value)}
                title={day.fullLabel}
              >
                {day.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Konec opakování */}
      {value && (
        <div className="recurrence-end">
          <label className="form-label-small">Končí:</label>
          <div className="end-type-options">
            <label className="end-type-option">
              <input
                type="radio"
                name="endType"
                checked={value.endType === 'never'}
                onChange={() => handleEndTypeChange('never')}
              />
              <span>Nikdy</span>
            </label>

            <label className="end-type-option">
              <input
                type="radio"
                name="endType"
                checked={value.endType === 'date'}
                onChange={() => handleEndTypeChange('date')}
              />
              <span>Dne</span>
              {value.endType === 'date' && (
                <input
                  type="date"
                  className="form-input end-date-input"
                  value={value.endDate || ''}
                  onChange={(e) => handleEndDateChange(e.target.value)}
                  min={startDate.toISOString().split('T')[0]}
                />
              )}
            </label>

            <label className="end-type-option">
              <input
                type="radio"
                name="endType"
                checked={value.endType === 'count'}
                onChange={() => handleEndTypeChange('count')}
              />
              <span>Po</span>
              {value.endType === 'count' && (
                <>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    className="form-input end-count-input"
                    value={value.endCount || 10}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9]/g, '');
                      if (val === '') {
                        handleEndCountChange(1);
                      } else {
                        handleEndCountChange(parseInt(val, 10));
                      }
                    }}
                  />
                  <span>opakováních</span>
                </>
              )}
            </label>
          </div>
        </div>
      )}

      {/* Náhled */}
      {value && (
        <div className="recurrence-preview">
          <span className="preview-icon">📋</span>
          <span className="preview-text">
            {getRecurrenceDescription(value, startDate)}
          </span>
        </div>
      )}

      {/* Chybová hláška */}
      {validationError && (
        <div className="recurrence-error">
          <span className="error-icon">⚠️</span>
          <span className="error-text">{validationError}</span>
        </div>
      )}

      {/* Info Modal */}
      {showInfoModal && (
        <div
          className="recurrence-info-modal-overlay"
          onClick={() => setShowInfoModal(false)}
        >
          <div
            className="recurrence-info-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="recurrence-info-modal-header">
              <h4>📋 Limity opakování</h4>
              <button
                type="button"
                className="recurrence-info-modal-close"
                onClick={() => setShowInfoModal(false)}
              >
                ✕
              </button>
            </div>
            <div className="recurrence-info-modal-content">
              <ul className="recurrence-limits-list">
                <li>
                  <strong>📆 Denně:</strong> max 365 dní (1 rok)
                </li>
                <li>
                  <strong>🗓️ Týdně:</strong> max 104 týdnů (2 roky)
                </li>
                <li>
                  <strong>📋 Každé 2 týdny:</strong> max 52× (2 roky)
                </li>
                <li>
                  <strong>📅 Měsíčně:</strong> max 48 měsíců (4 roky)
                </li>
                <li>
                  <strong>🎂 Ročně:</strong> max 4 roky
                </li>
                <li>
                  <strong>⚙️ Vlastní:</strong> max 104 týdnů (2 roky)
                </li>
              </ul>
              <p className="recurrence-info-note">
                Tyto limity zajišťují optimální výkon aplikace.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Pomocná funkce pro popis opakování
function getRecurrenceDescription(
  pattern: RecurringPattern,
  startDate: Date
): string {
  const dayNames = [
    'neděli',
    'pondělí',
    'úterý',
    'středu',
    'čtvrtek',
    'pátek',
    'sobotu',
  ];

  let desc = '';

  switch (pattern.frequency) {
    case 'daily':
      desc = 'Každý den';
      break;
    case 'weekly':
      desc = `Každý týden v ${dayNames[startDate.getDay()]}`;
      break;
    case 'biweekly':
      desc = `Každé 2 týdny v ${dayNames[startDate.getDay()]}`;
      break;
    case 'monthly':
      desc = `Každý měsíc ${startDate.getDate()}. dne`;
      break;
    case 'yearly':
      desc = `Každý rok ${startDate.getDate()}. ${startDate.toLocaleString(
        'cs',
        { month: 'long' }
      )}`;
      break;
    case 'custom':
      if (pattern.daysOfWeek && pattern.daysOfWeek.length > 0) {
        const days = pattern.daysOfWeek.map((d) => dayNames[d]).join(', ');
        desc = `Každý týden: ${days}`;
      } else {
        desc = 'Vlastní opakování';
      }
      break;
    default:
      desc = 'Opakování';
  }

  // Konec
  if (pattern.endType === 'date' && pattern.endDate) {
    const endDate = new Date(pattern.endDate);
    desc += ` (do ${endDate.toLocaleDateString('cs')})`;
  } else if (pattern.endType === 'count' && pattern.endCount) {
    desc += ` (${pattern.endCount}×)`;
  }

  return desc;
}

export default RecurrenceSelector;
