// audio-service.js - iOS-optimized audio service
class AudioService {
    constructor() {
        // iOS Detection
        this.isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
        this.isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

        // Audio context for iOS
        this.audioContext = null;
        this.isUnlocked = false;

        // Audio pool for iOS
        this.audioPool = [];
        this.poolSize = 3;
        this.currentPoolIndex = 0;

        // Track current audio
        this.currentAudio = null;
        this.audioElements = new Set();

        // iOS-specific state
        this.iosAudioSession = null;
        this.backgroundMode = false;

        // Initialize based on platform
        if (this.isIOS) {
            this.initializeIOSAudio();
        } else {
            this.initializeStandardAudio();
        }

        // Handle page visibility for iOS
        this.setupVisibilityHandlers();
    }

    // iOS-specific initialization
    initializeIOSAudio() {
        // Create Web Audio context for better iOS control
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        this.audioContext = new AudioContext();

        // Pre-create audio elements for iOS
        for (let i = 0; i < this.poolSize; i++) {
            const audio = new Audio();

            // iOS-specific attributes
            audio.setAttribute('playsinline', 'true');
            audio.setAttribute('webkit-playsinline', 'true');
            audio.preload = 'metadata';
            audio.volume = 1.0;

            // Keep audio elements in DOM for iOS
            audio.style.display = 'none';
            document.body.appendChild(audio);

            this.audioPool.push(audio);
        }

        console.log('iOS Audio initialized with pool of', this.poolSize);
    }

    // Standard initialization for other browsers
    initializeStandardAudio() {
        console.log('Standard Audio initialized');
    }

    // Unlock audio context - MUST be called on user interaction
    async unlockAudioContext() {
        if (this.isUnlocked) return true;

        try {
            if (this.isIOS) {
                // Method 1: Play silence through Web Audio API
                if (this.audioContext && this.audioContext.state === 'suspended') {
                    await this.audioContext.resume();
                }

                // Method 2: Play silence through all pooled audio elements
                const unlockPromises = this.audioPool.map(async (audio) => {
                    audio.src = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBIAAAABAAEARKwAAIAESQAQABAAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGS2Oy9diMFl2z9';
                    audio.volume = 0.001;

                    try {
                        const playPromise = audio.play();
                        if (playPromise !== undefined) {
                            await playPromise;
                            audio.pause();
                            audio.currentTime = 0;
                        }
                    } catch (e) {
                        console.log('Audio unlock attempt failed for element:', e);
                    }
                });

                await Promise.all(unlockPromises);

                // Method 3: Create and play an oscillator (Web Audio API)
                const source = this.audioContext.createBufferSource();
                const buffer = this.audioContext.createBuffer(1, 1, 22050);
                source.buffer = buffer;
                source.connect(this.audioContext.destination);
                source.start(0);
                source.stop(0.001);
            } else {
                // For non-iOS browsers
                const audio = new Audio();
                audio.src = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBIAAAABAAEARKwAAIAESQAQABAAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGS2Oy9diMFl2z9';
                audio.volume = 0.001;
                await audio.play();
                audio.pause();
            }

            this.isUnlocked = true;
            console.log('Audio context unlocked successfully');
            return true;

        } catch (error) {
            console.error('Failed to unlock audio context:', error);
            return false;
        }
    }

    // Get or create audio element
    async getAudioElement(audioUrl) {
        if (this.isIOS) {
            return this.getIOSAudioElement(audioUrl);
        } else {
            return this.getStandardAudioElement(audioUrl);
        }
    }

