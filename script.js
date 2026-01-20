/* =========================================
   1. SHRIMP GAME ENGINE (FIXED MOBILE)
   ========================================= */
const ShrimpGame = {
    active: false, 
    shrimps: [], 
    mouse: { x: -100, y: -100 }, 
    whaleElement: null, 
    animationFrame: null, 
    
    // CONFIG
    TOTAL_SHRIMP: 20, 
    TIME_LIMIT: 10, 

    // STATE
    timeLeft: 10,
    timerInterval: null,
    audioContext: null,
    
    // ELEMENTS
    timerElement: null,
    startModal: null,
    winModal: null,
    loseModal: null,

    // --- AUDIO SYSTEM ---
    initAudio() {
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
    },

    playTick() {
        if (!this.audioContext) return;
        try {
            if (this.audioContext.state === 'suspended') this.audioContext.resume();
            
            const osc = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();
            osc.connect(gain);
            gain.connect(this.audioContext.destination);
            
            osc.type = 'square';
            osc.frequency.setValueAtTime(800, this.audioContext.currentTime);
            
            gain.gain.setValueAtTime(0.05, this.audioContext.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.00001, this.audioContext.currentTime + 0.05);
            
            osc.start();
            osc.stop(this.audioContext.currentTime + 0.05);
        } catch(e) { console.error("Audio Error:", e); }
    },

    // --- UI CREATION ---
    createUI() {
        if (!this.timerElement) {
            const t = document.createElement('div');
            t.className = 'game-timer';
            document.body.appendChild(t);
            this.timerElement = t;
        }

        if (!this.startModal) {
            const m = document.createElement('div');
            m.className = 'game-modal';
            m.innerHTML = `
                <div class="modal-icon">🦐</div>
                <div class="modal-title">Quick!</div>
                <div class="modal-text">
                    Wailmer is hungry! Eat all the shrimp in <strong>${this.TIME_LIMIT} seconds</strong>.
                </div>
                <button class="modal-btn">I'm Ready!</button>
            `;
            document.body.appendChild(m);
            this.startModal = m;
            
            const startBtn = m.querySelector('button');
            const startAction = (e) => {
                e.preventDefault();
                this.initAudio(); 
                this.startGameplay();
            };
            startBtn.onclick = startAction;
            startBtn.ontouchstart = startAction;
        }

        if (!this.winModal) {
            const m = document.createElement('div');
            m.className = 'game-modal';
            m.innerHTML = `
                <div class="modal-icon golden-key">🗝️</div>
                <div class="modal-title">Huzzah!</div>
                <div class="modal-text">Wailmer is pleased. You have earned the key to the last door 🚪.</div>
                <button class="modal-btn">Collect Key</button>
            `;
            document.body.appendChild(m);
            this.winModal = m;
            
            const winBtn = m.querySelector('button');
            const winAction = (e) => {
                e.preventDefault();
                m.classList.remove('active');
                this.stop(); 
                sessionStorage.setItem('shrimpGameWon', 'true');
                sessionStorage.setItem('hasGoldenKey', 'true');
                activateKeyMode(); 
            };
            winBtn.onclick = winAction;
            winBtn.ontouchstart = winAction;
        }

        if (!this.loseModal) {
            const m = document.createElement('div');
            m.className = 'game-modal';
            m.innerHTML = `
                <div class="modal-icon">⏳</div>
                <div class="modal-title">Too Slow!</div>
                <div class="modal-text">Wailmer is still hungry. Try again?</div>
                <button class="modal-btn">Retry</button>
            `;
            document.body.appendChild(m);
            this.loseModal = m;
            
            const retryBtn = m.querySelector('button');
            const retryAction = (e) => {
                e.preventDefault();
                m.classList.remove('active');
                this.startGameplay(); 
            };
            retryBtn.onclick = retryAction;
            retryBtn.ontouchstart = retryAction;
        }
    },

    // --- GAME LOOP ---
    init() {
        if (sessionStorage.getItem('hasGoldenKey') === 'true' || sessionStorage.getItem('shrimpGameWon') === 'true') return;
        this.createUI();
        this.startModal.classList.add('active'); 
    },

    startGameplay() {
        if (this.active) return; 
        this.active = true;
        
        [this.startModal, this.loseModal, this.winModal].forEach(m => m && m.classList.remove('active'));

        this.timeLeft = this.TIME_LIMIT;
        this.timerElement.innerText = `TIME: ${this.timeLeft}s`;
        this.timerElement.style.display = 'block';
        this.timerElement.classList.remove('urgent');

        if (this.timerInterval) clearInterval(this.timerInterval);
        this.timerInterval = setInterval(() => {
            this.timeLeft--;
            this.timerElement.innerText = `TIME: ${this.timeLeft}s`;
            this.playTick(); 
            if (this.timeLeft <= 5) this.timerElement.classList.add('urgent');
            if (this.timeLeft <= 0) this.gameOver();
        }, 1000);

        if (!this.whaleElement) {
            this.whaleElement = document.createElement('div');
            this.whaleElement.className = 'whale-cursor';
            this.whaleElement.innerText = '🐋';
            this.whaleElement.style.pointerEvents = 'none';
            this.whaleElement.style.zIndex = '9999'; 
            document.body.appendChild(this.whaleElement);
        }
        this.whaleElement.style.display = 'block'; 
        document.body.style.cursor = 'none';
        
        document.addEventListener('mousemove', this.handleMouseMove);
        document.addEventListener('touchstart', this.handleTouch, { passive: false });
        document.addEventListener('touchmove', this.handleTouch, { passive: false });
        
        this.shrimps.forEach(s => s.element && s.element.remove());
        this.shrimps = [];
        this.spawnShrimps();
        this.loop();
    },

    stop() {
        this.active = false;
        if (this.whaleElement) this.whaleElement.style.display = 'none';
        if (this.timerElement) this.timerElement.style.display = 'none';
        [this.startModal, this.loseModal, this.winModal].forEach(m => m && m.classList.remove('active'));
        
        if (this.timerInterval) clearInterval(this.timerInterval);
        
        document.body.style.cursor = 'default';
        this.shrimps.forEach(s => s.element && s.element.remove());
        this.shrimps = [];
        
        document.removeEventListener('mousemove', this.handleMouseMove);
        document.removeEventListener('touchstart', this.handleTouch);
        document.removeEventListener('touchmove', this.handleTouch);
        
        if (this.animationFrame) cancelAnimationFrame(this.animationFrame);
    },

    handleMouseMove(e) {
        ShrimpGame.mouse.x = e.clientX; 
        ShrimpGame.mouse.y = e.clientY;
        if (ShrimpGame.whaleElement) {
            ShrimpGame.whaleElement.style.left = e.clientX + 'px';
            ShrimpGame.whaleElement.style.top = e.clientY + 'px';
        }
    },

    // --- FIXED TOUCH HANDLER ---
    handleTouch(e) {
        // IMPORTANT: If we are touching a button, do NOT preventDefault
        // This allows the "click" event to still fire for the UI
        if (e.target.tagName === 'BUTTON' || e.target.closest('button')) {
            return; 
        }

        if(e.cancelable) e.preventDefault(); 
        
        const touch = e.touches[0];
        if (touch) {
            ShrimpGame.mouse.x = touch.clientX;
            ShrimpGame.mouse.y = touch.clientY;
            
            if (ShrimpGame.whaleElement) {
                ShrimpGame.whaleElement.style.left = touch.clientX + 'px';
                ShrimpGame.whaleElement.style.top = touch.clientY + 'px';
            }
        }
    },

    gameOver() {
        this.active = false; 
        if (this.timerInterval) clearInterval(this.timerInterval);
        this.loseModal.classList.add('active');
        document.body.style.cursor = 'default';
    },

    gameWin() {
        this.active = false;
        if (this.timerInterval) clearInterval(this.timerInterval);
        this.timerElement.style.display = 'none';
        this.winModal.classList.add('active');
        
        if (typeof confetti === 'function') {
            confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
        }
        document.body.style.cursor = 'default';
    },

    spawnShrimps() {
        for (let i = 0; i < this.TOTAL_SHRIMP; i++) {
            const s = document.createElement('div'); 
            s.className = 'floating-shrimp'; 
            s.innerText = '🦐'; 
            s.style.pointerEvents = 'none'; 
            s.style.position = 'fixed'; 
            s.style.zIndex = '9998';
            document.body.appendChild(s);
            
            const x = Math.random() * (window.innerWidth - 40);
            const y = Math.random() * (window.innerHeight - 40);
            const vx = (Math.random() - 0.5) * 6; 
            const vy = (Math.random() - 0.5) * 6;
            
            this.shrimps.push({ element: s, x: x, y: y, vx: vx, vy: vy });
        }
    },

    loop() {
        if (!ShrimpGame.active) return;
        const maxX = window.innerWidth - 30;
        const maxY = window.innerHeight - 30;

        for (let i = ShrimpGame.shrimps.length - 1; i >= 0; i--) {
            let s = ShrimpGame.shrimps[i];
            
            s.x += s.vx; 
            s.y += s.vy;
            
            if (s.x <= 0) { s.x = 0; s.vx = Math.abs(s.vx); } 
            else if (s.x >= maxX) { s.x = maxX; s.vx = -Math.abs(s.vx); }

            if (s.y <= 0) { s.y = 0; s.vy = Math.abs(s.vy); } 
            else if (s.y >= maxY) { s.y = maxY; s.vy = -Math.abs(s.vy); }

            const dx = s.x - ShrimpGame.mouse.x;
            const dy = s.y - ShrimpGame.mouse.y;
            const dist = Math.sqrt(dx*dx + dy*dy);
            
            if (dist < 250) { 
                s.vx += (dx/dist) * 0.8; 
                s.vy += (dy/dist) * 0.8; 
            }
            
            if (dist < 50) { 
                s.element.remove(); 
                ShrimpGame.shrimps.splice(i, 1); 
                if (ShrimpGame.shrimps.length === 0) {
                    ShrimpGame.gameWin();
                }
                continue; 
            }
            
            const speed = Math.sqrt(s.vx*s.vx + s.vy*s.vy);
            if (speed > 5) { s.vx *= 0.9; s.vy *= 0.9; } 
            else if (speed < 1) { s.vx *= 1.05; s.vy *= 1.05; }
            
            s.element.style.transform = `translate3d(${s.x}px, ${s.y}px, 0)`;
        }
        ShrimpGame.animationFrame = requestAnimationFrame(ShrimpGame.loop);
    }
};

