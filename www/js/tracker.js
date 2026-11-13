// js/tracker.js
document.addEventListener("DOMContentLoaded", () => {
    // Elements - Tabs
    const tabBtns = document.querySelectorAll('.tracker-tabs .tab-btn');
    const modeViews = document.querySelectorAll('.tracker-mode-view');

    // Elements - Timer (Stopwatch)
    const timerValueEl = document.getElementById('timer-value');
    const timerActivityName = document.getElementById('timer-activity-name');
    const timerCategorySelect = document.getElementById('timer-category-select');
    const btnTimerStart = document.getElementById('btn-timer-start');
    const btnTimerStop = document.getElementById('btn-timer-stop');

    // Elements - Countdown
    const countdownValueEl = document.getElementById('countdown-value');
    const countdownActivityName = document.getElementById('countdown-activity-name');
    const countdownCategorySelect = document.getElementById('countdown-category-select');
    const btnCountdownStart = document.getElementById('btn-countdown-start');
    const btnCountdownStop = document.getElementById('btn-countdown-stop');
    const countdownMinBtns = document.querySelectorAll('#tab-countdown .activity-inputs .btn.secondary-btn');
    let selectedCountdownMinutes = 10;
    
    // Elements - Manual Entry
    const manualForm = document.getElementById('manual-entry-form');
    const manualActivityName = document.getElementById('manual-activity-name');
    const manualCategorySelect = document.getElementById('manual-category-select');
    const manualDatetime = document.getElementById('manual-datetime');
    const manualHours = document.getElementById('manual-hours');
    const manualMinutes = document.getElementById('manual-minutes');

    // Timer State
    let activeInterval = null;
    let currentMode = null; // 'timer' or 'countdown'
    
    // Initialize
    populateCategories();
    manualDatetime.value = Utils.formatDatetimeLocal(new Date());

    // Restore active timer from background
    restoreActiveTimer();

    // Re-check timer when app comes to foreground
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
            restoreActiveTimer();
        }
    });

    if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App) {
        window.Capacitor.Plugins.App.addListener('appStateChange', ({ isActive }) => {
            if (isActive) restoreActiveTimer();
        });
    }

    // --- Tab Switching ---
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const target = btn.getAttribute('data-tab');
            tabBtns.forEach(b => b.classList.remove('active'));
            modeViews.forEach(v => v.classList.add('hidden'));
            btn.classList.add('active');
            document.getElementById(`tab-${target}`).classList.remove('hidden');
        });
    });

    // --- Countdown Pre-selection ---
    countdownMinBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            if (currentMode === 'countdown') return; // disabled while running
            countdownMinBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            selectedCountdownMinutes = parseInt(btn.getAttribute('data-min'));
            countdownValueEl.innerText = `${selectedCountdownMinutes.toString().padStart(2, '0')}:00`;
        });
    });

    // --- Core Timer Logic ---
    function startTimerLoop(timerData) {
        if (activeInterval) clearInterval(activeInterval);

        currentMode = timerData.mode;

        // UI Updates based on mode
        if (currentMode === 'timer') {
            btnTimerStart.classList.add('hidden');
            btnTimerStop.classList.remove('hidden');
            timerValueEl.classList.add('timer-running');
            timerActivityName.disabled = true;
            timerCategorySelect.disabled = true;
            timerActivityName.value = timerData.name;
            timerCategorySelect.value = timerData.categoryId;
            
            // Switch to timer tab visually
            document.querySelector('.tab-btn[data-tab="timer"]').click();
        } else if (currentMode === 'countdown') {
            btnCountdownStart.classList.add('hidden');
            btnCountdownStop.classList.remove('hidden');
            countdownValueEl.classList.add('timer-running');
            countdownActivityName.disabled = true;
            countdownCategorySelect.disabled = true;
            countdownActivityName.value = timerData.name;
            countdownCategorySelect.value = timerData.categoryId;

            document.querySelector('.tab-btn[data-tab="countdown"]').click();
        }

        if (window.AppNotifications) {
            window.AppNotifications.showTimerNotification(timerData.name);
        }

        activeInterval = setInterval(() => {
            const now = Date.now();
            const elapsedMs = now - timerData.startTime;
            const elapsedSec = Math.floor(elapsedMs / 1000);
            
            let timeStr = "";

            if (currentMode === 'timer') {
                timeStr = Utils.formatTimeHHMMSS(elapsedSec);
                timerValueEl.innerText = timeStr;
            } else if (currentMode === 'countdown') {
                const totalSec = timerData.durationMinutes * 60;
                const remainingSec = totalSec - elapsedSec;
                
                if (remainingSec <= 0) {
                    timeStr = "00:00";
                    countdownValueEl.innerText = timeStr;
                    playBeepSound();
                    stopTimerLoop(true); // auto-complete
                } else {
                    const m = Math.floor(remainingSec / 60).toString().padStart(2, '0');
                    const s = (remainingSec % 60).toString().padStart(2, '0');
                    timeStr = `${m}:${s}`;
                    countdownValueEl.innerText = timeStr;
                }
            }
            
            if (window.AppNotifications && timeStr) {
                // Update ongoing notification every 60 seconds or at the very start to avoid spam/battery drain
                if (elapsedSec % 60 === 0 || elapsedSec === 1) {
                    window.AppNotifications.showTimerNotification(timerData.name, timeStr);
                }
            }
        }, 1000); // 1 sec
    }

    function playBeepSound() {
        try {
            const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();
            
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); // A5
            
            gainNode.gain.setValueAtTime(1, audioCtx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 1); // 1 second
            
            oscillator.connect(gainNode);
            gainNode.connect(audioCtx.destination);
            
            oscillator.start();
            oscillator.stop(audioCtx.currentTime + 1);
        } catch (e) {
            console.error("Audio playback failed", e);
        }
    }

    function stopTimerLoop(autoComplete = false) {
        if (!activeInterval && !currentMode) return;
        clearInterval(activeInterval);
        activeInterval = null;

        const timerData = Storage.getActiveTimer();
        if (!timerData) return;

        const elapsedMs = Date.now() - timerData.startTime;
        let elapsedMinutes = Math.floor(elapsedMs / 60000);

        if (currentMode === 'countdown') {
            if (autoComplete) {
                elapsedMinutes = timerData.durationMinutes;
                alert("Timer / Countdown complete!");
            } else {
                // Stopped early, still record what we tracked if it's > 1 min
                if (elapsedMinutes < 1) elapsedMinutes = 1; 
            }
        } else {
            if (elapsedMinutes < 1) elapsedMinutes = 1;
        }

        Storage.addActivity({
            name: timerData.name,
            categoryId: timerData.categoryId,
            durationMinutes: elapsedMinutes,
            timestamp: timerData.startTime,
            dateString: Utils.getTodayString()
        });

        Storage.clearActiveTimer();

        if (window.AppNotifications) {
            window.AppNotifications.clearTimerNotification();
        }

        // Reset UI
        if (currentMode === 'timer') {
            btnTimerStart.classList.remove('hidden');
            btnTimerStop.classList.add('hidden');
            timerValueEl.classList.remove('timer-running');
            timerValueEl.innerText = "00:00:00";
            timerActivityName.disabled = false;
            timerCategorySelect.disabled = false;
            timerActivityName.value = '';
            timerCategorySelect.value = '';
        } else if (currentMode === 'countdown') {
            btnCountdownStart.classList.remove('hidden');
            btnCountdownStop.classList.add('hidden');
            countdownValueEl.classList.remove('timer-running');
            countdownValueEl.innerText = `${selectedCountdownMinutes.toString().padStart(2, '0')}:00`;
            countdownActivityName.disabled = false;
            countdownCategorySelect.disabled = false;
            countdownCategorySelect.value = '';
        }

        if (!autoComplete) {
            alert(`Saved: ${timerData.name} (${Utils.formatDuration(elapsedMinutes)})`);
        }

        currentMode = null;
    }

    function restoreActiveTimer() {
        const timerData = Storage.getActiveTimer();
        if (timerData) {
            startTimerLoop(timerData);
        }
    }

    // --- Buttons Actions ---
    btnTimerStart.addEventListener('click', () => {
        if (currentMode) {
            alert("A timer is already running!");
            return;
        }
        
        const name = timerActivityName.value.trim();
        const catId = timerCategorySelect.value;

        if (!name) return alert("Please enter an activity name.");
        if (!catId) return alert("Please select a category.");

        const timerData = {
            mode: 'timer',
            name: name,
            categoryId: catId,
            startTime: Date.now()
        };

        Storage.setActiveTimer(timerData);
        startTimerLoop(timerData);
    });

    btnTimerStop.addEventListener('click', () => stopTimerLoop(false));

    btnCountdownStart.addEventListener('click', () => {
        if (currentMode) {
            alert("A timer is already running!");
            return;
        }
        
        const name = countdownActivityName.value.trim();
        const catId = countdownCategorySelect.value;

        if (!name) return alert("Please enter an activity name.");
        if (!catId) return alert("Please select a category.");

        const timerData = {
            mode: 'countdown',
            name: name,
            categoryId: catId,
            durationMinutes: selectedCountdownMinutes,
            startTime: Date.now()
        };

        Storage.setActiveTimer(timerData);
        startTimerLoop(timerData);
    });

    btnCountdownStop.addEventListener('click', () => stopTimerLoop(false));

    // --- Manual Entry Logic ---
    manualForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const h = parseInt(manualHours.value) || 0;
        const m = parseInt(manualMinutes.value) || 0;
        const totalMin = (h * 60) + m;

        if (totalMin <= 0) return alert("Duration must be greater than 0.");

        const dateObj = new Date(manualDatetime.value);
        
        Storage.addActivity({
            name: manualActivityName.value.trim(),
            categoryId: manualCategorySelect.value,
            durationMinutes: totalMin,
            timestamp: dateObj.getTime(),
            dateString: Utils.getDateString(dateObj)
        });

        alert("Activity saved manually.");
        manualForm.reset();
        manualDatetime.value = Utils.formatDatetimeLocal(new Date());
    });

    // --- Custom Categories & Populate ---
    function handleCustomCategorySelection(e) {
        if (e.target.value === '__add_custom__') {
            const catName = prompt("Enter the name of your new category:");
            if (catName && catName.trim()) {
                const isProd = confirm("Is this a productive activity? (Yes = OK, No = Cancel)");
                const newCat = {
                    id: Utils.generateId(),
                    name: catName.trim(),
                    isProductive: isProd,
                    color: `hsl(${Math.floor(Math.random() * 360)}, 70%, 60%)`
                };
                Storage.addCategory(newCat);
                e.target.value = newCat.id;
            } else {
                e.target.value = "";
            }
        }
    }

    timerCategorySelect.addEventListener('change', handleCustomCategorySelection);
    countdownCategorySelect.addEventListener('change', handleCustomCategorySelection);
    manualCategorySelect.addEventListener('change', handleCustomCategorySelection);
    document.addEventListener('dataChanged', populateCategories);

    function populateCategories() {
        const categories = Storage.getCategories();
        let optionsHTML = '<option value="" disabled selected>Select Category</option>';
        
        categories.forEach(cat => {
            optionsHTML += `<option value="${cat.id}">${cat.name}</option>`;
        });
        optionsHTML += `<option disabled>──────────</option>`;
        optionsHTML += `<option value="__add_custom__" style="font-weight: 600; color: var(--primary);">+ New Custom Category</option>`;

        const timerCurrentVal = timerCategorySelect.value;
        const countdownCurrentVal = countdownCategorySelect.value;
        const manualCurrentVal = manualCategorySelect.value;

        timerCategorySelect.innerHTML = optionsHTML;
        countdownCategorySelect.innerHTML = optionsHTML;
        manualCategorySelect.innerHTML = optionsHTML;

        if (timerCurrentVal) timerCategorySelect.value = timerCurrentVal;
        if (countdownCurrentVal) countdownCategorySelect.value = countdownCurrentVal;
        if (manualCurrentVal) manualCategorySelect.value = manualCurrentVal;
    }
});
