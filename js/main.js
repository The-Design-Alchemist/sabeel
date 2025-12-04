// Main application logic with state management

// Initialize state subscriptions
document.addEventListener('DOMContentLoaded', () => {
// Subscribe to highlighting changes
window.appStore.subscribe('highlightingEnabled', (enabled) => {
    if (!window.wordHighlighter) return;
    
    const isPlaying = window.appStore.get('isReciting') && !window.appStore.get('isPaused');
    
    if (enabled) {
        console.log('Highlighting enabled');
        // If currently playing, start highlighting immediately
        if (isPlaying) {
            window.wordHighlighter.startHighlighting();
        }
    } else {
        console.log('Highlighting disabled');
        // Stop highlighting but don't affect playback
        window.wordHighlighter.pauseHighlighting();
    }
});
    
// Subscribe to verse changes - FIXED VERSION
window.appStore.subscribe('currentVerseIndex', (newIndex, oldIndex) => {
    if (window.readingProgress && window.appStore.get('currentSurah')) {
        const surahNumber = getSurahFromURL();
        const verses = window.appStore.get('verses');
        
        if (verses && verses[newIndex]) {
            const verse = verses[newIndex];
            
            // CRITICAL FIX: Only save progress for actual verses, not Bismillah
            if (verse.number !== 'Bismillah') {
                const segmentIndex = window.appStore.get('isSegmentedVerse') ? 
                    window.verseDisplay?.currentSegmentIndex : null;
                console.log(`🔍 SUBSCRIBER SAVING: Verse ${verse.number}, Segment: ${segmentIndex}, verseDisplay.currentSegmentIndex: ${window.verseDisplay?.currentSegmentIndex}`);
                // Call savePosition with all required parameters
                window.readingProgress.savePosition(
                    surahNumber, 
                    newIndex, 
                    verse.number,
                    segmentIndex
                );
            }
        }
    }
});
});

// Keep currentAudio as the only global that's not in state (since it's an object reference)
window.currentAudio = null;

// Application class to manage everything
class QuranLearningApp {
constructor() {
    this.loadingElement = document.getElementById('loading');
    this.errorElement = document.getElementById('error');
    this.audioControlsElement = document.getElementById('audio-controls');
    this.verseContainerElement = document.getElementById('verse-container');
    
    // Log for debugging
    console.log('QuranLearningApp initialized', {
        loading: !!this.loadingElement,
        error: !!this.errorElement,
        audioControls: !!this.audioControlsElement,
        verseContainer: !!this.verseContainerElement
    });

    this.initializeNetworkHandling();
}

