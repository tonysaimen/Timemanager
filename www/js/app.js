// js/app.js
document.addEventListener("DOMContentLoaded", () => {
    // State
    let currentView = 'view-dashboard';

    // Elements
    const navItems = document.querySelectorAll('.nav-item');
    const views = document.querySelectorAll('.view');
    const pageTitle = document.getElementById('page-title');
    const themeToggleBtn = document.getElementById('theme-toggle');
    const settingsBtn = document.getElementById('settings-btn');
    const settingsBackBtn = document.getElementById('btn-settings-back');

    // Title mapping
    const titleMap = {
        'view-dashboard': 'Dashboard',
        'view-tracker': 'Track Time',
        'view-reports': 'Analytics',
        'view-calendar': 'Timeline',
        'view-settings': 'Settings'
    };

    // Initialize Theme
    const savedTheme = localStorage.getItem('tm_theme') || 'dark';
    document.body.setAttribute('data-theme', savedTheme);
    updateThemeIcon();

    // Event Listeners for Navigation
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const target = item.getAttribute('data-target');
            if (target) {
                switchView(target);
                // Update active state in nav
                navItems.forEach(nav => nav.classList.remove('active'));
                item.classList.add('active');
            }
        });
    });

    // Settings routing
    settingsBtn.addEventListener('click', () => {
        switchView('view-settings');
        navItems.forEach(nav => nav.classList.remove('active'));
    });

    if (settingsBackBtn) {
        settingsBackBtn.addEventListener('click', () => {
            switchView('view-dashboard');
            navItems.forEach(nav => {
                if(nav.getAttribute('data-target') === 'view-dashboard') {
                    nav.classList.add('active');
                } else {
                    nav.classList.remove('active');
                }
            });
        });
    }

    // Theme Toggle
    themeToggleBtn.addEventListener('click', () => {
        const currentTheme = document.body.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        document.body.setAttribute('data-theme', newTheme);
        localStorage.setItem('tm_theme', newTheme);
        updateThemeIcon();
        
        // Dispatch theme event so charts can re-render colors
        document.dispatchEvent(new CustomEvent('themeChanged', { detail: { theme: newTheme } }));
    });

    function updateThemeIcon() {
        const isDark = document.body.getAttribute('data-theme') === 'dark';
        themeToggleBtn.innerHTML = isDark ? '<i class="fa-solid fa-sun"></i>' : '<i class="fa-solid fa-moon"></i>';
    }

    // View Switcher logic
    function switchView(viewId) {
        if (currentView === viewId) return;
        
        // Hide all views
        views.forEach(view => {
            view.classList.remove('active');
        });

        // Show target view
        const targetView = document.getElementById(viewId);
        if (targetView) targetView.classList.add('active');

        // Update title
        pageTitle.innerText = titleMap[viewId] || 'Time Manager';
        currentView = viewId;

        // Custom hooks for view entry
        document.dispatchEvent(new CustomEvent('viewChanged', { detail: { viewId } }));
    }

    // Initialize the app routing to dashboard
    switchView('view-dashboard');

    // --- Streak Logic ---
    function checkDailyStreak() {
        const streakData = Storage.getStreakData();
        if (!streakData) return;

        const todayObj = new Date();
        const todayStr = Utils.getDateString(todayObj);
        const currentMonthStr = todayStr.substring(0, 7);
        
        // Month rollover for excuses
        if (streakData.lastExcuseMonth !== currentMonthStr) {
            streakData.excusesRemaining = 3;
            streakData.lastExcuseMonth = currentMonthStr;
        }

        let popupMessage = null;

        if (!streakData.lastLoginDate) {
            streakData.currentStreak = 1;
            streakData.lastLoginDate = todayStr;
            popupMessage = "Welcome! Your 1-day streak begins today! Keep it up!";
        } else if (streakData.lastLoginDate !== todayStr) {
            const todayReset = new Date(todayObj);
            todayReset.setHours(0,0,0,0);
            
            const lastLoginObj = new Date(streakData.lastLoginDate + 'T00:00:00');
            const diffTime = Math.abs(todayReset - lastLoginObj);
            const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
            
            if (diffDays === 1) {
                streakData.currentStreak += 1;
                popupMessage = `You're on fire! ${streakData.currentStreak} day streak!`;
                if (window.AppNotifications && window.AppNotifications.showStreakNotification) {
                    window.AppNotifications.showStreakNotification(streakData.currentStreak);
                }
            } else if (diffDays > 1) {
                if (streakData.excusesRemaining > 0) {
                    streakData.excusesRemaining -= 1;
                    popupMessage = `You missed a day, but we used 1 streak freeze! Streak saved at ${streakData.currentStreak}. (${streakData.excusesRemaining} left this month)`;
                } else {
                    streakData.currentStreak = 1;
                    popupMessage = `Oh no! You lost your streak. But today is a new beginning! 1 day streak.`;
                }
            }
            streakData.lastLoginDate = todayStr;
        }

        Storage.updateStreakData(streakData);

        if (popupMessage) {
            showStreakModal(streakData.currentStreak, popupMessage);
        }
    }

    function showStreakModal(streak, message) {
        const modal = document.getElementById('streak-modal');
        const numEl = document.getElementById('streak-number');
        const msgEl = document.getElementById('streak-message');
        if (!modal || !numEl || !msgEl) return;

        numEl.innerText = streak;
        msgEl.innerText = message;
        modal.classList.remove('hidden');
    }

    const btnCloseStreak = document.getElementById('btn-close-streak');
    if (btnCloseStreak) {
        btnCloseStreak.addEventListener('click', () => {
            document.getElementById('streak-modal').classList.add('hidden');
        });
    }

    // --- Header Streak Update ---
    function updateHeaderStreak() {
        const streakData = Storage.getStreakData();
        const headerNumEl = document.getElementById('header-streak-number');
        if (headerNumEl && streakData) {
            headerNumEl.innerText = streakData.currentStreak;
        }
    }

    document.addEventListener('streakChanged', updateHeaderStreak);

    const btnStreakHeader = document.getElementById('streak-header-btn');
    if (btnStreakHeader) {
        btnStreakHeader.addEventListener('click', () => {
            const streakData = Storage.getStreakData();
            if (streakData) {
                const msg = `You are on a ${streakData.currentStreak} day streak! Keep it going!\n\n🧊 You have ${streakData.excusesRemaining || 0} streak freeze(s) left this month.`;
                showStreakModal(streakData.currentStreak, msg);
            }
        });
    }

    // Run streak check on startup
    checkDailyStreak();
    updateHeaderStreak();
    // --- Global Edit Modal Logic ---
    const editModal = document.getElementById('edit-modal');
    const btnCloseModal = document.getElementById('btn-close-modal');
    const btnSaveEdit = document.getElementById('btn-save-edit');
    const btnDeleteEdit = document.getElementById('btn-delete-edit');
    const editIdInput = document.getElementById('edit-activity-id');
    const editNameInput = document.getElementById('edit-activity-name');
    const editDurationInput = document.getElementById('edit-activity-duration');
    const editCategorySelect = document.getElementById('edit-category-select');

    window.openEditModal = function(activityId) {
        const activities = Storage.getActivities();
        const act = activities.find(a => a.id === activityId);
        if (!act) return;

        // Populate Categories
        const categories = Storage.getCategories();
        editCategorySelect.innerHTML = '';
        categories.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c.id;
            opt.innerText = c.name;
            editCategorySelect.appendChild(opt);
        });

        editIdInput.value = act.id;
        editNameInput.value = act.name;
        editDurationInput.value = act.durationMinutes;
        editCategorySelect.value = act.categoryId;

        editModal.classList.remove('hidden');
    }

    function closeEditModal() {
        editModal.classList.add('hidden');
        editIdInput.value = '';
    }

    btnCloseModal.addEventListener('click', closeEditModal);
    editModal.addEventListener('click', (e) => {
        if(e.target === editModal) closeEditModal();
    });

    btnSaveEdit.addEventListener('click', () => {
        const id = editIdInput.value;
        const newName = editNameInput.value.trim();
        const newCat = editCategorySelect.value;
        const newDur = parseInt(editDurationInput.value, 10);

        if (!newName || isNaN(newDur) || newDur <= 0) {
            alert('Please enter valid name and duration');
            return;
        }

        Storage.editActivity(id, {
            name: newName,
            categoryId: newCat,
            durationMinutes: newDur
        });
        closeEditModal();
    });

    btnDeleteEdit.addEventListener('click', () => {
        const id = editIdInput.value;
        if (confirm("Are you sure you want to delete this activity?")) {
            Storage.deleteActivity(id);
            closeEditModal();
        }
    });

});
