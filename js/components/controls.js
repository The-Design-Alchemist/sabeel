// controls.js - Complete Clean Version with State Store and iOS Optimization
// Playback Controls with segment support and iOS repeat functionality

const BASE_PATH = '';

class PlaybackControls {
    constructor() {
        this.statusElement = document.getElementById('status');
        this.isLoading = false;
        this.audioTimeout = null;
        this.playbackMonitor = null;
    }

// Start recitation
start() {
    console.log('Starting fresh recitation...');
    audioService.stopAudio();
    window.appStore.update({ isReciting: true, isPaused: false });
    this.updatePlayPauseButton('loading');
    this.playCurrentVerse();
}

// Resume recitation with iOS handling
async resumeRecitation() {
    console.log('Resuming from pause...');
    
    const audio = audioService.getCurrentAudio();
    const pausedAt = window.appStore.get('pausedAt');
    
    if (audio && audio.src) {
        // Check if audio has ended
        if (audio.ended || audio.currentTime >= audio.duration - 0.1) {
            console.log('Audio ended, restarting from beginning');
            audio.currentTime = 0;
        } else if (pausedAt !== undefined && pausedAt !== null) {
            // Resume from paused position
            console.log(`Resuming from ${pausedAt.toFixed(2)}s`);
            audio.currentTime = pausedAt;
        }
        
        try {
            await audio.play();
            window.appStore.update({ 
                isPaused: false,
                isReciting: true,
                pausedAt: null
            });
            this.updatePlayPauseButton('pause');
            
            // Restart word highlighting if enabled
            if (window.wordHighlighter && window.appStore.get('highlightingEnabled')) {
                window.wordHighlighter.startHighlighting();
            }
            
            console.log('✅ Resumed successfully');
        } catch (error) {
            console.error('Resume failed:', error);
            // If simple resume fails, reload the verse
            window.appStore.update({ isPaused: false, isReciting: true });
            this.playCurrentVerse();
        }
    } else {
        // No audio found, start fresh
        console.log('No audio found, starting fresh');
        window.appStore.update({ isPaused: false, isReciting: true });
        this.playCurrentVerse();
    }
}

