// api-service.js - Update to use NetworkManager
class ApiService {
    constructor() {
        this.dataCache = new Map();
        this.cacheTimeout = 3600000; // 1 hour
        this.initNetworkHandling();
    }
    
    initNetworkHandling() {
        // Listen to network events
        if (window.networkManager) {
            window.networkManager.on('online', () => {
                console.log('API Service: Network restored, refreshing cache');
                this.refreshStaleCache();
            });
            
            window.networkManager.on('connectionChange', (event) => {
                const quality = event.detail.type;
                console.log('API Service: Connection quality changed to', quality);
                this.adjustCacheStrategy(quality);
            });
        }
    }
    
    async fetchVerseData(surahNumber) {
        const cacheKey = `verses-${surahNumber}`;
        
        // Check cache first
        const cached = this.getCached(cacheKey);
        if (cached) {
            console.log(`Using cached data for Surah ${surahNumber}`);
            return cached;
        }
        
        try {
            const url = `./quran-data/enhanced/${surahNumber.toString().padStart(3, '0')}.json`;
            
            // Use network manager for resilient fetching
            const response = await (window.networkManager ? 
                window.networkManager.fetchWithRetry(url) : 
                fetch(url));
                
            const data = await response.json();
            
            // Transform to match app's expected structure
            const verses = this.transformVerseData(data);
            
            // Cache the result
            this.setCache(cacheKey, verses);
            
            return verses;
            
        } catch (error) {
            console.error('Error loading verse data:', error);
            
            // Try to return stale cache if available
            const staleCache = this.getCached(cacheKey, true);
            if (staleCache) {
                console.warn('Using stale cache due to network error');
                this.showStaleDataWarning();
                return staleCache;
            }
            
            throw error;
        }
    }
    
    transformVerseData(data) {
        const verses = [];
        
        data.verses.forEach(verse => {
            const verseNumber = verse.key.split(':')[1];
            
            verses.push({
                number: verseNumber,
                text: verse.arabic || verse.arabicSimple,
                arabic: verse.arabic || verse.arabicSimple,
                english: verse.translation,
                transliteration: verse.transliteration,
                hasAudio: true,
                segments: verse.segments,
                words: verse.words,
                wordCount: verse.wordCount,
                key: verse.key,
                id: `verse-${verseNumber}-display`
            });
        });
        
        return verses;
    }
    
    async fetchAudioWithFallback(audioUrl) {
        try {
            // Try primary URL
            const response = await (window.networkManager ? 
                window.networkManager.fetchWithRetry(audioUrl, { mode: 'cors' }) : 
                fetch(audioUrl));
                
            if (response.ok) {
                return response;
            }
        } catch (error) {
            console.warn('Primary audio fetch failed, trying fallback:', error);
        }
        
        // Try fallback CDN or alternate source
        const fallbackUrl = audioUrl.replace('/audio/', '/audio-backup/');
        
        try {
            const response = await fetch(fallbackUrl);
            if (response.ok) {
                console.log('Using fallback audio source');
                return response;
            }
        } catch (error) {
            console.error('Fallback audio also failed:', error);
        }
        
        throw new Error('Audio not available');
    }
    
    getCached(key, includeStale = false) {
        const cached = this.dataCache.get(key);
        
        if (!cached) {
            // Try to load from localStorage
            const persistent = this.loadFromPersistentCache(key);
            if (persistent) {
                this.dataCache.set(key, persistent);
                return persistent.data;
            }
            return null;
        }
        
        const age = Date.now() - cached.timestamp;
        
        if (age < this.cacheTimeout || includeStale) {
            return cached.data;
        }
        
        return null;
    }
    
    setCache(key, data) {
        const cacheEntry = {
            data,
            timestamp: Date.now()
        };
        
        this.dataCache.set(key, cacheEntry);
        
        // Also save to localStorage for persistence
        this.persistCache(key, data);
    }
    
    loadFromPersistentCache(key) {
        try {
            const stored = localStorage.getItem(`quranApp_cache_${key}`);
            if (stored) {
                const parsed = JSON.parse(stored);
                return {
                    data: parsed.d,
                    timestamp: parsed.t
                };
            }
        } catch (e) {
            console.warn('Failed to load persistent cache:', e);
        }
        return null;
    }
    
    persistCache(key, data) {
        try {
            const compressed = {
                v: 1, // version
                t: Date.now(), // timestamp
                d: data // data
            };
            localStorage.setItem(`quranApp_cache_${key}`, JSON.stringify(compressed));
        } catch (e) {
            console.warn('Failed to persist cache:', e);
            // Clear old cache if storage is full
            this.clearOldCache();
        }
    }
    
