// verse-display.js - FIXED VERSION with State Store
// Verse display component for managing verse UI

class VerseDisplay {
    constructor() {
        this.container = document.getElementById('verse-container');
        this.counter = document.getElementById('verse-counter');
        this.prevBtn = document.getElementById('prev-btn');
        this.nextBtn = document.getElementById('next-btn');
        this.isTransitioning = false; // Add transition lock
        this.currentSegmentIndex = 0; // Add segment tracking

        // ADD THIS - define waqfMarkers
        this.waqfMarkers = {
            '\u06D6': 'Û–',  // small_stop
            '\u06D7': 'Û—',  // preferable_stop
            '\u06D8': 'Û˜',  // permissible_stop
            '\u06D9': 'Û™',  // preferred_stop
            '\u06DA': 'Ûš',  // compulsory_stop
            '\u06DB': 'Û›'   // sufficient_stop
        };
    }

    // ADD THIS NEW METHOD (anywhere in the class, preferably after the show() method)
    detectOverflow() {
        const container = document.querySelector('.verse-container');
        const content = document.querySelector('.verse-display');

        if (container && content) {
            if (content.scrollHeight > container.clientHeight) {
                container.classList.add('has-overflow');
            } else {
                container.classList.remove('has-overflow');
            }
        }
    }

    // In the generateHTML method, update the verse structure:
    generateHTML() {
        this.container.innerHTML = '';

        // Create a single verse display container
        const verseDisplay = document.createElement('div');
        verseDisplay.className = 'verse-display';
        verseDisplay.id = 'verse-display';

        // This will hold the current verse content
        this.container.appendChild(verseDisplay);

        // Populate verse selector dropdown
        this.populateVerseSelector();
    }


    show(index, direction = 'right') {
        const verses = window.appStore.get('verses');
        const verse = verses[index];

        // Update custom dropdown
        if (window.verseDropdown) {
            window.verseDropdown.update();
        }

        if (!verse) {
            console.error('No verse at index:', index);
            return;
        }

        // Debug logging
        console.log(`Showing verse ${verse.number}:`, {
            hasSegments: !!verse.segments,
            segmentCount: verse.segments?.length,
            segments: verse.segments
        });

        // When showing verse, use the direction parameter
// When showing verse, use the direction parameter
if (verse.segments && verse.segments.length > 1) {
    // ✅ FIX: Don't reset segment index if already set (for resume functionality)
    // Only reset to 0 if coming from a different verse
    if (window.appStore.get('currentVerseIndex') !== index) {
        this.currentSegmentIndex = 0;
    }
    window.appStore.set('isSegmentedVerse', true);
    this.showSegmented(verse, this.currentSegmentIndex, direction);
        } else {
            // Non-segmented verse
            window.appStore.set('isSegmentedVerse', false);
            this.showSingle(verse, direction); // ✅ Pass direction
        }

        // Clean up word highlighting from previous verse
        if (window.wordHighlighter && window.appStore.get('currentVerseIndex') !== index) {
            window.wordHighlighter.cleanup();
        }

        // Reset segment index when showing different verse
        if (window.appStore.get('currentVerseIndex') !== index) {
            this.currentSegmentIndex = 0;
        }

        // Update the current verse index
        window.appStore.set('currentVerseIndex', index);

        // Check if verse has segments
        if (verse.segments && Array.isArray(verse.segments) && verse.segments.length > 1) {
            console.log(`Verse ${verse.number} has ${verse.segments.length} segments, showing segmented view`);
            window.appStore.set('isSegmentedVerse', true);
            this.showSegmented(verse, this.currentSegmentIndex, direction);
            this.showSegmentNavigation(verse.segments.length); // ADD THIS LINE
        } else {
            console.log(`Verse ${verse.number} has no segments, showing full verse`);
            window.appStore.set('isSegmentedVerse', false);
            this.showFullVerse(verse, direction);
            this.hideSegmentNavigation(); // ADD THIS LINE
        }

        // Update verse selector dropdown for new design
        this.updateVerseSelector(); // ADD THIS LINE

        // Update bottom navigation buttons for new design
        this.updateBottomNavigation(); // ADD THIS LINE

        // Save reading progress
        if (window.readingProgress && verse.number !== 'Bismillah') {
            const surahNumber = getSurahFromURL();
            const segmentIndex = window.appStore.get('isSegmentedVerse') ? this.currentSegmentIndex : null;
            window.readingProgress.savePosition(surahNumber, index, verse.number, segmentIndex);
        }

        this.updateCounter();
        this.updateNavigationButtons();
    }

