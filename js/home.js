
        // Complete list of all 114 surahs
        const surahs = [
            { number: 1, arabic: "سُورَةُ الْفَاتِحَة", english: "Al-Fatihah (The Opening)", verses: 7, revelation: "Makki" },
            { number: 2, arabic: "سُورَةُ الْبَقَرَة", english: "Al-Baqarah (The Cow)", verses: 286, revelation: "Madani" },
            { number: 3, arabic: "سُورَةُ آل عِمْرَان", english: "Aal-E-Imran (The Family of Imran)", verses: 200, revelation: "Madani" },
            { number: 4, arabic: "سُورَةُ النِّسَاء", english: "An-Nisa (The Women)", verses: 176, revelation: "Madani" },
            { number: 5, arabic: "سُورَةُ الْمَائِدَة", english: "Al-Ma'idah (The Table)", verses: 120, revelation: "Madani" },
            { number: 6, arabic: "سُورَةُ الْأَنْعَام", english: "Al-An'am (The Cattle)", verses: 165, revelation: "Makki" },
            { number: 7, arabic: "سُورَةُ الْأَعْرَاف", english: "Al-A'raf (The Heights)", verses: 206, revelation: "Makki" },
            { number: 8, arabic: "سُورَةُ الْأَنْفَال", english: "Al-Anfal (The Spoils of War)", verses: 75, revelation: "Madani" },
            { number: 9, arabic: "سُورَةُ التَّوْبَة", english: "At-Tawbah (The Repentance)", verses: 129, revelation: "Madani" },
            { number: 10, arabic: "سُورَةُ يُونُس", english: "Yunus (Jonah)", verses: 109, revelation: "Makki" },
            { number: 11, arabic: "سُورَةُ هُود", english: "Hud", verses: 123, revelation: "Makki" },
            { number: 12, arabic: "سُورَةُ يُوسُف", english: "Yusuf (Joseph)", verses: 111, revelation: "Makki" },
            { number: 13, arabic: "سُورَةُ الرَّعْد", english: "Ar-Ra'd (The Thunder)", verses: 43, revelation: "Madani" },
            { number: 14, arabic: "سُورَةُ إِبْرَاهِيم", english: "Ibrahim (Abraham)", verses: 52, revelation: "Makki" },
            { number: 15, arabic: "سُورَةُ الْحِجْر", english: "Al-Hijr", verses: 99, revelation: "Makki" },
            { number: 16, arabic: "سُورَةُ النَّحْل", english: "An-Nahl (The Bee)", verses: 128, revelation: "Makki" },
            { number: 17, arabic: "سُورَةُ الْإِسْرَاء", english: "Al-Isra (The Night Journey)", verses: 111, revelation: "Makki" },
            { number: 18, arabic: "سُورَةُ الْكَهْف", english: "Al-Kahf (The Cave)", verses: 110, revelation: "Makki" },
            { number: 19, arabic: "سُورَةُ مَرْيَم", english: "Maryam (Mary)", verses: 98, revelation: "Makki" },
            { number: 20, arabic: "سُورَةُ طه", english: "Ta-Ha", verses: 135, revelation: "Makki" },
            { number: 21, arabic: "سُورَةُ الْأَنْبِيَاء", english: "Al-Anbiya (The Prophets)", verses: 112, revelation: "Makki" },
            { number: 22, arabic: "سُورَةُ الْحَج", english: "Al-Hajj (The Pilgrimage)", verses: 78, revelation: "Madani" },
            { number: 23, arabic: "سُورَةُ الْمُؤْمِنُون", english: "Al-Mu'minun (The Believers)", verses: 118, revelation: "Makki" },
            { number: 24, arabic: "سُورَةُ النُّور", english: "An-Nur (The Light)", verses: 64, revelation: "Madani" },
            { number: 25, arabic: "سُورَةُ الْفُرْقَان", english: "Al-Furqan (The Criterion)", verses: 77, revelation: "Makki" },
            { number: 26, arabic: "سُورَةُ الشُّعَرَاء", english: "Ash-Shu'ara (The Poets)", verses: 227, revelation: "Makki" },
            { number: 27, arabic: "سُورَةُ النَّمْل", english: "An-Naml (The Ant)", verses: 93, revelation: "Makki" },
            { number: 28, arabic: "سُورَةُ الْقَصَص", english: "Al-Qasas (The Stories)", verses: 88, revelation: "Makki" },
            { number: 29, arabic: "سُورَةُ الْعَنْكَبُوت", english: "Al-Ankabut (The Spider)", verses: 69, revelation: "Makki" },
            { number: 30, arabic: "سُورَةُ الرُّوم", english: "Ar-Rum (The Romans)", verses: 60, revelation: "Makki" },
            { number: 31, arabic: "سُورَةُ لُقْمَان", english: "Luqman", verses: 34, revelation: "Makki" },
            { number: 32, arabic: "سُورَةُ السَّجْدَة", english: "As-Sajdah (The Prostration)", verses: 30, revelation: "Makki" },
            { number: 33, arabic: "سُورَةُ الْأَحْزَاب", english: "Al-Ahzab (The Clans)", verses: 73, revelation: "Madani" },
            { number: 34, arabic: "سُورَةُ سَبَأ", english: "Saba (Sheba)", verses: 54, revelation: "Makki" },
            { number: 35, arabic: "سُورَةُ فَاطِر", english: "Fatir (The Creator)", verses: 45, revelation: "Makki" },
            { number: 36, arabic: "سُورَةُ يس", english: "Ya-Sin", verses: 83, revelation: "Makki" },
            { number: 37, arabic: "سُورَةُ الصَّافَّات", english: "As-Saffat (Those Ranged in Ranks)", verses: 182, revelation: "Makki" },
            { number: 38, arabic: "سُورَةُ ص", english: "Sad", verses: 88, revelation: "Makki" },
            { number: 39, arabic: "سُورَةُ الزُّمَر", english: "Az-Zumar (The Groups)", verses: 75, revelation: "Makki" },
            { number: 40, arabic: "سُورَةُ غَافِر", english: "Ghafir (The Forgiver)", verses: 85, revelation: "Makki" },
            { number: 41, arabic: "سُورَةُ فُصِّلَت", english: "Fusilat (Explained in Detail)", verses: 54, revelation: "Makki" },
            { number: 42, arabic: "سُورَةُ الشُّورَى", english: "Ash-Shura (The Consultation)", verses: 53, revelation: "Makki" },
            { number: 43, arabic: "سُورَةُ الزُّخْرُف", english: "Az-Zukhruf (The Gold)", verses: 89, revelation: "Makki" },
            { number: 44, arabic: "سُورَةُ الدُّخَان", english: "Ad-Dukhan (The Smoke)", verses: 59, revelation: "Makki" },
            { number: 45, arabic: "سُورَةُ الْجَاثِيَة", english: "Al-Jathiyah (The Kneeling)", verses: 37, revelation: "Makki" },
            { number: 46, arabic: "سُورَةُ الْأَحْقَاف", english: "Al-Ahqaf (The Valley)", verses: 35, revelation: "Makki" },
            { number: 47, arabic: "سُورَةُ مُحَمَّد", english: "Muhammad", verses: 38, revelation: "Madani" },
            { number: 48, arabic: "سُورَةُ الْفَتْح", english: "Al-Fath (The Victory)", verses: 29, revelation: "Madani" },
            { number: 49, arabic: "سُورَةُ الْحُجُرَات", english: "Al-Hujurat (The Rooms)", verses: 18, revelation: "Madani" },
            { number: 50, arabic: "سُورَةُ ق", english: "Qaf", verses: 45, revelation: "Makki" },
            { number: 51, arabic: "سُورَةُ الذَّارِيَات", english: "Az-Zariyat (The Scatterers)", verses: 60, revelation: "Makki" },
            { number: 52, arabic: "سُورَةُ الطُّور", english: "At-Tur (The Mount)", verses: 49, revelation: "Makki" },
            { number: 53, arabic: "سُورَةُ النَّجْم", english: "An-Najm (The Star)", verses: 62, revelation: "Makki" },
            { number: 54, arabic: "سُورَةُ الْقَمَر", english: "Al-Qamar (The Moon)", verses: 55, revelation: "Makki" },
            { number: 55, arabic: "سُورَةُ الرَّحْمَن", english: "Ar-Rahman (The Most Gracious)", verses: 78, revelation: "Madani" },
            { number: 56, arabic: "سُورَةُ الْوَاقِعَة", english: "Al-Waqi'ah (The Event)", verses: 96, revelation: "Makki" },
            { number: 57, arabic: "سُورَةُ الْحَدِيد", english: "Al-Hadid (The Iron)", verses: 29, revelation: "Madani" },
            { number: 58, arabic: "سُورَةُ الْمُجَادِلَة", english: "Al-Mujadilah (The Pleading)", verses: 22, revelation: "Madani" },
            { number: 59, arabic: "سُورَةُ الْحَشْر", english: "Al-Hashr (The Gathering)", verses: 24, revelation: "Madani" },
            { number: 60, arabic: "سُورَةُ الْمُمْتَحَنَة", english: "Al-Mumtahanah (The Tested)", verses: 13, revelation: "Madani" },
            { number: 61, arabic: "سُورَةُ الصَّف", english: "As-Saff (The Row)", verses: 14, revelation: "Madani" },
            { number: 62, arabic: "سُورَةُ الْجُمُعَة", english: "Al-Jumu'ah (Friday)", verses: 11, revelation: "Madani" },
            { number: 63, arabic: "سُورَةُ الْمُنَافِقُون", english: "Al-Munafiqun (The Hypocrites)", verses: 11, revelation: "Madani" },
            { number: 64, arabic: "سُورَةُ التَّغَابُن", english: "At-Taghabun (Loss and Gain)", verses: 18, revelation: "Madani" },
            { number: 65, arabic: "سُورَةُ الطَّلَاق", english: "At-Talaq (The Divorce)", verses: 12, revelation: "Madani" },
            { number: 66, arabic: "سُورَةُ التَّحْرِيم", english: "At-Tahrim (The Prohibition)", verses: 12, revelation: "Madani" },
            { number: 67, arabic: "سُورَةُ الْمُلْك", english: "Al-Mulk (The Kingdom)", verses: 30, revelation: "Makki" },
            { number: 68, arabic: "سُورَةُ الْقَلَم", english: "Al-Qalam (The Pen)", verses: 52, revelation: "Makki" },
            { number: 69, arabic: "سُورَةُ الْحَاقَّة", english: "Al-Haqqah (The Inevitable)", verses: 52, revelation: "Makki" },
            { number: 70, arabic: "سُورَةُ الْمَعَارِج", english: "Al-Ma'arij (The Ways of Ascent)", verses: 44, revelation: "Makki" },
            { number: 71, arabic: "سُورَةُ نُوح", english: "Nuh (Noah)", verses: 28, revelation: "Makki" },
            { number: 72, arabic: "سُورَةُ الْجِن", english: "Al-Jinn (The Jinn)", verses: 28, revelation: "Makki" },
            { number: 73, arabic: "سُورَةُ الْمُزَّمِّل", english: "Al-Muzammil (The Wrapped)", verses: 20, revelation: "Makki" },
            { number: 74, arabic: "سُورَةُ الْمُدَّثِّر", english: "Al-Mudaththir (The Cloaked)", verses: 56, revelation: "Makki" },
            { number: 75, arabic: "سُورَةُ الْقِيَامَة", english: "Al-Qiyamah (The Resurrection)", verses: 40, revelation: "Makki" },
            { number: 76, arabic: "سُورَةُ الْإِنْسَان", english: "Al-Insan (The Human)", verses: 31, revelation: "Madani" },
            { number: 77, arabic: "سُورَةُ الْمُرْسَلَات", english: "Al-Mursalat (Those Sent)", verses: 50, revelation: "Makki" },
            { number: 78, arabic: "سُورَةُ النَّبَأ", english: "An-Naba (The Great News)", verses: 40, revelation: "Makki" },
            { number: 79, arabic: "سُورَةُ النَّازِعَات", english: "An-Nazi'at (Those Who Pull Out)", verses: 46, revelation: "Makki" },
            { number: 80, arabic: "سُورَةُ عَبَس", english: "Abasa (He Frowned)", verses: 42, revelation: "Makki" },
            { number: 81, arabic: "سُورَةُ التَّكْوِير", english: "At-Takwir (The Overthrowing)", verses: 29, revelation: "Makki" },
            { number: 82, arabic: "سُورَةُ الانْفِطَار", english: "Al-Infitar (The Cleaving)", verses: 19, revelation: "Makki" },
            { number: 83, arabic: "سُورَةُ الْمُطَفِّفِين", english: "Al-Mutaffifin (Those Who Deal in Fraud)", verses: 36, revelation: "Makki" },
            { number: 84, arabic: "سُورَةُ الانْشِقَاق", english: "Al-Inshiqaq (The Splitting Asunder)", verses: 25, revelation: "Makki" },
            { number: 85, arabic: "سُورَةُ الْبُرُوج", english: "Al-Buruj (The Stars)", verses: 22, revelation: "Makki" },
            { number: 86, arabic: "سُورَةُ الطَّارِق", english: "At-Tariq (The Night-Comer)", verses: 17, revelation: "Makki" },
            { number: 87, arabic: "سُورَةُ الْأَعْلَى", english: "Al-A'la (The Most High)", verses: 19, revelation: "Makki" },
            { number: 88, arabic: "سُورَةُ الْغَاشِيَة", english: "Al-Ghashiyah (The Overwhelming)", verses: 26, revelation: "Makki" },
            { number: 89, arabic: "سُورَةُ الْفَجْر", english: "Al-Fajr (The Dawn)", verses: 30, revelation: "Makki" },
            { number: 90, arabic: "سُورَةُ الْبَلَد", english: "Al-Balad (The City)", verses: 20, revelation: "Makki" },
            { number: 91, arabic: "سُورَةُ الشَّمْس", english: "Ash-Shams (The Sun)", verses: 15, revelation: "Makki" },
            { number: 92, arabic: "سُورَةُ اللَّيْل", english: "Al-Layl (The Night)", verses: 21, revelation: "Makki" },
            { number: 93, arabic: "سُورَةُ الضُّحَى", english: "Ad-Duha (The Forenoon)", verses: 11, revelation: "Makki" },
            { number: 94, arabic: "سُورَةُ الشَّرْح", english: "Ash-Sharh (The Opening Forth)", verses: 8, revelation: "Makki" },
            { number: 95, arabic: "سُورَةُ التِّين", english: "At-Tin (The Fig)", verses: 8, revelation: "Makki" },
            { number: 96, arabic: "سُورَةُ الْعَلَق", english: "Al-Alaq (The Clot)", verses: 19, revelation: "Makki" },
            { number: 97, arabic: "سُورَةُ الْقَدْر", english: "Al-Qadr (The Night of Decree)", verses: 5, revelation: "Makki" },
            { number: 98, arabic: "سُورَةُ الْبَيِّنَة", english: "Al-Bayyinah (The Clear Evidence)", verses: 8, revelation: "Madani" },
            { number: 99, arabic: "سُورَةُ الزَّلْزَلَة", english: "Az-Zalzalah (The Earthquake)", verses: 8, revelation: "Madani" },
            { number: 100, arabic: "سُورَةُ الْعَادِيَات", english: "Al-Adiyat (Those Who Run)", verses: 11, revelation: "Makki" },
            { number: 101, arabic: "سُورَةُ الْقَارِعَة", english: "Al-Qari'ah (The Striking Hour)", verses: 11, revelation: "Makki" },
            { number: 102, arabic: "سُورَةُ التَّكَاثُر", english: "At-Takathur (The Piling Up)", verses: 8, revelation: "Makki" },
            { number: 103, arabic: "سُورَةُ الْعَصْر", english: "Al-Asr (The Time)", verses: 3, revelation: "Makki" },
            { number: 104, arabic: "سُورَةُ الْهُمَزَة", english: "Al-Humazah (The Slanderer)", verses: 9, revelation: "Makki" },
            { number: 105, arabic: "سُورَةُ الْفِيل", english: "Al-Fil (The Elephant)", verses: 5, revelation: "Makki" },
            { number: 106, arabic: "سُورَةُ قُرَيْش", english: "Quraish", verses: 4, revelation: "Makki" },
            { number: 107, arabic: "سُورَةُ الْمَاعُون", english: "Al-Ma'un (The Assistance)", verses: 7, revelation: "Makki" },
            { number: 108, arabic: "سُورَةُ الْكَوْثَر", english: "Al-Kawthar (The Abundance)", verses: 3, revelation: "Makki" },
            { number: 109, arabic: "سُورَةُ الْكَافِرُون", english: "Al-Kafirun (The Disbelievers)", verses: 6, revelation: "Makki" },
            { number: 110, arabic: "سُورَةُ النَّصْر", english: "An-Nasr (The Help)", verses: 3, revelation: "Madani" },
            { number: 111, arabic: "سُورَةُ الْمَسَد", english: "Al-Masad (The Palm Fiber)", verses: 5, revelation: "Makki" },
            { number: 112, arabic: "سُورَةُ الْإِخْلَاص", english: "Al-Ikhlas (The Sincerity)", verses: 4, revelation: "Makki" },
            { number: 113, arabic: "سُورَةُ الْفَلَق", english: "Al-Falaq (The Daybreak)", verses: 5, revelation: "Makki" },
            { number: 114, arabic: "سُورَةُ النَّاس", english: "An-Nas (The Mankind)", verses: 6, revelation: "Makki" }
        ];

    // Transform surahs array to match expected format