    initializeNetworkHandling() {
    if (!window.networkManager) {
        console.warn('NetworkManager not initialized');
        return;
    }
    
    // Subscribe to network events
    window.networkManager.on('offline', () => {
        this.handleOffline();
    });
    
    window.networkManager.on('online', () => {
        this.handleOnline();
    });
    
    // Check initial network state
    if (!window.networkManager.online) {
        this.showOfflineNotice();
    }
}

handleOffline() {
    console.log('App: Went offline');
    
    // Pause any ongoing downloads
    if (window.appStore.get('isReciting')) {
        pauseRecitation();
        this.showNotification('⏸️ Playback paused - No connection', 'warning');
    }
    
    // Switch to offline mode UI
    document.body.classList.add('offline-mode');
}

handleOnline() {
    console.log('App: Back online');
    
    // Remove offline mode UI
    document.body.classList.remove('offline-mode');
    
    // Resume any paused activities
    if (window.appStore.get('isPaused')) {
        this.showNotification('📶 Connection restored - Tap play to resume', 'info');
    }
    
    // Refresh data if needed
    this.refreshDataIfNeeded();
}

async refreshDataIfNeeded() {
    const currentSurah = window.appStore.get('currentSurah');
    if (!currentSurah) return;
    
    // Check if current data is stale
    const lastUpdate = localStorage.getItem(`lastUpdate_${getSurahFromURL()}`);
    const staleTime = 3600000; // 1 hour
    
    if (lastUpdate && Date.now() - parseInt(lastUpdate) > staleTime) {
        console.log('Refreshing stale data...');
        
        try {
            const freshData = await apiService.fetchVerseData(getSurahFromURL());
            window.appStore.set('verses', freshData);
            
            localStorage.setItem(`lastUpdate_${getSurahFromURL()}`, Date.now());
            
            this.showNotification('✅ Content updated', 'success');
        } catch (error) {
            console.error('Failed to refresh data:', error);
        }
    }
}

showOfflineNotice() {
    const notice = document.createElement('div');
    notice.className = 'offline-notice';
    notice.innerHTML = `
        <h3>📴 Offline Mode</h3>
        <p>You can still access previously viewed content</p>
        <button onclick="this.parentElement.remove()">OK</button>
    `;
    notice.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: white;
        padding: 20px;
        border-radius: 15px;
        box-shadow: 0 10px 30px rgba(0,0,0,0.2);
        z-index: 10000;
        text-align: center;
        max-width: 300px;
    `;
    
    document.body.appendChild(notice);
}

    // Initialize the application
    async initialize() {
        try {
            // iOS Audio initialization handler
            if (audioService.isIOS) {
                // Show iOS-specific instruction if needed
                this.addIOSAudioHandler();
            }
            
            const surahNumber = getSurahFromURL();
            console.log(`🚀 Starting Dynamic Quran App for Surah ${surahNumber}`);
            
            await this.loadSurah(surahNumber);
            
        } catch (error) {
            console.error('Failed to initialize app:', error);
            this.showError('Failed to initialize application');
        }
    }

    // Add iOS audio handler for first user interaction
    addIOSAudioHandler() {
        // One-time unlock on first user interaction
        const unlockHandler = async () => {
            const unlocked = await audioService.unlockAudioContext();
            
            if (unlocked) {
                console.log('iOS Audio unlocked via user interaction');
                
                // Show success feedback
                this.showNotification('Audio enabled ✓', 'success');
            }
            
            // Remove listeners after first unlock
            document.removeEventListener('touchstart', unlockHandler);
            document.removeEventListener('click', unlockHandler);
        };
        
        // Add listeners for first user interaction
        document.addEventListener('touchstart', unlockHandler, { once: true });
        document.addEventListener('click', unlockHandler, { once: true });
        
        // Show iOS audio indicator if needed
        if (audioService.isIOS) {
            this.showIOSAudioIndicator();
        }
    }

    // Show iOS audio indicator
    showIOSAudioIndicator() {
        const indicator = document.createElement('div');
        indicator.className = 'ios-audio-indicator';
        indicator.textContent = '🎵 Tap anywhere to enable audio';
        indicator.style.cssText = `
            position: fixed;
            top: 60px;
            left: 50%;
            transform: translateX(-50%);
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 8px 20px;
            border-radius: 20px;
            font-size: 14px;
            z-index: 1000;
            animation: pulse 2s infinite;
        `;
        
        document.body.appendChild(indicator);
        
        // Remove after first interaction
        const removeIndicator = () => {
            indicator.remove();
            document.removeEventListener('touchstart', removeIndicator);
            document.removeEventListener('click', removeIndicator);
        };
        
        document.addEventListener('touchstart', removeIndicator, { once: true });
        document.addEventListener('click', removeIndicator, { once: true });
    }

    // Show notification
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `app-notification ${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            background: ${type === 'success' ? '#4CAF50' : '#2196F3'};
            color: white;
            border-radius: 8px;
            box-shadow: 0 3px 10px rgba(0,0,0,0.2);
            z-index: 9999;
            animation: slideInRight 0.3s ease;
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 2000);
    }

// Load a specific Surah
async loadSurah(surahNumber) {
    try {
        console.log(`🕌 Loading Surah ${surahNumber}`);
        
        // Update state
        window.appStore.set('isLoading', true);
        
        // Show loading state
        this.showLoading();
        
        // Validate and get Surah info
        const surahInfo = SURAH_DATABASE[surahNumber];
        if (!surahInfo) {
            throw new Error(`Surah ${surahNumber} not found`);
        }
        
        window.appStore.set('currentSurah', surahInfo);

        // Update header
        this.updateHeader(surahNumber);

        // Track this surah as recently accessed
        if (window.readingProgress) {
            window.readingProgress.addToRecent(surahNumber);
        }

        // Fetch verse data
        const verseData = await apiService.fetchVerseData(surahNumber);
        if (!verseData || verseData.length === 0) {
            throw new Error(`No verse data found for Surah ${surahNumber}`);
        }

        // Build verses array
        await this.buildVersesArray(surahNumber, verseData);

        console.log(`📖 Loaded ${window.appStore.get('verses').length} verses for Surah ${surahNumber}`);

        // Generate verse HTML
        window.verseDisplay.generateHTML();

        // NEW LOGIC: Check if Bismillah screen should be shown
        const hasBismillah = surahNumber !== 9;
        
// Check for saved progress - UPDATED
const savedPosition = window.readingProgress?.getPosition(surahNumber);

// UPDATED: Don't show resume modal if user was at Bismillah or verse 1
if (savedPosition && 
    savedPosition.verseNumber !== 'Bismillah' && 
    savedPosition.verseNumber > 1) {  // Only show resume if past verse 1
    
    // Show resume modal
    const modalShown = this.showResumeModal();
    
    if (modalShown) {
        console.log('📋 Resume modal displayed');
        
        // CRITICAL: Hide loading screen
        if (this.loadingElement) {
            this.loadingElement.style.display = 'none';
        }
        
        // Show header
        const header = document.querySelector('.header-new');
        if (header) {
            header.style.display = 'flex';
        }
        
        // Hide bismillah screen since we're showing resume modal
        const bismillahScreen = document.getElementById('bismillah-screen');
        if (bismillahScreen) {
            bismillahScreen.style.display = 'none';
        }
    } else {
        // Modal failed to show, fallback to bismillah
        this.showBismillahScreen();
    }
} else {
    // No saved progress, was at Bismillah, or was at verse 1 - show bismillah screen
    this.showBismillahScreen();
}

        // Initialize services
        this.initializeServices();

    } catch (error) {
        console.error('Error loading Surah:', error);
        window.appStore.set('error', error.message);
        this.showError(error.message);
    } finally {
        window.appStore.set('isLoading', false);
    }
}

// Show loading state
showLoading() {
    console.log('📍 Showing loading state');
    
    if (this.loadingElement) {
        this.loadingElement.style.display = 'flex';
        console.log('✅ Loading shown');
    }
    if (this.errorElement) {
        this.errorElement.style.display = 'none';
    }
    
    // Hide header
    const header = document.querySelector('.header-new');
    if (header) header.style.display = 'none';
    
    // Hide audio controls
    if (this.audioControlsElement) {
        this.audioControlsElement.style.display = 'none';
    }
    
    // Hide verse container
    if (this.verseContainerElement) {
        this.verseContainerElement.style.display = 'none';
    }
    
    // Hide all other elements
    const bottomNav = document.getElementById('bottom-navigation');
    const segmentNav = document.getElementById('segment-navigation');
    const bismillah = document.getElementById('bismillah-screen');
    
    if (bottomNav) bottomNav.style.display = 'none';
    if (segmentNav) segmentNav.style.display = 'none';
    if (bismillah) bismillah.style.display = 'none';
}