    // Add this method after updateBottomNavigation()
    updateVerseSelector() {
        const selector = document.getElementById('verse-selector');
        if (!selector) return;

        const verses = window.appStore.get('verses');
        const currentIndex = window.appStore.get('currentVerseIndex');
        const currentSurah = window.appStore.get('currentSurah');

        // Populate if empty
        if (selector.options.length === 0 && currentSurah) {
            verses.forEach((verse, index) => {
                const option = document.createElement('option');
                option.value = index;

                if (verse.number === 'Bismillah') {
                    option.textContent = 'Bismillah';
                } else {
                    option.textContent = `Verse ${verse.number} : ${currentSurah.verses}`;
                }

                selector.appendChild(option);
            });
        }

        // Set current value
        selector.value = currentIndex;
    }

    // Add this method after updateVerseSelector()
    updateBottomNavigation() {
        const verses = window.appStore.get('verses');
        const currentIndex = window.appStore.get('currentVerseIndex');

        // Desktop buttons
        const prevBtn = document.getElementById('prev-verse-btn');
        const nextBtn = document.getElementById('next-verse-btn');

        // Mobile buttons
        const prevBtnMobile = document.getElementById('prev-verse-btn-mobile');
        const nextBtnMobile = document.getElementById('next-verse-btn-mobile');

        // Update total verse count
        const totalLabel = document.getElementById('verse-total-label');
        if (totalLabel) {
            totalLabel.textContent = `of ${verses.length - 1}`; // -1 to exclude Bismillah
        }

        if (prevBtn && nextBtn && prevBtnMobile && nextBtnMobile) {
            // Disable/enable based on position
            const isFirst = currentIndex === 0;
            const isLast = currentIndex === verses.length - 1;

            prevBtn.disabled = isFirst;
            nextBtn.disabled = isLast;
            prevBtnMobile.disabled = isFirst;
            nextBtnMobile.disabled = isLast;
        }
    }

    showSegmented(verse, segmentIndex, direction = 'right') {
        const verseDisplay = document.getElementById('verse-display');
        if (!verseDisplay || !verse.segments) return;

        const segment = verse.segments[segmentIndex];
        if (!segment) return;

        // Store current segment for repeat functionality
        this.currentSegmentIndex = segmentIndex;
        window.appStore.update({
            currentSegment: segmentIndex,
            isSegmentedVerse: true
        });

        // Only add exit animation if direction is not 'none'
        if (direction !== 'none') {
            verseDisplay.classList.add(direction === 'right' ? 'slide-out-left' : 'slide-out-right');
        }

        const delay = direction === 'none' ? 0 : 150; // No delay for instant updates

        setTimeout(() => {
            verseDisplay.className = 'verse-display';


            // Check if translation and transliteration should be shown from state store
            const showTranslation = window.appStore.get('showTranslation');
            const showTransliteration = window.appStore.get('showTransliteration');

            // Add verse end mark only on last segment
            const isLastSegment = segmentIndex === verse.segments.length - 1;
            const verseEndMark = isLastSegment ?
                `<span class="verse-end-mark">${this.getVerseEndMark(verse.number)}</span>` : '';

            // Build the HTML - always show Arabic
            let html = `
            <div class="verse-arabic-new">
                ${this.wrapWordsForHighlighting(segment.arabic, verse.number, segmentIndex)}
                ${verseEndMark}
            </div>
        `;

            // Add transliteration WITH its divider (wrapped together)
            if (showTransliteration && segment.transliteration) {
                html += `
                <div class="verse-divider">
                    <svg width="112" height="13" viewBox="0 0 112 13" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M0 6.36389H42M69.3137 6.36389H111.314M55.6569 0.707031L61.3137 6.36389L55.6569 12.0207L50 6.36389L55.6569 0.707031Z" stroke="#E9E9E9"/>
                    </svg>
                </div>
                <div class="verse-transliteration-new">${segment.transliteration}</div>
            `;
            }

            // Add translation WITH its divider (wrapped together)
            if (showTranslation && segment.translation) {
                html += `
                <div class="verse-divider">
                    <svg width="112" height="13" viewBox="0 0 112 13" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M0 6.36389H42M69.3137 6.36389H111.314M55.6569 0.707031L61.3137 6.36389L55.6569 12.0207L50 6.36389L55.6569 0.707031Z" stroke="#E9E9E9"/>
                    </svg>
                </div>
                <div class="verse-translation-new">${segment.translation}</div>
            `;
            }

            verseDisplay.innerHTML = html;

            // Only add enter animation if direction is not 'none'
            if (direction !== 'none') {
                verseDisplay.classList.add(direction === 'right' ? 'slide-in-right' : 'slide-in-left');

                setTimeout(() => {
                    verseDisplay.classList.remove('slide-in-right', 'slide-in-left', 'slide-out-left', 'slide-out-right');
                }, 300);
            }

            // CRITICAL FIX: Update segment indicator UI after displaying segment
            this.updateSegmentIndicator(segmentIndex, verse.segments.length);
        }, delay);
    }