const surahDatabase = surahs.map(surah => {
    // Split the english name to separate name and meaning
    const englishParts = surah.english.match(/(.+?)\s*\((.+?)\)/);
    return {
        id: surah.number,
        englishName: englishParts ? englishParts[1].trim() : surah.english,
        englishMeaning: englishParts ? englishParts[2].trim() : '',
        arabicName: surah.arabic,
        verses: surah.verses,
        revelation: surah.revelation
    };
});

// Pagination variables
let currentPage = 0;
const itemsPerPage = 3;
const itemsPerPageMobile = 1;
let recentSurahs = [];

// Function to get items per page based on screen width
function getItemsPerPage() {
    return window.innerWidth <= 768 ? itemsPerPageMobile : itemsPerPage;
}

// Function to get total pages
function getTotalPages() {
    return Math.ceil(recentSurahs.length / getItemsPerPage());
}

// Function to update recent cards display
function updateRecentCards(direction = null) {
    const recentGrid = document.getElementById('recentGrid');
    const itemsToShow = getItemsPerPage();
    const startIdx = currentPage * itemsToShow;
    const endIdx = startIdx + itemsToShow;
    
    // Only add slide animation if direction is specified (page change)
    if (direction) {
        recentGrid.className = `recent-grid slide-out-${direction === 'right' ? 'left' : 'right'}`;
        
        setTimeout(() => {
            renderCards();
        }, 300); // Match CSS animation duration
    } else {
        // Initial load - no slide animation, just render
        renderCards();
    }
    
    function renderCards() {
        recentGrid.innerHTML = '';
        
        const visibleSurahs = recentSurahs.slice(startIdx, endIdx);
        visibleSurahs.forEach(surahNum => {
            const surah = surahDatabase.find(s => s.id === surahNum);
            if (surah) {
                const progress = JSON.parse(localStorage.getItem(`progress_${surah.id}`)) || { lastVerse: 0, lastPlayed: Date.now() };
                const progressPercent = Math.round((progress.lastVerse / surah.verses) * 100);
                const timeAgo = getTimeAgo(progress.lastPlayed);
                const currentVerse = progress.lastVerse || 0;
                
                const card = document.createElement('div');
                // Only add slide-in animation if there's a direction
                card.className = direction ? `recent-card slide-in-${direction}` : 'recent-card';
                card.onclick = () => navigateToSurah(surah.id);
                
                card.innerHTML = `
                    <div class="recent-main-row">
                        <div class="recent-left-content">
                            <div class="recent-number">${surah.id}</div>
                            <div class="recent-text-content">
                                <div class="recent-english">${surah.englishName}</div>
                                <div class="recent-meaning">${surah.englishMeaning}</div>
                            </div>
                        </div>
                        <div class="recent-arabic">${surah.arabicName}</div>
                    </div>
                    <div class="recent-progress-section">
                        <div class="recent-progress-bar">
                            <div class="recent-progress-fill" style="width: ${progressPercent}%"></div>
                        </div>
                        <div class="recent-progress-info">
                            <span class="recent-progress-text">Current Verse: ${currentVerse} of ${surah.verses}</span>
                            <span class="recent-progress-text">Last Played: ${timeAgo}</span>
                        </div>
                    </div>
                `;
                
                recentGrid.appendChild(card);
            }
        });
        
        // Remove animation class after cards are added
        recentGrid.className = 'recent-grid';
        
        updatePaginationDots();
    }
}

