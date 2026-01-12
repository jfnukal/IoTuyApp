// src/components/Widgets/HandwritingNotes/HandwritingWidget.tsx
import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom'; // Import pro Portal
import CanvasDrawing from './CanvasDrawing';
import { ocrService } from './ocrService';
import { notesStorage } from './notesStorage';
import type { HandwritingNote } from './types';
import type { FamilyMember } from '../../../types';

interface HandwritingWidgetProps {
  userId: string;
  familyMembers?: FamilyMember[];
}

// Komponenta pro Modal využívající Portal
const ModalPortal: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Vytvoříme element na body, pokud neexistuje, nebo použijeme body přímo
  return ReactDOM.createPortal(
    <div className="drawing-modal-overlay">{children}</div>,
    document.body // Rendrujeme přímo do BODY
  );
};

const HandwritingWidget: React.FC<HandwritingWidgetProps> = ({
  userId,
  familyMembers: _familyMembers = [],
}) => {
  const [isDrawing, setIsDrawing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [notes, setNotes] = useState<HandwritingNote[]>([]);
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  useEffect(() => {
    loadNotes();
  }, [userId]);
  const loadNotes = async () => {
    /* původní kód */
    try {
      const loadedNotes = await notesStorage.getNotes(userId);
      setNotes(loadedNotes);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveDrawing = async (imageData: string) => {
    setIsDrawing(false);
    setIsProcessing(true);
    try {
      const result = await ocrService.recognizeAndCategorize(imageData);
      await notesStorage.createNote({
        userId,
        type: result.type,
        originalImage: imageData,
        recognizedText: result.text,
        isArchived: false,
      });
      await loadNotes();
    } catch (error) {
      console.error(error);
      alert('Chyba při zpracování.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Začít editaci
  const startEdit = (note: HandwritingNote) => {
    setEditingNote(note.id);
    setEditText(note.editedText || note.recognizedText);
  };
  const saveEdit = async (noteId: string) => {
    await notesStorage.updateNoteText(noteId, editText);
    await loadNotes();
    setEditingNote(null);
  };
  const toggleType = async (note: HandwritingNote) => {
    await notesStorage.updateNoteType(
      note.id,
      note.type === 'note' ? 'shopping' : 'note'
    );
    await loadNotes();
  };
  const archiveNote = async (noteId: string) => {
    await notesStorage.archiveNote(noteId);
    await loadNotes();
  };
  const deleteNote = async (noteId: string) => {
    if (confirm('Smazat?')) {
      await notesStorage.deleteNote(noteId);
      await loadNotes();
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
            ➕ Nová
          </button>
        )}
      </div>

      {/* MODAL PŘES PORTAL - Tím vyřešíme překrývání widgetů */}
      {isDrawing && (
        <ModalPortal>
          <CanvasDrawing
            onSave={handleSaveDrawing}
            onCancel={() => setIsDrawing(false)}
          />
        </ModalPortal>
      )}

{/* Loading overlay přes Portal se stabilním kolečkem */}
{isProcessing && (
  <ModalPortal>
    <div className="processing-content">
      <div className="spinner-mini"></div>
      <p>Rozpoznávám text...</p>
    </div>
  </ModalPortal>
)}

      <div className="notes-list">
        {/* ... (Zbytek renderování seznamu poznámek zůstává stejný) ... */}
        {notes.length === 0 ? (
          <div className="empty-state">
            <p>📝 Zatím žádné poznámky</p>
          </div>
        ) : (
          notes.map((note) => (
            <div key={note.id} className={`note-card ${note.type}`}>
              {/* ... Obsah karty poznámky (beze změny) ... */}
              <div className="note-header">
                <span className="note-type-icon">
                  {note.type === 'shopping' ? '🛒' : '📝'}
                </span>
                <span className="note-date">
                  {new Date(note.createdAt).toLocaleDateString('cs-CZ')}
                </span>
                <div className="note-actions">
                  <button onClick={() => toggleType(note)}>🔄</button>
                  <button onClick={() => archiveNote(note.id)}>📦</button>
                  <button onClick={() => deleteNote(note.id)}>🗑️</button>
                </div>
              </div>
              <div className="note-content">
                {editingNote === note.id ? (
                  <div className="note-edit">
                    <textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      rows={3}
                    />
                    <div className="edit-actions">
                      <button onClick={() => saveEdit(note.id)}>✅</button>
                      <button onClick={() => setEditingNote(null)}>❌</button>
                    </div>
                  </div>
                ) : (
                  <div className="note-text" onClick={() => startEdit(note)}>
                    {note.editedText || note.recognizedText || '...'}
                  </div>
                )}
              </div>
              <div className="note-original">
                <img src={note.originalImage} alt="Originál" loading="lazy" />
              </div>
            </div>
          ))
        )}
      </div>

      <style>{`
        /* Opravené styly widgetu pro lepší viditelnost */
        .handwriting-widget {
          /* VÍCE KRYCÍ POZADÍ */
          background: rgba(20, 20, 30, 0.85); 
          backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 16px;
          padding: 20px;
          color: white;
          box-shadow: 0 4px 24px rgba(0,0,0,0.2);
          display: flex;
          flex-direction: column;
          max-height: 600px; /* Omezení výšky, aby nerostl do nekonečna */
        }

        .notes-list {
          overflow-y: auto; /* Scrollování uvnitř widgetu */
          padding-right: 5px; /* Místo pro scrollbar */
        }

        /* Scrollbar styling */
        .notes-list::-webkit-scrollbar { width: 6px; }
        .notes-list::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 3px; }

        /* PORTAL STYLES (mimo widget, globálně na body) */
        .drawing-modal-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0, 0, 0, 0.85); /* Tmavší overlay */
          backdrop-filter: blur(5px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 99999; /* Extrémně vysoký index */
          animation: fadeIn 0.2s ease-out;
        }

        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

        .processing-content {
          text-align: center;
          color: white;
        }

        /* Responzivita poznámek */
        .notes-list {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
          gap: 12px;
        }

        .note-card {
          background: #fcfcfc;
          border-radius: 10px;
          padding: 12px;
          color: #333;
        }
        
        .note-text {
            font-size: 0.95rem;
            color: #444;
        }

        .btn-new-note {
            background: #667eea;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 6px;
            cursor: pointer;
            font-weight: bold;
        }
      `}</style>
    </div>
  );
};

export default HandwritingWidget;