    showSingle(verse, direction = 'right') {
    const verseDisplay = document.getElementById('verse-display');
    if (!verseDisplay) return;

    // Only add exit animation if direction is not 'none'
    if (direction !== 'none') {
        verseDisplay.classList.add(direction === 'right' ? 'slide-out-left' : 'slide-out-right');
    }

    const delay = direction === 'none' ? 0 : 150;

    setTimeout(() => {
        verseDisplay.className = 'verse-display';

        const showTranslation = window.appStore.get('showTranslation');
        const showTransliteration = window.appStore.get('showTransliteration');

        const verseEndMark = `<span class="verse-end-mark">${this.getVerseEndMark(verse.number)}</span>`;

        let html = `
            <div class="verse-arabic-new">
                ${verse.arabic}
                ${verseEndMark}
            </div>
        `;

        if (showTransliteration && verse.transliteration) {
            html += `
                <div class="verse-divider">
                    <svg width="112" height="13" viewBox="0 0 112 13" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M0 6.36389H42M69.3137 6.36389H111.314M55.6569 0.707031L61.3137 6.36389L55.6569 12.0207L50 6.36389L55.6569 0.707031Z" stroke="#E9E9E9"/>
                    </svg>
                </div>
                <div class="verse-transliteration-new">${verse.transliteration}</div>
            `;
        }

        if (showTranslation && verse.translation) {
            html += `
                <div class="verse-divider">
                    <svg width="112" height="13" viewBox="0 0 112 13" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M0 6.36389H42M69.3137 6.36389H111.314M55.6569 0.707031L61.3137 6.36389L55.6569 12.0207L50 6.36389L55.6569 0.707031Z" stroke="#E9E9E9"/>
                    </svg>
                </div>
                <div class="verse-translation-new">${verse.translation}</div>
            `;
        }

        verseDisplay.innerHTML = html;
        verseDisplay.classList.add('active');

        if (direction !== 'none') {
            verseDisplay.classList.add(direction === 'right' ? 'slide-in-right' : 'slide-in-left');
            setTimeout(() => {
                verseDisplay.classList.remove('slide-in-right', 'slide-in-left');
            }, 300);
        }
    }, delay);
}

    showSegmentNavigation(totalSegments) {
        const segmentNav = document.getElementById('segment-navigation');
        if (!segmentNav) return;

        segmentNav.style.display = 'flex';
        this.updateSegmentIndicator(this.currentSegmentIndex, totalSegments);
    }

    // Hide segment navigation
    hideSegmentNavigation() {
        const segmentNav = document.getElementById('segment-navigation');
        if (segmentNav) {
            segmentNav.style.display = 'none';
        }
    }


    // Update segment indicator
    // Update segment indicator
    updateSegmentIndicator(currentSegment, totalSegments) {
        const segmentText = document.getElementById('segment-text');
        const segmentDots = document.getElementById('segment-dots');
        const prevBtn = document.getElementById('prev-segment-btn');
        const nextBtn = document.getElementById('next-segment-btn');

        // Update text indicator
        if (segmentText) {
            segmentText.innerHTML = `Part <span class="segment-number">${currentSegment + 1}</span> of <span class="segment-number">${totalSegments}</span>`;
        }

        // Create and update dots
        if (segmentDots) {
            segmentDots.innerHTML = '';
            for (let i = 0; i < totalSegments; i++) {
                const dot = document.createElement('div');
                dot.className = `segment-dot ${i === currentSegment ? 'active' : ''}`;
                segmentDots.appendChild(dot);
            }
        }

        // Update Previous button state
        if (prevBtn) {
            const isFirst = currentSegment === 0;
            prevBtn.disabled = isFirst;
            prevBtn.style.opacity = isFirst ? '0.5' : '1';
            prevBtn.style.cursor = isFirst ? 'not-allowed' : 'pointer';
        }

        // Update Next button state  
        if (nextBtn) {
            const isLast = currentSegment === totalSegments - 1;
            nextBtn.disabled = isLast;
            nextBtn.style.opacity = isLast ? '0.5' : '1';
            nextBtn.style.cursor = isLast ? 'not-allowed' : 'pointer';
        }
    }