/* =========================================
   2. KEY & UNLOCK UI LOGIC
   ========================================= */
let keyCursorElement = null;

function activateKeyMode() {
    if (!keyCursorElement) {
        keyCursorElement = document.createElement('div');
        keyCursorElement.className = 'key-cursor';
        keyCursorElement.innerText = '🗝️'; 
        keyCursorElement.style.cssText = "position:fixed; z-index:10000; font-size:30px; pointer-events:none; transform:translate(-50%, -50%); transition: transform 0.1s linear;  filter: sepia(100%) saturate(300%) hue-rotate(5deg) brightness(1.2);";
        document.body.appendChild(keyCursorElement);
    }
    
    keyCursorElement.style.display = 'block';
    keyCursorElement.style.opacity = '1';
    document.body.classList.add('has-key-cursor');
    document.body.style.cursor = 'none'; 
    
    document.addEventListener('mousemove', (e) => {
        if(keyCursorElement) {
            keyCursorElement.style.left = e.clientX + 'px';
            keyCursorElement.style.top = e.clientY + 'px';
        }
    });

    const allLockedLinks = document.querySelectorAll('a[href*="viannak.html"]');
    allLockedLinks.forEach(link => {
        const wrapper = link.closest('.person-card-wrapper');
        if (wrapper) {
            wrapper.classList.remove('locked'); 
            wrapper.classList.add('unlockable');
            const overlay = wrapper.querySelector('.lock-overlay');
            if (overlay) overlay.style.display = 'none';
        }
    });

    const toast = document.createElement('div');
    toast.style.cssText = "position:fixed; bottom:20px; left:50%; transform:translateX(-50%); background:var(--text-color); color:var(--bg-color); padding:10px 20px; border-radius:20px; z-index:10000; animation: fadeUp 0.5s ease-out; font-family:'Cousine', monospace;";
    toast.innerText = "Key acquired! Click the last door to unlock.";
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
}

