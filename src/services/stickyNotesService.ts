// src/services/stickyNotesService.ts
// Firestore služba pro rodinné vzkazy (sticky notes) — sdílené napříč zařízeními

import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  onSnapshot,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from '../config/firebase';

export interface StickyNote {
  id: string;
  author: string;
  authorEmoji: string;
  content: string;
  timestamp: number;
  color?: string;
}

const COLLECTION = 'stickyNotes';

class StickyNotesService {
  /** Real-time listener — vrátí všechny vzkazy seřazené od nejnovějších */
  subscribeToNotes(callback: (notes: StickyNote[]) => void): Unsubscribe {
    const q = query(collection(db, COLLECTION), orderBy('timestamp', 'desc'));
    return onSnapshot(
      q,
      (snapshot) => {
        const notes = snapshot.docs.map(
          (d) => ({ id: d.id, ...d.data() } as StickyNote)
        );
        callback(notes);
      },
      (error) => {
        console.error('[StickyNotes] subscribe error:', error);
      }
    );
  }

  /** Přidá vzkaz do Firestore */
  async addNote(note: Omit<StickyNote, 'id'>): Promise<string> {
    const ref = await addDoc(collection(db, COLLECTION), note);
    return ref.id;
  }

  /** Smaže vzkaz */
  async deleteNote(id: string): Promise<void> {
    await deleteDoc(doc(db, COLLECTION, id));
  }
}

export const stickyNotesService = new StickyNotesService();
