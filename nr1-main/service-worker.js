// service-worker.js
const CACHE_NAME = 'viral-clip-cache-v1';
const RUNTIME_CACHE = 'viral-clip-runtime-v1';
const OFFLINE_URL = '/offline.html';
const ASSETS = [
  '/',
  '/index.html',
  '/favicon.ico',
  '/public/styles.css',
  '/public/main.js',
  '/public/manifest.json',
  // Add more static assets as needed
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await cache.addAll(ASSETS.concat([OFFLINE_URL]));
      self.skipWaiting();
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME && key !== RUNTIME_CACHE)
          .map((key) => caches.delete(key)),
      );
      self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    (async () => {
      const cache = await caches.open(RUNTIME_CACHE);
      try {
        const response = await fetch(event.request);
        if (response && response.status === 200 && response.type === 'basic') {
          cache.put(event.request, response.clone());
        }
        return response;
      } catch (err) {
        const cached = await cache.match(event.request);
        if (cached) return cached;
        if (event.request.mode === 'navigate') {
          return caches.match(OFFLINE_URL);
        }
        return caches.match(event.request);
      }
    })(),
  );
});

// Push notifications (stub for future integration)
self.addEventListener('push', function (event) {
  const data = event.data ? event.data.text() : 'Viral Clip Generator update!';
  event.waitUntil(
    self.registration.showNotification('Viral Clip Generator', {
      body: data,
      icon: '/favicon.ico',
    }),
  );
});

// Advanced: Add background sync for feedback and push notification support
self.addEventListener('sync', function (event) {
  if (event.tag === 'sync-feedback') {
    event.waitUntil(
      (async () => {
        // Example: Try to send queued feedback to the server
        const feedbacks = await getQueuedFeedback();
        for (const feedback of feedbacks) {
          try {
            await fetch('/api/feedback', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(feedback),
            });
            await removeQueuedFeedback(feedback);
          } catch (e) {
            // Leave in queue for next sync
          }
        }
      })(),
    );
  }
});

async function getQueuedFeedback() {
  // Use IndexedDB or Cache Storage for real implementation
  // Placeholder: return []
  return [];
}
async function removeQueuedFeedback(feedback) {
  // Use IndexedDB or Cache Storage for real implementation
}

// Advanced: Push notification click handler
self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  event.waitUntil(clients.openWindow('/'));
});
