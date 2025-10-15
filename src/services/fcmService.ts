// src/services/fcmService.ts

import { getToken, onMessage, type Messaging } from 'firebase/messaging';
import { getMessagingInstance } from '../config/firebase';
import { firestoreService } from './firestoreService';

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY;

class FCMService {
  private currentToken: string | null = null;

  /**
   * Požádá uživatele o povolení notifikací a získá FCM token
   */
  async requestPermissionAndGetToken(userId: string): Promise<string | null> {
    try {
      let messaging = getMessagingInstance();
      let attempts = 0;
      while (!messaging && attempts < 30) {
        await new Promise((resolve) => setTimeout(resolve, 100));
        attempts++;
        messaging = getMessagingInstance(); // ← Zkus znovu
      }

      if (!messaging) {
        console.warn('⚠️ Firebase Messaging není k dispozici');
        return null;
      }

      // Zkontroluj, jestli je messaging inicializováno
      if (!messaging) {
        console.warn('⚠️ Firebase Messaging není k dispozici');
        return null;
      }

      // Požádej o povolení
      const permission = await Notification.requestPermission();

      if (permission !== 'granted') {
        console.log('ℹ️ Uživatel nepovolil notifikace');
        return null;
      }

      console.log('✅ Povolení pro notifikace uděleno');

      // Zaregistruj service worker
      let registration: ServiceWorkerRegistration;

      try {
        registration = await navigator.serviceWorker.register(
          '/firebase-messaging-sw.js',
          {
            scope: '/',
            type: 'classic',
          }
        );

        await navigator.serviceWorker.ready;
        console.log('✅ Service Worker zaregistrován:', registration.scope);
      } catch (swError) {
        console.error('❌ Chyba při registraci Service Workeru:', swError);
        return null;
      }

      // Získej FCM token
      try {
        const token = await getToken(messaging as Messaging, {
          vapidKey: VAPID_KEY,
          serviceWorkerRegistration: registration,
        });

        if (token) {
          console.log('✅ FCM Token získán:', token.substring(0, 30) + '...');
          this.currentToken = token;

          // Ulož token do Firestore
          await firestoreService.saveFCMToken(userId, token);

          return token;
        } else {
          console.warn('⚠️ Nepodařilo se získat FCM token');
          return null;
        }
      } catch (tokenError) {
        console.error('❌ Chyba při získávání FCM tokenu:', tokenError);
        return null;
      }
    } catch (error) {
      console.error(
        '❌ Neočekávaná chyba v requestPermissionAndGetToken:',
        error
      );
      return null;
    }
  }

  /**
   * Naslouchá zprávám, když je aplikace v popředí
   */
  async listenForMessages(callback: (payload: any) => void): Promise<void> {
    const messaging = getMessagingInstance();

    if (!messaging) {
      console.warn('⚠️ Firebase Messaging není k dispozici pro listening');
      return;
    }

    onMessage(messaging, (payload) => {
      console.log('📨 Zpráva přijata v popředí:', payload);
      callback(payload);

      // Zobraz notifikaci i když je app otevřená
      if (payload.notification && Notification.permission === 'granted') {
        new Notification(payload.notification.title || 'Nová zpráva', {
          body: payload.notification.body,
          icon: '/icon-192x192.png',
          tag: payload.data?.messageId || 'family-message',
          requireInteraction: payload.data?.urgent === 'true',
        });
      }
    });
  }

  /**
   * Vrátí aktuální token (pokud existuje)
   */
  getCurrentToken(): string | null {
    return this.currentToken;
  }
}

export const fcmService = new FCMService();