    // Navigate segments
navigateSegment(direction) {
    const verses = window.appStore.get('verses');
    const verse = verses[window.appStore.get('currentVerseIndex')];

    if (!verse || !verse.segments) return;

    const totalSegments = verse.segments.length;

    if (direction === 'next' && this.currentSegmentIndex < totalSegments - 1) {
        this.currentSegmentIndex++;
        
        // ✅ CRITICAL FIX: Save progress when navigating segments
        if (window.readingProgress && verse.number !== 'Bismillah') {
            const surahNumber = getSurahFromURL();
            const currentIndex = window.appStore.get('currentVerseIndex');
            window.readingProgress.savePosition(
                surahNumber,
                currentIndex,
                verse.number,
                this.currentSegmentIndex
            );
            console.log(`✅ Saved progress after NEXT: Segment ${this.currentSegmentIndex} (Part ${this.currentSegmentIndex + 1})`);
        }
        
        this.showSegmented(verse, this.currentSegmentIndex, 'right');

        // Pause any playing audio
        if (window.appStore.get('isReciting') && !window.appStore.get('isPaused')) {
            audioService.stopAudio();
            window.appStore.update({ isPaused: true });
            window.playbackControls.updatePlayPauseButton('play');
        }

        // ✅ NEW: Re-initialize word highlighting for new segment
        if (window.wordHighlighter && verse.hasAudio) {
            setTimeout(async () => {
                const verseNumber = verse.number || verse.numberInSurah;
                await window.wordHighlighter.initializeVerse(verseNumber);
                console.log('[VerseDisplay] Word highlighting re-initialized for segment', this.currentSegmentIndex + 1);
            }, 500);
        }

    } else if (direction === 'prev' && this.currentSegmentIndex > 0) {
        this.currentSegmentIndex--;
        
        // ✅ CRITICAL FIX: Save progress when navigating segments
        if (window.readingProgress && verse.number !== 'Bismillah') {
            const surahNumber = getSurahFromURL();
            const currentIndex = window.appStore.get('currentVerseIndex');
            window.readingProgress.savePosition(
                surahNumber,
                currentIndex,
                verse.number,
                this.currentSegmentIndex
            );
            console.log(`✅ Saved progress after PREV: Segment ${this.currentSegmentIndex} (Part ${this.currentSegmentIndex + 1})`);
        }
        
        this.showSegmented(verse, this.currentSegmentIndex, 'left');

        // Pause any playing audio
        if (window.appStore.get('isReciting') && !window.appStore.get('isPaused')) {
            audioService.stopAudio();
            window.appStore.update({ isPaused: true });
            window.playbackControls.updatePlayPauseButton('play');
        }

        // ✅ NEW: Re-initialize word highlighting for new segment
        if (window.wordHighlighter && verse.hasAudio) {
            setTimeout(async () => {
                const verseNumber = verse.number || verse.numberInSurah;
                await window.wordHighlighter.initializeVerse(verseNumber);
                console.log('[VerseDisplay] Word highlighting re-initialized for segment', this.currentSegmentIndex + 1);
            }, 500);
        }
    }
}

    getVerseEndMark(verseNumber) {
        if (!verseNumber || verseNumber === 'Bismillah') return '';

        // Arabic-Indic numerals (0-9)
        const arabicNumerals = ['\u06F0', '\u06F1', '\u06F2', '\u06F3', '\u06F4', '\u06F5', '\u06F6', '\u06F7', '\u06F8', '\u06F9'];
        const arabicNum = verseNumber.toString()
            .split('')
            .map(d => arabicNumerals[parseInt(d)])
            .join('');

        // U+06DD is the Arabic End of Ayah marker
        return `\u06DD${arabicNum}`;
    }