    // Add this after the resumeRecitation method
isCurrentAudioCorrect(audioUrl) {
    const currentAudio = audioService.getCurrentAudio();
    if (!currentAudio || !currentAudio.src) return false;
    
    // Check if current audio source matches what we want to play
    const currentSrc = currentAudio.src.split('?')[0]; // Remove any query params
    const targetSrc = audioUrl.startsWith('/') ? audioUrl : `./${audioUrl}`;
    
    return currentSrc.includes(targetSrc) || targetSrc.includes(currentAudio.src.split('/').pop());
}

    
// Pause recitation
pause() {
    console.log('Pausing recitation...');

    if (window.appStore.get('isReciting') && !window.appStore.get('isPaused')) {
        const audio = audioService.getCurrentAudio();
        
        if (audio) {
            // Save current playback position
            const currentTime = audio.currentTime;
            audio.pause();
            
            // Store the paused position
            window.appStore.update({
                isPaused: true,
                pausedAt: currentTime
            });
            
            console.log(`Paused at ${currentTime.toFixed(2)}s`);
            
            // Stop highlighting but keep it ready to resume
            if (window.wordHighlighter) {
                window.wordHighlighter.pauseHighlighting();
            }
            
            this.updatePlayPauseButton('play');
            this.updateStatus('Paused');
        }
    }
}

// Stop playback completely
stop() {
    console.log('Stopping playback...');
    
    audioService.stopAudio();
    
    window.appStore.update({
        isReciting: false,
        isPaused: false,
        pausedAt: null,
        autoAdvance: false
    });
    
    // Clean up word highlighting
    if (window.wordHighlighter) {
        window.wordHighlighter.cleanup();
    }
    
    this.updatePlayPauseButton('play');
    this.updateStatus('Stopped');
}

// Play current verse
async playCurrentVerse() {
    const verses = window.appStore.get('verses');
    const currentIndex = window.appStore.get('currentVerseIndex');
    const verse = verses[currentIndex];

    if (!verse) {
        console.error('Verse not found at index', currentIndex);
        return;
    }

    const verseNumber = verse.number;
    const surahNum = getSurahFromURL();

    console.log(`Playing verse: ${verseNumber}, has audio: ${verse.hasAudio}`);

    // Check if verse has audio
    if (!verse.hasAudio) {
        console.log(`Verse ${verseNumber} has no audio, skipping...`);
        this.updateStatus(`Verse ${verseNumber} has no audio`);
        this.updatePlayPauseButton('play');
        return;
    }

    // Update state
    window.appStore.update({
        isReciting: true,
        isPaused: false
    });

    // Load timing data
    const timingData = await audioService.loadTimingData(surahNum, verseNumber);
    
    if (!timingData) {
        console.warn('No timing data available');
    }

    // Determine audio URL
    let audioUrl;
    let usingSplitAudio = false;

    // Check if it's a segmented verse and has split audio
    if (verse.segments && verse.segments.length > 1 && timingData && timingData.segments) {
        const currentSegmentIndex = window.verseDisplay.getCurrentSegmentIndex();
        console.log(`Segmented verse - checking segment ${currentSegmentIndex + 1}`);
        
        if (timingData.segments && timingData.segments[currentSegmentIndex]) {
            const segment = timingData.segments[currentSegmentIndex];
            
            if (segment.audioFile) {
                // ✅ Use split audio file
                audioUrl = `${BASE_PATH}/quran-data/audio/${segment.audioFile}`;
                usingSplitAudio = true;
                console.log(`✅ Using split audio: ${audioUrl}`);
            }
        }
    }

    // Fallback to full verse audio if no split audio available
    if (!audioUrl) {
        audioUrl = `${BASE_PATH}/quran-data/audio/${surahNum}/${surahNum}${verseNumber}.mp3`;
        console.log(`Loading full verse audio: ${audioUrl}`);
    }

    // Check if we already have the correct audio loaded
if (this.isCurrentAudioCorrect(audioUrl)) {
    const currentAudio = audioService.getCurrentAudio();
    console.log('✅ Correct audio already loaded, just playing');
    
    // Reset to start for split audio segments
    if (usingSplitAudio) {
        currentAudio.currentTime = 0;
    }
    
    try {
        await audioService.playAudio(currentAudio);
        this.updatePlayPauseButton('pause');
        
        // Setup iOS repeat if enabled
        if (audioService.isIOS && window.appStore.get('repeatMode') === 'verse') {
            this.setupIOSRepeat(currentAudio, verse);
        }
        
        if (window.wordHighlighter && verse.hasAudio) {
            if (window.appStore.get('highlightingEnabled')) {
                window.wordHighlighter.startHighlighting();
            }
        }
        
        return;
    } catch (error) {
        console.error('Play error with existing audio:', error);
    }
}

        // Load new audio
        const newAudio = await audioService.loadAudio(audioUrl);

        if (!newAudio) {
            console.error('Failed to load audio');
            this.updatePlayPauseButton('play');
            this.updateStatus('Failed to load audio');
            return;
        }

// For split audio - use simple ended handler
if (usingSplitAudio) {
    console.log('Setting up split audio handlers');
    
newAudio.addEventListener('ended', () => {
    const currentSegmentIndex = window.verseDisplay.getCurrentSegmentIndex();
    console.log(`Segment ${currentSegmentIndex + 1} completed`);
    
    // Stop word highlighting
    if (window.wordHighlighter) {
        window.wordHighlighter.pauseHighlighting();
    }
    
    // Check repeat mode
    if (window.appStore.get('repeatMode') === 'segment') {
        // Replay segment
        newAudio.currentTime = 0;
        newAudio.play();
        
        // Restart highlighting
        if (window.wordHighlighter && window.appStore.get('highlightingEnabled')) {
            window.wordHighlighter.startHighlighting();
        }
        return;
    }
    
    // Mark as ended and stopped
    window.appStore.update({ 
        isPaused: true,
        isReciting: false,
        pausedAt: null
    });
    this.updatePlayPauseButton('play');
    
    // Check if last segment
    if (currentSegmentIndex >= verse.segments.length - 1) {
        console.log('Last segment - verse complete');
        this.handleVerseCompletion();
    }
});
} else {
            // For full audio (non-split or non-segmented), use existing handlers
            this.setupAudioEventHandlers(newAudio, verse);
            
            // Set up segment boundaries if needed (for fallback timing marker method)
            if (verse.segments && verse.segments.length > 1 && timingData) {
                if (newAudio.currentTime === 0) {
                    this.setupSegmentBoundaries(newAudio, verse, timingData);
                }
            }
        }

        try {
            // Use new iOS-optimized playAudio method
            await audioService.playAudio(newAudio);
            console.log(`Successfully playing verse ${verseNumber}`);

            // Update button to pause state
            this.updatePlayPauseButton('pause');
            
            // ✅ Setup iOS repeat if enabled
            if (audioService.isIOS && window.appStore.get('repeatMode') === 'verse') {
                this.setupIOSRepeat(newAudio, verse);
                console.log('[iOS Repeat] Setup after successful play');
            }

        } catch (playError) {
            console.error('Play error:', playError);

            if (window.appStore.get('currentVerseIndex') === 0 && audioService.isIOS) {
                this.updateStatus('Tap to start playing...');
                this.showIOSAudioError();
            } else {
                console.log('Attempting to recover playback...');
                setTimeout(async () => {
                    try {
                        await audioService.playAudio(newAudio);
                        this.updatePlayPauseButton('pause');
                        
                        // Setup iOS repeat after recovery
                        if (audioService.isIOS && window.appStore.get('repeatMode') === 'verse') {
                            this.setupIOSRepeat(newAudio, verse);
                        }
                    } catch (e) {
                        console.error('Recovery failed:', e);
                        this.updatePlayPauseButton('play');
                        this.handleVerseCompletion();
                    }
                }, 100);
            }
        }

// Initialize word highlighting for the current verse
// IMPORTANT: Initialize ALWAYS (not just when highlighting enabled) for click-to-jump
if (window.wordHighlighter && verse.hasAudio) {
    setTimeout(async () => {
        const verseDisplay = document.querySelector('.verse-arabic-new');
        if (verseDisplay) {
            // Initialize verse (wraps words, sets up clicks)
            await window.wordHighlighter.initializeVerse(verseNumber);
            
            // Start highlighting if enabled
            if (window.appStore.get('highlightingEnabled') && window.appStore.get('isReciting') && !window.appStore.get('isPaused')) {
                window.wordHighlighter.startHighlighting();
            }
        }
    }, 100);
}
    }

// Set up standard audio event handlers
setupAudioEventHandlers(audio, verse) {
    // Remove any existing handlers first
    audio.onended = null;
    audio.ontimeupdate = null;
    audio.onerror = null;
    
    // Store handlers so we can remove them later if needed
    const endedHandler = () => {
        console.log('Audio ended');
        this.handleVerseCompletion();
    };
    
    audio.addEventListener('ended', endedHandler);
    audio._endedHandler = endedHandler; // Store reference for cleanup
    
    // Error handling
    audio.addEventListener('error', (e) => {
        console.error('Audio error:', e);
        this.updateStatus('Audio playback error');
        this.updatePlayPauseButton('play');
    });
    
    console.log('✅ Audio event handlers set up');
}

