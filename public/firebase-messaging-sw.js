/* eslint-disable no-undef */
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyBWf6LMv324JKzgbbvRNd8Ur124X2DqKqY',
  authDomain: 'afcrashpad-crm-6c216.firebaseapp.com',
  projectId: 'afcrashpad-crm-6c216',
  storageBucket: 'afcrashpad-crm-6c216.firebasestorage.app',
  messagingSenderId: '420519152229',
  appId: '1:420519152229:web:bb79abe4ef28956e5f548c',
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const { title, body, url } = payload.data || {};
  if (!title) return;

  self.registration.showNotification(title, {
    body: body || '',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    data: { url: url || '/pipeline' },
  });
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/pipeline';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});