    // iOS-specific audio element handling
    async getIOSAudioElement(audioUrl) {
        // Use pooled audio element
        const audio = this.audioPool[this.currentPoolIndex];
        this.currentPoolIndex = (this.currentPoolIndex + 1) % this.poolSize;

        // Stop and reset current audio if it exists
        if (audio.src && !audio.paused) {
            audio.pause();
        }

        // Clear previous source
        audio.removeAttribute('src');
        audio.load();

        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('iOS audio load timeout'));
            }, 10000);

            const handleCanPlay = () => {
                clearTimeout(timeout);
                cleanup();
                resolve(audio);
            };

            const handleError = (e) => {
                clearTimeout(timeout);
                cleanup();
                reject(new Error('iOS audio load error: ' + e.message));
            };

            const cleanup = () => {
                audio.removeEventListener('canplaythrough', handleCanPlay);
                audio.removeEventListener('error', handleError);
            };

            // Set up listeners before setting src
            audio.addEventListener('canplaythrough', handleCanPlay, { once: true });
            audio.addEventListener('error', handleError, { once: true });

            // Set source and load
            audio.src = audioUrl;
            audio.load();
        });
    }

    // Standard audio element for non-iOS
    async getStandardAudioElement(audioUrl) {
        const audio = new Audio();
        audio.preload = 'auto';

        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Audio load timeout'));
            }, 5000);

            audio.addEventListener('canplay', () => {
                clearTimeout(timeout);
                resolve(audio);
            }, { once: true });

            audio.addEventListener('error', (e) => {
                clearTimeout(timeout);
                reject(e);
            }, { once: true });

            audio.src = audioUrl;
        });
    }

    // Play audio with iOS handling
    async playAudio(audio, startTime = 0) {
        try {
            // Ensure audio context is unlocked
            if (!this.isUnlocked) {
                await this.unlockAudioContext();
            }

            if (this.isIOS) {
                // iOS-specific play handling
                if (this.audioContext && this.audioContext.state === 'suspended') {
                    await this.audioContext.resume();
                }

                // Set current time before play for iOS
                if (startTime > 0) {
                    audio.currentTime = startTime;
                }

                // Use promise-based play
                const playPromise = audio.play();

                if (playPromise !== undefined) {
                    await playPromise;
                    this.currentAudio = audio;

                    // Keep audio context active
                    this.keepIOSAudioActive();

                    return true;
                }
            } else {
                // Standard play
                audio.currentTime = startTime;
                await audio.play();
                this.currentAudio = audio;
                return true;
            }
        } catch (error) {
            console.error('Play failed:', error);

            // Retry once for iOS
            if (this.isIOS && error.name === 'NotAllowedError') {
                console.log('Retrying play after NotAllowedError...');
                await this.unlockAudioContext();

                try {
                    await audio.play();
                    this.currentAudio = audio;
                    return true;
                } catch (retryError) {
                    console.error('Retry failed:', retryError);
                    throw retryError;
                }
            }

            throw error;
        }
    }

    // Keep iOS audio context active
    keepIOSAudioActive() {
        if (!this.isIOS || !this.audioContext) return;

        // Create a silent oscillator to keep context active
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        oscillator.frequency.value = 0;
        gainNode.gain.value = 0;

        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        oscillator.start();

        // Stop after a short time
        setTimeout(() => {
            oscillator.stop();
        }, 100);
    }

    // Pause current audio
    pauseAudio() {
        if (this.currentAudio && !this.currentAudio.paused) {
            this.currentAudio.pause();

            if (this.isIOS && this.audioContext) {
                this.audioContext.suspend();
            }
        }
    }

    // Resume audio
    async resumeAudio() {
        if (this.currentAudio && this.currentAudio.paused) {
            if (this.isIOS && this.audioContext) {
                await this.audioContext.resume();
            }

            await this.currentAudio.play();
        }
    }

    // Stop and cleanup
    stopAudio() {
        if (this.currentAudio) {
            this.currentAudio.pause();
            this.currentAudio.currentTime = 0;

            if (!this.isIOS) {
                // Only clear source for non-iOS
                this.currentAudio.src = '';
                this.currentAudio.load();
            }
        }

        if (this.isIOS && this.audioContext) {
            this.audioContext.suspend();
        }
    }

    // Cleanup all audio
    cleanup() {
        if (this.isIOS) {
            // Don't destroy pooled elements, just pause them
            this.audioPool.forEach(audio => {
                audio.pause();
                audio.currentTime = 0;
            });
        } else {
            // Standard cleanup
            this.audioElements.forEach(audio => {
                audio.pause();
                audio.currentTime = 0;
                audio.src = '';
                audio.load();
                audio.remove();
            });
            this.audioElements.clear();
        }

        this.currentAudio = null;
    }

    // Handle visibility changes
    setupVisibilityHandlers() {
        document.addEventListener('visibilitychange', () => {
            if (this.isIOS && this.currentAudio) {
                if (document.hidden) {
                    // App going to background
                    this.backgroundMode = true;
                    this.handleIOSBackground();
                } else {
                    // App coming to foreground
                    this.backgroundMode = false;
                    this.handleIOSForeground();
                }
            }
        });

        // Handle iOS-specific audio interruptions
        if (this.isIOS) {
            window.addEventListener('pause', () => {
                this.handleIOSBackground();
            });

            window.addEventListener('resume', () => {
                this.handleIOSForeground();
            });
        }
    }

    // Handle iOS background mode
    handleIOSBackground() {
        console.log('iOS app entering background');
        // Store current playback state
        if (this.currentAudio) {
            this.iosAudioSession = {
                src: this.currentAudio.src,
                currentTime: this.currentAudio.currentTime,
                paused: this.currentAudio.paused
            };
        }
    }

    // Handle iOS foreground mode
    async handleIOSForeground() {
        console.log('iOS app entering foreground');

        // Restore audio session if needed
        if (this.iosAudioSession && this.currentAudio) {
            if (!this.iosAudioSession.paused) {
                // Resume playback
                try {
                    await this.audioContext.resume();
                    await this.currentAudio.play();
                } catch (error) {
                    console.error('Failed to resume audio after foreground:', error);
                }
            }
        }
    }

    // Get current audio
    getCurrentAudio() {
        return this.currentAudio;
    }

    // Set current audio
    setCurrentAudio(audio) {
        this.currentAudio = audio;
    }

    // Check if audio is playing
    isPlaying() {
        return this.currentAudio && !this.currentAudio.paused;
    }

    // Add this method to the AudioService class in audio-service.js
    async loadTimingData(surahNumber, verseNumber) {
        try {
            const paddedSurah = surahNumber.toString().padStart(3, '0');
            const paddedVerse = verseNumber.toString().padStart(3, '0');
            const timingPath = `./quran-data/complete-timings/surah_${paddedSurah}_complete.json`;

            console.log(`Loading timing data: ${timingPath}`);

            const response = await fetch(timingPath);
            if (!response.ok) {
                console.log(`No timing data available for verse ${verseNumber}`);
                return null;
            }

const timingData = await response.json();

// Find the specific verse from the complete timing file
const verseTimingData = timingData.find(v => v.verseNumber == verseNumber);

if (!verseTimingData) {
    console.log(`No timing data available for verse ${verseNumber}`);
    return null;
}

console.log(`Loaded timing data for verse ${verseNumber}:`, verseTimingData);
return verseTimingData;

        } catch (error) {
            console.log(`Failed to load timing data for verse ${verseNumber}:`, error);
            return null;
        }
    }

    // Add these methods to the AudioService class