    // Handle verse completion
    handleVerseCompletion() {
        console.log('Handling verse completion...');

        const verse = window.appStore.get('verses')[window.appStore.get('currentVerseIndex')];
        const audio = audioService.getCurrentAudio();
        const repeatMode = window.appStore.get('repeatMode');

        console.log(`Repeat mode: ${repeatMode}`);

        // Handle repeat mode first
        if (repeatMode !== 'none' && audio) {
            if (repeatMode === 'verse') {
                console.log('Repeating verse', verse.number);
                
                // iOS repeat is handled by setupIOSRepeat via timeupdate
                // Android/Desktop use simple restart on ended event
                if (!audioService.isIOS) {
                    audio.currentTime = 0;

                    // Keep reciting state active for repeat
                    window.appStore.update({
                        isReciting: true,
                        isPaused: false
                    });

                    audio.play().catch(e => console.error('Repeat play error:', e));

                    // Reinitialize word highlighting
                    if (window.wordHighlighter) {
                        window.wordHighlighter.reset();
                        setTimeout(() => {
                            window.wordHighlighter.initializeVerse(verse.number);
                            window.wordHighlighter.startHighlighting();
                        }, 100);
                    }
                }
                return; // Exit early for repeat
            }

            // Add other repeat modes (segment, surah) here if needed
        }

        // No repeat mode - STOP completely
        console.log('Playback complete - stopping (no repeat)');

        // Stop the audio completely
        if (audio) {
            audio.pause();
            audio.currentTime = 0;
        }

        // Clean up word highlighting to prepare for next playthrough
        if (window.wordHighlighter) {
            window.wordHighlighter.cleanup();
        }

        // FIXED: Set to completely stopped state
        window.appStore.update({
            isPaused: false,
            isReciting: false,
            autoAdvance: false
        });

        this.updateStatus('Verse completed - Click Play to recite again');
        this.updatePlayPauseButton('play');
    }
    
