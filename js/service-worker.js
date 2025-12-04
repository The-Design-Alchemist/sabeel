// service-worker.js - Progressive Web App Service Worker
const CACHE_NAME = 'quran-app-v1.0.0';
const DATA_CACHE_NAME = 'quran-data-v1.0.0';
const AUDIO_CACHE_NAME = 'quran-audio-v1.0.0';

// Add to service-worker.js for debugging
   self.addEventListener('install', e => console.log('[SW] Install:', e));
   self.addEventListener('activate', e => console.log('[SW] Activate:', e));
   self.addEventListener('fetch', e => console.log('[SW] Fetch:', e.request.url));

// Essential files that must be cached for offline functionality
const ESSENTIAL_FILES = [
    '/sabeel/',
    '/sabeel/index.html',
    '/sabeel/quran-learning.html',
    '/sabeel/offline.html',
    '/sabeel/manifest.json',

    // CSS files
    '/sabeel/css/surah.css',
    '/sabeel/css/styles.css',
    '/sabeel/css/home.css',
    
    // Core JavaScript
    '/sabeel/js/main.js',
    '/sabeel/js/home.js',
    '/sabeel/js/service-worker.js',
    
    // Core
    '/sabeel/js/core/state-store.js',

    // Data
    '/sabeel/js/data/surah-database.js',
    
    // Utils
    '/sabeel/js/utils/url-utils.js',
    '/sabeel/js/utils/migration-helpers.js',
    
    // Services
    '/sabeel/js/services/api-service.js',
    '/sabeel/js/services/audio-service.js',
    '/sabeel/js/services/reading-progress.js',
    '/sabeel/js/services/sw-manager.js',
    '/sabeel/js/services/network-manager.js',
    '/sabeel/js/services/media-session.js',
    
    // Components
    '/sabeel/js/components/verse-display.js',
    '/sabeel/js/components/controls.js',
    '/sabeel/js/components/word-highlighting.js',
    '/sabeel/js/components/settings.js',
    '/sabeel/js/components/network-status.js',
    '/sabeel/js/components/verse-dropdown.js'
];

// Surah data files (1-114)
const SURAH_DATA_FILES = Array.from({length: 114}, (_, i) => {
    const num = String(i + 1).padStart(3, '0');
    return `/sabeel/quran-data/enhanced/${num}.json`;
});

// Install event - cache essential files
self.addEventListener('install', (event) => {
    console.log('[ServiceWorker] Install');
    
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('[ServiceWorker] Caching essential files');
                return cache.addAll(ESSENTIAL_FILES);
            })
            .then(() => {
                // Pre-cache first 10 surahs for better offline experience
                return caches.open(DATA_CACHE_NAME);
            })
            .then(cache => {
                const firstTenSurahs = SURAH_DATA_FILES.slice(0, 10);
                return cache.addAll(firstTenSurahs);
            })
            .then(() => self.skipWaiting()) // Activate immediately
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    console.log('[ServiceWorker] Activate');
    
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    // Delete old cache versions
                    if (cacheName !== CACHE_NAME && 
                        cacheName !== DATA_CACHE_NAME && 
                        cacheName !== AUDIO_CACHE_NAME) {
                        console.log('[ServiceWorker] Removing old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim()) // Take control immediately
    );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);
    
    // Skip non-GET requests
    if (request.method !== 'GET') return;
    
    // Handle different types of resources
    if (url.pathname.includes('/audio/')) {
        event.respondWith(handleAudioRequest(request));
    } else if (url.pathname.includes('/enhanced/') || url.pathname.includes('.json')) {
        event.respondWith(handleDataRequest(request));
    } else {
        event.respondWith(handleGeneralRequest(request));
    }
});

// Handle general requests (HTML, CSS, JS)
async function handleGeneralRequest(request) {
    try {
        // Try cache first
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        
        // Try network
        const networkResponse = await fetch(request);
        
        // Cache successful responses
        if (networkResponse.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
    } catch (error) {
        console.error('[ServiceWorker] Fetch failed:', error);
        
        // Return offline page if available
        const offlineResponse = await caches.match('/offline.html');
        if (offlineResponse) {
            return offlineResponse;
        }
        
        // Return a basic offline response
        return new Response('Offline - Content not available', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: new Headers({
                'Content-Type': 'text/plain'
            })
        });
    }
}