// Network-aware audio loading
async loadAudioWithNetworkHandling(audioUrl) {
    // Check network status first
    if (window.networkManager && !window.networkManager.online) {
        // Check if audio is cached
        const cached = await this.checkAudioCache(audioUrl);
        if (cached) {
            console.log('Using cached audio for offline playback');
            return cached;
        }
        
        throw new Error('Audio not available offline');
    }
    
    // Get connection quality
    const quality = window.networkManager ? 
        window.networkManager.connectionQuality : 
        'unknown';
    
    // Adjust loading strategy based on connection
    switch (quality) {
        case 'excellent':
        case 'good':
            // Preload full audio
            return this.loadFullAudio(audioUrl);
            
        case 'poor':
            // Load with minimal buffering
            return this.loadMinimalAudio(audioUrl);
            
        case 'offline':
            throw new Error('No network connection');
            
        default:
            // Standard loading
            return this.getAudioElement(audioUrl);
    }
}

async loadFullAudio(audioUrl) {
    const audio = await this.getAudioElement(audioUrl);
    audio.preload = 'auto';
    
    // Wait for full load on good connection
    return new Promise((resolve, reject) => {
        const handleCanPlayThrough = () => {
            cleanup();
            resolve(audio);
        };
        
        const handleError = (e) => {
            cleanup();
            reject(e);
        };
        
        const cleanup = () => {
            audio.removeEventListener('canplaythrough', handleCanPlayThrough);
            audio.removeEventListener('error', handleError);
        };
        
        audio.addEventListener('canplaythrough', handleCanPlayThrough);
        audio.addEventListener('error', handleError);
        
        audio.load();
    });
}

