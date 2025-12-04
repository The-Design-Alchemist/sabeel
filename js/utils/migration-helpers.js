// migration-helpers.js - Temporary compatibility layer during migration
// Remove this file after full migration is complete and tested

// Create proxy for old appState references to help catch any missed migrations
window.appState = new Proxy({}, {
    get(target, prop) {
        console.warn(`🔄 Migration Helper: accessing window.appState.${prop}, use window.appStore.get('${prop}') instead`);
        return window.appStore.get(prop);
    },
    set(target, prop, value) {
        console.warn(`🔄 Migration Helper: setting window.appState.${prop}, use window.appStore.set('${prop}', value) instead`);
        window.appStore.set(prop, value);
        return true;
    }
});

// Add a helper function to check migration status
window.checkMigrationStatus = function() {
    console.log('🔍 State Migration Status:');
    console.log('State Store:', window.appStore.state);
    console.log('Available methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(window.appStore)));
    
    // Check if any critical state is missing
    const criticalKeys = ['currentVerseIndex', 'verses', 'currentSurah', 'isReciting'];
    const missingKeys = criticalKeys.filter(key => window.appStore.get(key) === undefined);
    
    if (missingKeys.length > 0) {
        console.warn('⚠️ Missing critical state keys:', missingKeys);
    } else {
        console.log('✅ All critical state keys present');
    }
};

// Add debugging helper to track state changes
window.debugStateChanges = function(enable = true) {
    if (enable) {
        // Subscribe to all state changes for debugging
        Object.keys(window.appStore.state).forEach(key => {
            window.appStore.subscribe(key, (newValue, oldValue, key) => {
                console.log(`🔄 State Change: ${key}`, { oldValue, newValue });
            });
        });
        console.log('🐛 State change debugging enabled');
    } else {
        console.log('🐛 State change debugging disabled');
    }
};

// Helper to migrate any remaining localStorage items
window.migrateLegacySettings = function() {
    const legacySettings = localStorage.getItem('quranAppSettings');
    if (legacySettings) {
        try {
            const settings = JSON.parse(legacySettings);
            console.log('🔄 Migrating legacy settings:', settings);
            
            // Map old settings to new state store
            if (settings.showTranslation !== undefined) {
                window.appStore.set('showTranslation', settings.showTranslation);
            }
            if (settings.showTransliteration !== undefined) {
                window.appStore.set('showTransliteration', settings.showTransliteration);
            }
            if (settings.showHighlighting !== undefined) {
                window.appStore.set('highlightingEnabled', settings.showHighlighting);
            }
            
            console.log('✅ Legacy settings migrated successfully');
            
            // Optionally remove the old settings
            // localStorage.removeItem('quranAppSettings');
        } catch (e) {
            console.error('❌ Failed to migrate legacy settings:', e);
        }
    } else {
        console.log('ℹ️ No legacy settings found');
    }
};

// Run migration check on load
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        console.log('🔄 Running migration check...');
        window.checkMigrationStatus();
        window.migrateLegacySettings();
        
        // Uncomment to enable state change debugging
        // window.debugStateChanges(true);
    }, 1000);
});

console.log('🔄 Migration helpers loaded. Use window.checkMigrationStatus() to verify migration.');