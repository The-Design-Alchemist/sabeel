// word-highlighting.js - Production-Ready Word Highlighting System
// Handles word-by-word highlighting and click-to-jump functionality

class WordHighlighter {
    constructor() {
        this.currentWordIndex = 0;
        this.wordTimings = null;
        this.highlightInterval = null;
        this.currentVerseWords = [];
        this.syncOffset = parseInt(localStorage.getItem('syncOffset') || '300');
        this.highlightColor = '#0D8E91';
        this.isInitialized = false;
    }
    

    /**
     * Initialize word highlighting for a verse
     * @param {number} verseNumber - The verse number to initialize
     */
    async initializeVerse(verseNumber) {
        console.log(`[WordHighlighter] Initializing for verse ${verseNumber}`);
        
        // Always cleanup first
        this.cleanup();
        
        const verseElement = document.querySelector('.verse-arabic-new');
        if (!verseElement) {
            console.error('[WordHighlighter] Verse element not found!');
            return;
        }

        // Get timing data (should already be loaded by controls.js)
        if (window.currentVerseTimings && window.currentVerseTimings.words) {
            this.wordTimings = window.currentVerseTimings.words;
            console.log(`[WordHighlighter] ✅ Timing data available: ${this.wordTimings.length} words`);
        } else {
            this.wordTimings = null;
            console.warn('[WordHighlighter] ⚠️ No timing data available');
        }

        // Wrap words in spans for both highlighting AND clicking
        this.wrapWords(verseElement);
        
        // Set up click handlers (works regardless of highlighting enabled/disabled)
        this.setupClickHandlers();
        
        this.isInitialized = true;
        
        // Start highlighting if enabled
        if (window.appStore.get('highlightingEnabled')) {
            console.log('[WordHighlighter] Highlighting enabled - will start on play');
        } else {
            console.log('[WordHighlighter] Highlighting disabled - click-to-jump ready');
        }
    }

    /**
     * Wrap words in clickable spans
     * @param {HTMLElement} verseElement - The verse container element
     */
    wrapWords(verseElement) {
        // Store original text if not already stored
        if (!verseElement.dataset.originalText) {
            verseElement.dataset.originalText = verseElement.textContent;
        }

        const arabicText = verseElement.textContent;
        const words = arabicText.split(/\s+/).filter(word => word.length > 0);

        // Wrap each word in a span
        verseElement.innerHTML = words.map((word, index) => {
            // Check if word contains waqf mark
            if (/[\u06D6-\u06DD]/.test(word)) {
                return `<span class="waqf-mark">${word}</span>`;
            }
            // Check if it's a verse end marker
            if (/^[\u06DD][\u0660-\u0669]+$/.test(word) || /^[\u06DD][\u0660-\u0669]+[\u06DD]$/.test(word)) {
                return `<span class="verse-end-marker">${word}</span>`;
            }
            return `<span class="arabic-word" data-word-index="${index}">${word}</span>`;
        }).join(' ');

        // Get all wrapped word elements
        this.currentVerseWords = Array.from(verseElement.querySelectorAll('.arabic-word'));
        console.log(`[WordHighlighter] Wrapped ${this.currentVerseWords.length} words`);
    }

    /**
     * Set up click handlers for all words
     */
    setupClickHandlers() {
        if (!this.currentVerseWords || this.currentVerseWords.length === 0) {
            console.warn('[WordHighlighter] No words to set up click handlers');
            return;
        }

        this.currentVerseWords.forEach((word, index) => {
            word.addEventListener('click', (e) => {
                e.stopPropagation();
                this.handleWordClick(index);
            });
        });

        console.log(`[WordHighlighter] ✅ Click handlers set for ${this.currentVerseWords.length} words`);
    }

