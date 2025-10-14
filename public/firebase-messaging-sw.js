// public/firebase-messaging-sw.js

// Import Firebase scripts z CDN
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js');

// Firebase konfigurace - MUSÍ být stejná jako v src/config/firebase.ts

firebase.initializeApp({
  apiKey: "AIzaSyDe3twpHJjf4-f-kPYO9_3CKYa83MY7Qoc",
  authDomain: "iotuyapp.firebaseapp.com",
  projectId: "iotuyapp",
  storageBucket: "iotuyapp.firebasestorage.app",
  messagingSenderId: "375880123616",
  appId: "1:375880123616:web:439082786411401f407c85"
});

// Inicializace messaging
const messaging = firebase.messaging();

// Přijímání zpráv na pozadí (když je app zavřená)
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Background message received:', payload);
  
  const notificationTitle = payload.notification?.title || '💬 Nová rodinná zpráva';
  const notificationOptions = {
    body: payload.notification?.body || 'Máte novou zprávu',
    icon: '/icon-192x192.png',
    badge: '/badge-72x72.png',
    tag: payload.data?.messageId || 'family-message',
    requireInteraction: payload.data?.urgent === 'true',
    vibrate: payload.data?.urgent === 'true' ? [200, 100, 200, 100, 200] : [200],
    data: payload.data
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Kliknutí na notifikaci
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked');
  event.notification.close();

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Pokud je aplikace otevřená, zaměř se na ni
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            return client.focus();
          }
        }
        // Jinak otevři novou záložku
        if (clients.openWindow) {
          return clients.openWindow('/');
        }
      })
  );
});