    // Show error state
    showError(message) {
        this.loadingElement.style.display = 'none';
        this.errorElement.style.display = 'block';
        document.getElementById('error-message').textContent = message;
    }

    // Show main content
// Show main content
// Show main content
showContent() {
    console.log('📍 Showing content');
    
    // Hide loading and error
    if (this.loadingElement) {
        this.loadingElement.style.display = 'none';
    }
    if (this.errorElement) {
        this.errorElement.style.display = 'none';
    }
    
    // Hide bismillah screen
    const bismillahScreen = document.getElementById('bismillah-screen');
    if (bismillahScreen) {
        bismillahScreen.style.display = 'none';
    }
    
    // Show header
    const header = document.querySelector('.header-new');
    if (header) {
        header.style.display = 'flex';
        console.log('✅ Header shown');
    }
    
    // Show audio controls
    if (this.audioControlsElement) {
        this.audioControlsElement.style.display = 'flex';
        console.log('✅ Audio controls shown');
    }
    
    // Show verse container
    if (this.verseContainerElement) {
        this.verseContainerElement.style.display = 'flex';
        console.log('✅ Verse container shown');
    }
    
    // Show bottom navigation
    const bottomNav = document.getElementById('bottom-navigation');
    if (bottomNav) {
        bottomNav.style.display = 'flex';
        console.log('✅ Bottom nav shown');
    }

    // Enable navigation buttons after content is shown
    setTimeout(() => {
        if (window.verseDisplay && window.verseDisplay.updateNavigationButtons) {
            window.verseDisplay.updateNavigationButtons();
        }
    }, 100);
    
    console.log('✅ Content display complete');
}

