// public/sw.js

self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  event.waitUntil(self.clients.claim());
});

// Zachytávání push notifikací
self.addEventListener('push', (event) => {
  console.log('Service Worker: Push received');
  
  let data = {};
  if (event.data) {
    data = event.data.json();
  }

  const title = data.title || 'Rodinná zpráva';
  const options = {
    body: data.body || 'Máte novou zprávu',
    icon: data.icon || '/icon-192x192.png',
    badge: '/badge-72x72.png',
    tag: data.tag || 'family-message',
    data: data,
    requireInteraction: data.urgent || false,
    vibrate: data.urgent ? [200, 100, 200, 100, 200] : [200],
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Kliknutí na notifikaci
self.addEventListener('notificationclick', (event) => {
  console.log('Service Worker: Notification clicked');
  
  event.notification.close();

  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clientList) => {
      // Pokud je aplikace už otevřená, zaměř se na ni
      for (let client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      // Jinak otevři nové okno
      if (self.clients.openWindow) {
        return self.clients.openWindow('/');
      }
    })
  );
});

// Zavření notifikace
self.addEventListener('notificationclose', (event) => {
  console.log('Service Worker: Notification closed', event.notification.tag);
});