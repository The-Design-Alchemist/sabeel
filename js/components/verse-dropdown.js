// verse-dropdown.js - Custom Verse Dropdown Component

class VerseDropdown {
    constructor() {
        this.container = document.getElementById('verse-dropdown-container');
        this.list = document.getElementById('verse-dropdown-list');
        this.currentDisplay = document.getElementById('verse-dropdown-current');
        this.totalLabel = document.getElementById('verse-total-label');
        this.isOpen = false;
        
        // Bind methods
        this.close = this.close.bind(this);
        this.handleClickOutside = this.handleClickOutside.bind(this);
    }
    
    populate() {
        const verses = window.appStore.get('verses');
        const currentIndex = window.appStore.get('currentVerseIndex');
        
        if (!verses || !this.list) return;
        
        // Clear existing items
        this.list.innerHTML = '';
        
        // Create dropdown items - SKIP BISMILLAH (start from index 1)
        verses.forEach((verse, index) => {
            // Skip Bismillah
            if (verse.number === 'Bismillah') {
                return;
            }
            
            const item = document.createElement('div');
            item.className = 'verse-dropdown-item';
            
            // Main text
            const textSpan = document.createElement('span');
            textSpan.textContent = `Verse ${verse.number}`;
            item.appendChild(textSpan);
            
            // Waqf count if segments exist
            if (verse.segments && verse.segments.length > 1) {
                const waqfSpan = document.createElement('span');
                waqfSpan.className = 'verse-waqf-count';
                waqfSpan.textContent = `${verse.segments.length} Waqf`;
                item.appendChild(waqfSpan);
            }
            
            if (index === currentIndex) {
                item.classList.add('active');
            }
            
            item.onclick = (e) => {
                e.stopPropagation();
                this.selectVerse(index);
            };
            
            this.list.appendChild(item);
        });
        
        // Update total count (excluding Bismillah)
        if (this.totalLabel) {
            this.totalLabel.textContent = verses.length - 1;
        }
        
        // Update current display
        this.updateCurrent();
    }
    
    updateCurrent() {
        const verses = window.appStore.get('verses');
        const currentIndex = window.appStore.get('currentVerseIndex');
        
        if (!verses || !this.currentDisplay) return;
        
        const currentVerse = verses[currentIndex];
        if (currentVerse) {
            if (currentVerse.number === 'Bismillah') {
                this.currentDisplay.textContent = 'B';
            } else {
                this.currentDisplay.textContent = currentVerse.number;
            }
        }
    }
    
    open() {
        if (this.isOpen) return;
        
        this.isOpen = true;
        this.container.classList.add('open');
        
        // Scroll to active item
        const activeItem = this.list.querySelector('.verse-dropdown-item.active');
        if (activeItem) {
            setTimeout(() => {
                activeItem.scrollIntoView({ block: 'center', behavior: 'smooth' });
            }, 100);
        }
        
        // Add click outside listener
        setTimeout(() => {
            document.addEventListener('click', this.handleClickOutside);
        }, 100);
    }
    
    close() {
        if (!this.isOpen) return;
        
        this.isOpen = false;
        this.container.classList.remove('open');
        document.removeEventListener('click', this.handleClickOutside);
    }
    
    toggle() {
        if (this.isOpen) {
            this.close();
        } else {
            this.open();
        }
    }
    
    handleClickOutside(event) {
        if (!this.container.contains(event.target)) {
            this.close();
        }
    }
    
    selectVerse(index) {
        // Update active state
        const items = this.list.querySelectorAll('.verse-dropdown-item');
        items.forEach((item, i) => {
            // Adjust for skipped Bismillah
            const verses = window.appStore.get('verses');
            let actualIndex = i;
            if (verses[0].number === 'Bismillah') {
                actualIndex = i + 1; // Offset by 1 if Bismillah exists
            }
            
            if (actualIndex === index) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
        
        // Update hidden select
        const select = document.getElementById('verse-selector');
        if (select) {
            select.value = index;
        }
        
        // Jump to verse
        if (window.verseDisplay) {
            window.verseDisplay.jumpToVerse(index);
        }
        
        // Update display
        this.updateCurrent();
        
        // Close dropdown
        this.close();
    }
    
    update() {
        this.updateCurrent();
        
        // Update active state in list
        const currentIndex = window.appStore.get('currentVerseIndex');
        const items = this.list.querySelectorAll('.verse-dropdown-item');
        const verses = window.appStore.get('verses');
        
        items.forEach((item, i) => {
            // Adjust for skipped Bismillah
            let actualIndex = i;
            if (verses[0].number === 'Bismillah') {
                actualIndex = i + 1;
            }
            
            if (actualIndex === currentIndex) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
    }
}

// Initialize
window.verseDropdown = new VerseDropdown();

// Global toggle function for onclick
function toggleVerseDropdown(event) {
    event.stopPropagation();
    window.verseDropdown.toggle();
}