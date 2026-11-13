// js/dashboard.js
document.addEventListener("DOMContentLoaded", () => {
    // Elements
    const dateDisplay = document.getElementById('current-date-display');
    const scoreValue = document.getElementById('time-score-value');
    const scoreMessage = document.getElementById('time-score-message');
    const statProductive = document.getElementById('stat-productive-time');
    const statNonProductive = document.getElementById('stat-non-productive-time');
    const recentActivitiesList = document.getElementById('recent-activities-list');

    // Init
    renderDashboard();

    // Listeners
    document.addEventListener('dataChanged', renderDashboard);
    document.addEventListener('viewChanged', (e) => {
        if (e.detail.viewId === 'view-dashboard') {
            renderDashboard();
        }
    });

    function renderDashboard() {
        const todayStr = Utils.getTodayString();
        const activities = Storage.getActivitiesByDate(todayStr);
        const settings = Storage.getSettings();
        
        // Formatter for display date
        const options = { weekday: 'long', month: 'short', day: 'numeric' };
        dateDisplay.innerText = new Intl.DateTimeFormat('en-US', options).format(new Date());

        let productiveMins = 0;
        let nonProductiveMins = 0;

        // Process activities
        activities.forEach(act => {
            const cat = Storage.getCategoryById(act.categoryId);
            if (cat.isProductive) {
                productiveMins += act.durationMinutes;
            } else {
                nonProductiveMins += act.durationMinutes;
            }
        });

        // Update Stats
        statProductive.innerText = Utils.formatDuration(productiveMins);
        statNonProductive.innerText = Utils.formatDuration(nonProductiveMins);

        // Calculate Score
        const goalMins = (settings.productiveGoalHours || 4) * 60;
        let score = 0;
        if (goalMins > 0) {
            score = Math.floor((productiveMins / goalMins) * 100);
            if (score > 100) score = 100;
        }

        // Animate score (simple innerText update for now)
        scoreValue.innerText = score;

        // Update Message
        if (score === 0) {
            scoreMessage.innerText = "Let's get started today!";
        } else if (score < 50) {
            scoreMessage.innerText = "You're on your way. Keep focusing!";
        } else if (score < 100) {
            scoreMessage.innerText = "Great job! Almost at your goal.";
        } else {
            scoreMessage.innerText = "Incredible! You hit your daily goal.";
        }

        // Smart Insights
        const insightsContainer = document.getElementById('smart-insights-container');
        const insightsText = document.getElementById('smart-insights-text');
        
        let insightMsg = "";
        if (activities.length > 0) {
            const catTotals = {};
            activities.forEach(a => {
                catTotals[a.categoryId] = (catTotals[a.categoryId] || 0) + a.durationMinutes;
            });
            
            let maxCatId = Object.keys(catTotals).reduce((a, b) => catTotals[a] > catTotals[b] ? a : b);
            let maxCat = Storage.getCategoryById(maxCatId);
            
            if (maxCat.isProductive && catTotals[maxCatId] >= 120) {
                insightMsg = `🔥 <strong>Great focus!</strong> You've spent <strong>${Utils.formatDuration(catTotals[maxCatId])}</strong> on ${maxCat.name} today.`;
            } else if (!maxCat.isProductive && catTotals[maxCatId] >= 60) {
                insightMsg = `💡 <strong>Mindful moment:</strong> You've spent <strong>${Utils.formatDuration(catTotals[maxCatId])}</strong> on ${maxCat.name}. Consider taking a productive break.`;
            } else if (score >= 100) {
                insightMsg = `⭐ <strong>Goal Achieved!</strong> You've hit your daily productivity target.`;
            } else {
                insightMsg = `Keep tracking to gain more insights on your day.`;
            }
        }
        
        if (insightsContainer) {
            if (insightMsg) {
                insightsText.innerHTML = insightMsg;
                insightsContainer.style.display = 'block';
            } else {
                insightsContainer.style.display = 'none';
            }
        }

        // Render Recent Activities (Limit to 5)
        recentActivitiesList.innerHTML = '';
        if (activities.length === 0) {
            recentActivitiesList.innerHTML = '<li class="empty-state" style="padding:1rem;">No activities yet.</li>';
        } else {
            // Sort to show newest first
            const recent = [...activities].sort((a, b) => b.timestamp - a.timestamp).slice(0, 5);
            
            recent.forEach(act => {
                const cat = Storage.getCategoryById(act.categoryId);
                const isProdClass = cat.isProductive ? 'cat-productive' : 'cat-non-productive';
                
                // Format time HH:MM AM/PM
                const timeStr = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: 'numeric' }).format(new Date(act.timestamp));

                const li = document.createElement('li');
                li.className = 'activity-item';
                li.style.cursor = 'pointer';
                li.title = "Click to Edit";
                li.onclick = () => window.openEditModal(act.id);
                li.innerHTML = `
                    <div class="activity-info">
                        <h4>${act.name}</h4>
                        <span class="activity-category ${isProdClass}">${cat.name}</span>
                    </div>
                    <div class="activity-time">
                        ${Utils.formatDuration(act.durationMinutes)}
                        <small>${timeStr}</small>
                    </div>
                `;
                recentActivitiesList.appendChild(li);
            });
        }
    }
});