async loadMinimalAudio(audioUrl) {
    const audio = await this.getAudioElement(audioUrl);
    audio.preload = 'metadata'; // Only load metadata on poor connection
    
    return new Promise((resolve, reject) => {
        const handleLoadedMetadata = () => {
            cleanup();
            resolve(audio);
        };
        
        const handleError = (e) => {
            cleanup();
            reject(e);
        };
        
        const cleanup = () => {
            audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
            audio.removeEventListener('error', handleError);
        };
        
        audio.addEventListener('loadedmetadata', handleLoadedMetadata);
        audio.addEventListener('error', handleError);
        
        audio.load();
    });
}

async checkAudioCache(audioUrl) {
    // Check if service worker has cached this audio
    if ('caches' in window) {
        try {
            const cache = await caches.open('quran-audio-v1.0.0');
            const response = await cache.match(audioUrl);
            
            if (response) {
                const blob = await response.blob();
                const objectUrl = URL.createObjectURL(blob);
                
                const audio = new Audio();
                audio.src = objectUrl;
                
                return audio;
            }
        } catch (error) {
            console.error('Cache check failed:', error);
        }
    }
    
    return null;
}

// Add buffering status monitoring
monitorBuffering(audio) {
    let lastBufferCheck = 0;
    let bufferStalls = 0;
    
    const checkBuffer = () => {
        if (!audio || audio.paused || audio.ended) {
            return;
        }
        
        const buffered = audio.buffered;
        const currentTime = audio.currentTime;
        
        if (buffered.length > 0) {
            const bufferedEnd = buffered.end(buffered.length - 1);
            const bufferRemaining = bufferedEnd - currentTime;
            
            if (bufferRemaining < 2) {
                // Less than 2 seconds buffered
                this.showBufferingIndicator();
                bufferStalls++;
                
                // Report poor streaming experience
                if (bufferStalls > 3 && window.networkManager) {
                    console.warn('Multiple buffer stalls detected');
                    this.suggestDownload();
                }
            } else {
                this.hideBufferingIndicator();
            }
        }
        
        requestAnimationFrame(checkBuffer);
    };
    
    checkBuffer();
}

showBufferingIndicator() {
    if (!document.querySelector('.buffering-indicator')) {
        const indicator = document.createElement('div');
        indicator.className = 'buffering-indicator';
        indicator.innerHTML = `
            <div class="buffering-spinner"></div>
            <span>Buffering...</span>
        `;
        indicator.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0,0,0,0.8);
            color: white;
            padding: 15px 25px;
            border-radius: 10px;
            display: flex;
            align-items: center;
            gap: 10px;
            z-index: 10000;
        `;
        
        document.body.appendChild(indicator);
    }
}

hideBufferingIndicator() {
    document.querySelector('.buffering-indicator')?.remove();
}

suggestDownload() {
    if (!document.querySelector('.download-suggestion')) {
        const suggestion = document.createElement('div');
        suggestion.className = 'download-suggestion';
        suggestion.innerHTML = `
            <span>Poor connection detected</span>
            <button onclick="audioService.downloadCurrentSurah()">Download for Offline</button>
        `;
        suggestion.style.cssText = `
            position: fixed;
            bottom: 100px;
            left: 50%;
            transform: translateX(-50%);
            background: #FF9800;
            color: white;
            padding: 12px 20px;
            border-radius: 25px;
            display: flex;
            align-items: center;
            gap: 15px;
            z-index: 9999;
        `;
        
        document.body.appendChild(suggestion);
        
        setTimeout(() => suggestion.remove(), 10000);
    }
}
}

// Create global instance
window.audioService = new AudioService();