    clearOldCache() {
        const keys = Object.keys(localStorage);
        const cacheKeys = keys.filter(k => k.startsWith('quranApp_cache_'));
        
        // Sort by age and remove oldest half
        const cacheEntries = cacheKeys.map(key => {
            try {
                const data = JSON.parse(localStorage.getItem(key));
                return { key, timestamp: data.t || 0 };
            } catch {
                return { key, timestamp: 0 };
            }
        });
        
        cacheEntries.sort((a, b) => a.timestamp - b.timestamp);
        const toRemove = cacheEntries.slice(0, Math.floor(cacheEntries.length / 2));
        
        toRemove.forEach(entry => localStorage.removeItem(entry.key));
        console.log(`Cleared ${toRemove.length} old cache entries`);
    }
    
    refreshStaleCache() {
        // Refresh cache entries that are older than 30 minutes
        const staleAge = 1800000; // 30 minutes
        const now = Date.now();
        
        for (const [key, cached] of this.dataCache.entries()) {
            if (now - cached.timestamp > staleAge) {
                // Extract surah number from key
                const match = key.match(/verses-(\d+)/);
                if (match) {
                    const surahNumber = match[1];
                    console.log(`Refreshing stale cache for Surah ${surahNumber}`);
                    
                    // Re-fetch in background
                    this.fetchVerseData(parseInt(surahNumber)).catch(err => {
                        console.warn(`Failed to refresh cache for Surah ${surahNumber}:`, err);
                    });
                }
            }
        }
    }
    
    adjustCacheStrategy(connectionQuality) {
        // Adjust cache timeout based on connection quality
        switch (connectionQuality) {
            case 'excellent':
                this.cacheTimeout = 1800000; // 30 minutes
                break;
            case 'good':
                this.cacheTimeout = 3600000; // 1 hour
                break;
            case 'poor':
            case 'offline':
                this.cacheTimeout = 86400000; // 24 hours
                break;
            default:
                this.cacheTimeout = 3600000; // 1 hour
        }
    }
    
    showStaleDataWarning() {
        if (!document.querySelector('.stale-data-warning')) {
            const warning = document.createElement('div');
            warning.className = 'stale-data-warning';
            warning.innerHTML = `
                <span>⚠️ Using offline data. Some content may be outdated.</span>
            `;
            warning.style.cssText = `
                position: fixed;
                top: 60px;
                left: 50%;
                transform: translateX(-50%);
                background: #ff9800;
                color: white;
                padding: 10px 20px;
                border-radius: 8px;
                font-size: 14px;
                z-index: 9998;
            `;
            
            document.body.appendChild(warning);
            
            setTimeout(() => warning.remove(), 5000);
        }
    }

    getVerseEndMark(verseNumber) {
        const arabicNumerals = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
        const arabicNum = verseNumber.toString().split('').map(d => arabicNumerals[parseInt(d)]).join('');
        return `۝${arabicNum}`;
    }
        