// Function to calculate time ago
function getTimeAgo(timestamp) {
    const now = Date.now();
    const diff = now - timestamp;
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    const weeks = Math.floor(diff / 604800000);
    const months = Math.floor(diff / 2592000000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes} ${minutes === 1 ? 'Minute' : 'Minutes'} Ago`;
    if (hours < 24) return `${hours} ${hours === 1 ? 'Hour' : 'Hours'} Ago`;
    if (days < 7) return `${days} ${days === 1 ? 'Day' : 'Days'} Ago`;
    if (weeks < 4) return `${weeks} ${weeks === 1 ? 'Week' : 'Weeks'} Ago`;
    return `${months} ${months === 1 ? 'Month' : 'Months'} Ago`;
}

// Function to update pagination dots
function updatePaginationDots() {
    const dotsContainer = document.querySelector('.pagination-dots');
    const totalPages = getTotalPages();
    
    dotsContainer.innerHTML = '';
    
    for (let i = 0; i < totalPages; i++) {
        const dot = document.createElement('div');
        dot.className = `dot ${i === currentPage ? 'active' : ''}`;
        dot.onclick = () => goToPage(i);
        dotsContainer.appendChild(dot);
    }
}

// Function to go to specific page
function goToPage(page) {
    if (page === currentPage) return; // Don't animate if same page
    
    const direction = page > currentPage ? 'right' : 'left';
    currentPage = page;
    updateRecentCards(direction);
}

// Add touch gesture support for mobile
let touchStartX = 0;
let touchEndX = 0;

function handleGesture() {
    const totalPages = getTotalPages();
    if (touchEndX < touchStartX - 50 && currentPage < totalPages - 1) {
        // Swipe left - next page
        currentPage++;
        updateRecentCards();
    }
    if (touchEndX > touchStartX + 50 && currentPage > 0) {
        // Swipe right - previous page
        currentPage--;
        updateRecentCards();
    }
}

// Initialize recent surahs from localStorage
function initializeRecentSurahs() {
    const stored = localStorage.getItem('recentSurahs');
    recentSurahs = stored ? JSON.parse(stored) : [];
    
    // Limit to 6 surahs
    recentSurahs = recentSurahs.slice(0, 6);
    
    const recentSection = document.getElementById('recent-section');
    if (recentSurahs.length > 0) {
        recentSection.style.display = 'flex';
        updateRecentCards();
        
        // Add touch event listeners
        const recentGrid = document.getElementById('recentGrid');
        recentGrid.addEventListener('touchstart', e => {
            touchStartX = e.changedTouches[0].screenX;
        });
        
        recentGrid.addEventListener('touchend', e => {
            touchEndX = e.changedTouches[0].screenX;
            handleGesture();
        });
    } else {
        recentSection.style.display = 'none';
    }
}

// Handle window resize
window.addEventListener('resize', () => {
    if (recentSurahs.length > 0) {
        currentPage = 0;
        updateRecentCards();
    }
});

// Function to navigate to surah learning page
function navigateToSurah(surahId) {
    saveRecentSurah(surahId); // Save before navigating
    window.location.href = `quran-learning.html?surah=${surahId}`;
}

// Function to populate surah grid
function populateSurahGrid() {
    const surahGrid = document.getElementById('surahGrid');
    surahGrid.innerHTML = '';
    
    // Create rows of 3 cards each
    for (let i = 0; i < surahDatabase.length; i += 3) {
        const row = document.createElement('div');
        row.className = 'surah-grid-row';
        
        // Add up to 3 cards per row
        for (let j = 0; j < 3 && (i + j) < surahDatabase.length; j++) {
            const surah = surahDatabase[i + j];
            const card = createSurahCard(surah);
            row.appendChild(card);
        }
        
        surahGrid.appendChild(row);
    }
}

// Function to create a surah card
function createSurahCard(surah) {
    const card = document.createElement('div');
    card.className = 'surah-card';
    card.onclick = () => navigateToSurah(surah.id);
    
    card.innerHTML = `
        <div class="surah-main-row">
            <div class="surah-left-content">
                <div class="surah-number">${surah.id}</div>
                <div class="surah-text-content">
                    <div class="surah-english">${surah.englishName}</div>
                    <div class="surah-meaning">${surah.englishMeaning}</div>
                </div>
            </div>
            <div class="surah-arabic">${surah.arabicName}</div>
        </div>
        <div class="surah-divider"></div>
        <div class="surah-footer">
            <div class="surah-chapter-info">
                <div class="surah-chapter-text">
                    <span>Chapter</span>
                    <span>${surah.id}</span>
                </div>
                <div class="surah-dot"></div>
                <div class="surah-verses-text">
                    <span>${surah.verses}</span>
                    <span>Verses</span>
                </div>
            </div>
            <div class="surah-revelation">${surah.revelation}</div>
        </div>
    `;
    
    return card;
}

// Search functionality
function searchSurahs() {
    const searchInput = document.getElementById('searchInput');
    const searchTerm = searchInput.value.toLowerCase().trim();
    const surahGrid = document.getElementById('surahGrid');
    const mainContent = document.querySelector('.main-content');
    
    surahGrid.innerHTML = '';
    
    // More flexible search - remove special characters and spaces for matching
    const normalizedSearch = searchTerm.replace(/[^a-z0-9]/g, '');
    
    const filteredSurahs = surahDatabase.filter(surah => {
        const englishName = surah.englishName.toLowerCase();
        const englishMeaning = surah.englishMeaning.toLowerCase();
        const normalizedEnglishName = englishName.replace(/[^a-z0-9]/g, '');
        const normalizedEnglishMeaning = englishMeaning.replace(/[^a-z0-9]/g, '');
        
        return englishName.includes(searchTerm) ||
               englishMeaning.includes(searchTerm) ||
               normalizedEnglishName.includes(normalizedSearch) ||
               normalizedEnglishMeaning.includes(normalizedSearch) ||
               surah.arabicName.includes(searchTerm) ||
               surah.id.toString().includes(searchTerm);
    });
    
    // Create rows of 3 cards each for filtered results
    for (let i = 0; i < filteredSurahs.length; i += 3) {
        const row = document.createElement('div');
        row.className = 'surah-grid-row';
        
        for (let j = 0; j < 3 && (i + j) < filteredSurahs.length; j++) {
            const surah = filteredSurahs[i + j];
            const card = createSurahCard(surah);
            row.appendChild(card);
        }
        
        surahGrid.appendChild(row);
    }
    
    // Show message if no results
    if (filteredSurahs.length === 0) {
        mainContent.classList.add('no-results-active'); // ADD THIS
        surahGrid.innerHTML = `
           <div class="no-results-container">
            <div class="no-results-content">
                <svg width="93" height="77" viewBox="0 0 93 77" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M92.85 31.5129C92.85 31.5129 92.82 31.4329 92.8 31.3929L80.01 5.82287C79.74 5.28287 79.12 4.98287 78.53 5.10287L71.63 6.48287L69.54 1.86288L69.21 1.69288C68.8 1.48288 59.22 -3.37713 46.51 4.39287C33.8 -3.36713 24.21 1.48288 23.8 1.69288L23.47 1.86288L21.38 6.48287L14.48 5.10287C13.89 4.98287 13.27 5.29287 13 5.82287L0.210022 31.3929C0.210022 31.3929 0.170034 31.4729 0.160034 31.5129C0.0600342 31.6729 0 31.8629 0 32.0629V36.7429C0 37.3329 0.41999 37.8829 0.98999 38.0529L25.26 44.9829L13.06 75.4829C12.84 76.0329 13.11 76.6529 13.66 76.8829C13.79 76.9329 13.93 76.9629 14.06 76.9629C14.1 76.9629 14.13 76.9629 14.17 76.9629C14.2 76.9629 14.24 76.9629 14.27 76.9629H20.39C20.79 76.9629 21.23 76.7829 21.52 76.4929L46.5 51.4529L71.48 76.4929C71.76 76.7729 72.2 76.9629 72.6 76.9629H78.72C78.72 76.9629 78.79 76.9629 78.82 76.9629C78.86 76.9629 78.89 76.9629 78.93 76.9629C79.06 76.9629 79.2 76.9329 79.33 76.8829C79.88 76.6629 80.15 76.0429 79.93 75.4829L67.73 44.9929L92 38.0529C92.57 37.8929 92.98 37.3429 92.98 36.7429V32.0629C92.98 31.8629 92.92 31.6729 92.82 31.5129H92.85ZM62.16 2.19288C65.1 2.36288 67.15 3.12288 67.9 3.44288L70.01 8.11288C70.01 8.11288 70.01 8.12286 70.01 8.13286L75.86 21.0629C63.41 20.4729 51.77 26.0429 47.57 28.3329V6.25287C53.59 2.57287 58.8 2.01287 62.15 2.20287L62.16 2.19288ZM46.5 36.9229C43.62 35.2529 30.5 28.1829 16.48 29.0929V23.2529C31.37 22.2429 45.78 31.0029 45.93 31.0929C45.93 31.0929 45.94 31.0929 45.95 31.1029C45.98 31.1229 46 31.1329 46.03 31.1429C46.04 31.1429 46.06 31.1529 46.07 31.1629C46.07 31.1629 46.08 31.1629 46.09 31.1629C46.11 31.1629 46.14 31.1829 46.16 31.1829C46.18 31.1829 46.2 31.1929 46.22 31.2029C46.23 31.2029 46.25 31.2029 46.26 31.2029C46.27 31.2029 46.29 31.2029 46.3 31.2029C46.32 31.2029 46.34 31.2029 46.35 31.2129C46.39 31.2129 46.43 31.2129 46.48 31.2129C46.48 31.2129 46.51 31.2129 46.53 31.2129C46.56 31.2129 46.59 31.2129 46.61 31.2129C46.63 31.2129 46.65 31.2129 46.67 31.2029C46.68 31.2029 46.7 31.2029 46.71 31.2029C46.72 31.2029 46.74 31.2029 46.75 31.2029C46.77 31.2029 46.79 31.1829 46.82 31.1829C46.84 31.1829 46.86 31.1729 46.88 31.1629C46.88 31.1629 46.89 31.1629 46.9 31.1629C46.91 31.1629 46.93 31.1529 46.94 31.1429C46.97 31.1329 46.99 31.1229 47.02 31.1029C47.02 31.1029 47.03 31.1029 47.04 31.0929C47.19 31.0029 61.59 22.2429 76.49 23.2529V29.0929C62.48 28.1829 49.36 35.2529 46.48 36.9229H46.5ZM25.11 3.44288C25.86 3.12288 27.91 2.36288 30.85 2.19288C34.2 2.00288 39.41 2.56287 45.43 6.24287V28.3229C41.22 26.0429 29.59 20.4629 17.14 21.0529L22.99 8.12287C22.99 8.12287 22.99 8.11287 22.99 8.10287L25.1 3.43287L25.11 3.44288ZM14.65 7.32287L20.47 8.48287L13.67 23.5029L14.34 23.4429V31.4329L15.51 31.3229C30.73 29.8429 45.78 38.9929 45.93 39.0829C45.93 39.0829 45.95 39.0829 45.95 39.0929C45.97 39.1029 46 39.1229 46.02 39.1329C46.04 39.1329 46.06 39.1529 46.08 39.1629C46.1 39.1629 46.13 39.1829 46.15 39.1929C46.17 39.1929 46.19 39.2029 46.22 39.2129C46.24 39.2129 46.27 39.2129 46.29 39.2229C46.31 39.2229 46.34 39.2229 46.36 39.2329C46.39 39.2329 46.43 39.2329 46.46 39.2329C46.46 39.2329 46.48 39.2329 46.49 39.2329C46.49 39.2329 46.51 39.2329 46.52 39.2329C46.56 39.2329 46.59 39.2329 46.62 39.2329C46.64 39.2329 46.67 39.2329 46.69 39.2229C46.71 39.2229 46.74 39.2229 46.76 39.2129C46.78 39.2129 46.8 39.2029 46.82 39.1929C46.84 39.1929 46.87 39.1729 46.89 39.1629C46.91 39.1629 46.93 39.1429 46.95 39.1329C46.98 39.1229 47 39.1129 47.02 39.0929C47.02 39.0929 47.04 39.0929 47.04 39.0829C47.19 38.9929 62.24 29.8429 77.46 31.3229L78.64 31.4329V23.4429L79.31 23.5029L72.51 8.48287L78.33 7.32287L90.37 31.3929L46.48 43.9329L2.59003 31.3929L14.63 7.32287H14.65ZM39.38 49.0229L17 71.4229L27.33 45.5829L39.37 49.0229H39.38ZM20.16 74.8029H16.64L41.73 49.6929L44.44 50.4629L20.16 74.8029ZM72.84 74.8029L48.56 50.4629L51.27 49.6929L76.36 74.8029H72.84ZM76.01 71.4129L53.63 49.0129L65.67 45.5729L76.01 71.4129ZM51.44 47.4129C51.33 47.4229 51.21 47.4529 51.11 47.5129L46.5 48.8329L41.89 47.5129C41.78 47.4629 41.67 47.4329 41.56 47.4229L2.15002 36.1629V33.5029L46 46.0329C46.15 46.0729 46.33 46.1029 46.5 46.1029C46.67 46.1029 46.85 46.0829 47 46.0329L90.85 33.5029V36.1629L51.44 47.4229V47.4129Z" fill="#0D8E91"/>
</svg>
                <p class="no-results-subtitle"> Hmm, we couldn't find that surah. <br> Try searching by surah name, number, or meaning.</p>
            </div>
        </div>
        `;
    } else {
        mainContent.classList.remove('no-results-active'); // ADD THIS
    }
}

// Function to save recent surah
function saveRecentSurah(surahId) {
    let recentSurahs = JSON.parse(localStorage.getItem('recentSurahs')) || [];
    
    // Remove if already exists (to move it to front)
    recentSurahs = recentSurahs.filter(id => id !== surahId);
    
    // Add to beginning
    recentSurahs.unshift(surahId);
    
    // Keep only last 6
    recentSurahs = recentSurahs.slice(0, 6);
    
    // Save back to localStorage
    localStorage.setItem('recentSurahs', JSON.stringify(recentSurahs));
    
    // Update progress with last played time
    let progress = JSON.parse(localStorage.getItem(`progress_${surahId}`)) || { lastVerse: 0 };
    progress.lastPlayed = Date.now();
    localStorage.setItem(`progress_${surahId}`, JSON.stringify(progress));
}

// Initialize the page
document.addEventListener('DOMContentLoaded', () => {
    initializeRecentSurahs();
    populateSurahGrid();
});

/* TEMPORARY: Add test data for recent surahs
if (!localStorage.getItem('recentSurahs')) {
    localStorage.setItem('recentSurahs', JSON.stringify([1, 2, 3, 4, 5, 6]));
    // Add some progress data
    localStorage.setItem('progress_1', JSON.stringify({ lastVerse: 5 }));
    localStorage.setItem('progress_2', JSON.stringify({ lastVerse: 150 }));
    localStorage.setItem('progress_3', JSON.stringify({ lastVerse: 100 }));
} */