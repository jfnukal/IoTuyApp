// src/components/Widgets/HandwritingNotes/HandwritingWidget.tsx
import React, { useState, useEffect } from 'react';
import CanvasDrawing from './CanvasDrawing';
import { ocrService } from './ocrService';
import { notesStorage } from './notesStorage';
import type { HandwritingNote } from './types';
import type { FamilyMember } from '../../../types';

interface HandwritingWidgetProps {
  userId: string;
  familyMembers?: FamilyMember[];
}

const HandwritingWidget: React.FC<HandwritingWidgetProps> = ({
  userId,
  familyMembers: _familyMembers = [],
}) => {
  const [isDrawing, setIsDrawing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [notes, setNotes] = useState<HandwritingNote[]>([]);
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  // Načtení poznámek
  useEffect(() => {
    loadNotes();
  }, [userId]);

  const loadNotes = async () => {
    try {
      const loadedNotes = await notesStorage.getNotes(userId);
      setNotes(loadedNotes);
    } catch (error) {
      console.error('Chyba při načítání poznámek:', error);
    }
  };

  // Zpracování nakresleného obrázku
  const handleSaveDrawing = async (imageData: string) => {
    setIsDrawing(false);
    setIsProcessing(true);

    try {
      
      // Rozpoznání textu a kategorizace
      const result = await ocrService.recognizeAndCategorize(imageData);
      
      // Uložení do Firestore
      await notesStorage.createNote({
        userId,
        type: result.type,
        originalImage: imageData,
        recognizedText: result.text,
        isArchived: false,
      });

      // Refresh seznamu
      await loadNotes();

      alert(`✅ Poznámka rozpoznána!\n\nTyp: ${result.type === 'note' ? '📝 Poznámka' : '🛒 Nákupní seznam'}\nPřesnost: ${result.confidence}%\n\nText: ${result.text.substring(0, 100)}${result.text.length > 100 ? '...' : ''}`);

    } catch (error) {
      console.error('❌ Chyba při zpracování:', error);
      alert('Chyba při rozpoznávání textu. Zkus to znovu.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Začít editaci
  const startEdit = (note: HandwritingNote) => {
    setEditingNote(note.id);
    setEditText(note.editedText || note.recognizedText);
  };

  // Uložit editaci
  const saveEdit = async (noteId: string) => {
    try {
      await notesStorage.updateNoteText(noteId, editText);
      await loadNotes();
      setEditingNote(null);
    } catch (error) {
      console.error('Chyba při ukládání:', error);
    }
  };

  // Změnit typ
  const toggleType = async (note: HandwritingNote) => {
    try {
      const newType = note.type === 'note' ? 'shopping' : 'note';
      await notesStorage.updateNoteType(note.id, newType);
      await loadNotes();
    } catch (error) {
      console.error('Chyba při změně typu:', error);
    }
  };

  // Archivovat
  const archiveNote = async (noteId: string) => {
    try {
      await notesStorage.archiveNote(noteId);
      await loadNotes();
    } catch (error) {
      console.error('Chyba při archivaci:', error);
    }
  };

  // Smazat
  const deleteNote = async (noteId: string) => {
    if (!confirm('Opravdu smazat tuto poznámku?')) return;
    
    try {
      await notesStorage.deleteNote(noteId);
      await loadNotes();
    } catch (error) {
      console.error('Chyba při mazání:', error);
    }
  };

  return (
    <div className="handwriting-widget">
      <div className="widget-header">
        <h2>✍️ Ručně psané poznámky</h2>
        {!isDrawing && (
          <button 
            className="btn-new-note" 
            onClick={() => setIsDrawing(true)}
            disabled={isProcessing}
          >
            ➕ Nová poznámka
          </button>
        )}
      </div>

      {isDrawing && (
        <div className="drawing-modal">
          <CanvasDrawing
            onSave={handleSaveDrawing}
            onCancel={() => setIsDrawing(false)}
          />
        </div>
      )}

      {isProcessing && (
        <div className="processing-overlay">
          <div className="spinner">🔄</div>
          <p>Rozpoznávám text...</p>
        </div>
      )}

      <div className="notes-list">
        {notes.length === 0 ? (
          <div className="empty-state">
            <p>📝 Zatím žádné poznámky</p>
            <p className="hint">Klikni na "➕ Nová poznámka" a napiš něco perem!</p>
          </div>
        ) : (
          notes.map((note) => (
            <div key={note.id} className={`note-card ${note.type}`}>
              <div className="note-header">
                <span className="note-type-icon">
                  {note.type === 'shopping' ? '🛒' : '📝'}
                </span>
                <span className="note-date">
                  {new Date(note.createdAt).toLocaleDateString('cs-CZ')}
                </span>
                <div className="note-actions">
                  <button 
                    onClick={() => toggleType(note)}
                    title="Změnit typ"
                  >
                    🔄
                  </button>
                  <button 
                    onClick={() => archiveNote(note.id)}
                    title="Archivovat"
                  >
                    📦
                  </button>
                  <button 
                    onClick={() => deleteNote(note.id)}
                    title="Smazat"
                  >
                    🗑️
                  </button>
                </div>
              </div>

              <div className="note-content">
                {editingNote === note.id ? (
                  <div className="note-edit">
                    <textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      rows={5}
                    />
                    <div className="edit-actions">
                      <button onClick={() => saveEdit(note.id)}>✅ Uložit</button>
                      <button onClick={() => setEditingNote(null)}>❌ Zrušit</button>
                    </div>
                  </div>
                ) : (
                  <div className="note-text" onClick={() => startEdit(note)}>
                    {note.editedText || note.recognizedText || 'Klikni pro úpravu'}
                  </div>
                )}
              </div>

              <div className="note-original">
                <img src={note.originalImage} alt="Originál" />
              </div>
            </div>
          ))
        )}
      </div>

      <style>{`
        .handwriting-widget {
          background: rgba(255, 255, 255, 0.15);
          backdrop-filter: blur(10px);
          border-radius: 16px;
          padding: 20px;
          color: white;
        }

        .widget-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .widget-header h2 {
          margin: 0;
          font-size: 1.5rem;
        }

        .btn-new-note {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .btn-new-note:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
        }

        .btn-new-note:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .drawing-modal {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.8);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          padding: 20px;
        }

        .processing-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.9);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          z-index: 10000;
          color: white;
        }

        .spinner {
          font-size: 4rem;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .notes-list {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 16px;
          margin-top: 20px;
        }

        .empty-state {
          grid-column: 1 / -1;
          text-align: center;
          padding: 40px;
          opacity: 0.7;
        }

        .empty-state .hint {
          font-size: 0.9rem;
          margin-top: 10px;
        }

        .note-card {
          background: rgba(255, 255, 255, 0.9);
          color: #333;
          border-radius: 12px;
          padding: 16px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        .note-card.shopping {
          border-left: 4px solid #4CAF50;
        }

        .note-card.note {
          border-left: 4px solid #2196F3;
        }

        .note-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }

        .note-type-icon {
          font-size: 1.5rem;
        }

        .note-date {
          font-size: 0.85rem;
          opacity: 0.7;
        }

        .note-actions {
          display: flex;
          gap: 8px;
        }

        .note-actions button {
          background: none;
          border: none;
          font-size: 1.2rem;
          cursor: pointer;
          padding: 4px;
          opacity: 0.7;
          transition: all 0.2s;
        }

        .note-actions button:hover {
          opacity: 1;
          transform: scale(1.2);
        }

        .note-content {
          margin: 12px 0;
        }

        .note-text {
          background: #f5f5f5;
          padding: 12px;
          border-radius: 8px;
          min-height: 60px;
          cursor: pointer;
          line-height: 1.6;
          white-space: pre-wrap;
        }

        .note-text:hover {
          background: #e0e0e0;
        }

        .note-edit textarea {
          width: 100%;
          padding: 12px;
          border: 2px solid #667eea;
          border-radius: 8px;
          font-family: inherit;
          font-size: 1rem;
          resize: vertical;
        }

        .edit-actions {
          display: flex;
          gap: 8px;
          margin-top: 8px;
        }

        .edit-actions button {
          padding: 8px 16px;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 600;
        }

        .note-original {
          margin-top: 12px;
          padding-top: 12px;
          border-top: 1px solid #ddd;
        }

        .note-original img {
          width: 100%;
          border-radius: 8px;
          cursor: pointer;
        }

        @media (max-width: 768px) {
          .notes-list {
            grid-template-columns: 1fr;
          }

          .drawing-modal {
            padding: 10px;
          }
        }
      `}</style>
    </div>
  );
};

export default HandwritingWidget;