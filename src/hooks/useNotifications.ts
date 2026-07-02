// src/hooks/useNotifications.ts

import { useState, useEffect, useCallback } from 'react';
import { familyMessagingService } from '../services/familyMessagingService';
import type { FamilyMessage } from '../types/notifications';
import { fcmService } from '../services/fcmService';

export const useNotifications = (
  authUid: string | null,
  familyMemberId: string | null
) => {
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
      if (!authUid) return;

      const initFCM = async () => {
        try {

          // Získej FCM token (pokud už uživatel povolil notifikace)
          if (Notification.permission === 'granted') {
            const token = await fcmService.requestPermissionAndGetToken(authUid);

            if (token) {

              // Naslouchej zprávám v popředí — když je appka OTEVŘENÁ, service worker
              // notifikaci neukáže, musíme ji zobrazit sami (jinak by nepřišla nic).
              fcmService.listenForMessages(async (payload: any) => {
                const data = payload?.data || {};
                const title =
                  data.title || payload?.notification?.title || 'Nová zpráva';
                const body = data.body || payload?.notification?.body || '';
                const tag = data.messageId || data.type || 'smarthome-msg';
                try {
                  const reg = await navigator.serviceWorker.ready;
                  await reg.showNotification(title, {
                    body,
                    tag, // stabilní tag → OS deduplikuje případný duplikát
                    icon: '/icon-192x192.png',
                    badge: '/badge-24x24.png',
                    data,
                  });
                } catch {
                  // Fallback, kdyby SW nebyl dostupný
                  if (Notification.permission === 'granted') {
                    new Notification(title, { body, tag });
                  }
                }
              });
            }
          } else {
          }
        } catch (error) {
        }
      };

      initFCM();
    }, [authUid]);

    // Sledování zpráv z Firestore (real-time listener)
    useEffect(() => {
      if (!familyMemberId) {
        return;
      }

     const unsubscribe = familyMessagingService.subscribeToMessages(
        familyMemberId,
        (newMessages) => {
         setMessages(newMessages);

          // Spočítej nepřečtené
          const unread = newMessages.filter(
            (msg) => !msg.readBy.includes(familyMemberId)
          ).length;
          setUnreadCount(unread);
        }
      );

      return () => {
        unsubscribe();
      };
    }, [familyMemberId]);

      // Požádat o povolení notifikací
      const requestPermission = useCallback(async () => {
        if (!authUid) {
          return false;
        }
      
        try {
      
          const token = await fcmService.requestPermissionAndGetToken(authUid);

          if (token) {
            setPermission('granted');
            // listenForMessages() je už zaregistrován v FCM init efektu výše,
            // druhé volání by pouze vytvořilo nový listener (i když fcmService
            // odregistruje ten předchozí, je to zbytečné a matoucí).
            return true;
          } else {
            setPermission(Notification.permission);
            return false;
          }
        } catch (error) {
          console.error('❌ Chyba při žádosti o povolení:', error);
          setPermission('denied');
          return false;
        }
      }, [authUid]);

  // Poslat zprávu
  const sendMessage = useCallback(
    async (
      senderName: string,
      recipients: string[],
      message: string,
      template?: string,
      urgent: boolean = false
    ) => {
      if (!familyMemberId) {
        throw new Error('User not authenticated');
      };

      // Expanduj skupiny na jednotlivé členy
      const expandedRecipients =
        familyMessagingService.expandRecipients(recipients);

      const messageId = await familyMessagingService.sendMessage(
        familyMemberId,
        senderName,
        expandedRecipients,
        message,
        template as any,
        urgent
      );

      return messageId;
    },
    [familyMemberId]
  );

  // Označit jako přečtené
  const markAsRead = useCallback(
    async (messageId: string) => {
      if (!familyMemberId) return;
      await familyMessagingService.markAsRead(messageId, familyMemberId);
    },
    [familyMemberId]
  );

  // Smazat zprávu
  const deleteMessage = useCallback(async (messageId: string) => {
    try {
      await familyMessagingService.deleteMessage(messageId);
    } catch (error) {
      console.error('❌ Chyba při mazání zprávy:', error);
      throw error;
    }
  }, []);

  // Smazat všechny přečtené
      const deleteReadMessages = useCallback(async () => {
        if (!familyMemberId) return 0;
        try {
          const count = await familyMessagingService.deleteReadMessages(familyMemberId);
          return count;
        } catch (error) {
          console.error('❌ Chyba při mazání přečtených zpráv:', error);
          throw error;
        }
      }, [familyMemberId]);
      
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