    // Add method to wrap words for highlighting
    wrapWordsForHighlighting(arabicText, verseNumber, segmentIndex = null) {
        const words = arabicText.split(/\s+/);
        let actualWordIndex = 0;

        return words.map((word) => {
            // Skip empty words
            if (!word || word.trim() === '') return '';

            // Check for verse end marker (don't highlight this)
            if (word.includes('\u06DD')) {
                return `<span class="verse-end-number">${word}</span>`;
            }

            // Check for waqf marks (don't highlight these)
            if (/[\u06D6-\u06DC]/.test(word)) {
                return `<span class="waqf-mark">${word}</span>`;
            }

            // Regular Arabic words get clickable spans for highlighting
            const wordId = segmentIndex !== null
                ? `word-${verseNumber}-${segmentIndex}-${actualWordIndex}`
                : `word-${verseNumber}-${actualWordIndex}`;

            const span = `<span class="arabic-word word" 
                      data-word-index="${actualWordIndex}" 
                      data-verse-number="${verseNumber}"
                      data-segment-index="${segmentIndex !== null ? segmentIndex : ''}"
                      data-word-id="${wordId}">${word}</span>`;
            actualWordIndex++;
            return span;
        }).join(' ');
    }

    // Initialize click handlers for word jumping
    initializeWordClickHandlers() {
        document.querySelectorAll('.arabic-word').forEach(wordElement => {
            wordElement.addEventListener('click', (e) => {
                e.stopPropagation();
                const wordIndex = parseInt(wordElement.dataset.wordIndex);
                const segmentIndex = parseInt(wordElement.dataset.segmentIndex);
                this.jumpToWord(wordIndex, segmentIndex);
            });
        });
    }

    // Update the jumpToWord method:
    jumpToWord(wordIndex, segmentIndex) {
        const audio = audioService.getCurrentAudio();
        if (!audio || !window.currentVerseTimings) return;

        const verses = window.appStore.get('verses');
        const verse = verses[window.appStore.get('currentVerseIndex')];
        let fullVerseWordIndex = wordIndex;

        // Calculate the actual word position in the full verse
        if (verse.segments && verse.segments.length > 1 && segmentIndex !== undefined) {
            fullVerseWordIndex = 0;

            // Add all words from previous segments
            for (let i = 0; i < segmentIndex; i++) {
                const segmentText = verse.segments[i].arabic;
                const words = segmentText.split(/\s+/).filter(w =>
                    w.length > 0 && !this.isWaqfMark(w)
                );
                fullVerseWordIndex += words.length;
            }

            // Add the clicked word index
            fullVerseWordIndex += wordIndex;
        }

        console.log(`Jumping to segment ${segmentIndex}, word ${wordIndex}, full verse word ${fullVerseWordIndex}`);

        // Jump to the word timing
        if (window.currentVerseTimings.words && window.currentVerseTimings.words[fullVerseWordIndex]) {
            const wordTiming = window.currentVerseTimings.words[fullVerseWordIndex];
            audio.currentTime = wordTiming.start;

            // Resume playback if paused
            if (audio.paused) {
                audio.play();
                window.appStore.update({
                    isReciting: true,
                    isPaused: false
                });

                // Update play/pause button
                const icon = document.getElementById('play-pause-icon');
                const text = document.getElementById('play-pause-text');
                if (icon && text) {
                    icon.textContent = 'â¸ï¸';
                    text.textContent = 'Pause';
                }
            }

            // Restart highlighting from this position
            if (window.wordHighlighter) {
                window.wordHighlighter.reset();
                setTimeout(() => {
                    window.wordHighlighter.reinitializeForSegment();
                    window.wordHighlighter.startPreciseHighlighting(audio, window.currentVerseTimings.words);
                }, 100);
            }
        }
    }

    // Add helper to check if word is waqf mark
    isWaqfMark(word) {
        const waqfMarks = ['\u06D6', '\u06D7', '\u06D8', '\u06D9', '\u06DA', '\u06DB'];
        return waqfMarks.some(mark => word.includes(mark));
    }


