// src/services/familyMessagingService.ts

import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  updateDoc,
  doc,
  onSnapshot,
  writeBatch,
  deleteDoc,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type {
  FamilyMessage,
  MessageTemplate,
  FamilyGroup,
} from '../types/notifications';

// Přednastavené skupiny
export const FAMILY_GROUPS: FamilyGroup[] = [
  {
    id: 'all',
    name: 'Celá rodina',
    members: ['dad', 'mom', 'jarecek', 'johanka'],
    icon: '👨‍👩‍👧‍👦',
    color: '#667eea',
  },
  {
    id: 'parents',
    name: 'Rodiče',
    members: ['dad', 'mom'],
    icon: '👫',
    color: '#ff6b6b',
  },
  {
    id: 'children',
    name: 'Děti',
    members: ['jarecek', 'johanka'],
    icon: '👦👧',
    color: '#96ceb4',
  },
];

// Šablony zpráv
export const MESSAGE_TEMPLATES: Record<MessageTemplate, string> = {
  shopping: 'Jedu do obchodu, zavolejte jestli něco chcete',
  call_down: 'Potřebuju vás dolů',
  dinner_ready: 'Oběd/Večeře je hotová',
  leaving_soon: 'Za chvíli odjíždím',
  custom: '', // Vlastní zpráva
};

class FamilyMessagingService {
  // Poslat zprávu
  async sendMessage(
    senderId: string,
    senderName: string,
    recipients: string[],
    message: string,
    template?: MessageTemplate,
    urgent: boolean = false
  ): Promise<string> {
    try {
      const messagesRef = collection(db, 'familyMessages');

      const newMessage: Omit<FamilyMessage, 'id'> = {
        senderId,
        senderName,
        recipients,
        message,
        ...(template && { template }),
        urgent,
        timestamp: Date.now(),
        readBy: [senderId], // Odesílatel už to četl
        delivered: true,
      };

      const docRef = await addDoc(messagesRef, newMessage);
      return docRef.id;
    } catch (error) {
      throw new Error('Nepodařilo se poslat zprávu');
    }
  }

  // Označit zprávu jako přečtenou
  async markAsRead(messageId: string, userId: string): Promise<void> {
    try {
      const messageRef = doc(db, 'familyMessages', messageId);
      const messageDoc = await getDocs(
        query(
          collection(db, 'familyMessages'),
          where('__name__', '==', messageId)
        )
      );

      if (!messageDoc.empty) {
        const data = messageDoc.docs[0].data() as FamilyMessage;
        const readBy = [...data.readBy];

        if (!readBy.includes(userId)) {
          readBy.push(userId);
          await updateDoc(messageRef, { readBy });
        }
      }
    } catch (error) {
      console.error('Error marking message as read:', error);
    }
  }

  // Smazat jednu zprávu
  async deleteMessage(messageId: string): Promise<void> {
    try {
      const messageRef = doc(db, 'familyMessages', messageId);
      await deleteDoc(messageRef);
    } catch (error) {
      console.error('Error deleting message:', error);
      throw new Error('Nepodařilo se smazat zprávu');
    }
  }

  // Smazat všechny přečtené zprávy pro uživatele
  async deleteReadMessages(userId: string): Promise<number> {
    try {
      const messagesRef = collection(db, 'familyMessages');
      const q = query(
        messagesRef,
        where('recipients', 'array-contains', userId),
        limit(100)
      );

      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        return 0;
      }

      // Filtruj přečtené zprávy
      const readMessages = snapshot.docs.filter((doc) => {
        const data = doc.data() as FamilyMessage;
        return data.readBy.includes(userId);
      });

      if (readMessages.length === 0) {
        return 0;
      }

      // Smazat v batch
      const batch = writeBatch(db);
      readMessages.forEach((doc) => {
        batch.delete(doc.ref);
      });

      await batch.commit();
      return readMessages.length;
    } catch (error) {
      console.error('Error deleting read messages:', error);
      throw new Error('Nepodařilo se smazat zprávy');
    }
  }

  // Získat zprávy pro uživatele
  async getMessagesForUser(
    userId: string,
    limitCount: number = 50
  ): Promise<FamilyMessage[]> {
    try {
      const messagesRef = collection(db, 'familyMessages');
      const q = query(
        messagesRef,
        where('recipients', 'array-contains', userId),
        orderBy('timestamp', 'desc'),
        limit(limitCount)
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(
        (doc) =>
          ({
            id: doc.id,
            ...doc.data(),
          } as FamilyMessage)
      );
    } catch (error) {
      console.error('Error getting messages:', error);
      return [];
    }
  }

  // Real-time listener pro nové zprávy
  subscribeToMessages(
    userId: string,
    callback: (messages: FamilyMessage[]) => void
  ): Unsubscribe {
    const messagesRef = collection(db, 'familyMessages');
    const q = query(
      messagesRef,
      where('recipients', 'array-contains', userId),
      orderBy('timestamp', 'desc'),
      limit(50)
    );

    return onSnapshot(q, (snapshot) => {
      const messages = snapshot.docs.map(
        (doc) =>
          ({
            id: doc.id,
            ...doc.data(),
          } as FamilyMessage)
      );
      callback(messages);
    });
  }

  // Expandovat skupinu na jednotlivé členy
  expandRecipients(recipients: string[]): string[] {
    const expanded = new Set<string>();

    recipients.forEach((recipientId) => {
      const group = FAMILY_GROUPS.find((g) => g.id === recipientId);
      if (group) {
        // Je to skupina, přidej všechny členy
        group.members.forEach((member) => expanded.add(member));
      } else {
        // Je to jednotlivý člen
        expanded.add(recipientId);
      }
    });

    return Array.from(expanded);
  }

  // Získat skupinu podle ID
  getGroup(groupId: string): FamilyGroup | undefined {
    return FAMILY_GROUPS.find((g) => g.id === groupId);
  }

  // Získat všechny skupiny
  getAllGroups(): FamilyGroup[] {
    return FAMILY_GROUPS;
  }

  // Smazat staré zprávy (pro cleanup)
  async deleteOldMessages(daysOld: number = 7): Promise<number> {
    try {
      const messagesRef = collection(db, 'familyMessages');
      const cutoffDate = Date.now() - daysOld * 24 * 60 * 60 * 1000;

      const q = query(
        messagesRef,
        where('timestamp', '<', cutoffDate),
        limit(100) // Mazat po dávkách
      );

      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        return 0;
      }

      // Smazat v batch
      const batch = writeBatch(db);
      snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });

      await batch.commit();
      return snapshot.docs.length;
    } catch (error) {
      console.error('Error deleting old messages:', error);
      return 0;
    }
  }

  // Spustit cleanup job (volat pravidelně)
  async runCleanup(daysToKeep: number = 7): Promise<void> {
    let totalDeleted = 0;
    let batchDeleted = 0;

    do {
      batchDeleted = await this.deleteOldMessages(daysToKeep);
      totalDeleted += batchDeleted;
    } while (batchDeleted > 0);
  }
}

export const familyMessagingService = new FamilyMessagingService();
