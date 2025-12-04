// network-status.js - UI component for network status
class NetworkStatus {
    constructor() {
        this.container = null;
        this.queueIndicator = null;
        this.initialize();
    }

    initialize() {
        if (!window.networkManager) {
            console.warn('NetworkManager not available');
            return;
        }

        // Create UI elements
        this.createConnectionIndicator();
        this.createQueueIndicator();

        // Subscribe to network events
        this.subscribeToEvents();

        // Initial update
        this.updateConnectionIndicator();
    }

    createConnectionIndicator() {
        this.container = document.createElement('div');
        this.container.className = 'connection-indicator';
        this.container.innerHTML = `
            <div class="connection-bars">
                <div class="bar"></div>
                <div class="bar"></div>
                <div class="bar"></div>
                <div class="bar"></div>
            </div>
            <span class="connection-text">Checking...</span>
        `;

        document.body.appendChild(this.container);
    }

    createQueueIndicator() {
        this.queueIndicator = document.createElement('div');
        this.queueIndicator.className = 'queue-indicator';
        this.queueIndicator.innerHTML = `
            <div class="queue-spinner"></div>
            <span class="queue-text">0 requests queued</span>
        `;

        document.body.appendChild(this.queueIndicator);
    }

    subscribeToEvents() {
        const nm = window.networkManager;

        nm.on('online', () => {
            this.updateConnectionIndicator();
            this.hideOfflineBanner();
        });

        nm.on('offline', () => {
            this.updateConnectionIndicator();
            this.showOfflineBanner();
        });

        nm.on('connectionChange', () => {
            this.updateConnectionIndicator();
        });

        nm.on('requestRecovered', (event) => {
            this.showRecoveryNotification(event.detail);
        });

        // Update queue indicator periodically
        setInterval(() => {
            this.updateQueueIndicator();
        }, 1000);
    }

    updateConnectionIndicator() {
        const stats = window.networkManager.getStats();
        const textElement = this.container.querySelector('.connection-text');

        // Remove all quality classes
        this.container.className = 'connection-indicator';

        if (!stats.online) {
            this.container.classList.add('connection-offline');
            this.container.style.display = 'block'; // Show when offline
            textElement.textContent = 'Offline';
            return;
        }

        // Hide when online (unless you want to show connection quality)
        this.container.style.display = 'none'; // ADD THIS - Hide when online

        /* Update based on quality
 this.container.style.display = 'block';
    switch (stats.connectionQuality) {
        case 'excellent':
            this.container.classList.add('connection-excellent');
            textElement.textContent = '4G';
            break;
        case 'good':
            this.container.classList.add('connection-good');
            textElement.textContent = '3G';
            break;
        case 'poor':
            this.container.classList.add('connection-poor');
            textElement.textContent = '2G';
            break;
        default:
            this.container.classList.add('connection-good');
            textElement.textContent = 'Online';
    } */
    }

    updateQueueIndicator() {
        const stats = window.networkManager.getStats();
        const queueCount = stats.queuedRequests;

        if (queueCount > 0) {
            this.queueIndicator.classList.add('active');
            this.queueIndicator.querySelector('.queue-text').textContent =
                `${queueCount} request${queueCount !== 1 ? 's' : ''} queued`;
        } else {
            this.queueIndicator.classList.remove('active');
            this.queueIndicator.style.display = 'none'; // ADD THIS - Hide when 0
        }
    }

    showOfflineBanner() {
        // Remove existing banner
        document.querySelector('.offline-banner')?.remove();

        const banner = document.createElement('div');
        banner.className = 'offline-banner';
        banner.innerHTML = `
            <span>📴 You're offline. Content will load when connection is restored.</span>
            <button class="retry-btn" onclick="networkStatus.retryConnection()">Retry</button>
        `;

        document.body.prepend(banner);
    }

    hideOfflineBanner() {
        const banner = document.querySelector('.offline-banner');
        if (banner) {
            banner.style.animation = 'slideUp 0.3s ease';
            setTimeout(() => banner.remove(), 300);
        }
    }

    showRecoveryNotification(details) {
        const notification = document.createElement('div');
        notification.className = 'network-notification recovery';
        notification.innerHTML = `
            <span>✅ Recovered: ${details.method} ${details.url.split('/').pop()}</span>
        `;
        notification.style.cssText = `
            position: fixed;
            bottom: 140px;
            right: 20px;
            background: #4CAF50;
            color: white;
            padding: 10px 15px;
            border-radius: 8px;
            font-size: 13px;
            z-index: 9999;
            animation: slideInRight 0.3s ease;
        `;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    async retryConnection() {
        const button = document.querySelector('.offline-banner .retry-btn');
        if (button) {
            button.disabled = true;
            button.textContent = 'Checking...';
        }

        const isOnline = await window.networkManager.checkConnectivity();

        if (button) {
            button.disabled = false;
            button.textContent = 'Retry';
        }

        if (isOnline) {
            this.hideOfflineBanner();
        }
    }
}

// Create global instance
window.networkStatus = new NetworkStatus();