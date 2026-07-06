// service-worker.js - Progressive Web App Service Worker
// NOTE: this file MUST live at the app root so its scope covers the whole app
// (index.html + quran-learning.html). BASE_PATH is derived from its own location
// so the app works whether served from '/sabeel/' (GitHub Pages) or a domain root.
const CACHE_NAME = 'quran-app-v1.0.0';
const DATA_CACHE_NAME = 'quran-data-v1.0.0';
const AUDIO_CACHE_NAME = 'quran-audio-v1.0.0';

// Derive the deploy base (e.g. '/sabeel' or '') from where this SW is served.
const BASE_PATH = self.location.pathname.replace(/\/service-worker\.js.*$/, '');

// Essential files that must be cached for offline functionality
const ESSENTIAL_FILES = [
    `${BASE_PATH}/`,
    `${BASE_PATH}/index.html`,
    `${BASE_PATH}/quran-learning.html`,
    `${BASE_PATH}/offline.html`,
    `${BASE_PATH}/manifest.json`,

    // CSS files
    `${BASE_PATH}/css/surah.css`,
    `${BASE_PATH}/css/styles.css`,
    `${BASE_PATH}/css/home.css`,

    // Core JavaScript
    `${BASE_PATH}/js/main.js`,
    `${BASE_PATH}/js/home.js`,
    `${BASE_PATH}/service-worker.js`,

    // Core
    `${BASE_PATH}/js/core/state-store.js`,

    // Data
    `${BASE_PATH}/js/data/surah-database.js`,

    // Utils
    `${BASE_PATH}/js/utils/url-utils.js`,
    `${BASE_PATH}/js/utils/migration-helpers.js`,

    // Services
    `${BASE_PATH}/js/services/api-service.js`,
    `${BASE_PATH}/js/services/audio-service.js`,
    `${BASE_PATH}/js/services/reading-progress.js`,
    `${BASE_PATH}/js/services/sw-manager.js`,
    `${BASE_PATH}/js/services/network-manager.js`,
    `${BASE_PATH}/js/services/media-session.js`,

    // Components
    `${BASE_PATH}/js/components/verse-display.js`,
    `${BASE_PATH}/js/components/controls.js`,
    `${BASE_PATH}/js/components/word-highlighting.js`,
    `${BASE_PATH}/js/components/settings.js`,
    `${BASE_PATH}/js/components/network-status.js`,
    `${BASE_PATH}/js/components/verse-dropdown.js`
];

// Surah data files (1-114)
const SURAH_DATA_FILES = Array.from({length: 114}, (_, i) => {
    const num = String(i + 1).padStart(3, '0');
    return `${BASE_PATH}/quran-data/enhanced/${num}.json`;
});

// Cache a list of URLs individually so one missing file can't abort the whole
// install (cache.addAll is atomic and rejects if any single request 404s).
async function cacheAllSettled(cache, urls) {
    await Promise.all(urls.map(async (url) => {
        try {
            const res = await fetch(url, { cache: 'no-cache' });
            if (res.ok) await cache.put(url, res.clone());
            else console.warn('[ServiceWorker] Skipped (not ok):', url, res.status);
        } catch (err) {
            console.warn('[ServiceWorker] Skipped (failed):', url);
        }
    }));
}

// Install event - cache essential files
self.addEventListener('install', (event) => {
    event.waitUntil((async () => {
        const shell = await caches.open(CACHE_NAME);
        await cacheAllSettled(shell, ESSENTIAL_FILES);
        // Pre-cache first 10 surahs for a better first offline experience
        const data = await caches.open(DATA_CACHE_NAME);
        await cacheAllSettled(data, SURAH_DATA_FILES.slice(0, 10));
        await self.skipWaiting(); // Activate immediately
    })());
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    // Delete old cache versions
                    if (cacheName !== CACHE_NAME &&
                        cacheName !== DATA_CACHE_NAME &&
                        cacheName !== AUDIO_CACHE_NAME) {
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
        // Return offline page if available
        const offlineResponse = await caches.match(`${BASE_PATH}/offline.html`);
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
        const dataUrl = `${BASE_PATH}/quran-data/enhanced/${surahNum}.json`;
        const dataResponse = await fetch(dataUrl);
        if (dataResponse.ok) {
            const cache = await caches.open(DATA_CACHE_NAME);
            await cache.put(dataUrl, dataResponse.clone());
        }

        // Get verse count from the data
        const data = await dataResponse.clone().json();
        const verseCount = data.verses.length;

        // Cache audio files for all verses (cap concurrency to avoid hammering origin)
        const audioCache = await caches.open(AUDIO_CACHE_NAME);
        const CONCURRENCY = 5;
        let i = 1;
        async function worker() {
            while (i <= verseCount) {
                const n = i++;
                const verseNum = String(n).padStart(3, '0');
                const audioUrl = `${BASE_PATH}/quran-data/audio/${surahNum}/${surahNum}${verseNum}.mp3`;
                try {
                    const response = await fetch(audioUrl);
                    if (response.ok) await audioCache.put(audioUrl, response);
                } catch (err) {
                    // skip a failed verse, keep going
                }
            }
        }
        await Promise.all(Array.from({ length: CONCURRENCY }, worker));

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
        const cache = await caches.open(AUDIO_CACHE_NAME);
        const requests = await cache.keys();

        // Remove oldest half of cached audio
        const toDelete = requests.slice(0, Math.floor(requests.length / 2));
        for (const request of toDelete) {
            await cache.delete(request);
        }
    }
}