    createSegmentsFromWaqf(arabicText, translation, transliteration, verseNumber) {
        // Enhanced Waqf pattern - ensure we catch all marks
        const waqfPattern = /[\u06D4\u06D6\u06D7\u06D8\u06D9\u06DA\u06DB\u06DC\u06DD\u06DE\u06DF\u06E0-\u06E9\u0670]/g;
        
        // Find all Waqf positions
        const waqfPositions = [];
        let match;
        while ((match = waqfPattern.exec(arabicText)) !== null) {
            waqfPositions.push({
                index: match.index,
                mark: match[0],
                endIndex: match.index + 1
            });
        }
        
        const wordCount = arabicText.split(/\s+/).length;
        
        // Only segment if we have marks and sufficient length
        if (waqfPositions.length === 0 || wordCount < 15) {
            return [];
        }
        
        console.log(`Verse ${verseNumber}: Found ${waqfPositions.length} Waqf marks in ${wordCount} words`);
        
        const segments = [];
        let lastIndex = 0;
        
        // Split translation into sentences for better distribution
        const translationSentences = translation.split(/[.!?;]/).filter(s => s.trim());
        const transliterationWords = transliteration.split(/\s+/);
        
        waqfPositions.forEach((waqf, segmentIndex) => {
            const segmentArabic = arabicText.substring(lastIndex, waqf.endIndex).trim();
            
            if (segmentArabic.length > 0) {
                // Better translation distribution
                const segmentRatio = (waqf.endIndex - lastIndex) / arabicText.length;
                const expectedTranslationLength = Math.floor(translation.length * segmentRatio);
                
                // Use sentence boundaries when possible
                let segmentTranslation = '';
                if (translationSentences.length > 1 && segmentIndex < translationSentences.length) {
                    segmentTranslation = translationSentences[segmentIndex]?.trim() || 
                                       translation.substring(
                                           Math.floor(translation.length * (lastIndex / arabicText.length)),
                                           Math.floor(translation.length * (waqf.endIndex / arabicText.length))
                                       ).trim();
                } else {
                    // Fallback to proportional split
                    const startPos = Math.floor(translation.length * (lastIndex / arabicText.length));
                    const endPos = Math.floor(translation.length * (waqf.endIndex / arabicText.length));
                    segmentTranslation = translation.substring(startPos, endPos).trim();
                }
                
                // Similar approach for transliteration
                const translitStartWord = Math.floor(transliterationWords.length * (lastIndex / arabicText.length));
                const translitEndWord = Math.ceil(transliterationWords.length * (waqf.endIndex / arabicText.length));
                const segmentTransliteration = transliterationWords.slice(translitStartWord, translitEndWord).join(' ');
                
                segments.push({
                    id: `${verseNumber}_${segmentIndex + 1}`,
                    segmentNumber: segmentIndex + 1,
                    arabic: segmentArabic,
                    translation: segmentTranslation || `Part ${segmentIndex + 1} translation`,
                    transliteration: segmentTransliteration,
                    waqfMark: waqf.mark,
                    waqfType: this.getWaqfType(waqf.mark)
                });
            }
            
            lastIndex = waqf.endIndex;
        });
        
        // Handle remaining text after last Waqf
        if (lastIndex < arabicText.length) {
            const remainingArabic = arabicText.substring(lastIndex).trim();
            if (remainingArabic.length > 0) {
                const remainingTranslation = translation.substring(
                    Math.floor(translation.length * (lastIndex / arabicText.length))
                ).trim();
                
                const remainingTransliteration = transliterationWords.slice(
                    Math.floor(transliterationWords.length * (lastIndex / arabicText.length))
                ).join(' ');
                
                segments.push({
                    id: `${verseNumber}_${segments.length + 1}`,
                    segmentNumber: segments.length + 1,
                    arabic: remainingArabic,
                    translation: remainingTranslation || 'Final part translation',
                    transliteration: remainingTransliteration,
                    waqfMark: null,
                    waqfType: 'end'
                });
            }
        }
        
        // Add total count to all segments
        segments.forEach(seg => {
            seg.totalSegments = segments.length;
        });
        
        console.log(`Verse ${verseNumber}: Created ${segments.length} segments with proper translations`);
            
        return segments;
    }

    // Helper to identify Waqf type
    getWaqfType(mark) {
        const types = {
            '\u06D4': 'full_stop',           // ۔
            '\u06D6': 'small_stop',           // ۖ
            '\u06D7': 'preferable_stop',      // ۗ
            '\u06D8': 'permissible_stop',     // ۘ
            '\u06D9': 'preferred_stop',       // ۙ
            '\u06DA': 'compulsory_stop',      // ۚ
            '\u06DB': 'sufficient_stop',      // ۛ
            '\u06DC': 'emphasis_stop',        // ۜ
            '\u06DD': 'verse_end',            // ۝
            '\u06DE': 'rub_el_hizb',         // ۞
            '\u06DF': 'rounded_zero',         // ۟
            '\u06E0': 'rectangular_zero',     // ۠
            '\u06E1': 'dotless_khah',        // ۡ
            '\u06E2': 'meem_isolated',       // ۢ
            '\u06E3': 'low_seen',            // ۣ
            '\u06E4': 'madda',               // ۤ
            '\u06E5': 'small_waw',           // ۥ
            '\u06E6': 'small_yeh',           // ۦ
            '\u06E7': 'high_yeh',            // ۧ
            '\u06E8': 'high_noon',           // ۨ
            '\u06E9': 'sajdah',              // ۩
            '\u0670': 'superscript_alef'     // ٰ
        };
        return types[mark] || 'unknown';
    }

    generateFallbackVerses(surahNumber) {
        const surahInfo = window.SURAH_DATABASE[surahNumber];
        const verses = [];
        
        for (let i = 1; i <= surahInfo.verses; i++) {
            verses.push({
                number: i,
                text: `آية ${i}`,
                numberInSurah: i,
                juz: 1,
                manzil: 1,
                page: 1,
                ruku: 1,
                hizbQuarter: 1,
                sajda: false,
                hasAudio: true
            });
        }
        
        return verses;
    }
}

window.apiService = new ApiService();