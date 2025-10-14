// src/hooks/useNotifications.ts

import { useState, useEffect, useCallback } from 'react';
import { familyMessagingService } from '../services/familyMessagingService';
import type { FamilyMessage } from '../types/notifications';
import { fcmService } from '../services/fcmService';

export const useNotifications = (userId: string | null) => {
  const [permission, setPermission] =
    useState<NotificationPermission>('default');
  const [isSupported, setIsSupported] = useState(false);
  const [messages, setMessages] = useState<FamilyMessage[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Inicializace - zkontroluj podporu notifikací
  useEffect(() => {
    const supported = 'Notification' in window && 'serviceWorker' in navigator;
    setIsSupported(supported);

    if (supported && Notification.permission) {
      setPermission(Notification.permission);
    }
  }, []);

  // FCM Inicializace
  useEffect(() => {
    if (!userId) return;

    const initFCM = async () => {
      try {
        console.log('🔔 Inicializuji FCM pro userId:', userId);

        // Získej FCM token (pokud už uživatel povolil notifikace)
        if (Notification.permission === 'granted') {
          const token = await fcmService.requestPermissionAndGetToken(userId);

          if (token) {
            console.log('✅ FCM úspěšně inicializován');

            // Naslouchej zprávám v popředí
            fcmService.listenForMessages((payload) => {
              console.log('📨 Nová zpráva z FCM:', payload);
            });
          }
        } else {
          console.log('ℹ️ Notifikace ještě nejsou povoleny');
        }
      } catch (error) {
        console.error('❌ Chyba při inicializaci FCM:', error);
      }
    };

    initFCM();
  }, [userId]);

  // Sledování zpráv z Firestore (real-time listener)
  useEffect(() => {
    if (!userId) {
      console.log('❌ useNotifications: No userId');
      return;
    }

    console.log('✅ useNotifications: Subscribing to messages for:', userId);

    const unsubscribe = familyMessagingService.subscribeToMessages(
      userId,
      (newMessages) => {
        console.log(
          '📨 useNotifications: Received',
          newMessages.length,
          'messages'
        );
        setMessages(newMessages);

        // Spočítej nepřečtené
        const unread = newMessages.filter(
          (msg) => !msg.readBy.includes(userId)
        ).length;
        setUnreadCount(unread);

        console.log(`📊 Nepřečtených zpráv: ${unread}/${newMessages.length}`);
      }
    );

    return () => {
      console.log('🔌 Odpojuji listener pro zprávy');
      unsubscribe();
    };
  }, [userId]);

  // Požádat o povolení notifikací
  const requestPermission = useCallback(async () => {
    if (!userId) {
      console.error('❌ Nelze požádat o povolení bez userId');
      return false;
    }

    try {
      console.log('🔔 Žádám o povolení notifikací...');

      const token = await fcmService.requestPermissionAndGetToken(userId);

      if (token) {
        setPermission('granted');
        console.log('✅ Notifikace povoleny, token uložen do Firestore');

        // Inicializuj listening pro zprávy v popředí
        fcmService.listenForMessages((payload) => {
          console.log('📨 Nová zpráva z FCM:', payload);
        });

        return true;
      } else {
        setPermission(Notification.permission);
        console.log('ℹ️ Notifikace nebyly povoleny nebo nejsou podporovány');
        return false;
      }
    } catch (error) {
      console.error('❌ Chyba při žádosti o povolení:', error);
      setPermission('denied');
      return false;
    }
  }, [userId]);

  // Poslat zprávu
  const sendMessage = useCallback(
    async (
      senderName: string,
      recipients: string[],
      message: string,
      template?: string,
      urgent: boolean = false
    ) => {
      if (!userId) {
        throw new Error('User not authenticated');
      }

      console.log('📤 Odesílám zprávu:', {
        senderName,
        recipients,
        message,
        urgent,
      });

      // Expanduj skupiny na jednotlivé členy
      const expandedRecipients =
        familyMessagingService.expandRecipients(recipients);
      console.log('👥 Rozšířené příjemci:', expandedRecipients);

      const messageId = await familyMessagingService.sendMessage(
        userId,
        senderName,
        expandedRecipients,
        message,
        template as any,
        urgent
      );

      console.log('✅ Zpráva odeslána s ID:', messageId);
      return messageId;
    },
    [userId]
  );

  // Označit jako přečtené
  const markAsRead = useCallback(
    async (messageId: string) => {
      if (!userId) return;
      console.log('👁️ Označuji zprávu jako přečtenou:', messageId);
      await familyMessagingService.markAsRead(messageId, userId);
    },
    [userId]
  );

  // Smazat zprávu
  const deleteMessage = useCallback(async (messageId: string) => {
    try {
      console.log('🗑️ Mažu zprávu:', messageId);
      await familyMessagingService.deleteMessage(messageId);
    } catch (error) {
      console.error('❌ Chyba při mazání zprávy:', error);
      throw error;
    }
  }, []);

  // Smazat všechny přečtené
  const deleteReadMessages = useCallback(async () => {
    if (!userId) return 0;
    try {
      console.log('🗑️ Mažu přečtené zprávy...');
      const count = await familyMessagingService.deleteReadMessages(userId);
      console.log(`✅ Smazáno ${count} přečtených zpráv`);
      return count;
    } catch (error) {
      console.error('❌ Chyba při mazání přečtených zpráv:', error);
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
