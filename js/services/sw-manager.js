// Service Worker Manager - handles registration and updates
class ServiceWorkerManager {
    constructor() {
        this.registration = null;
        this.updateAvailable = false;
    }
    
    async init() {
        if (!('serviceWorker' in navigator)) {
            console.log('Service Workers not supported');
            return;
        }
        
        try {
            // Register service worker
            this.registration = await navigator.serviceWorker.register('/service-worker.js', {
                scope: '/sabeel/'
            });
            
            console.log('ServiceWorker registered:', this.registration);
            
            // Check for updates
            this.setupUpdateHandler();
            
            // Setup message handler
            this.setupMessageHandler();
            
            // Check registration state
            if (this.registration.waiting) {
                this.showUpdatePrompt(this.registration.waiting);
            }
            
            if (this.registration.active) {
                console.log('ServiceWorker active and ready');
            }
            
            // Check for updates periodically
            setInterval(() => {
                this.registration.update();
            }, 3600000); // Check every hour
            
        } catch (error) {
            console.error('ServiceWorker registration failed:', error);
        }
    }
    
    setupUpdateHandler() {
        this.registration.addEventListener('updatefound', () => {
            const newWorker = this.registration.installing;
            
            newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                    // New service worker available
                    this.showUpdatePrompt(newWorker);
                }
            });
        });
    }
    
    setupMessageHandler() {
        navigator.serviceWorker.addEventListener('message', (event) => {
            console.log('Message from ServiceWorker:', event.data);
            
            if (event.data.type === 'SURAH_CACHED') {
                this.showNotification(`Surah ${event.data.surahNumber} is now available offline!`);
            }
        });
    }
    
    showUpdatePrompt(worker) {
        const updateBanner = document.createElement('div');
        updateBanner.className = 'update-banner';
        updateBanner.innerHTML = `
            <div class="update-content">
                <span>A new version is available!</span>
                <button onclick="window.swManager.applyUpdate()" class="update-btn">Update Now</button>
                <button onclick="this.parentElement.parentElement.remove()" class="dismiss-btn">Later</button>
            </div>
        `;
        updateBanner.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 15px 20px;
            border-radius: 10px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.2);
            z-index: 9999;
            animation: slideUp 0.3s ease;
        `;
        
        document.body.appendChild(updateBanner);
        this.updateAvailable = true;
        this.waitingWorker = worker;
    }
    
    async applyUpdate() {
        if (!this.waitingWorker) return;
        
        // Tell waiting service worker to skip waiting
        this.waitingWorker.postMessage({ type: 'SKIP_WAITING' });
        
        // Reload once the new service worker takes control
        navigator.serviceWorker.addEventListener('controllerchange', () => {
            window.location.reload();
        });
    }
    
    // Cache a specific surah for offline use
    async cacheSurah(surahNumber) {
        if (!navigator.serviceWorker.controller) {
            console.warn('No active service worker');
            return;
        }
        
        navigator.serviceWorker.controller.postMessage({
            type: 'CACHE_SURAH',
            surahNumber: surahNumber
        });
    }
    
    // Get cache storage info
    async getCacheInfo() {
        if ('storage' in navigator && 'estimate' in navigator.storage) {
            const estimate = await navigator.storage.estimate();
            return {
                usage: this.formatBytes(estimate.usage),
                quota: this.formatBytes(estimate.quota),
                percentage: Math.round((estimate.usage / estimate.quota) * 100)
            };
        }
        return null;
    }
    
    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    }
    
    showNotification(message) {
        const notification = document.createElement('div');
        notification.className = 'sw-notification';
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #4CAF50;
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            box-shadow: 0 3px 10px rgba(0,0,0,0.2);
            z-index: 9999;
            animation: slideInRight 0.3s ease;
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
}

// Initialize on load
window.swManager = new ServiceWorkerManager();