    // Show Bismillah screen
// Show Bismillah screen
showBismillahScreen() {
    console.log('📍 Showing Bismillah screen');
    
    // Hide loading and error - THIS IS CRITICAL
    if (this.loadingElement) {
        this.loadingElement.style.display = 'none';
        console.log('✅ Loading hidden');
    }
    if (this.errorElement) {
        this.errorElement.style.display = 'none';
    }
    
    // Show header
    const header = document.querySelector('.header-new');
    if (header) {
        header.style.display = 'flex';
        console.log('✅ Header shown');
    }
    
    // Show bismillah screen
    const bismillahScreen = document.getElementById('bismillah-screen');
    if (bismillahScreen) {
        bismillahScreen.style.display = 'flex';
        console.log('✅ Bismillah screen shown');
    } else {
        console.warn('⚠️ Bismillah screen not found, showing content directly');
        // Fallback: show content directly
        window.appStore.set('currentVerseIndex', 0);
        window.verseDisplay.show(0);
        this.showContent();
        return;
    }
    
    // Hide everything else
    if (this.audioControlsElement) {
        this.audioControlsElement.style.display = 'none';
    }
    if (this.verseContainerElement) {
        this.verseContainerElement.style.display = 'none';
    }
    
    const bottomNav = document.getElementById('bottom-navigation');
    const segmentNav = document.getElementById('segment-navigation');
    
    if (bottomNav) bottomNav.style.display = 'none';
    if (segmentNav) segmentNav.style.display = 'none';
    
    console.log('✅ Bismillah screen display complete');
}
    
    
// Show resume modal with saved progress
showResumeModal() {
    const surahNumber = getSurahFromURL();
    const position = window.readingProgress?.getPosition(surahNumber);
    
    if (!position) {
        console.log('No saved progress found');
        return false;
    }
    
    const modal = document.getElementById('resume-modal');
    const verseText = document.getElementById('resume-verse-text');
    const segmentText = document.getElementById('resume-segment-text');
    const timeText = document.getElementById('resume-time-text');
    
    if (!modal || !verseText || !timeText || !segmentText) {
        console.warn('Resume modal elements not found');
        return false;
    }
    
    // Update verse text
    verseText.textContent = `Verse ${position.verseNumber}`;
    
    // Show segment if it exists
    if (position.segmentIndex !== null && position.segmentIndex !== undefined) {
        segmentText.textContent = `, Part ${position.segmentIndex + 1}`;
        segmentText.style.display = 'inline';
    } else {
        segmentText.style.display = 'none';
    }
    
    // Update time
    const timeSince = window.readingProgress.getTimeSinceLastRead(surahNumber);
    timeText.textContent = timeSince || 'Just now';
    
    // Show modal
    modal.style.display = 'flex';

    // ✅ Hide settings button when resume modal is shown
const settingsBtn = document.querySelector('.settings-icon-btn');
if (settingsBtn) {
    settingsBtn.style.display = 'none';
}
    
    console.log(`📋 Resume modal shown for Verse ${position.verseNumber}${position.segmentIndex !== null ? `, Part ${position.segmentIndex + 1}` : ''}`);
    
    return true;
}
    
    // Close resume modal
closeResumeModal() {
    const modal = document.getElementById('resume-modal');
    if (modal) {
        modal.style.display = 'none';
    }
    
    // ✅ Show settings button when modal closes
    const settingsBtn = document.querySelector('.settings-icon-btn');
    if (settingsBtn) {
        settingsBtn.style.display = 'block';
    }
}



// Update header with Surah info
// Update header with Surah info
updateHeader(surahNumber) {
    const currentSurah = window.appStore.get('currentSurah');
    
    // Update old design header
    const surahTitle = document.getElementById('surah-title');
    const surahInfo = document.getElementById('surah-info');
    
    if (surahTitle) {
        surahTitle.textContent = currentSurah.arabic;
    }
    if (surahInfo) {
        surahInfo.textContent = 
            `${currentSurah.english} • Chapter ${surahNumber} • ${currentSurah.verses} Verses • ${currentSurah.revelation}`;
    }
    
    // Update new design header
    const surahNumberBadge = document.getElementById('surah-number-badge');
    const arabicTitle = document.getElementById('surah-arabic-title');
    const englishTitle = document.getElementById('surah-english-title');
    const chapterLabel = document.getElementById('surah-chapter-label');
    
    if (surahNumberBadge) {
        surahNumberBadge.textContent = surahNumber;
    }
    if (arabicTitle) {
        arabicTitle.textContent = currentSurah.arabic;
    }
    if (englishTitle) {
        // Extract only the English name without the meaning in parentheses
        // Example: "Al-Baqarah (The Cow)" becomes "Al-Baqarah"
        const englishName = currentSurah.english.split('(')[0].trim();
        englishTitle.textContent = englishName;
    }
    if (chapterLabel) {
        // Use the 'meaning' field from the database
        chapterLabel.textContent = currentSurah.meaning || 'The Chapter';
    }
}

