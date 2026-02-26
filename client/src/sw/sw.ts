/**
 * Service Worker for offline support and smart caching
 * 
 * Features:
 * - Cache-first for static assets
 * - Network-first for API calls
 * - Stale-while-revalidate for images
 * - Background sync support
 * - Push notifications ready
 * - Workbox precache integration
 */

/// <reference lib="webworker" />

// Workbox types
declare global {
  interface ServiceWorkerGlobalScope {
    __WB_MANIFEST: Array<{ url: string; revision: string | null }>;
  }
}

declare const self: ServiceWorkerGlobalScope;

// Workbox will inject the precache manifest here
// This is required for vite-plugin-pwa with injectManifest strategy
const precacheManifest = self.__WB_MANIFEST;

const CACHE_VERSION = 'dev-1772130527350';
const STATIC_CACHE = `static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `dynamic-${CACHE_VERSION}`;
const IMAGE_CACHE = `images-${CACHE_VERSION}`;

// Files to cache immediately on install (in addition to Workbox precache)
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.png',
];

// Cache size limits
const LIMITS = {
  images: 50,
  dynamic: 100,
};

/**
 * Install event - cache static assets
 */
self.addEventListener('install', (event: ExtendableEvent) => {
  console.log('[SW] Installing service worker...');
  console.log('[SW] Precache manifest:', precacheManifest);
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .catch((error) => {
        console.error('[SW] Failed to cache static assets:', error);
      })
  );
  
  // Force the waiting service worker to become the active service worker
  self.skipWaiting();
});

/**
 * Activate event - clean up old caches
 */
self.addEventListener('activate', (event: ExtendableEvent) => {
  console.log('[SW] Activating service worker...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => {
              return cacheName.startsWith('static-') ||
                     cacheName.startsWith('dynamic-') ||
                     cacheName.startsWith('images-');
            })
            .filter((cacheName) => {
              return cacheName !== STATIC_CACHE &&
                     cacheName !== DYNAMIC_CACHE &&
                     cacheName !== IMAGE_CACHE;
            })
            .map((cacheName) => {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            })
        );
      })
      .then(() => {
        console.log('[SW] Service worker activated');
        return self.clients.claim();
      })
  );
});

/**
 * Fetch event - implement caching strategies
 */
self.addEventListener('fetch', (event: FetchEvent) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip cross-origin requests
  if (url.origin !== location.origin) {
    return;
  }
  
  // API requests - Network first
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(request, DYNAMIC_CACHE));
    return;
  }
  
  // Images - Stale while revalidate
  if (request.destination === 'image') {
    event.respondWith(staleWhileRevalidate(request, IMAGE_CACHE));
    return;
  }
  
  // Static assets - Cache first
  if (
    request.destination === 'script' ||
    request.destination === 'style' ||
    request.destination === 'font' ||
    request.destination === 'document'
  ) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }
  
  // Default - Network first
  event.respondWith(networkFirst(request, DYNAMIC_CACHE));
});

/**
 * Cache-first strategy
 */
async function cacheFirst(request: Request, cacheName: string): Promise<Response> {
  try {
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    const networkResponse = await fetch(request);
    
    if (networkResponse && networkResponse.status === 200) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.error('[SW] Cache-first failed:', error);
    
    // Return offline page if available
    const offlineResponse = await caches.match('/offline.html');
    if (offlineResponse) {
      return offlineResponse;
    }
    
    return new Response('Offline', { status: 503 });
  }
}

/**
 * Network-first strategy
 */
async function networkFirst(request: Request, cacheName: string): Promise<Response> {
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse && networkResponse.status === 200) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
      
      // Limit cache size
      limitCacheSize(cacheName, LIMITS.dynamic);
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[SW] Network failed, trying cache:', (error as Error).message);
    
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    return new Response('Offline', { status: 503 });
  }
}

/**
 * Stale-while-revalidate strategy
 */
async function staleWhileRevalidate(request: Request, cacheName: string): Promise<Response> {
  const cachedResponse = await caches.match(request);
  
  const fetchPromise = fetch(request).then(async (networkResponse) => {
    if (networkResponse && networkResponse.status === 200) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
      
      // Limit cache size
      limitCacheSize(cacheName, LIMITS.images);
    }
    return networkResponse;
  }).catch((error) => {
    console.log('[SW] Fetch failed:', (error as Error).message);
    return new Response('Offline', { status: 503 });
  });
  
  return cachedResponse || fetchPromise;
}

/**
 * Limit cache size by removing oldest entries
 */
async function limitCacheSize(cacheName: string, maxItems: number): Promise<void> {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  
  if (keys.length > maxItems) {
    // Remove oldest entries
    const toDelete = keys.slice(0, keys.length - maxItems);
    await Promise.all(toDelete.map(key => cache.delete(key)));
  }
}

/**
 * Background sync for offline actions
 */
self.addEventListener('sync', (event: any) => {
  console.log('[SW] Background sync:', event.tag);
  
  if (event.tag === 'sync-data') {
    event.waitUntil(syncData());
  }
});

async function syncData(): Promise<void> {
  try {
    // Get pending sync data from IndexedDB
    // Send to server
    console.log('[SW] Syncing offline data...');
    
    // Implementation would go here
    return Promise.resolve();
  } catch (error) {
    console.error('[SW] Sync failed:', error);
    throw error;
  }
}

/**
 * Push notification handler
 */
self.addEventListener('push', (event: any) => {
  const options: NotificationOptions = {
    body: event.data ? event.data.text() : 'New notification',
    icon: '/icon-192x192.png',
    badge: '/badge-72x72.png',
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    }
  };
  
  event.waitUntil(
    self.registration.showNotification('Performance App', options)
  );
});

/**
 * Notification click handler
 */
self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close();
  
  event.waitUntil(
    self.clients.openWindow('/')
  );
});

/**
 * Message handler for communication with main thread
 */
self.addEventListener('message', (event: ExtendableMessageEvent) => {
  console.log('[SW] Message received:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => caches.delete(cacheName))
        );
      })
    );
  }
});

export {};
