// src/components/Widgets/StickyNotes/StickyNotesWidget.tsx
import React, { useState, useEffect, useMemo } from 'react';
import './StickyNotes.css';
import { stickyNotesService } from '../../../services/stickyNotesService';
import type { StickyNote } from '../../../services/stickyNotesService';
import { firestoreService } from '../../../services/firestoreService';
import { useAuth } from '../../../contexts/AuthContext';
import type { FamilyMember } from '../../../types/index';

interface StickyNotesWidgetProps {
  selectedMember: string | null;
}

const FALLBACK_COLORS = ['#ffeaa7', '#74b9ff', '#a29bfe', '#fd79a8', '#fdcb6e'];

const getRandomColor = () =>
  FALLBACK_COLORS[Math.floor(Math.random() * FALLBACK_COLORS.length)];

// Dynamická velikost písma podle délky textu — krátký vzkaz je velký, dlouhý se zmenší
const getFontSize = (len: number): string => {
  if (len <= 30) return '1.6rem';
  if (len <= 60) return '1.3rem';
  if (len <= 100) return '1.1rem';
  if (len <= 150) return '0.95rem';
  return '0.85rem';
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

const StickyNotesWidget: React.FC<StickyNotesWidgetProps> = ({
  selectedMember,
}) => {
  const { currentUser } = useAuth();

  const [notes, setNotes] = useState<StickyNote[]>([]);
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newNoteContent, setNewNoteContent] = useState('');
  const [selectedAuthorId, setSelectedAuthorId] = useState<string | null>(null);

  // ─── Real-time vzkazy z Firestore ───
  useEffect(() => {
    const unsub = stickyNotesService.subscribeToNotes(setNotes);
    return () => unsub();
  }, []);

  // ─── Rodinní členové (pro výběr autora) ───
  useEffect(() => {
    let unsub: (() => void) | undefined;
    firestoreService
      .subscribeToFamilyMembers((m) => setMembers(m))
      .then((fn) => {
        unsub = fn;
      })
      .catch((e) => console.error('[StickyNotes] members error:', e));
    return () => unsub?.();
  }, []);

  // ─── Jednorázová migrace starých vzkazů z localStorage do Firestore ───
  useEffect(() => {
    if (localStorage.getItem('sticky-notes-migrated')) return;

    const saved = localStorage.getItem('sticky-notes');
    if (!saved) {
      localStorage.setItem('sticky-notes-migrated', 'true');
      return;
    }

    try {
      const local: StickyNote[] = JSON.parse(saved);
      // Přeskoč mock vzkazy (id '1','2','3'); reálné mají timestamp-id (>3 znaky)
      const real = local.filter((n) => n.id && n.id.length > 3);
      if (real.length === 0) {
        localStorage.setItem('sticky-notes-migrated', 'true');
        return;
      }
      Promise.all(
        real.map((n) =>
          stickyNotesService.addNote({
            author: n.author,
            authorEmoji: n.authorEmoji,
            content: n.content,
            timestamp: n.timestamp || Date.now(),
            color: n.color || getRandomColor(),
          })
        )
      )
        .then(() => {
          localStorage.setItem('sticky-notes-migrated', 'true');
          console.log(`[StickyNotes] Migrováno ${real.length} vzkazů do cloudu`);
        })
        .catch((e) => console.error('[StickyNotes] migrace selhala:', e));
    } catch {
      localStorage.setItem('sticky-notes-migrated', 'true');
    }
  }, []);

  // ─── Výchozí autor: přihlášený uživatel → vybraný člen → první člen ───
  const defaultAuthor = useMemo<FamilyMember | null>(() => {
    if (members.length === 0) return null;
    const byAuth = members.find((m) => m.authUid === currentUser?.uid);
    if (byAuth) return byAuth;
    const bySelected = members.find((m) => m.name === selectedMember);
    if (bySelected) return bySelected;
    return members[0];
  }, [members, currentUser, selectedMember]);

  // Nastav výchozího autora, jakmile známe členy
  useEffect(() => {
    if (selectedAuthorId === null && defaultAuthor) {
      setSelectedAuthorId(defaultAuthor.id);
    }
  }, [defaultAuthor, selectedAuthorId]);

  const handleAddNote = async () => {
    if (!newNoteContent.trim()) return;

    const author =
      members.find((m) => m.id === selectedAuthorId) || defaultAuthor;

    try {
      await stickyNotesService.addNote({
        author: author?.name || 'Anonym',
        authorEmoji: author?.emoji || '🙂',
        content: newNoteContent.trim(),
        timestamp: Date.now(),
        color: author?.color || getRandomColor(),
      });
      setNewNoteContent('');
      setIsAdding(false);
    } catch (e) {
      console.error('[StickyNotes] přidání selhalo:', e);
    }
  };

  const handleDeleteNote = async (id: string) => {
    try {
      await stickyNotesService.deleteNote(id);
    } catch (e) {
      console.error('[StickyNotes] smazání selhalo:', e);
    }
  };

  const filteredNotes = selectedMember
    ? notes.filter((note) => note.author === selectedMember)
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
          {members.length > 0 && (
            <div className="note-author-picker">
              {members.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  className={`author-chip ${
                    selectedAuthorId === m.id ? 'author-chip--active' : ''
                  }`}
                  style={
                    selectedAuthorId === m.id
                      ? { backgroundColor: m.color, borderColor: m.color }
                      : undefined
                  }
                  onClick={() => setSelectedAuthorId(m.id)}
                  title={m.name}
                >
                  <span className="author-chip-emoji">{m.emoji}</span>
                  <span className="author-chip-name">{m.name}</span>
                </button>
              ))}
            </div>
          )}

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
            <button
              className="note-cancel-btn"
              onClick={() => {
                setIsAdding(false);
                setNewNoteContent('');
              }}
            >
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
              <div
                className="note-content"
                style={{ fontSize: getFontSize(note.content.length) }}
              >
                {note.content}
              </div>
              <div className="note-footer">
                <span className="note-timestamp">
                  {getRelativeTime(note.timestamp)}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default StickyNotesWidget;
