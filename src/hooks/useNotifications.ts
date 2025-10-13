// src/hooks/useNotifications.ts

import { useState, useEffect, useCallback } from 'react';
import { webPushService } from '../services/webPushService';
import { familyMessagingService } from '../services/familyMessagingService';
import type { FamilyMessage } from '../types/notifications';
import { firestoreService } from '../services/firestoreService';

export const useNotifications = (userId: string | null) => {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSupported, setIsSupported] = useState(false);
  const [messages, setMessages] = useState<FamilyMessage[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Inicializace
  useEffect(() => {
    const supported = webPushService.isSupported();
    setIsSupported(supported);
    
    if (supported) {
      setPermission(webPushService.getPermission());
    }
  }, []);

  // Sledování zpráv
  useEffect(() => {
    if (!userId) {
      console.log('❌ useNotifications: No userId');
      return;
    }

    console.log('✅ useNotifications: Subscribing with userId:', userId);

    const unsubscribe = familyMessagingService.subscribeToMessages(
      userId,
      (newMessages) => {
        console.log('📨 useNotifications: Received messages:', newMessages);
        setMessages(newMessages);
        
        // Spočítej nepřečtené
        const unread = newMessages.filter(
          msg => !msg.readBy.includes(userId)
        ).length;
        setUnreadCount(unread);

        // Zobraz notifikaci pro nové zprávy
        newMessages.forEach(msg => {
          if (!msg.readBy.includes(userId) && msg.senderId !== userId) {
            webPushService.showFamilyMessage(
              msg.senderName,
              msg.message,
              msg.urgent
            );
          }
        });
      }
    );

    return () => unsubscribe();
  }, [userId]);

  // Požádat o povolení
// TOTO JE SPRÁVNÁ VERZE
const requestPermission = useCallback(async () => {
  // 1. Zkontrolujeme, jestli máme userId
  if (!userId) {
    console.error("Nemohu požádat o povolení bez ID uživatele.");
    return false;
  }

  const granted = await webPushService.requestPermission();
  if (granted) {
    // 2. Zaregistrujeme service worker
    await webPushService.registerServiceWorker();
    setPermission('granted');

    console.log('Povolení uděleno, pokouším se získat FCM token...');
    
    // 3. ZÍSKÁME TOKEN (tento krok chyběl)
    const token = await webPushService.getFCMToken();
    
    // 4. Pokud máme token, uložíme ho
    if (token) {
      await firestoreService.saveFCMToken(userId, token);
    }

  } else {
    setPermission('denied');
  }
  return granted;
}, [userId]); // 5. Přidáme userId do závislostí

  // Poslat zprávu
  const sendMessage = useCallback(async (
    senderName: string,
    recipients: string[],
    message: string,
    template?: string,
    urgent: boolean = false
  ) => {
    if (!userId) throw new Error('User not authenticated');

    // Expanduj skupiny na jednotlivé členy
    const expandedRecipients = familyMessagingService.expandRecipients(recipients);

    const messageId = await familyMessagingService.sendMessage(
      userId,
      senderName,
      expandedRecipients,
      message,
      template as any,
      urgent
    );

    return messageId;
  }, [userId]);

  // Označit jako přečtené
  const markAsRead = useCallback(async (messageId: string) => {
    if (!userId) return;
    await familyMessagingService.markAsRead(messageId, userId);
  }, [userId]);

  // Smazat zprávu
  const deleteMessage = useCallback(async (messageId: string) => {
    try {
      await familyMessagingService.deleteMessage(messageId);
    } catch (error) {
      console.error('Error deleting message:', error);
      throw error;
    }
  }, []);

  // Smazat všechny přečtené
  const deleteReadMessages = useCallback(async () => {
    if (!userId) return 0;
    try {
      return await familyMessagingService.deleteReadMessages(userId);
    } catch (error) {
      console.error('Error deleting read messages:', error);
      throw error;
    }
  }, [userId]);

  return {
    permission,
    isSupported,
    messages,
    unreadCount,
    requestPermission,
    sendMessage,
    markAsRead,
    deleteMessage,
    deleteReadMessages,
  };
};