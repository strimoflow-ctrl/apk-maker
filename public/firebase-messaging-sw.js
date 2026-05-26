importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

// To receive background notifications, you need to provide your Firebase Config here.
// Since Service Workers don't have access to process.env, you must paste the raw strings here.
const firebaseConfig = {
  apiKey: "AIzaSyALZMs212CHPInid6Uhf6z0HFuz6epDK1s",
  authDomain: "naino-app.firebaseapp.com",
  projectId: "naino-app",
  storageBucket: "naino-app.firebasestorage.app",
  messagingSenderId: "413161903541",
  appId: "1:413161903541:web:ef79ef79d50d6c1a8b75fc"
};

// Only initialize if config is provided
if (firebaseConfig.apiKey) {
  firebase.initializeApp(firebaseConfig);
  const messaging = firebase.messaging();

  messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Received background message ', payload);
    const notificationTitle = payload.notification?.title || "Naino Academy";
    const notificationOptions = {
      body: payload.notification?.body,
      icon: '/logo.png', // Fallback icon
      data: payload.data
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
  });
}

// Handle notification click to open the app
self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  // Open the app when clicked
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(windowClients => {
      // Check if there is already a window/tab open with the target URL
      for (var i = 0; i < windowClients.length; i++) {
        var client = windowClients[i];
        if (client.url === self.registration.scope && 'focus' in client) {
          return client.focus();
        }
      }
      // If not, open a new window
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});
