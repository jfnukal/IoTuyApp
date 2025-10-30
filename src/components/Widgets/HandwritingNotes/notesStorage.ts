// src/components/Widgets/HandwritingNotes/notesStorage.ts
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  query,
  where,
  orderBy,
  Timestamp as _Timestamp,
} from 'firebase/firestore';
import { db } from '../../../config/firebase';
import type { HandwritingNote } from './types';

class NotesStorage {
  private readonly COLLECTION = 'handwritingNotes';

  /**
   * Vytvoří novou poznámku
   */
  async createNote(
    note: Omit<HandwritingNote, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<string> {
    try {
      const now = Date.now();
      const docRef = await addDoc(collection(db, this.COLLECTION), {
        ...note,
        createdAt: now,
        updatedAt: now,
      });

      return docRef.id;
    } catch (error) {
      console.error('❌ Chyba při vytváření poznámky:', error);
      throw error;
    }
  }

  /**
   * Načte všechny poznámky pro daného uživatele
   */
  async getNotes(
    userId: string,
    includeArchived: boolean = false
  ): Promise<HandwritingNote[]> {
    try {
      const constraints = [
        where('userId', '==', userId),
        orderBy('createdAt', 'desc'),
      ];

      if (!includeArchived) {
        constraints.push(where('isArchived', '==', false));
      }

      const q = query(collection(db, this.COLLECTION), ...constraints);
      const snapshot = await getDocs(q);

      const notes: HandwritingNote[] = snapshot.docs.map(
        (doc) =>
          ({
            id: doc.id,
            ...doc.data(),
          } as HandwritingNote)
      );

      return notes;
    } catch (error) {
      console.error('❌ Chyba při načítání poznámek:', error);
      throw error;
    }
  }

  /**
   * Načte poznámky podle typu
   */
  async getNotesByType(
    userId: string,
    type: 'note' | 'shopping'
  ): Promise<HandwritingNote[]> {
    try {
      const q = query(
        collection(db, this.COLLECTION),
        where('userId', '==', userId),
        where('type', '==', type),
        where('isArchived', '==', false),
        orderBy('createdAt', 'desc')
      );

      const snapshot = await getDocs(q);
      const notes: HandwritingNote[] = snapshot.docs.map(
        (doc) =>
          ({
            id: doc.id,
            ...doc.data(),
          } as HandwritingNote)
      );

      return notes;
    } catch (error) {
      console.error('❌ Chyba při načítání poznámek podle typu:', error);
      throw error;
    }
  }

  /**
   * Aktualizuje text poznámky
   */
  async updateNoteText(noteId: string, editedText: string): Promise<void> {
    try {
      const noteRef = doc(db, this.COLLECTION, noteId);
      await updateDoc(noteRef, {
        editedText,
        updatedAt: Date.now(),
      });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Změní typ poznámky (poznámka ↔ nákup)
   */
  async updateNoteType(
    noteId: string,
    type: 'note' | 'shopping'
  ): Promise<void> {
    try {
      const noteRef = doc(db, this.COLLECTION, noteId);
      await updateDoc(noteRef, {
        type,
        updatedAt: Date.now(),
      });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Archivuje poznámku
   */
  async archiveNote(noteId: string): Promise<void> {
    try {
      const noteRef = doc(db, this.COLLECTION, noteId);
      await updateDoc(noteRef, {
        isArchived: true,
        updatedAt: Date.now(),
      });
    } catch (error) {
      console.error('❌ Chyba při archivaci:', error);
      throw error;
    }
  }

  /**
   * Obnoví poznámku z archivu
   */
  async unarchiveNote(noteId: string): Promise<void> {
    try {
      const noteRef = doc(db, this.COLLECTION, noteId);
      await updateDoc(noteRef, {
        isArchived: false,
        updatedAt: Date.now(),
      });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Smaže poznámku natrvalo
   */
  async deleteNote(noteId: string): Promise<void> {
    try {
      const noteRef = doc(db, this.COLLECTION, noteId);
      await deleteDoc(noteRef);
    } catch (error) {
      throw error;
    }
  }
}

export const notesStorage = new NotesStorage();
