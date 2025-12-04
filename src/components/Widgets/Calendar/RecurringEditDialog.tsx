//src/components/Widgets/Calendar/RecurringEditDialog.tsx
import React from 'react';
import './styles/RecurringEditDialog.css';

export type RecurringEditAction = 'this' | 'future' | 'all' | 'cancel';

interface RecurringEditDialogProps {
  isOpen: boolean;
  mode: 'edit' | 'delete';
  eventTitle: string;
  instanceDate: string;
  onSelect: (action: RecurringEditAction) => void;
}

const RecurringEditDialog: React.FC<RecurringEditDialogProps> = ({
  isOpen,
  mode,
  eventTitle,
  instanceDate,
  onSelect,
}) => {
  if (!isOpen) return null;

  const formattedDate = new Date(instanceDate + 'T00:00:00').toLocaleDateString('cs-CZ', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  const isDelete = mode === 'delete';
  const actionVerb = isDelete ? 'Smazat' : 'Upravit';
  const icon = isDelete ? '🗑️' : '✏️';

  return (
    <div className="recurring-dialog-overlay" onClick={() => onSelect('cancel')}>
      <div className="recurring-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="recurring-dialog-header">
          <span className="recurring-dialog-icon">{icon}</span>
          <h3>{actionVerb} opakovanou událost</h3>
        </div>

        <div className="recurring-dialog-content">
          <p className="recurring-dialog-event-name">„{eventTitle}"</p>
          <p className="recurring-dialog-date">📅 {formattedDate}</p>
          <p className="recurring-dialog-question">
            Toto je opakovaná událost. Co chcete {isDelete ? 'smazat' : 'upravit'}?
          </p>
        </div>

        <div className="recurring-dialog-options">
          <button
            className="recurring-dialog-btn option-this"
            onClick={() => onSelect('this')}
          >
            <span className="btn-icon">1️⃣</span>
            <span className="btn-text">
              <strong>Jen tento výskyt</strong>
              <small>Ostatní zůstanou beze změny</small>
            </span>
          </button>

          <button
            className="recurring-dialog-btn option-future"
            onClick={() => onSelect('future')}
          >
            <span className="btn-icon">➡️</span>
            <span className="btn-text">
              <strong>Tento a všechny budoucí</strong>
              <small>Minulé zůstanou beze změny</small>
            </span>
          </button>

          <button
            className="recurring-dialog-btn option-all"
            onClick={() => onSelect('all')}
          >
            <span className="btn-icon">🔄</span>
            <span className="btn-text">
              <strong>Všechny výskyty</strong>
              <small>Změní se celá série</small>
            </span>
          </button>
        </div>

        <div className="recurring-dialog-footer">
          <button
            className="recurring-dialog-cancel"
            onClick={() => onSelect('cancel')}
          >
            Zrušit
          </button>
        </div>
      </div>
    </div>
  );
};

export default RecurringEditDialog;