    // Build verses array from API data
    async buildVersesArray(surahNumber, verseData) {
        const verses = [];
        
        // Add Bismillah for all surahs except At-Tawbah (9)
        if (surahNumber !== 9) {
            verses.push({
                number: 'Bismillah',
                text: "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ",
                english: "In the name of Allah, the Most Gracious, the Most Merciful",
                transliteration: "Bismillah ir-Rahman ir-Raheem",
                id: "bismillah-display",
                hasAudio: false
            });
        }

        // Add all verses - DON'T OVERWRITE, just add missing fields
        for (let i = 0; i < verseData.length; i++) {
            const verse = verseData[i];
            
            // Use the verse object as-is, just add the id field
            verse.id = `verse-${verse.number}-display`;
            
            // If segments exist, they're already in the verse object
            // Just push the complete verse object
            verses.push(verse);
        }
        
        // Set verses in state store
        window.appStore.set('verses', verses);
        
        // Debug: Check for segmented verses
        console.log('Checking for segmented verses after building array:');
        verses.forEach((verse, index) => {
            if (verse.segments) {
                console.log(`✅ Verse ${verse.number} has ${verse.segments.length} segments`);
            }
        });
    }

    // Initialize all services
    initializeServices() {
        const currentSurah = window.appStore.get('currentSurah');
        // Update status
        window.playbackControls.updateStatus(`Ready to recite ${currentSurah.english} with Mishary Alafasy`);
    }
}

// Global helper functions for resume modal (called from HTML onclick)
function closeResumeModal() {
    const modal = document.getElementById('resume-modal');
    if (modal) {
        modal.style.display = 'none';
    }
      // ✅ Show settings button when modal closes
    const settingsBtn = document.querySelector('.settings-icon-btn');
    if (settingsBtn) {
        settingsBtn.style.display = 'block';
    }
}

function continueFromProgress() {
    const surahNumber = getSurahFromURL();
    const position = window.readingProgress?.getPosition(surahNumber);
    
    if (!position) {
        console.warn('No saved position to resume from');
        startRecitation();
        return;
    }
    
    console.log(`▶️ Continuing from Verse ${position.verseNumber}${position.segmentIndex !== null ? `, Part ${position.segmentIndex + 1}` : ''}`);
    console.log('📍 Saved position details:', position);
    
    // ✅ CRITICAL FIX: Set segment index FIRST, before anything else
    if (position.segmentIndex !== null && position.segmentIndex !== undefined) {
        console.log(`✅ Setting segment index to ${position.segmentIndex}`);
        window.verseDisplay.currentSegmentIndex = position.segmentIndex;
        window.appStore.set('isSegmentedVerse', true);
        window.appStore.set('currentSegment', position.segmentIndex);
    } else {
        window.verseDisplay.currentSegmentIndex = 0;
        window.appStore.set('isSegmentedVerse', false);
    }
    
    // ✅ Set currentVerseIndex BEFORE calling show() to prevent reset in show()
    window.appStore.set('currentVerseIndex', position.verseIndex);
    console.log(`✅ Set currentVerseIndex to ${position.verseIndex}`);
    console.log(`✅ verseDisplay.currentSegmentIndex is now ${window.verseDisplay.currentSegmentIndex}`);
    
    // Now show the verse - it won't reset segment because currentVerseIndex already matches
    window.verseDisplay.show(position.verseIndex, 'none');
    
    // Hide bismillah screen
    const bismillahScreen = document.getElementById('bismillah-screen');
    if (bismillahScreen) {
        bismillahScreen.style.display = 'none';
    }
    
    // Show header
    const header = document.querySelector('.header-new');
    if (header) {
        header.style.display = 'flex';
    }
    
    // Show all content elements
    const audioControls = document.getElementById('audio-controls');
    const verseContainer = document.getElementById('verse-container');
    const bottomNav = document.getElementById('bottom-navigation');
    
    if (audioControls) audioControls.style.display = 'flex';
    if (verseContainer) verseContainer.style.display = 'flex';
    if (bottomNav) bottomNav.style.display = 'flex';
    
    // Check if it's a segmented verse and show segment navigation
    const verses = window.appStore.get('verses');
    if (verses && verses[position.verseIndex] && verses[position.verseIndex].segments) {
        const segmentNav = document.getElementById('segment-navigation');
        if (segmentNav) {
            segmentNav.style.display = 'flex';
        }
    }
    
    // Show settings button after continuing/starting
const settingsBtn = document.querySelector('.settings-icon-btn');
if (settingsBtn) {
    settingsBtn.style.display = 'block';
}

    // Close the modal
    closeResumeModal();
    
    console.log('✅ Successfully continued from saved position');
    console.log(`✅ Final segment index: ${window.verseDisplay.currentSegmentIndex}`);
}

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const app = new QuranLearningApp();
    app.initialize();
});

// Also support old window.onload for compatibility
window.addEventListener('load', () => {
    // Ensure all components are initialized
    if (!window.playbackControls) {
        console.log('Initializing components...');
    }
});