    showFullVerse(verse, direction = 'right') {
        const verseDisplay = document.getElementById('verse-display');
        if (!verseDisplay) return;

        // Only add exit animation if direction is not 'none'
        if (direction !== 'none') {
            verseDisplay.classList.add(direction === 'right' ? 'slide-out-left' : 'slide-out-right');
        }

        const delay = direction === 'none' ? 0 : 150; // No delay for instant updates

        setTimeout(() => {
            verseDisplay.className = 'verse-display';

            // Check if translation and transliteration should be shown from state store
            const showTranslation = window.appStore.get('showTranslation');
            const showTransliteration = window.appStore.get('showTransliteration');

            // Build the HTML - always show Arabic
            let html = `
            <div class="verse-arabic-new">
                ${this.wrapWordsForHighlighting(verse.arabic, verse.number)}
                ${verse.number !== 'Bismillah' ? `<span class="verse-end-mark">${this.getVerseEndMark(verse.number)}</span>` : ''}
            </div>
        `;

            // Add transliteration WITH its divider (wrapped together)
            if (showTransliteration && verse.transliteration) {
                html += `
                <div class="verse-divider">
                    <svg width="112" height="13" viewBox="0 0 112 13" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M0 6.36389H42M69.3137 6.36389H111.314M55.6569 0.707031L61.3137 6.36389L55.6569 12.0207L50 6.36389L55.6569 0.707031Z" stroke="#E9E9E9"/>
                    </svg>
                </div>
                <div class="verse-transliteration-new">${verse.transliteration}</div>
            `;
            }

            // Add translation WITH its divider (wrapped together)
            if (showTranslation && verse.english) {
                html += `
                <div class="verse-divider">
                    <svg width="112" height="13" viewBox="0 0 112 13" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M0 6.36389H42M69.3137 6.36389H111.314M55.6569 0.707031L61.3137 6.36389L55.6569 12.0207L50 6.36389L55.6569 0.707031Z" stroke="#E9E9E9"/>
                    </svg>
                </div>
                <div class="verse-translation-new">${verse.english}</div>
            `;
            }

            verseDisplay.innerHTML = html;

            // Only add enter animation if direction is not 'none'
            if (direction !== 'none') {
                verseDisplay.classList.add(direction === 'right' ? 'slide-in-right' : 'slide-in-left');

                setTimeout(() => {
                    verseDisplay.classList.remove('slide-in-right', 'slide-in-left', 'slide-out-left', 'slide-out-right');
                }, 300);
            }
            // Update segment navigation UI
            this.updateSegmentIndicator(segmentIndex, verse.segments.length);
        }, delay);
    }


    // Navigate to next (handles segments)
    // Update next() method to NOT handle segments:
    next() {
        if (this.isTransitioning) return;

        const verses = window.appStore.get('verses');
        const currentIndex = window.appStore.get('currentVerseIndex');

        // Always move to next verse, not segment
        if (currentIndex < verses.length - 1) {
            this.currentSegmentIndex = 0;
            this.stopAllAudio();

            setTimeout(() => {
                window.appStore.set('currentVerseIndex', currentIndex + 1);
                this.show(currentIndex + 1, 'right');

                // Play the new segment if audio was playing
                if (window.appStore.get('isReciting') && !window.appStore.get('isPaused')) {
                    // Pause the current audio
                    audioService.stopAudio();
                    window.appStore.update({ isPaused: true });
                    window.playbackControls.updatePlayPauseButton('play');
                }
            }, 100);
        }
    }

    // Update previous() method to NOT handle segments:
    previous() {
        if (this.isTransitioning) return;

        const currentIndex = window.appStore.get('currentVerseIndex');

        // Always move to previous verse, not segment
        if (currentIndex > 0) {
            this.stopAllAudio();

            setTimeout(() => {
                window.appStore.set('currentVerseIndex', currentIndex - 1);
                this.currentSegmentIndex = 0;
                this.show(currentIndex - 1, 'left');

                // Play the new segment if audio was playing
                if (window.appStore.get('isReciting') && !window.appStore.get('isPaused')) {
                    // Pause the current audio
                    audioService.stopAudio();
                    window.appStore.update({ isPaused: true });
                    window.playbackControls.updatePlayPauseButton('play');
                }
            }, 100);
        }
    }
    // Update jumpToSegment in verse-display.js
jumpToSegment(segmentIndex) {
    const verses = window.appStore.get('verses');
    const currentVerse = verses[window.appStore.get('currentVerseIndex')];
    if (currentVerse && currentVerse.segments && segmentIndex < currentVerse.segments.length) {
        const previousSegmentIndex = this.currentSegmentIndex;
        this.currentSegmentIndex = segmentIndex;
        
        // ✅ CRITICAL FIX: Update the app store segment state immediately
        window.appStore.set('currentSegment', segmentIndex);
        window.appStore.set('isSegmentedVerse', true);
        
        // ✅ CRITICAL FIX: Save reading progress when jumping to a segment
        if (window.readingProgress && currentVerse.number !== 'Bismillah') {
            const surahNumber = getSurahFromURL();
            const currentIndex = window.appStore.get('currentVerseIndex');
            window.readingProgress.savePosition(
                surahNumber, 
                currentIndex, 
                currentVerse.number, 
                segmentIndex
            );
            console.log(`✅ Saved progress: Verse ${currentVerse.number}, Segment ${segmentIndex} (Part ${segmentIndex + 1})`);
        }
        
        // Keep the last word highlighted during transition
        const keepHighlight = Math.abs(previousSegmentIndex - segmentIndex) === 1;
        
        this.showSegmented(currentVerse, segmentIndex);
        
        const audio = audioService.getCurrentAudio();
        if (audio && window.currentVerseTimings && window.currentVerseTimings.segments) {
            const segmentTiming = window.currentVerseTimings.segments[segmentIndex];
            if (segmentTiming) {
                const isManualJump = Math.abs(previousSegmentIndex - segmentIndex) > 1;
                const isAudioOutOfSync = Math.abs(audio.currentTime - segmentTiming.start) > 1;
                
                if (isManualJump || isAudioOutOfSync) {
                    audio.currentTime = segmentTiming.start;
                }
            }
        }
        
        // Reinitialize word highlighting with delay
        if (window.wordHighlighter && audio) {
            // Clear old highlighting only if not sequential
            if (!keepHighlight) {
                window.wordHighlighter.reset();
            }
            
            setTimeout(() => {
                if (!audio.paused && window.appStore.get('isReciting')) {
                    window.wordHighlighter.reinitializeForSegment();
                    
                    if (window.currentVerseTimings && window.currentVerseTimings.words) {
                        window.wordHighlighter.startPreciseHighlighting(
                            audio, 
                            window.currentVerseTimings.words
                        );
                    }
                }
            }, 400);
        }
        
        if (window.playbackControls) {
            window.playbackControls.updateStatus(
                `Part ${segmentIndex + 1} of ${currentVerse.segments.length}`
            );
        }
    }
}

