// js/core/state-store.js - Centralized state management
class StateStore {
    constructor() {
        this.state = {
            // App-wide state
            currentSurah: null,
            verses: [],
            currentVerseIndex: 0,
            
            // Playback state
            isReciting: false,
            isPaused: false,
            pausedAt: null, 
            currentSegment: 0,
            isSegmentedVerse: false,
            
            // Settings
            autoAdvance: true,
            repeatMode: 'none',
            repeatCount: 3,
            currentRepeatCount: 0,
            surahRepeatCount: 0,
            highlightingEnabled: true,
            showTranslation: true,
            showTransliteration: false,
            
            // UI state
            isLoading: false,
            error: null,
            resumeDialogData: null
        };
        
        this.listeners = new Map();
        this.persistentKeys = ['highlightingEnabled', 'showTranslation', 'showTransliteration'];
        // Load persistent state
        this.loadPersistentState();
    }
    
    set(key, value) {
        const oldValue = this.state[key];
        this.state[key] = value;
        
        // Persist if needed
        if (this.persistentKeys.includes(key)) {
            this.persistState(key, value);
        }
        
        this.notify(key, value, oldValue);
        return value;
    }
    
    get(key) {
        return this.state[key];
    }
    
    update(updates) {
        Object.keys(updates).forEach(key => {
            this.set(key, updates[key]);
        });
    }
    
    subscribe(key, callback) {
        if (!this.listeners.has(key)) {
            this.listeners.set(key, new Set());
        }
        this.listeners.get(key).add(callback);
        
        // Return unsubscribe function
        return () => this.listeners.get(key).delete(callback);
    }
    
    subscribeMultiple(keys, callback) {
        const unsubscribes = keys.map(key => this.subscribe(key, callback));
        return () => unsubscribes.forEach(unsub => unsub());
    }
    
    notify(key, newValue, oldValue) {
        const callbacks = this.listeners.get(key);
        if (callbacks) {
            callbacks.forEach(cb => cb(newValue, oldValue, key));
        }
    }
    
    loadPersistentState() {
        this.persistentKeys.forEach(key => {
            const stored = localStorage.getItem(`quranApp_${key}`);
            if (stored !== null) {
                try {
                    this.state[key] = JSON.parse(stored);
                } catch {
                    this.state[key] = stored;
                }
            }
        });
    }
    
    persistState(key, value) {
        try {
            localStorage.setItem(`quranApp_${key}`, JSON.stringify(value));
        } catch (e) {
            console.warn('Failed to persist state:', key, e);
        }
    }
    
    // Helper methods for common operations
    nextVerse() {
        const newIndex = Math.min(this.state.currentVerseIndex + 1, this.state.verses.length - 1);
        this.set('currentVerseIndex', newIndex);
        return newIndex;
    }
    
    previousVerse() {
        const newIndex = Math.max(this.state.currentVerseIndex - 1, 0);
        this.set('currentVerseIndex', newIndex);
        return newIndex;
    }
    
    reset() {
        this.update({
            currentVerseIndex: 0,
            isReciting: false,
            isPaused: false,
            currentSegment: 0,
            isSegmentedVerse: false,
            currentRepeatCount: 0,
            surahRepeatCount: 0
        });
    }
}

// Create global instance
window.appStore = new StateStore();