// Handle data requests (JSON files)
async function handleDataRequest(request) {
    try {
        // Check data cache first
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            // Return cached data but try to update in background
            fetchAndCache(request, DATA_CACHE_NAME);
            return cachedResponse;
        }
        
        // Fetch from network
        const networkResponse = await fetch(request);
        
        if (networkResponse.ok) {
            const cache = await caches.open(DATA_CACHE_NAME);
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
    } catch (error) {
        console.error('[ServiceWorker] Data fetch failed:', error);
        
        // Return cached version if available
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        
        // Return error response
        return new Response(JSON.stringify({ error: 'Offline - Data not available' }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

// Handle audio requests with intelligent caching
async function handleAudioRequest(request) {
    try {
        // Check if audio is in cache
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        
        // Fetch from network with timeout
        const networkResponse = await fetchWithTimeout(request, 10000);
        
        // Cache audio files under 5MB
        const contentLength = networkResponse.headers.get('content-length');
        if (contentLength && parseInt(contentLength) < 5242880) { // 5MB
            const cache = await caches.open(AUDIO_CACHE_NAME);
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
    } catch (error) {
        console.error('[ServiceWorker] Audio fetch failed:', error);
        
        // Check cache again as fallback
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        
        // Return 503 for offline audio
        return new Response('Audio not available offline', {
            status: 503,
            statusText: 'Service Unavailable'
        });
    }
}

// Fetch with timeout helper
function fetchWithTimeout(request, timeout = 5000) {
    return Promise.race([
        fetch(request),
        new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Request timeout')), timeout)
        )
    ]);
}

// Background fetch and cache helper
async function fetchAndCache(request, cacheName) {
    try {
        const response = await fetch(request);
        if (response.ok) {
            const cache = await caches.open(cacheName);
            cache.put(request, response);
        }
    } catch (error) {
        // Silently fail - this is a background update
        console.log('[ServiceWorker] Background update failed:', error);
    }
}

// Handle messages from the main app
self.addEventListener('message', (event) => {
    if (event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
    
    if (event.data.type === 'CACHE_SURAH') {
        const { surahNumber } = event.data;
        cacheEntireSurah(surahNumber);
    }
    
    if (event.data.type === 'CLEAR_AUDIO_CACHE') {
        caches.delete(AUDIO_CACHE_NAME);
    }
});

// Cache an entire surah (data + audio)
async function cacheEntireSurah(surahNumber) {
    try {
        const surahNum = String(surahNumber).padStart(3, '0');
        
        // Cache the surah data
        const dataUrl = `/quran-data/enhanced/${surahNum}.json`;
        const dataResponse = await fetch(dataUrl);
        if (dataResponse.ok) {
            const cache = await caches.open(DATA_CACHE_NAME);
            await cache.put(dataUrl, dataResponse);
        }
        
        // Get verse count from the data
        const data = await dataResponse.clone().json();
        const verseCount = data.verses.length;
        
        // Cache audio files for all verses
        const audioCache = await caches.open(AUDIO_CACHE_NAME);
        const audioPromises = [];
        
        for (let i = 1; i <= verseCount; i++) {
            const verseNum = String(i).padStart(3, '0');
            const audioUrl = `/quran-data/audio/${surahNum}/${surahNum}${verseNum}.mp3`;
            
            audioPromises.push(
                fetch(audioUrl)
                    .then(response => {
                        if (response.ok) {
                            return audioCache.put(audioUrl, response);
                        }
                    })
                    .catch(err => console.log(`Failed to cache audio ${audioUrl}`))
            );
        }
        
        await Promise.all(audioPromises);
        console.log(`[ServiceWorker] Cached Surah ${surahNumber} completely`);
        
        // Notify the app
        const clients = await self.clients.matchAll();
        clients.forEach(client => {
            client.postMessage({
                type: 'SURAH_CACHED',
                surahNumber: surahNumber
            });
        });
        
    } catch (error) {
        console.error(`[ServiceWorker] Failed to cache Surah ${surahNumber}:`, error);
    }
}

// Cache size management
async function getCacheSize() {
    if ('estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate();
        return {
            usage: estimate.usage,
            quota: estimate.quota,
            percentage: (estimate.usage / estimate.quota) * 100
        };
    }
    return null;
}

// Clean up old audio cache if running low on space
async function cleanupAudioCache() {
    const cacheSize = await getCacheSize();
    
    if (cacheSize && cacheSize.percentage > 80) {
        console.log('[ServiceWorker] Cache usage high, cleaning up audio cache');
        const cache = await caches.open(AUDIO_CACHE_NAME);
        const requests = await cache.keys();
        
        // Remove oldest half of cached audio
        const toDelete = requests.slice(0, Math.floor(requests.length / 2));
        for (const request of toDelete) {
            await cache.delete(request);
        }
    }
}