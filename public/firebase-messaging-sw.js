// Import Firebase scripts
importScripts(
  'https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js'
);
importScripts(
  'https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js'
);

// Firebase konfigurace - ZKOPÍRUJ Z .env
const firebaseConfig = {
  apiKey: 'AIzaSyDan3bgiAAUPQn8NeEDsNAcawpsO17Hax8',
  authDomain: 'iotuyapp.firebaseapp.com',
  projectId: 'iotuyapp',
  storageBucket: 'iotuyapp.firebasestorage.app',
  messagingSenderId: '375880123616',
  appId: '1:375880123616:web:c7b8b1f7e5c79d4be8e0d8',
  measurementId: 'G-3WFPE82CYD',
};

// Okamžitá aktivace nové verze SW (bez čekání na zavření všech tabů)
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(clients.claim()));

// Inicializace Firebase
firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// KLÍČOVÁ ČÁST: Zobraz notifikaci když přijde zpráva na pozadí
// Pozor: zprávy mají POUZE data pole (žádné notification pole),
// aby browser neukázal notifikaci automaticky → žádné duplikáty.
messaging.onBackgroundMessage((payload) => {
  console.log('📨 Background Message received:', payload);

  // Title a body bereme z data pole (ne z notification pole)
  const notificationTitle =
    payload.data?.title || payload.notification?.title || 'Nová zpráva';
  const notificationBody =
    payload.data?.body || payload.notification?.body || '';

  // Stabilní tag = OS zamítne duplicitní notifikaci se stejným tagem
  const stableTag = payload.data?.messageId || payload.data?.type || 'smarthome-msg';

  const notificationOptions = {
    body: notificationBody,
    icon: '/icon-192x192.png',
    badge: '/badge-96x96.png',
    tag: stableTag,           // ← stabilní, ne Date.now()
    renotify: false,          // nesound znovu, pokud stejný tag existuje
    requireInteraction: payload.data?.urgent === 'true',
    data: payload.data,
  };

  console.log('🔔 Notification:', notificationTitle, '| tag:', stableTag);

  return self.registration.showNotification(
    notificationTitle,
    notificationOptions
  );
});

// Kliknutí na notifikaci
self.addEventListener('notificationclick', (event) => {
  console.log('🖱️ Notification clicked:', event);
  event.notification.close();

  // Hledej existující okno a zaostři na něj, nebo otevři nové
  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Pokud je aplikace už otevřená, zaměř se na ni
        for (const client of clientList) {
          // Používáme startsWith pro větší spolehlivost
          if (
            client.url.startsWith(self.location.origin) &&
            'focus' in client
          ) {
            return client.focus();
          }
        }
        // Jinak otevři nové okno na hlavní stránce
        if (clients.openWindow) {
          return clients.openWindow('/'); // <-- Toto je ta klíčová, spolehlivá změna
        }
      })
  );
});