    // ✅ iOS-specific repeat setup - must be called BEFORE audio ends
    setupIOSRepeat(audio, verse) {
        if (!audioService.isIOS) return;
        
        const repeatMode = window.appStore.get('repeatMode');
        if (repeatMode !== 'verse') return;
        
        console.log('[iOS Repeat] Setting up for verse', verse.number);
        
        // Remove any existing handler
        if (audio._iosRepeatHandler) {
            audio.removeEventListener('timeupdate', audio._iosRepeatHandler);
            audio._iosRepeatHandler = null;
        }
        
        // Create new handler
        audio._iosRepeatHandler = () => {
            // Only trigger near the end
            if (audio.currentTime >= audio.duration - 0.3 && !audio._isRepeating) {
                console.log('[iOS Repeat] Near end, preparing restart');
                audio._isRepeating = true;
                
                // Prevent highlighting from seeing ended state
                audio._preventEndedCheck = true;
                
                // Wait a tiny bit then restart
                setTimeout(() => {
                    console.log('[iOS Repeat] Restarting audio at 0');
                    
                    // Restart audio
                    audio.currentTime = 0;
                    
                    // Keep playing state
                    window.appStore.update({
                        isReciting: true,
                        isPaused: false
                    });
                    
                    // Restart highlighting smoothly WITHOUT full reset
                    if (window.wordHighlighter && window.appStore.get('highlightingEnabled')) {
                        // Just restart the highlighting loop - don't cleanup
                        if (window.wordHighlighter.highlightInterval) {
                            clearInterval(window.wordHighlighter.highlightInterval);
                        }
                        
                        // Start fresh highlighting
                        setTimeout(() => {
                            window.wordHighlighter.startHighlighting();
                            
                            // Clear flags
                            audio._preventEndedCheck = false;
                            audio._isRepeating = false;
                            
                            console.log('[iOS Repeat] ✅ Restarted successfully');
                        }, 100);
                    } else {
                        // No highlighting, just clear flags
                        audio._preventEndedCheck = false;
                        audio._isRepeating = false;
                    }
                }, 150);
            }
        };
        
        audio.addEventListener('timeupdate', audio._iosRepeatHandler);
        console.log('[iOS Repeat] ✅ Handler attached');
    }
    
    // Play from segment start
    playFromSegmentStart(segmentIndex) {
        const audio = audioService.getCurrentAudio();
        if (!audio || !window.currentVerseTimings) {
            this.playCurrentVerse();
            return;
        }

        const verse = window.appStore.get('verses')[window.appStore.get('currentVerseIndex')];
        if (!verse.segments || segmentIndex >= verse.segments.length) return;

        let wordOffset = 0;
        for (let i = 0; i < segmentIndex; i++) {
            const segmentWords = verse.segments[i].arabic.split(/\s+/).filter(w =>
                w.length > 0 && !w.match(/[\u06D6-\u06DB]/)
            );
            wordOffset += segmentWords.length;
        }

        const segmentWords = verse.segments[segmentIndex].arabic.split(/\s+/).filter(w =>
            w.length > 0 && !w.match(/[\u06D6-\u06DB]/)
        );
        const segmentEndWord = wordOffset + segmentWords.length - 1;

        if (window.appStore.get('repeatMode') === 'segment' &&
            window.currentVerseTimings.words[wordOffset] &&
            window.currentVerseTimings.words[segmentEndWord]) {

            const startTime = window.currentVerseTimings.words[wordOffset].start;
            const endTime = window.currentVerseTimings.words[segmentEndWord].end + 1.0;

            audio.currentTime = startTime;

            const loopHandler = () => {
                if (audio.currentTime >= endTime) {
                    audio.currentTime = startTime;
                }
            };

            if (audio._loopHandler) {
                audio.removeEventListener('timeupdate', audio._loopHandler);
            }

            audio._loopHandler = loopHandler;
            audio.addEventListener('timeupdate', loopHandler);

            audio.play();
        } else {
            if (window.currentVerseTimings.words[wordOffset]) {
                audio.currentTime = window.currentVerseTimings.words[wordOffset].start;
                audio.play();
            }
        }
    }