    /**
     * Handle word click event
     * @param {number} index - The index of the clicked word
     */
handleWordClick(index) {
    console.log(`[WordHighlighter] Word clicked: index ${index}`);

    if (!this.wordTimings || this.wordTimings.length === 0) {
        console.warn('[WordHighlighter] No timing data available for click');
        return;
    }

    // Calculate global word index for segmented verses
    const verses = window.appStore.get('verses');
    const verse = verses[window.appStore.get('currentVerseIndex')];
    let globalWordIndex = index;

    if (verse && verse.segments && verse.segments.length > 1) {
        const segmentIndex = window.verseDisplay.getCurrentSegmentIndex();
        const timing = window.currentVerseTimings;
        
        if (timing && timing.segments && timing.segments[segmentIndex]) {
            const segment = timing.segments[segmentIndex];
            globalWordIndex = segment.startWord + index;
            console.log(`[WordHighlighter] Segment ${segmentIndex + 1}: local ${index} → global ${globalWordIndex}`);
        }
    }

    const wordTiming = this.wordTimings[globalWordIndex];
    if (!wordTiming) {
        console.warn(`[WordHighlighter] No timing for word ${globalWordIndex}`);
        return;
    }

// ✅ CRITICAL FIX: Adjust seek time for split audio
const timing = window.currentVerseTimings;
let seekTime = wordTiming.start;

if (verse && verse.segments && verse.segments.length > 1 && timing && timing.segments) {
    const segmentIndex = window.verseDisplay.getCurrentSegmentIndex();
    const segment = timing.segments[segmentIndex];
    
    if (segment && segment.audioFile && segment.audioFile.includes('_seg')) {
        // Using split audio - adjust time relative to segment start
         // ✅ SMART OFFSET: Use first word's start time
        const firstWordInSegment = this.wordTimings[segment.startWord];
        const offset = firstWordInSegment ? firstWordInSegment.start : segment.start;
        seekTime = wordTiming.start - segment.start;
        console.log(`[WordHighlighter] Split audio: global ${wordTiming.start.toFixed(2)}s → local ${seekTime.toFixed(2)}s`);
    }
}

console.log(`[WordHighlighter] Jumping to ${seekTime.toFixed(2)}s`);

const audio = audioService.getCurrentAudio();
if (!audio) {
    console.warn('[WordHighlighter] No audio available');
    return;
}

// Seek to adjusted position
audio.currentTime = seekTime;
    
// Handle playback state after seeking
const isPaused = window.appStore.get('isPaused');
const isReciting = window.appStore.get('isReciting');

if (audio.paused || !isReciting) {
    // Audio is not playing, start it
    console.log('[WordHighlighter] Starting playback from word');
    window.playbackControls.resumeRecitation();
} else {
    // Audio is already playing, just seeked - keep it playing
    console.log('[WordHighlighter] Seeked to word, continuing playback');
    
    // Restart highlighting from this point if enabled
    if (window.appStore.get('highlightingEnabled') && window.wordHighlighter) {
        window.wordHighlighter.pauseHighlighting();
        setTimeout(() => {
            window.wordHighlighter.startHighlighting();
        }, 50);
    }
}
    // If already playing, just the seek above is enough
}

    /**
     * Start highlighting (called when audio plays)
     */
    startHighlighting() {
        // Check if highlighting is enabled
        if (!window.appStore.get('highlightingEnabled')) {
            console.log('[WordHighlighter] Highlighting disabled - skipping');
            return;
        }

        const audio = audioService.getCurrentAudio();
        if (!audio || !this.currentVerseWords || this.currentVerseWords.length === 0) {
            console.warn('[WordHighlighter] Cannot start highlighting - missing audio or words');
            return;
        }

        // Clear any existing interval
        if (this.highlightInterval) {
            clearInterval(this.highlightInterval);
            this.highlightInterval = null;
        }

        // Use precise timing if available
        if (this.wordTimings && this.wordTimings.length > 0) {
            console.log('[WordHighlighter] Starting precise highlighting');
            this.startPreciseHighlighting(audio, this.wordTimings);
        } else {
            console.warn('[WordHighlighter] No timing data - highlighting disabled');
        }
    }