    // Get Waqf name for display
    getWaqfName(waqfType) {
        const waqfNames = {
            'compulsory_stop': 'Compulsory Stop (Ù…Ù€)',
            'absolute_pause': 'Absolute Pause (Ø·)',
            'permissible_stop': 'Permissible Stop (Ø¬)',
            'preferred_stop': 'Preferred Stop (ØµÙ„Ù‰)',
            'small_stop': 'Brief Pause',
            'verse_end': 'End of Verse'
        };
        return waqfNames[waqfType] || waqfType;
    }


    // NEW METHOD: Stop all audio completely
    stopAllAudio() {
        // Stop current audio
        if (audioService.getCurrentAudio()) {
            audioService.getCurrentAudio().pause();
            audioService.getCurrentAudio().currentTime = 0;
        }

        // Stop any other audio elements that might be playing
        const allAudioElements = document.querySelectorAll('audio');
        allAudioElements.forEach(audio => {
            audio.pause();
            audio.currentTime = 0;
            audio.remove(); // Remove from DOM
        });

        // Clean up word highlighting
        if (window.wordHighlighter) {
            window.wordHighlighter.cleanup();
        }

        // Clean up audio service
        audioService.cleanup();

        // Remove all highlights
        this.removeAllHighlights();
    }

    // Add this new method to populate the dropdown
    populateVerseSelector() {
        const selector = document.getElementById('verse-selector');

        // Populate custom dropdown
        if (window.verseDropdown) {
            window.verseDropdown.populate();
        }

        const verses = window.appStore.get('verses');
        if (!selector || !verses) {
            console.log('Verse selector not found or no verses');
            return;
        }

        // Clear existing options
        selector.innerHTML = '';

        // Add options for each verse
        verses.forEach((verse, index) => {
            const option = document.createElement('option');
            option.value = index;

            if (verse.number === 'Bismillah') {
                option.textContent = 'Bismillah';
            } else {
                option.textContent = verse.number;
            }

            selector.appendChild(option);
        });

        console.log(`✅ Populated verse selector with ${verses.length} verses`);
    }

    // Update the updateCounter method
    updateCounter() {
        const verses = window.appStore.get('verses');
        const currentIndex = window.appStore.get('currentVerseIndex');
        const current = verses[currentIndex];
        const selector = document.getElementById('verse-selector');

        if (current) {
            // Update dropdown selection
            if (selector) {
                selector.value = currentIndex;
            }

            // Update verse display info
            let displayText = '';
            if (current.number === 'Bismillah') {
                displayText = 'Bismillah';
            } else {
                const currentSurah = window.appStore.get('currentSurah');
                const totalVerses = currentSurah ? currentSurah.verses : verses.length;
                displayText = `Verse ${current.number} of ${totalVerses}`;

                // Add segment info if applicable
                if (current.segments && current.segments.length > 1) {
                    displayText += ` (Part ${this.currentSegmentIndex + 1}/${current.segments.length})`;
                }
            }

            const counter = document.getElementById('verse-counter');
            if (counter) {
                counter.textContent = displayText;
            }
        }
    }