    // Update status display
    updateStatus(message) {
        if (this.statusElement) {
            this.statusElement.textContent = message;
        }
    }

    // Get repeat info for status
    getRepeatInfo() {
        if (window.appStore.get('repeatMode') === 'segment') {
            return ' (🔁 Part)';
        } else if (window.appStore.get('repeatMode') === 'verse') {
            return ' (🔁 Verse)';
        }
        return '';
    }

    // Setup segment boundaries for verse with multiple segments
setupSegmentBoundaries(audio, verse, timing) {
    if (!verse.segments || verse.segments.length <= 1) return;
    if (!timing || !timing.segments) return;

    console.log(`Setting up segment boundaries for ${verse.segments.length} segments`);

    // We'll use a timeupdate listener to track segment changes
    audio.addEventListener('timeupdate', () => {
        if (!window.currentVerseTimings || !window.currentVerseTimings.segments) return;

        const currentTime = audio.currentTime;
        const segments = window.currentVerseTimings.segments;
        const currentSegmentIndex = window.verseDisplay.getCurrentSegmentIndex();

        // Check if we've crossed into a new segment
        for (let i = 0; i < segments.length; i++) {
            const segment = segments[i];
            const nextSegment = segments[i + 1];

            if (currentTime >= segment.start) {
                // Check if we should move to next segment
                if (nextSegment && currentTime >= nextSegment.start) {
                    if (i + 1 !== currentSegmentIndex) {
                        console.log(`Crossed into segment ${i + 2}`);
                        // We'll let the natural flow handle this
                        // Don't force segment change here to avoid interrupting repeat mode
                    }
                }
            }
        }
    });
}

    updatePlayPauseButton(state) {
        const btn = document.getElementById('play-pause-btn');
        const text = document.getElementById('play-pause-text');

        if (!btn || !text) return;

        switch (state) {
            case 'play':
                text.textContent = 'PLAY RECITATION';
                btn.disabled = false;
                btn.classList.remove('loading');
                break;

            case 'pause':
                text.textContent = 'PAUSE RECITATION';
                btn.disabled = false;
                btn.classList.remove('loading');
                break;

            case 'loading':
                text.textContent = 'LOADING...';
                btn.disabled = true;
                btn.classList.add('loading');
                break;

            case 'stop':
                text.textContent = 'PLAY RECITATION';
                btn.disabled = false;
                btn.classList.remove('loading');
                break;
        }
    }