    /**
     * Start precise highlighting using timing data
     * @param {HTMLAudioElement} audio - The audio element
     * @param {Array} wordTimings - Array of word timing objects
     */
    startPreciseHighlighting(audio, wordTimings) {
        if (!wordTimings || !this.currentVerseWords || this.currentVerseWords.length === 0) {
            console.warn('[WordHighlighter] Cannot start precise highlighting');
            return;
        }

        let currentHighlightedIndex = -1;
        const verses = window.appStore.get('verses');
        const verse = verses[window.appStore.get('currentVerseIndex')];
        const timing = window.currentVerseTimings;

        this.highlightInterval = setInterval(() => {
            // Check if audio is still valid
            if (!audio || audio.paused || audio.ended) {
                if (audio?.ended) {
                    this.reset();
                }
                return;
            }

            const currentTime = audio.currentTime;

            // Handle segmented verses
// Handle segmented verses
if (verse?.segments?.length > 1 && timing?.segments) {
    const segmentIndex = window.verseDisplay.getCurrentSegmentIndex();
    const segment = timing.segments[segmentIndex];

    if (!segment) {
        console.warn('[WordHighlighter] No segment data for index:', segmentIndex);
        return;
    }

    const { startWord, endWord } = segment;
    
    // ✅ CRITICAL FIX: Check if using split audio
    const usingSplitAudio = segment.audioFile && segment.audioFile.includes('_seg');
    
    // ✅ SMART OFFSET: Use first word's start time instead of segment.start
    let timeOffset = 0;
    if (usingSplitAudio && startWord < wordTimings.length) {
        const firstWordInSegment = wordTimings[startWord];
        timeOffset = firstWordInSegment ? firstWordInSegment.start : segment.start;
        console.log(`[WordHighlighter] Smart offset for segment ${segmentIndex + 1}: ${timeOffset.toFixed(3)}s (from word ${startWord})`);
    }

    // Find current word in segment range
    for (let i = startWord; i <= endWord && i < wordTimings.length; i++) {
        const wordTiming = wordTimings[i];
        
        // ✅ Adjust timing comparison for split audio
        const adjustedStart = wordTiming.start - timeOffset;
        const adjustedEnd = wordTiming.end - timeOffset;

        if (currentTime >= adjustedStart && currentTime < adjustedEnd) {
            const localIndex = i - startWord;

            // Verify localIndex is within bounds
            if (localIndex >= 0 && localIndex < this.currentVerseWords.length) {
                if (localIndex !== currentHighlightedIndex) {
                    currentHighlightedIndex = localIndex;
                    this.highlightWord(localIndex);
                }
            }
            break;
        }
    }
} else {
                // Non-segmented verse - simple highlighting
                for (let i = 0; i < wordTimings.length && i < this.currentVerseWords.length; i++) {
                    const wordTiming = wordTimings[i];
                    
                    if (currentTime >= wordTiming.start && currentTime < wordTiming.end) {
                        if (i !== currentHighlightedIndex) {
                            currentHighlightedIndex = i;
                            this.highlightWord(i);
                        }
                        break;
                    }
                }
            }
        }, 30);

        console.log('[WordHighlighter] ✅ Precise highlighting started');
    }

    /**
     * Highlight a specific word
     * @param {number} index - The word index to highlight
     */
    highlightWord(index) {
        if (!this.currentVerseWords || index < 0 || index >= this.currentVerseWords.length) {
            return;
        }

        // Remove previous highlights
        this.currentVerseWords.forEach(word => {
            word.classList.remove('word-highlight', 'word-previous');
        });

        // Add highlight to current word
        this.currentVerseWords[index].classList.add('word-highlight');

        // Optionally mark previous word
        if (index > 0) {
            this.currentVerseWords[index - 1].classList.add('word-previous');
        }

        this.currentWordIndex = index;
    }

    /**
     * Pause highlighting (stop interval)
     */
    pauseHighlighting() {
        if (this.highlightInterval) {
            clearInterval(this.highlightInterval);
            this.highlightInterval = null;
            console.log('[WordHighlighter] Highlighting paused');
        }

        // Remove all highlights
        if (this.currentVerseWords) {
            this.currentVerseWords.forEach(word => {
                word.classList.remove('word-highlight', 'word-previous');
            });
        }
    }

    /**
     * Reset highlighter state
     */
    reset() {
        this.pauseHighlighting();
        this.currentWordIndex = 0;
        console.log('[WordHighlighter] Reset');
    }

    /**
     * Clean up all state and event listeners
     */
    cleanup() {
        console.log('[WordHighlighter] Cleaning up');
        
        // Stop highlighting
        this.pauseHighlighting();
        
        // Clear word array
        this.currentVerseWords = [];
        this.currentWordIndex = 0;
        this.isInitialized = false;
        
        // Remove highlights from DOM
        const verseElement = document.querySelector('.verse-arabic-new');
        if (verseElement) {
            const highlightedWords = verseElement.querySelectorAll('.word-highlight, .word-previous');
            highlightedWords.forEach(word => {
                word.classList.remove('word-highlight', 'word-previous');
            });
        }
    }
}

// Create global instance
window.wordHighlighter = new WordHighlighter();