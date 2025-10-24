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
          console.log('🔔 Inicializuji FCM pro authUid:', authUid);

          // Získej FCM token (pokud už uživatel povolil notifikace)
          if (Notification.permission === 'granted') {
            const token = await fcmService.requestPermissionAndGetToken(authUid);

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
    }, [authUid]);

    // Sledování zpráv z Firestore (real-time listener)
    useEffect(() => {
      if (!familyMemberId) {
        return;
      }

     const unsubscribe = familyMessagingService.subscribeToMessages(
        familyMemberId,
        (newMessages) => {
          console.log(
            '📨 useNotifications: Received',
            newMessages.length,
            'messages'
          );
          setMessages(newMessages);

          // Spočítej nepřečtené
          const unread = newMessages.filter(
            (msg) => !msg.readBy.includes(familyMemberId)
          ).length;
          setUnreadCount(unread);
        }
      );

      return () => {
        console.log('🔌 Odpojuji listener pro zprávy');
        unsubscribe();
      };
    }, [familyMemberId]);

      // Požádat o povolení notifikací
      const requestPermission = useCallback(async () => {
        if (!authUid) {
          return false;
        }
      
        try {
          console.log('🔔 Žádám o povolení notifikací...');
      
          const token = await fcmService.requestPermissionAndGetToken(authUid);
      
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
        familyMemberId,
        senderName,
        expandedRecipients,
        message,
        template as any,
        urgent
      );

      console.log('✅ Zpráva odeslána s ID:', messageId);
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
          console.log(`✅ Smazáno ${count} přečtených zpráv`);
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
