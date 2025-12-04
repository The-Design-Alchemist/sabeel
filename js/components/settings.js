// settings.js - Settings management with State Store integration

class SettingsManager {
    constructor() {
        this.initializeSubscriptions();
        this.updateUIControls();
    }
    
    initializeSubscriptions() {
        // Subscribe to setting changes from state store
        window.appStore.subscribe('showTranslation', (show) => {
            this.applyTranslationSetting(show);
        });
        
        window.appStore.subscribe('showTransliteration', (show) => {
            this.applyTransliterationSetting(show);
        });
        
        window.appStore.subscribe('highlightingEnabled', (enabled) => {
            this.applyHighlightingSetting(enabled);
        });
    }
    
    // Update UI controls to match current state
    updateUIControls() {
        const translationToggle = document.getElementById('translation-toggle');
        const transliterationToggle = document.getElementById('transliteration-toggle');
        const highlightingToggle = document.getElementById('highlighting-toggle');
        
        if (translationToggle) {
            translationToggle.checked = window.appStore.get('showTranslation');
        }
        if (transliterationToggle) {
            transliterationToggle.checked = window.appStore.get('showTransliteration');
        }
        if (highlightingToggle) {
            highlightingToggle.checked = window.appStore.get('highlightingEnabled');
        }
    }
    
    // Toggle translation visibility
    toggleTranslation(show) {
        window.appStore.set('showTranslation', show);
    }
    
    // Apply translation setting - UPDATED to support both designs
applyTranslationSetting(show) {
    // Remove the CSS hiding logic entirely
    // Just refresh the display
    this.refreshVerseDisplay();
}

    refreshVerseDisplay() {
    // Re-render the current verse to apply toggle changes
    if (window.verseDisplay) {
        const currentIndex = window.appStore.get('currentVerseIndex');
        window.verseDisplay.show(currentIndex, 'none'); // 'none' means no animation
    }
}

    // Toggle transliteration visibility
    toggleTransliteration(show) {
        window.appStore.set('showTransliteration', show);
    }
    
    // Apply transliteration setting - UPDATED to support both designs
applyTransliterationSetting(show) {
    // Remove the CSS hiding logic entirely
    // Just refresh the display
    this.refreshVerseDisplay();
}
    
    // Toggle highlighting
    toggleHighlighting(enabled) {
        window.appStore.set('highlightingEnabled', enabled);
    }
    
    // Apply highlighting setting
    applyHighlightingSetting(enabled) {
        if (!enabled) {
            // Clean up existing highlighting
            if (window.wordHighlighter) {
                window.wordHighlighter.cleanup();
            }
            
            // Restore original text without word spans
            const arabicText = document.querySelector('.verse-display.active .arabic-text');
            if (arabicText && arabicText.dataset.originalText) {
                arabicText.textContent = arabicText.dataset.originalText;
            }
        } else {
            // Re-enable highlighting if audio is playing
            if (window.audioService) {
                const audio = window.audioService.getCurrentAudio ? window.audioService.getCurrentAudio() : null;
                if (audio && !audio.paused && window.appStore.get('isReciting') && !window.appStore.get('isPaused')) {
                    const verse = window.appStore.get('verses')[window.appStore.get('currentVerseIndex')];
                    if (verse && verse.hasAudio && window.wordHighlighter) {
                        setTimeout(() => {
                            window.wordHighlighter.initializeVerse(verse.number);
                            window.wordHighlighter.startHighlighting();
                        }, 100);
                    }
                }
            }
        }
    }
    
    // Create style element for dynamic styles
    createStyleElement() {
        const style = document.createElement('style');
        style.id = 'dynamic-settings-style';
        document.head.appendChild(style);
        return style;
    }
}

// Global settings functions - UPDATED to support both old menu and new modal
function toggleSettings() {
    // Try new design modal first
    const modal = document.getElementById('settings-modal');
    
    if (modal) {
        // New design modal
        const isHidden = modal.style.display === 'none' || !modal.style.display;
        modal.style.display = isHidden ? 'flex' : 'none';
        
        if (isHidden) {
            // Update controls to match current settings
            window.settingsManager.updateUIControls();
        }
    } else {
        // Fall back to old design menu
        const menu = document.getElementById('settings-menu');
        const btn = document.getElementById('settings-toggle');
        
        if (menu && btn) {
            if (menu.style.display === 'none' || !menu.style.display) {
                menu.style.display = 'block';
                btn.classList.add('active');
                
                // Update controls to match current settings
                window.settingsManager.updateUIControls();
            } else {
                menu.style.display = 'none';
                btn.classList.remove('active');
            }
        }
    }
}

function closeSettings() {
    // Try new design modal first
    const modal = document.getElementById('settings-modal');
    
    if (modal) {
        // New design modal
        modal.style.display = 'none';
    } else {
        // Fall back to old design menu
        const menu = document.getElementById('settings-menu');
        const btn = document.getElementById('settings-toggle');
        
        if (menu) menu.style.display = 'none';
        if (btn) btn.classList.remove('active');
    }
}

function toggleTranslation() {
    const toggle = document.getElementById('translation-toggle');
    if (toggle) {
        window.settingsManager.toggleTranslation(toggle.checked);
    }
}

function toggleTransliteration() {
    const toggle = document.getElementById('transliteration-toggle');
    if (toggle) {
        window.settingsManager.toggleTransliteration(toggle.checked);
    }
}

function toggleHighlighting() {
    const toggle = document.getElementById('highlighting-toggle');
    if (toggle) {
        window.settingsManager.toggleHighlighting(toggle.checked);
    }
}

// Close modal when clicking outside - NEW
document.addEventListener('click', function(event) {
    const modal = document.getElementById('settings-modal');
    if (modal && event.target === modal) {
        closeSettings();
    }
});

// Create global instance
window.settingsManager = new SettingsManager();