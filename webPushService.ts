// src/services/webPushService.ts

export class WebPushService {
  private static instance: WebPushService;
  private registration: ServiceWorkerRegistration | null = null;

  private constructor() {}

  static getInstance(): WebPushService {
    if (!WebPushService.instance) {
      WebPushService.instance = new WebPushService();
    }
    return WebPushService.instance;
  }

  // Kontrola, jestli prohlížeč podporuje notifikace
  isSupported(): boolean {
    return 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
  }

  // Získání aktuálního stavu povolení
  getPermission(): NotificationPermission {
    if (!this.isSupported()) return 'denied';
    return Notification.permission;
  }

  // Požádat o povolení notifikací
  async requestPermission(): Promise<boolean> {
    if (!this.isSupported()) {
      console.warn('Push notifications are not supported');
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission === 'denied') {
      console.warn('Notification permission denied');
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }

  // Registrace Service Workeru
  async registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
    if (!this.isSupported()) return null;

    try {
      // Service Worker vytvoříme v dalším kroku
      const registration = await navigator.serviceWorker.register('/sw.js');
      this.registration = registration;
      console.log('Service Worker registered:', registration);
      return registration;
    } catch (error) {
      console.error('Service Worker registration failed:', error);
      return null;
    }
  }

  // Zobrazení notifikace
  async showNotification(
    title: string,
    options: {
      body: string;
      icon?: string;
      badge?: string;
      tag?: string;
      data?: any;
      requireInteraction?: boolean;
      silent?: boolean;
      vibrate?: number[];
    }
  ): Promise<void> {
    if (!this.isSupported() || Notification.permission !== 'granted') {
      console.warn('Cannot show notification - permission not granted');
      return;
    }

    try {
      if (this.registration) {
        await this.registration.showNotification(title, {
          ...options,
          icon: options.icon || '/icon-192x192.png',
          badge: options.badge || '/badge-72x72.png',
        });
      } else {
        // Fallback na základní notifikaci
        new Notification(title, options);
      }
    } catch (error) {
      console.error('Error showing notification:', error);
    }
  }

  // Zobrazení rodinné zprávy
  async showFamilyMessage(
    senderName: string,
    message: string,
    urgent: boolean = false
  ): Promise<void> {
    const title = urgent ? `🚨 ${senderName}` : `💬 ${senderName}`;
    
    await this.showNotification(title, {
      body: message,
      tag: urgent ? 'urgent-message' : 'family-message',
      requireInteraction: urgent,
      silent: false,
      vibrate: urgent ? [200, 100, 200, 100, 200] : [200],
      data: {
        type: 'family-message',
        urgent,
        timestamp: Date.now(),
      },
    });
  }

  // Zavření všech notifikací
  async closeAllNotifications(): Promise<void> {
    if (!this.registration) return;

    const notifications = await this.registration.getNotifications();
    notifications.forEach(notification => notification.close());
  }
}

export const webPushService = WebPushService.getInstance();