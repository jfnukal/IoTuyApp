// src/components/Widgets/StickyNotes/StickyNotesWidget.tsx
import React, { useState, useEffect } from 'react';
import './StickyNotes.css';


interface StickyNote {
  id: string;
  author: string;
  authorEmoji: string;
  content: string;
  timestamp: number;
  color?: string;
}

interface StickyNotesWidgetProps {
  selectedMember: string | null;
}

// Mock data - později nahradíme Firebase
const MOCK_NOTES: StickyNote[] = [
  {
    id: '1',
    author: 'Máma',
    authorEmoji: '👩',
    content: 'Nezapomeňte vyvenčit psa! 🐕',
    timestamp: Date.now() - 3600000,
    color: '#ffeaa7',
  },
  {
    id: '2',
    author: 'Táta',
    authorEmoji: '👨',
    content: 'Večer pizza party! 🍕',
    timestamp: Date.now() - 7200000,
    color: '#74b9ff',
  },
  {
    id: '3',
    author: 'Jareček',
    authorEmoji: '👦',
    content: 'Chci zmrzlinu! 🍦',
    timestamp: Date.now() - 1800000,
    color: '#a29bfe',
  },
];

const StickyNotesWidget: React.FC<StickyNotesWidgetProps> = ({ selectedMember }) => {
  // Načíst poznámky z localStorage při načtení komponenty
  const [notes, setNotes] = useState<StickyNote[]>(() => {
    const saved = localStorage.getItem('sticky-notes');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return MOCK_NOTES;
      }
    }
    return MOCK_NOTES;
  });
  
  const [isAdding, setIsAdding] = useState(false);
  const [newNoteContent, setNewNoteContent] = useState('');

  // Uložit poznámky do localStorage při každé změně
  useEffect(() => {
    localStorage.setItem('sticky-notes', JSON.stringify(notes));
  }, [notes]);

  const handleAddNote = () => {
    if (newNoteContent.trim()) {
      const newNote: StickyNote = {
        id: Date.now().toString(),
        author: 'Táta', // Později z auth
        authorEmoji: '👨',
        content: newNoteContent,
        timestamp: Date.now(),
        color: getRandomColor(),
      };
      setNotes([newNote, ...notes]);
      setNewNoteContent('');
      setIsAdding(false);
    }
  };

  const handleDeleteNote = (id: string) => {
    setNotes(notes.filter(note => note.id !== id));
  };

  const getRandomColor = () => {
    const colors = ['#ffeaa7', '#74b9ff', '#a29bfe', '#fd79a8', '#fdcb6e'];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  const getRelativeTime = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (days > 0) return `před ${days}d`;
    if (hours > 0) return `před ${hours}h`;
    if (minutes > 0) return `před ${minutes}m`;
    return 'právě teď';
  };

  const filteredNotes = selectedMember
    ? notes.filter(note => note.author === selectedMember)
    : notes;

  return (
    <div className="sticky-notes-widget">
      <div className="sticky-notes-header">
        <div className="sticky-notes-title">
          <span className="sticky-notes-icon">📝</span>
          <span>Rodinné vzkazy</span>
        </div>
        <button
          className="add-note-icon-btn"
          onClick={() => setIsAdding(!isAdding)}
          title="Přidat vzkaz"
        >
          {isAdding ? '✕' : '➕'}
        </button>
      </div>

      {isAdding && (
        <div className="add-note-form">
          <textarea
            className="note-textarea"
            placeholder="Napiš něco rodině..."
            value={newNoteContent}
            onChange={(e) => setNewNoteContent(e.target.value)}
            autoFocus
            maxLength={200}
          />
          <div className="note-form-actions">
            <button className="note-save-btn" onClick={handleAddNote}>
              Přidat
            </button>
            <button className="note-cancel-btn" onClick={() => {
              setIsAdding(false);
              setNewNoteContent('');
            }}>
              Zrušit
            </button>
          </div>
        </div>
      )}

      <div className="sticky-notes-container">
        {filteredNotes.length === 0 ? (
          <div className="no-notes-placeholder">
            <div className="no-notes-icon">📭</div>
            <p>Zatím žádné vzkazy</p>
            <button
              className="add-first-note-btn"
              onClick={() => setIsAdding(true)}
            >
              Přidat první vzkaz
            </button>
          </div>
        ) : (
          filteredNotes.map((note, index) => (
            <div
              key={note.id}
              className={`sticky-note sticky-note-${index % 3}`}
              style={{ backgroundColor: note.color }}
            >
              <div className="note-header">
                <div className="note-author">
                  <span className="note-author-emoji">{note.authorEmoji}</span>
                  <span className="note-author-name">{note.author}</span>
                </div>
                <button
                  className="note-delete-btn"
                  onClick={() => handleDeleteNote(note.id)}
                  title="Smazat vzkaz"
                >
                  ✕
                </button>
              </div>
              <div className="note-content">{note.content}</div>
              <div className="note-footer">
                <span className="note-timestamp">{getRelativeTime(note.timestamp)}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default StickyNotesWidget;