    // Show iOS-specific error handling
    showIOSAudioError() {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'ios-audio-error';
        errorDiv.innerHTML = `
            <div class="error-content">
                <span>⚠️ Audio playback requires interaction</span>
                <button onclick="window.playbackControls.retryIOSAudio()" class="retry-btn">Tap to Play</button>
            </div>
        `;
        errorDiv.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: white;
            padding: 20px;
            border-radius: 10px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            z-index: 10000;
        `;
        document.body.appendChild(errorDiv);
    }

    retryIOSAudio() {
        const errorDiv = document.querySelector('.ios-audio-error');
        if (errorDiv) errorDiv.remove();
        this.playCurrentVerse();
    }
}

// === Standalone Control Functions ===

function togglePlayPause() {
    const text = document.getElementById('play-pause-text');
    const isReciting = window.appStore.get('isReciting');
    const isPaused = window.appStore.get('isPaused');

    // If currently playing, pause it
    if (isReciting && !isPaused) {
        console.log('Pausing recitation...');
        window.playbackControls.pause();
        if (text) text.textContent = 'PLAY RECITATION';
    }
    // If paused, resume from current position
    else if (isReciting && isPaused) {
        console.log('Resuming from pause...');
        window.playbackControls.resumeRecitation();
        if (text) text.textContent = 'PAUSE RECITATION';
    }
    // If stopped, start fresh
    else {
        console.log('Starting fresh recitation...');
        window.playbackControls.start();
        if (text) text.textContent = 'PAUSE RECITATION';
    }
}

function playRecitation() {
    window.playbackControls.start();
}

function startFromBeginning() {
    console.log('Start Over button clicked');
    
    // Show confirmation modal instead of directly starting over
    showStartOverModal();
}


// Show start over confirmation modal
function showStartOverModal() {
    const modal = document.getElementById('start-over-modal');
    if (modal) {
        modal.style.display = 'flex';
    }
}

// Close start over modal - UPDATED
function closeStartOverModal() {
    const modal = document.getElementById('start-over-modal');
    if (modal) {
        modal.style.display = 'none';
    }

    // ADDED: If user clicks "No", take them back to their saved position
    // This means they changed their mind about starting over
    console.log('User chose not to start over, continuing from saved position...');
    continueFromProgress();
}

// Confirm start over (YES button clicked) - UPDATED
function confirmStartOver() {
    console.log('Confirmed: Starting from beginning...');

    // Close the modal first
    closeStartOverModal();

    // Close resume modal if it exists
    closeResumeModal();

    // Stop any playback
    window.playbackControls.stop();

    // Clear saved position
    const surahNumber = getSurahFromURL();
    window.readingProgress.clearPosition(surahNumber);

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

    // Show controls and verse container
    const audioControls = document.getElementById('audio-controls');
    const verseContainer = document.getElementById('verse-container');
    const bottomNav = document.getElementById('bottom-navigation');

    if (audioControls) audioControls.style.display = 'flex';
    if (verseContainer) verseContainer.style.display = 'flex';
    if (bottomNav) bottomNav.style.display = 'flex';

    // FIXED: Set to first actual verse (skip Bismillah)
    const verses = window.appStore.get('verses');
    let firstVerseIndex = 1; // Start from verse 1, not Bismillah

    // Find the first non-Bismillah verse
    for (let i = 0; i < verses.length; i++) {
        if (verses[i].number !== 'Bismillah') {
            firstVerseIndex = i;
            break;
        }
    }

    window.appStore.set('currentVerseIndex', firstVerseIndex);
    window.verseDisplay.show(firstVerseIndex, 'none');

    // Reset play button
    const icon = document.getElementById('play-pause-icon');
    const text = document.getElementById('play-pause-text');
    if (icon && text) {
        icon.textContent = '▶️';
        text.textContent = 'Play';
    }

window.playbackControls.updateStatus('Ready to recite from beginning');
    
    // ✅ Show settings button after starting over
    const settingsBtn = document.querySelector('.settings-icon-btn');
    if (settingsBtn) {
        settingsBtn.style.display = 'block';
    }
    
    console.log('✅ Started from beginning');
}

// Close resume modal helper
function closeResumeModal() {
    const modal = document.getElementById('resume-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

function toggleRepeat() {
    const btn = document.getElementById('repeat-btn');
    const notification = document.getElementById('repeat-notification');
    const verse = window.appStore.get('verses')[window.appStore.get('currentVerseIndex')];

    if (window.appStore.get('repeatMode') === 'none') {
        // Enable repeat based on current context
        if (verse && verse.segments && verse.segments.length > 1) {
            window.appStore.set('repeatMode', 'segment');
            window.playbackControls.updateStatus('Repeat segment enabled');
        } else {
            window.appStore.set('repeatMode', 'verse');
            window.playbackControls.updateStatus('Repeat verse enabled');
        }

        // Add active class for gradient
        btn.classList.add('active');
        
        // ✅ Setup iOS repeat if audio is currently playing
        if (audioService.isIOS && window.appStore.get('isReciting')) {
            const audio = audioService.getCurrentAudio();
            if (audio && !audio.paused) {
                window.playbackControls.setupIOSRepeat(audio, verse);
                console.log('[iOS Repeat] Setup triggered by toggle ON');
            }
        }

        // Show notification strip
        if (notification) {
            notification.textContent = 'Repeat Mode - Turned On';
            notification.style.display = 'flex'; // CHANGE FROM 'block' TO 'flex'
            // Force reflow to ensure animation works
            notification.offsetHeight;
            notification.classList.add('show');

            // Hide after 3 seconds
            setTimeout(() => {
                notification.classList.remove('show');
                // Remove from DOM after animation
                setTimeout(() => {
                    notification.style.display = 'none';
                }, 300);
            }, 3000);
        }

    } else {
        // Disable repeat
        window.appStore.set('repeatMode', 'none');
        btn.classList.remove('active');
        
        // ✅ iOS: Clean up repeat handler
        if (audioService.isIOS) {
            const audio = audioService.getCurrentAudio();
            if (audio && audio._iosRepeatHandler) {
                audio.removeEventListener('timeupdate', audio._iosRepeatHandler);
                audio._iosRepeatHandler = null;
                audio._isRepeating = false;
                audio._preventEndedCheck = false;
                console.log('[iOS Repeat] Handler removed (toggle OFF)');
            }
        }

        // Show notification strip for turned off
        if (notification) {
            notification.textContent = 'Repeat Mode - Turned Off';
            notification.style.display = 'flex'; // CHANGE FROM 'block' TO 'flex'
            // Force reflow
            notification.offsetHeight;
            notification.classList.add('show');

            // Hide after 3 seconds
            setTimeout(() => {
                notification.classList.remove('show');
                // Remove from DOM after animation
                setTimeout(() => {
                    notification.style.display = 'none';
                }, 300);
            }, 3000);
        }

        window.playbackControls.updateStatus('Repeat disabled');
    }
}

function nextVerse() {
    window.verseDisplay.next();
}

function previousVerse() {
    window.verseDisplay.previous();
}

function jumpToVerse() {
    const selector = document.getElementById('verse-selector');
    if (selector) {
        const selectedIndex = parseInt(selector.value);
        window.verseDisplay.jumpToVerse(selectedIndex);

        const verse = window.appStore.get('verses')[selectedIndex];
        const verseText = verse.number === 'Bismillah' ? 'Bismillah' : `verse ${verse.number}`;
        window.playbackControls.updateStatus(`Jumped to ${verseText}`);
    }
}

function resumeFromSaved() {
    const modal = document.querySelector('.resume-modal');
    if (modal) modal.remove();

    if (window.savedResumePosition) {
        window.appStore.set('currentVerseIndex', window.savedResumePosition.verseIndex);
        window.verseDisplay.show(window.savedResumePosition.verseIndex);
        window.playbackControls.updateStatus(`Resumed at verse ${window.savedResumePosition.verseNumber}`);
        window.savedResumePosition = null;
    }
}

// Start Recitation from Bismillah screen (UPDATED FUNCTION)
function startRecitation() {
    console.log('Starting recitation from Bismillah screen...');

    // Hide bismillah screen
    const bismillahScreen = document.getElementById('bismillah-screen');
    if (bismillahScreen) {
        bismillahScreen.style.display = 'none';
    }

    // Show controls and verse container
    const audioControls = document.getElementById('audio-controls');
    const verseContainer = document.getElementById('verse-container');
    const bottomNav = document.getElementById('bottom-navigation');

    if (audioControls) audioControls.style.display = 'flex';
    if (verseContainer) verseContainer.style.display = 'flex';
    if (bottomNav) bottomNav.style.display = 'flex';

    // FIXED: Set to first actual verse (index 1), skipping Bismillah (index 0)
    const verses = window.appStore.get('verses');
    let firstVerseIndex = 1; // Start from verse 1, not Bismillah

    // Find the first non-Bismillah verse
    for (let i = 0; i < verses.length; i++) {
        if (verses[i].number !== 'Bismillah') {
            firstVerseIndex = i;
            break;
        }
    }

    window.appStore.set('currentVerseIndex', firstVerseIndex);
    window.verseDisplay.show(firstVerseIndex);

    // Auto-play after a short delay
    setTimeout(() => {
        playRecitation();
    }, 300);
}

// Previous/Next Segment functions (NEW FUNCTIONS for segment navigation)
function previousSegment() {
    if (window.verseDisplay && window.verseDisplay.navigateSegment) {
        window.verseDisplay.navigateSegment('prev');
    }
}

function nextSegment() {
    if (window.verseDisplay && window.verseDisplay.navigateSegment) {
        window.verseDisplay.navigateSegment('next');
    }
}

// Create global instance
window.playbackControls = new PlaybackControls();