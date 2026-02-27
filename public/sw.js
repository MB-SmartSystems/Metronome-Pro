// Service Worker for Metronom Pro
// Provides offline functionality and performance optimizations

const CACHE_NAME = 'metronom-pro-v1.0.0';
const STATIC_CACHE_NAME = `${CACHE_NAME}-static`;
const DYNAMIC_CACHE_NAME = `${CACHE_NAME}-dynamic`;

// Files to cache immediately
const STATIC_FILES = [
  '/',
  '/manifest.json',
  '/icon-192x192.png',
  '/icon-512x512.png',
  // Next.js static files will be added dynamically
];

// Installation
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching static files');
        return cache.addAll(STATIC_FILES);
      })
      .then(() => {
        console.log('[SW] Installation complete');
        return self.skipWaiting(); // Activate immediately
      })
      .catch((error) => {
        console.error('[SW] Installation failed:', error);
      })
  );
});

// Activation
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        // Delete old caches
        const deletePromises = cacheNames
          .filter((cacheName) => {
            return cacheName.startsWith('metronom-pro-') && 
                   cacheName !== STATIC_CACHE_NAME && 
                   cacheName !== DYNAMIC_CACHE_NAME;
          })
          .map((cacheName) => {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          });
        
        return Promise.all(deletePromises);
      })
      .then(() => {
        console.log('[SW] Activation complete');
        return self.clients.claim(); // Take control immediately
      })
      .catch((error) => {
        console.error('[SW] Activation failed:', error);
      })
  );
});

// Fetch handling with cache strategies
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Skip non-HTTP requests
  if (!request.url.startsWith('http')) {
    return;
  }

  // Skip requests to other origins
  if (url.origin !== location.origin) {
    return;
  }

  event.respondWith(
    caches.match(request)
      .then((cachedResponse) => {
        // Cache hit - return cached version
        if (cachedResponse) {
          // For HTML files, check for updates in the background
          if (request.headers.get('accept')?.includes('text/html')) {
            // Background update
            fetch(request)
              .then((fetchResponse) => {
                if (fetchResponse && fetchResponse.status === 200) {
                  const responseClone = fetchResponse.clone();
                  caches.open(DYNAMIC_CACHE_NAME)
                    .then((cache) => cache.put(request, responseClone));
                }
              })
              .catch(() => {
                // Network error - cached version is fine
              });
          }
          
          return cachedResponse;
        }

        // No cache hit - fetch from network
        return fetch(request)
          .then((fetchResponse) => {
            if (!fetchResponse || fetchResponse.status !== 200 || fetchResponse.type !== 'basic') {
              return fetchResponse;
            }

            // Clone the response for caching
            const responseClone = fetchResponse.clone();
            
            // Cache static assets and HTML pages
            if (shouldCache(request)) {
              const cacheName = isStaticAsset(request) ? STATIC_CACHE_NAME : DYNAMIC_CACHE_NAME;
              caches.open(cacheName)
                .then((cache) => {
                  cache.put(request, responseClone);
                });
            }

            return fetchResponse;
          })
          .catch(() => {
            // Network error and no cache - return offline page for HTML requests
            if (request.headers.get('accept')?.includes('text/html')) {
              return caches.match('/') // Return main page as fallback
                .then((fallback) => fallback || new Response('Offline', {
                  status: 503,
                  statusText: 'Service Unavailable'
                }));
            }
            
            // For other resources, just fail
            return new Response('Network Error', {
              status: 503,
              statusText: 'Service Unavailable'
            });
          });
      })
  );
});

// Helper functions
function shouldCache(request) {
  const url = new URL(request.url);
  
  // Cache HTML pages
  if (request.headers.get('accept')?.includes('text/html')) {
    return true;
  }
  
  // Cache static assets
  if (isStaticAsset(request)) {
    return true;
  }
  
  // Cache API responses (if any)
  if (url.pathname.startsWith('/api/')) {
    return false; // Don't cache API responses for now
  }
  
  return false;
}

function isStaticAsset(request) {
  const url = new URL(request.url);
  const pathname = url.pathname;
  
  // Next.js static files
  if (pathname.startsWith('/_next/static/')) {
    return true;
  }
  
  // Static assets
  const staticExtensions = ['.js', '.css', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.woff', '.woff2'];
  return staticExtensions.some(ext => pathname.endsWith(ext));
}

// Message handling for manual cache updates
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Background sync for future features
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(
      // Future: sync user settings or usage data
      Promise.resolve()
    );
  }
});

// Push notifications (for future features)
self.addEventListener('push', (event) => {
  const options = {
    body: event.data ? event.data.text() : 'Metronome reminder',
    icon: '/icon-192x192.png',
    badge: '/icon-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'open',
        title: 'Open App',
        icon: '/icon-96x96.png'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('Metronom Pro', options)
  );
});

// Notification click handling
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  event.waitUntil(
    clients.openWindow('/')
  );
});