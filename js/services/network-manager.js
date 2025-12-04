// network-manager.js - Comprehensive network and connectivity management
class NetworkManager {
    constructor() {
        // Network state
        this.online = navigator.onLine;
        this.connectionType = this.getConnectionType();
        this.connectionQuality = 'unknown';
        
        // Retry configuration
        this.retryQueue = [];
        this.maxRetries = 3;
        this.retryDelays = [1000, 3000, 5000]; // Exponential backoff
        this.isProcessingQueue = false;
        
        // Failed requests cache
        this.failedRequests = new Map();
        
        // Connection monitoring
        this.lastOnlineTime = Date.now();
        this.downtime = 0;
        
        // Initialize
        this.setupEventListeners();
        this.startConnectionMonitoring();
        
        // Check initial state
        this.checkConnectivity();
    }
    
    // Setup network event listeners
    setupEventListeners() {
        // Online/Offline events
        window.addEventListener('online', () => this.handleOnline());
        window.addEventListener('offline', () => this.handleOffline());
        
        // Connection change event (for mobile)
        if ('connection' in navigator) {
            navigator.connection.addEventListener('change', () => {
                this.handleConnectionChange();
            });
        }
        
        // Visibility change - check connection when app becomes visible
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                this.checkConnectivity();
            }
        });
        
        // Custom events for app components
        this.eventTarget = new EventTarget();
    }
    
    // Get connection type
    getConnectionType() {
        if ('connection' in navigator) {
            const conn = navigator.connection;
            return {
                type: conn.effectiveType || 'unknown',
                downlink: conn.downlink || 0,
                rtt: conn.rtt || 0,
                saveData: conn.saveData || false
            };
        }
        return { type: 'unknown' };
    }
    
    // Check connectivity with actual network request
    async checkConnectivity() {
        try {
            // Try to fetch a small file with cache bypass
            const response = await fetch('/manifest.json', {
                method: 'HEAD',
                cache: 'no-store'
            });
            
            if (response.ok) {
                this.setOnline(true);
                return true;
            }
        } catch (error) {
            // Network request failed
            console.log('Connectivity check failed:', error);
        }
        
        this.setOnline(false);
        return false;
    }
    
    // Handle going online
    handleOnline() {
        console.log('Network: Online');
        this.setOnline(true);
        
        // Calculate downtime
        if (this.downtime > 0) {
            const downtimeDuration = Date.now() - this.downtime;
            console.log(`Network was down for ${Math.round(downtimeDuration / 1000)}s`);
        }
        
        this.lastOnlineTime = Date.now();
        this.downtime = 0;
        
        // Process retry queue
        this.processRetryQueue();
        
        // Emit event
        this.emit('online');
        
        // Show notification
        this.showNetworkStatus('online');
    }
    
    // Handle going offline
    handleOffline() {
        console.log('Network: Offline');
        this.setOnline(false);
        
        this.downtime = Date.now();
        
        // Emit event
        this.emit('offline');
        
        // Show notification
        this.showNetworkStatus('offline');
    }
    
    // Handle connection type change
    handleConnectionChange() {
        const oldType = this.connectionType;
        this.connectionType = this.getConnectionType();
        
        console.log('Connection changed:', oldType, '→', this.connectionType);
        
        // Adjust behavior based on connection quality
        this.updateConnectionQuality();
        
        // Emit event
        this.emit('connectionChange', this.connectionType);
    }
    
    // Update connection quality assessment
    updateConnectionQuality() {
        if (!this.online) {
            this.connectionQuality = 'offline';
            return;
        }
        
        const conn = this.connectionType;
        
        if (conn.type === '4g' && conn.downlink > 5) {
            this.connectionQuality = 'excellent';
        } else if (conn.type === '4g' || (conn.type === '3g' && conn.downlink > 1)) {
            this.connectionQuality = 'good';
        } else if (conn.type === '3g' || conn.type === '2g') {
            this.connectionQuality = 'poor';
        } else {
            this.connectionQuality = 'unknown';
        }
        
        console.log('Connection quality:', this.connectionQuality);
    }
    
    // Set online state
    setOnline(online) {
        this.online = online;
        
        // Update UI
        document.body.classList.toggle('offline', !online);
        document.body.classList.toggle('online', online);
    }
    
    // Fetch with retry logic
    async fetchWithRetry(url, options = {}, retryCount = 0) {
        const requestKey = `${options.method || 'GET'}-${url}`;
        
        try {
            // Add timeout to prevent hanging requests
            const timeout = this.getTimeoutForQuality();
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeout);
            
            const response = await fetch(url, {
                ...options,
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            // Success - remove from failed requests if present
            this.failedRequests.delete(requestKey);
            
            return response;
            
        } catch (error) {
            console.error(`Fetch failed (attempt ${retryCount + 1}):`, error);
            
            // Check if we should retry
            if (retryCount < this.maxRetries) {
                // If offline, add to queue instead of retrying immediately
                if (!this.online) {
                    this.addToRetryQueue(url, options);
                    throw new Error('Offline - request queued for retry');
                }
                
                // Online but failed - retry with backoff
                const delay = this.retryDelays[retryCount] || 5000;
                console.log(`Retrying in ${delay}ms...`);
                
                await this.delay(delay);
                return this.fetchWithRetry(url, options, retryCount + 1);
            }
            
            // Max retries exceeded
            this.failedRequests.set(requestKey, {
                url,
                options,
                error: error.message,
                timestamp: Date.now()
            });
            
            throw error;
        }
    }
    
    // Get timeout based on connection quality
    getTimeoutForQuality() {
        switch (this.connectionQuality) {
            case 'excellent': return 10000;  // 10s
            case 'good': return 15000;       // 15s
            case 'poor': return 30000;       // 30s
            default: return 20000;           // 20s
        }
    }
    
    // Add request to retry queue
    addToRetryQueue(url, options) {
        // Check if already in queue
        const exists = this.retryQueue.some(req => 
            req.url === url && JSON.stringify(req.options) === JSON.stringify(options)
        );
        
        if (!exists) {
            this.retryQueue.push({
                url,
                options,
                timestamp: Date.now(),
                attempts: 0
            });
            
            console.log(`Added to retry queue: ${url}`);
            this.saveRetryQueue();
        }
    }
    
    // Process retry queue when online
    async processRetryQueue() {
        if (!this.online || this.isProcessingQueue || this.retryQueue.length === 0) {
            return;
        }
        
        this.isProcessingQueue = true;
        console.log(`Processing ${this.retryQueue.length} queued requests`);
        
        const processed = [];
        
        for (const request of this.retryQueue) {
            try {
                console.log(`Retrying queued request: ${request.url}`);
                
                const response = await this.fetchWithRetry(
                    request.url, 
                    request.options, 
                    request.attempts
                );
                
                if (response.ok) {
                    processed.push(request);
                    
                    // Emit success event
                    this.emit('requestRecovered', {
                        url: request.url,
                        method: request.options.method || 'GET'
                    });
                }
                
            } catch (error) {
                console.error(`Failed to process queued request: ${request.url}`, error);
                request.attempts++;
                
                // Remove if max attempts exceeded
                if (request.attempts >= this.maxRetries) {
                    processed.push(request);
                }
            }
        }
        
        // Remove processed requests
        this.retryQueue = this.retryQueue.filter(req => !processed.includes(req));
        this.saveRetryQueue();
        
        this.isProcessingQueue = false;
        
        if (processed.length > 0) {
            this.showNotification(`✅ ${processed.length} queued requests completed`);
        }
    }
    
    // Save retry queue to localStorage for persistence
    saveRetryQueue() {
        try {
            localStorage.setItem('networkRetryQueue', JSON.stringify(this.retryQueue));
        } catch (e) {
            console.warn('Failed to save retry queue:', e);
        }
    }
    
    // Load retry queue from localStorage
    loadRetryQueue() {
        try {
            const saved = localStorage.getItem('networkRetryQueue');
            if (saved) {
                this.retryQueue = JSON.parse(saved);
                console.log(`Loaded ${this.retryQueue.length} queued requests`);
            }
        } catch (e) {
            console.warn('Failed to load retry queue:', e);
        }
    }
    
    // Monitor connection quality with periodic checks
    startConnectionMonitoring() {
        // Load saved queue
        this.loadRetryQueue();
        
        // Periodic connectivity check
        setInterval(() => {
            if (document.hidden) return; // Skip if app is in background
            
            if (this.online) {
                // Verify we're actually online
                this.checkConnectivity();
            } else {
                // Try to detect if we're back online
                this.checkConnectivity();
            }
        }, 30000); // Check every 30 seconds
        
        // Monitor failed requests and clean up old ones
        setInterval(() => {
            const now = Date.now();
            const maxAge = 3600000; // 1 hour
            
            for (const [key, request] of this.failedRequests.entries()) {
                if (now - request.timestamp > maxAge) {
                    this.failedRequests.delete(key);
                }
            }
        }, 60000); // Clean up every minute
    }
    
    // Show network status notification
    showNetworkStatus(status) {
        // Remove existing notification
        document.querySelector('.network-status')?.remove();
        
        const notification = document.createElement('div');
        notification.className = `network-status network-${status}`;
        
        if (status === 'online') {
            notification.innerHTML = `
                <span class="network-icon">🟢</span>
                <span>Back Online</span>
            `;
            notification.style.background = '#4CAF50';
        } else {
            notification.innerHTML = `
                <span class="network-icon">🔴</span>
                <span>No Connection</span>
            `;
            notification.style.background = '#f44336';
        }
        
        notification.style.cssText += `
            position: fixed;
            top: 10px;
            left: 50%;
            transform: translateX(-50%);
            color: white;
            padding: 10px 20px;
            border-radius: 20px;
            font-size: 14px;
            font-weight: bold;
            z-index: 10000;
            animation: slideDown 0.3s ease;
            box-shadow: 0 3px 10px rgba(0,0,0,0.2);
        `;
        
        document.body.appendChild(notification);
        
        // Auto-hide for online notification
        if (status === 'online') {
            setTimeout(() => {
                notification.style.animation = 'slideUp 0.3s ease';
                setTimeout(() => notification.remove(), 300);
            }, 3000);
        }
    }
    
    // Show general notification
    showNotification(message, duration = 3000) {
        const notification = document.createElement('div');
        notification.className = 'network-notification';
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: #323232;
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            font-size: 14px;
            z-index: 9999;
            animation: slideInRight 0.3s ease;
            max-width: 300px;
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, duration);
    }
    
    // Utility: delay function
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    // Event emitter methods
    emit(eventName, data) {
        const event = new CustomEvent(eventName, { detail: data });
        this.eventTarget.dispatchEvent(event);
    }
    
    on(eventName, callback) {
        this.eventTarget.addEventListener(eventName, callback);
    }
    
    off(eventName, callback) {
        this.eventTarget.removeEventListener(eventName, callback);
    }
    
    // Get network statistics
    getStats() {
        return {
            online: this.online,
            connectionType: this.connectionType,
            connectionQuality: this.connectionQuality,
            queuedRequests: this.retryQueue.length,
            failedRequests: this.failedRequests.size,
            lastOnlineTime: this.lastOnlineTime,
            downtime: this.downtime
        };
    }
}

// Create global instance
window.networkManager = new NetworkManager();