/* =========================================
   3. GENERAL LOGIC 
   ========================================= */
document.addEventListener('DOMContentLoaded', () => {

    /* --- B. THEME SWITCHER --- */
    const themes = {
        "🚪": { bg: "#f6eee4ff", text: "#753a0e", accent: "#f5c462ff", secondary: "#5A3111" },
        "🍵": { bg: "#cfdfc2ff", text: "#224209ff", accent: "#a2c97fff", secondary: "#36551D" },
        "💡": { bg: "#0d1222", text: "#fff2abff", accent: "#393770ff", secondary: "#FEF4D1" },
        "🌷": { bg: "#ffe1eb", text: "#7e1256ff", accent: "#f9a3beff", secondary: "#9D3A4B" },
        "🦐": { bg: "#c4e4e6", text: "#821f06ff", accent: "#f8a184", secondary: "#8B0000" }
    };

    function applyTheme(emojiChar) {
        const key = emojiChar.trim();
        const theme = themes[key]; 
        if (!theme) return;
        
        const root = document.documentElement;
        root.style.setProperty('--bg-color', theme.bg);
        root.style.setProperty('--text-color', theme.text);
        root.style.setProperty('--accent-color', theme.accent);
        root.style.setProperty('--secondary-text-color', theme.secondary);
        
        localStorage.setItem('selectedTheme', key);
        
        if (key === "🦐") {
            if (typeof ShrimpGame !== 'undefined') ShrimpGame.init(); 
        } else {
            if (typeof ShrimpGame !== 'undefined') ShrimpGame.stop();
        }
    }

    document.querySelectorAll('.emoji-bar span, .emoji-pill span').forEach(span => {
        span.addEventListener('click', (e) => {
            e.stopPropagation();
            applyTheme(e.target.textContent);
        });
    });
    
    const savedTheme = localStorage.getItem('selectedTheme');
    if (savedTheme && themes[savedTheme]) applyTheme(savedTheme);


    /* --- MOBILE MENU --- */
    const menuBtn = document.querySelector('.mobile-menu-btn');
    const overlay = document.querySelector('.mobile-overlay');
    const closeBtn = document.querySelector('.close-btn');

    function toggleMenu(e) {
        e.preventDefault();
        if (menuBtn) menuBtn.classList.toggle('open');
        if (overlay) overlay.classList.toggle('active');
        document.body.style.overflow = (document.body.style.overflow === 'hidden') ? '' : 'hidden';
    }

    if (menuBtn) menuBtn.addEventListener('click', toggleMenu);
    if (closeBtn) closeBtn.addEventListener('click', toggleMenu);


    /* --- SHARE & COPY --- */
    const shareBtn = document.getElementById('shareBtn');
    const copyBtn = document.getElementById('copyBtn');
    
    if (shareBtn) {
        shareBtn.addEventListener('click', async () => {
            const currentUrl = window.location.href;
            if (navigator.share) {
                try {
                    await navigator.share({ title: document.title, url: currentUrl });
                } catch (err) { console.log('Error sharing:', err); }
            } else {
                navigator.clipboard.writeText(currentUrl);
                alert('Link copied!');
            }
        });
    }

    if (copyBtn) {
        copyBtn.addEventListener('click', () => {
            navigator.clipboard.writeText(window.location.href).then(() => {
                copyBtn.classList.add('tooltip-visible');
                setTimeout(() => { copyBtn.classList.remove('tooltip-visible'); }, 2000);
            });
        });
    }


    /* --- PEOPLE ARCHIVE --- */
    const peopleSection = document.querySelector('.people-section');
    const peopleTrack = document.querySelector('.horizontal-track');
    const viewGridBtn = document.getElementById('viewGridBtn');
    const columnsControl = document.querySelector('.columns-control');
    const filterBtn = document.getElementById('filterBtn');
    const filterPopup = document.querySelector('.filter-popup');
    const checkboxes = document.querySelectorAll('.custom-checkbox input');
    const clearFiltersBtn = document.getElementById('clearFiltersBtn');
    const newestBtn = document.getElementById('newestBtn');
    const shuffleBtn = document.getElementById('shuffleBtn');

    const storeOriginalIndices = () => {
        if(!peopleTrack) return;
        const cards = Array.from(peopleTrack.children);
        cards.forEach((card, index) => {
            if(!card.hasAttribute('data-original-index')) card.setAttribute('data-original-index', index);
        });
    };

    const removeClones = () => {
        if(!peopleTrack) return;
        document.querySelectorAll('.is-clone').forEach(clone => clone.remove());
    };

    const setupInfiniteLoop = () => {
        if(!peopleTrack) return;
        removeClones();

        if (!peopleSection) return;
        const isGrid = peopleSection.classList.contains('is-grid-view');
        const isFiltering = Array.from(checkboxes).some(box => box.checked);

        if (isGrid || isFiltering) return;

        const originals = Array.from(peopleTrack.children);
        if(originals.length === 0) return;

        originals.forEach(card => {
            const clone = card.cloneNode(true); 
            clone.classList.add('is-clone');
            clone.removeAttribute('id');
            peopleTrack.appendChild(clone); 
        });

        [...originals].reverse().forEach(card => {
            const clone = card.cloneNode(true); 
            clone.classList.add('is-clone');
            clone.removeAttribute('id');
            peopleTrack.insertBefore(clone, peopleTrack.firstChild);
        });

        peopleTrack.scrollLeft = peopleTrack.scrollWidth / 3;
    };

    if (peopleTrack) {
        peopleTrack.addEventListener('scroll', () => {
            if (!peopleSection) return;
            if (peopleSection.classList.contains('is-grid-view')) return;
            if (document.querySelectorAll('.is-clone').length === 0) return;

            const scrollLeft = peopleTrack.scrollLeft;
            const oneSetWidth = peopleTrack.scrollWidth / 3; 

            if (oneSetWidth < 10) return;
            if (scrollLeft >= oneSetWidth * 2) peopleTrack.scrollLeft = scrollLeft - oneSetWidth;
            else if (scrollLeft <= 5) peopleTrack.scrollLeft = scrollLeft + oneSetWidth;
        });

        peopleTrack.addEventListener('wheel', (e) => {
            if (peopleSection.classList.contains('is-grid-view')) return;
            if (e.deltaY !== 0) {
                e.preventDefault();
                peopleTrack.scrollLeft += e.deltaY;
            }
        }, { passive: false });
    }

    const revertToOriginalOrder = () => {
        const cards = Array.from(peopleTrack.children).filter(n => !n.classList.contains('is-clone'));
        cards.sort((a, b) => parseInt(a.getAttribute('data-original-index')) - parseInt(b.getAttribute('data-original-index')));
        cards.forEach(card => peopleTrack.appendChild(card));
    };

    if(newestBtn) {
        newestBtn.addEventListener('click', () => {
            removeClones(); 
            if (newestBtn.classList.contains('active-btn')) {
                revertToOriginalOrder();
                newestBtn.classList.remove('active-btn');
            } else {
                const cards = Array.from(peopleTrack.children);
                cards.sort((a, b) => new Date(b.getAttribute('data-date')) - new Date(a.getAttribute('data-date')));
                cards.forEach(card => peopleTrack.appendChild(card));
                newestBtn.classList.add('active-btn');
                if(shuffleBtn) shuffleBtn.classList.remove('active-btn'); 
            }
            setupInfiniteLoop(); 
        });
    }

   if(shuffleBtn) {
    shuffleBtn.addEventListener('click', () => {
        removeClones();

        const cards = Array.from(peopleTrack.children);
        for (let i = cards.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [cards[i], cards[j]] = [cards[j], cards[i]];
        }
        
        cards.forEach(card => peopleTrack.appendChild(card));

        shuffleBtn.classList.add('active-btn');
        if(newestBtn) newestBtn.classList.remove('active-btn');

        setupInfiniteLoop();
    });
}

    if(viewGridBtn) {
        viewGridBtn.addEventListener('click', () => {
            peopleSection.classList.toggle('is-grid-view');
            viewGridBtn.classList.toggle('active-btn');
            const isGrid = peopleSection.classList.contains('is-grid-view');
            if (isGrid) {
                if(columnsControl) columnsControl.style.display = 'flex';
                viewGridBtn.textContent = "VIEW IN: SCROLL";
                removeClones(); 
            } else {
                if(columnsControl) columnsControl.style.display = 'none';
                viewGridBtn.textContent = "VIEW IN: GRID";
                setupInfiniteLoop();
            }
        });
    }

    if(filterBtn) {
        filterBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if(filterPopup) filterPopup.classList.toggle('active');
            filterBtn.classList.toggle('active-btn');
        });
        document.addEventListener('click', (e) => {
            if (filterPopup && !filterPopup.contains(e.target) && e.target !== filterBtn) {
                filterPopup.classList.remove('active');
                const count = Array.from(checkboxes).filter(box => box.checked).length;
                if (count === 0) filterBtn.classList.remove('active-btn');
                else filterBtn.classList.add('active-btn');
            }
        });
        if(filterPopup) filterPopup.addEventListener('click', (e) => e.stopPropagation());
    }

    function applyFilters() {
        const checkedValues = Array.from(checkboxes).filter(box => box.checked).map(box => box.value);
        const isFiltering = checkedValues.length > 0;

        if (isFiltering) removeClones();

        const allOriginals = document.querySelectorAll('.person-card-wrapper:not(.is-clone)');
        let visibleCount = 0;

        allOriginals.forEach(card => {
            if (!isFiltering) {
                card.classList.remove('hidden');
            } else {
                const cardTags = card.getAttribute('data-tags');
                const hasMatch = checkedValues.some(tag => cardTags && cardTags.includes(tag));
                if (hasMatch) {
                    card.classList.remove('hidden');
                    visibleCount++;
                } else {
                    card.classList.add('hidden');
                }
            }
        });

        if (filterBtn) {
            if (isFiltering) {
                filterBtn.textContent = `FILTER (${visibleCount})`;
                filterBtn.classList.add('active-btn');
                peopleTrack.scrollLeft = 0; 
            } else { 
                filterBtn.textContent = "FILTER"; 
                filterBtn.classList.remove('active-btn');
                setupInfiniteLoop(); 
            }
        }
    }
    checkboxes.forEach(box => box.addEventListener('change', applyFilters));

    if(clearFiltersBtn) {
        clearFiltersBtn.addEventListener('click', () => {
            checkboxes.forEach(box => box.checked = false);
            applyFilters();
        });
    }
    
    if(peopleTrack) {
        storeOriginalIndices();
        setupInfiniteLoop();
        window.addEventListener('resize', () => {
            if (peopleSection && !peopleSection.classList.contains('is-grid-view')) {
                if (document.querySelectorAll('.is-clone').length > 0) {
                    peopleTrack.scrollLeft = peopleTrack.scrollWidth / 3;
                } else {
                    setupInfiniteLoop();
                }
            }
        });
    }

    /* =========================================
       F. MASTER CLICK HANDLER (DOOR & HINTS)
       ========================================= */

    // 1. Create the Locked Hint Modal
    const hintModal = document.createElement('div');
    hintModal.className = 'game-modal unique-hint-modal';
    hintModal.innerHTML = `
        <div class="modal-icon">🔒</div>
        <div class="modal-title">Locked</div>
        <div class="modal-text">
            Uh oh, this door is locked.<br>I wonder if Wailmer is hungry?<br>
            <span style="font-size: 0.9em; opacity: 0.9; margin-top: 10px; display:block;">( Hint: 🦐 )</span>
        </div>
        <button class="modal-btn">Noted, With Thanks.</button>
    `;
    document.body.appendChild(hintModal);
    hintModal.querySelector('button').onclick = () => hintModal.classList.remove('active');

    // 2. The Logic
    document.addEventListener('click', (e) => {
        const targetLink = e.target.closest('a[href*="viannak.html"]');
        
        if (targetLink) {
            const hasKey = sessionStorage.getItem('hasGoldenKey') === 'true';
            const isPermanentlyUnlocked = sessionStorage.getItem('viannakUnlocked') === 'true';

            // SCENARIO 1: Previously unlocked. Let them through.
            if (isPermanentlyUnlocked) {
                return; // Default behavior (navigate)
            }

            // SCENARIO 2: Has Key. Unlock it.
            if (hasKey) {
                e.preventDefault(); 
                const wrapper = targetLink.closest('.person-card-wrapper');
                
                // Visual Unlock
                if(wrapper) {
                    wrapper.style.transition = '0.5s';
                    wrapper.style.opacity = '1';
                    wrapper.style.filter = 'none';
                    const overlay = wrapper.querySelector('.lock-overlay');
                    if (overlay) {
                         overlay.style.display = 'flex';
                         overlay.innerHTML = '<div style="font-size:40px">🔓</div><div>OPEN</div>';
                    }
                }

                // Poof Animation
                if (keyCursorElement) {
                    keyCursorElement.style.transition = 'transform 0.4s ease, opacity 0.4s ease';
                    keyCursorElement.style.transform = 'translate(-50%, -50%) rotate(-45deg) scale(1.5)';
                    
                    setTimeout(() => {
                        keyCursorElement.style.opacity = '0';
                        keyCursorElement.style.transform = 'translate(-50%, -50%) scale(0.1)';
                    }, 200);
                }

                // Remove Key & Set Permanent Unlock
                sessionStorage.removeItem('hasGoldenKey'); 
                sessionStorage.setItem('viannakUnlocked', 'true');

                // Reset Cursor
                setTimeout(() => {
                    document.body.classList.remove('has-key-cursor');
                    document.body.style.cursor = 'default';
                }, 400);

                // Navigate
                setTimeout(() => { window.location.href = 'viannak.html'; }, 800);

            } else {
                // SCENARIO 3: Locked, no key.
                e.preventDefault();
                e.stopPropagation();
                hintModal.classList.add('active');
            }
        }
    });

    // 3. Page Load - Check Visual State
    const isUnlocked = sessionStorage.getItem('viannakUnlocked') === 'true';
    if (isUnlocked) {
         // If unlocked, immediately show the card as open
         const allLockedLinks = document.querySelectorAll('a[href*="viannak.html"]');
         allLockedLinks.forEach(link => {
            const wrapper = link.closest('.person-card-wrapper');
            if (wrapper) {
                wrapper.classList.remove('locked');
                wrapper.classList.add('unlocked-persistent'); 
                wrapper.style.opacity = '1';
                wrapper.style.filter = 'none';
                const overlay = wrapper.querySelector('.lock-overlay');
                if (overlay) overlay.style.display = 'none';
            }
         });
    } else {
        // Only check for active key if door isn't already open
        const hasKey = sessionStorage.getItem('hasGoldenKey') === 'true';
        if (hasKey) {
            activateKeyMode();
        }
    }
});