    // Add method to handle jumping to selected verse
    jumpToVerse(index) {
        const currentIndex = window.appStore.get('currentVerseIndex');
        const newIndex = parseInt(index);

        // Determine animation direction based on index comparison
        let direction = 'none';
        if (newIndex > currentIndex) {
            direction = 'right'; // Moving forward
        } else if (newIndex < currentIndex) {
            direction = 'left'; // Moving backward
        }

        // Stop any ongoing playback but preserve pause state
        const wasPlaying = window.appStore.get('isReciting') && !window.appStore.get('isPaused');

        if (wasPlaying) {
            // Stop audio and mark as paused (not fully stopped)
            audioService.stopAudio();
            // Clear any playing audio reference
            audioService.setCurrentAudio(null);
            window.appStore.update({
                isPaused: true,
                isReciting: false
            });
            window.playbackControls.updatePlayPauseButton('play');
        }

        // Update verse index
        window.appStore.set('currentVerseIndex', newIndex);

        // Show the selected verse with appropriate animation
        this.show(newIndex, direction);

        // Update navigation buttons
        this.updateNavigationButtons();

        const verses = window.appStore.get('verses');
        console.log(`Jumped to verse ${verses[newIndex].number} (direction: ${direction})`);
    }



    updateNavigationButtons() {
        // Get buttons directly each time
        const prevBtn = document.getElementById('prev-btn');
        const nextBtn = document.getElementById('next-btn');

        const verses = window.appStore.get('verses');
        const currentIndex = window.appStore.get('currentVerseIndex');

        // Only disable based on position, not on playback state
        if (prevBtn) {
            prevBtn.disabled = currentIndex === 0;
        }
        if (nextBtn) {
            nextBtn.disabled = currentIndex === verses.length - 1;
        }
    }

    // Add highlight to current verse
    addHighlight(verseId) {
        const verseDisplay = document.getElementById('verse-display');
        if (verseDisplay) {
            //verseDisplay.classList.add('current-verse-highlight');
        }
    }

    // Remove highlight from verse
    removeHighlight(verseId) {
        const verseDisplay = document.getElementById('verse-display');
        if (verseDisplay) {
            //verseDisplay.classList.remove('current-verse-highlight');
        }
    }

    // Remove all highlights
    removeAllHighlights() {
        const verseDisplay = document.getElementById('verse-display');
        if (verseDisplay) {
            verseDisplay.classList.remove('current-verse-highlight');
        }
    }

    // Get current verse element
    getCurrentVerseElement() {
        return document.getElementById('verse-display');
    }

    // Get current segment index
    getCurrentSegmentIndex() {
        return this.currentSegmentIndex;
    }

    // Get current verse data
    getCurrentVerseData() {
        const verses = window.appStore.get('verses');
        const index = window.appStore.get('currentVerseIndex');
        return verses[index];
    }

    // Add this method to VerseDisplay class
    addOfflineControls() {
        const container = document.querySelector('.audio-controls');
        if (!container) return;

        const offlineBtn = document.createElement('button');
        offlineBtn.className = 'control-button offline-btn';
        offlineBtn.innerHTML = `
        <span>💾</span>
        <span>Save Offline</span>
    `;
        offlineBtn.onclick = () => this.downloadCurrentSurah();

        container.appendChild(offlineBtn);
    }

    async downloadCurrentSurah() {
        const surahNumber = getSurahFromURL();
        const btn = document.querySelector('.offline-btn');

        // Show loading state
        btn.innerHTML = `
        <span>⏳</span>
        <span>Downloading...</span>
    `;
        btn.disabled = true;

        try {
            // Cache the surah
            await window.swManager.cacheSurah(surahNumber);

            // Show success
            btn.innerHTML = `
            <span>✅</span>
            <span>Available Offline</span>
        `;

            setTimeout(() => {
                btn.innerHTML = `
                <span>💾</span>
                <span>Save Offline</span>
            `;
                btn.disabled = false;
            }, 3000);

        } catch (error) {
            console.error('Failed to cache surah:', error);
            btn.innerHTML = `
            <span>❌</span>
            <span>Download Failed</span>
        `;
            btn.disabled = false;
        }
    }

}

// Add window resize listener to recheck overflow
window.addEventListener('resize', () => {
    if (window.verseDisplay) {
        window.verseDisplay.detectOverflow();
    }
});

// Create global instance
window.verseDisplay = new VerseDisplay();