/* =========================================
   STICKER DRAG & MODAL LOGIC (UPDATED)
   ========================================= */
document.addEventListener("DOMContentLoaded", function() {
    
    const stickers = document.querySelectorAll(".draggable-sticker");
    const modal = document.getElementById("imageModal");
    const modalImg = document.getElementById("fullImage");
    const modalCaption = document.getElementById("modalCaption"); // New Element
    const closeBtn = document.getElementById("closeModalBtn");

    // Initialize drag for all stickers
    stickers.forEach(sticker => {
        dragElement(sticker);
    });

    function dragElement(elmnt) {
        let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
        let startX = 0, startY = 0;
        
        // Grab image source and caption text
        let img = elmnt.querySelector("img");
        let captionText = elmnt.querySelector(".sticker-caption") ? elmnt.querySelector(".sticker-caption").innerText : "";

        elmnt.onmousedown = dragMouseDown;

        function dragMouseDown(e) {
            e = e || window.event;
            e.preventDefault(); 
            
            // Record start positions for click detection
            startX = e.clientX;
            startY = e.clientY;
            pos3 = e.clientX;
            pos4 = e.clientY;
            
            document.onmouseup = closeDragElement;
            document.onmousemove = elementDrag;
        }

        function elementDrag(e) {
            e = e || window.event;
            e.preventDefault();
            
            // Calculate new position
            pos1 = pos3 - e.clientX;
            pos2 = pos4 - e.clientY;
            pos3 = e.clientX;
            pos4 = e.clientY;
            
            elmnt.style.top = (elmnt.offsetTop - pos2) + "px";
            elmnt.style.left = (elmnt.offsetLeft - pos1) + "px";
            
            elmnt.classList.add("is-dragging");
        }

        function closeDragElement(e) {
            document.onmouseup = null;
            document.onmousemove = null;
            elmnt.classList.remove("is-dragging");

            let dist = Math.sqrt(Math.pow(e.clientX - startX, 2) + Math.pow(e.clientY - startY, 2));

            if (dist < 5) {
                openModal(img.src, captionText);
            }
        }
    }

    // --- Modal Functionality ---
    function openModal(src, caption) {
        if(modal && modalImg) {
            modal.style.display = "flex"; 
            modalImg.src = src;
            
            if(modalCaption) {
                modalCaption.innerText = caption;
                modalCaption.style.animation = 'none';
                modalCaption.offsetHeight; 
                modalCaption.style.animation = 'fadeCaption 0.5s 0.2s forwards';
            }
        }
    }

    // Close Button
    if(closeBtn) {
        closeBtn.onclick = function() {
            modal.style.display = "none";
        }
    }

    // Click Outside to Close
    window.onclick = function(event) {
        if (event.target == modal) {
            modal.style.display = "none";
        }
    }

    // Mobile Menu Trigger 
    const mobileBtn = document.getElementById('mobileTrigger');
    const overlay = document.getElementById('mobileOverlay');
    if(mobileBtn && overlay) {
        mobileBtn.addEventListener('click', () => {
            overlay.classList.toggle('open'); 
        });
    }
});

window.addEventListener('scroll', function() {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    
    const totalDocHeight = document.documentElement.scrollHeight;
    const viewportHeight = document.documentElement.clientHeight;
    
    const footerHeight = 810; 
    const adjustedTotalHeight = totalDocHeight - footerHeight - viewportHeight;

    let scrollPercentage = (scrollTop / adjustedTotalHeight) * 100;
    
    scrollPercentage = Math.min(100, Math.max(0, scrollPercentage));
    
    document.getElementById('readingBar').style.width = scrollPercentage + '%';
});
