// js/calendar.js
document.addEventListener("DOMContentLoaded", () => {
    const btnPrev = document.getElementById('cal-prev-month');
    const btnNext = document.getElementById('cal-next-month');
    const monthTitle = document.getElementById('cal-current-month');
    const calendarGrid = document.getElementById('calendar-month-grid');
    const timelineContainer = document.getElementById('timeline-container');
    const selectedDateStrElem = document.getElementById('cal-selected-date-str');

    let currentMonthObj = new Date(); // tracks the month being viewed
    currentMonthObj.setDate(1); // set to 1st to avoid end of month skip issues
    let selectedDateObj = new Date(); // tracks the user's selected day
    
    let dayChartInstance = null;

    // Init
    renderMonthCalendar();
    renderTimelineForDate(selectedDateObj);

    // Listeners
    document.addEventListener('dataChanged', () => {
        renderMonthCalendar();
        renderTimelineForDate(selectedDateObj);
    });
    document.addEventListener('viewChanged', (e) => {
        if (e.detail.viewId === 'view-calendar') {
            renderMonthCalendar();
            renderTimelineForDate(selectedDateObj);
        }
    });

    btnPrev.addEventListener('click', () => {
        currentMonthObj.setMonth(currentMonthObj.getMonth() - 1);
        renderMonthCalendar();
    });

    btnNext.addEventListener('click', () => {
        currentMonthObj.setMonth(currentMonthObj.getMonth() + 1);
        renderMonthCalendar();
    });

    function renderMonthCalendar() {
        monthTitle.innerText = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(currentMonthObj);
        calendarGrid.innerHTML = '';

        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        days.forEach(day => {
            const el = document.createElement('div');
            el.className = 'calendar-day-header';
            el.innerText = day;
            calendarGrid.appendChild(el);
        });

        const year = currentMonthObj.getFullYear();
        const month = currentMonthObj.getMonth();
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const today = new Date();

        // Get all activities to highlight dates with data
        const allActivities = Storage.getActivities();
        const daysWithData = new Set(allActivities.map(a => a.dateString));

        for (let i = 0; i < firstDay; i++) {
            const empty = document.createElement('div');
            empty.className = 'calendar-day-cell empty';
            calendarGrid.appendChild(empty);
        }

        for (let i = 1; i <= daysInMonth; i++) {
            const currentIterDate = new Date(year, month, i);
            const dateStr = Utils.getDateString(currentIterDate);
            const cell = document.createElement('div');
            cell.className = 'calendar-day-cell';
            cell.innerText = i;

            if (daysWithData.has(dateStr)) {
                cell.classList.add('has-data');
            }

            if (currentIterDate.getDate() === today.getDate() && currentIterDate.getMonth() === today.getMonth() && currentIterDate.getFullYear() === today.getFullYear()) {
                cell.classList.add('today-date');
            }

            if (currentIterDate.getDate() === selectedDateObj.getDate() && currentIterDate.getMonth() === selectedDateObj.getMonth() && currentIterDate.getFullYear() === selectedDateObj.getFullYear()) {
                cell.classList.add('active-date');
            }

            cell.addEventListener('click', () => {
                selectedDateObj = new Date(year, month, i);
                renderMonthCalendar();
                renderTimelineForDate(selectedDateObj);
            });

            calendarGrid.appendChild(cell);
        }
    }

    function renderTimelineForDate(dateObj) {
        const dateStr = Utils.getDateString(dateObj);
        
        // Update Title
        const today = new Date();
        if (dateObj.toDateString() === today.toDateString()) {
            selectedDateStrElem.innerText = "Today's Activities";
        } else {
            selectedDateStrElem.innerText = new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).format(dateObj);
        }

        const activities = Storage.getActivitiesByDate(dateStr);
        timelineContainer.innerHTML = '';
        
        const chartContainer = document.getElementById('calendar-charts-container');

        if (activities.length === 0) {
            chartContainer.style.display = 'none';
            timelineContainer.innerHTML = '<div class="empty-state">No activities recorded for this day.</div>';
        } else {
            // Render Chart
            chartContainer.style.display = 'block';
            renderDayChart(activities);

            const sorted = [...activities].sort((a, b) => a.timestamp - b.timestamp);

            sorted.forEach(act => {
                const cat = Storage.getCategoryById(act.categoryId);
                const timeStr = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: 'numeric' }).format(new Date(act.timestamp));
                
                const isProdClass = cat.isProductive ? 'cat-productive' : 'cat-non-productive';

                const item = document.createElement('div');
                item.className = 'timeline-item';
                item.style.cursor = 'pointer';
                item.title = "Click to Edit";
                item.onclick = () => window.openEditModal(act.id);
                item.style.borderLeft = `4px solid ${cat.color || 'var(--primary)'}`;
                
                item.innerHTML = `
                    <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom: 0.5rem;">
                        <div>
                            <h4 style="margin: 0; font-size: 1.1rem;">${act.name}</h4>
                            <span class="activity-category ${isProdClass}" style="margin-top: 0.25rem;">${cat.name}</span>
                        </div>
                        <div style="text-align: right;">
                            <span style="font-weight: 600;">${timeStr}</span>
                            <br>
                            <small style="color: var(--text-muted);">${Utils.formatDuration(act.durationMinutes)}</small>
                        </div>
                    </div>
                `;
                timelineContainer.appendChild(item);
            });
        }

        renderCalendarTodos(dateStr);
    }

    function renderCalendarTodos(dateStr) {
        const todosContainer = document.getElementById('calendar-todos-container');
        if (!todosContainer) return;
        
        todosContainer.innerHTML = '';
        const allTodos = Storage.getTodos();
        const completedToday = allTodos.filter(t => t.completedDates && t.completedDates.includes(dateStr));
        const pendingToday = allTodos.filter(t => t.dateString <= dateStr && !(t.completedDates && t.completedDates.includes(dateStr)));
        
        if (completedToday.length === 0 && pendingToday.length === 0) {
            todosContainer.innerHTML = '<div class="empty-state">No todos for this day.</div>';
            return;
        }
        
        const ul = document.createElement('ul');
        ul.className = 'todo-list';
        ul.style.marginTop = '0';
        
        // Render completed
        completedToday.forEach(t => {
            const li = document.createElement('li');
            li.style.display = 'flex';
            li.style.alignItems = 'center';
            li.style.gap = '0.5rem';
            li.style.padding = '0.5rem 0';
            li.style.borderBottom = '1px solid var(--border)';
            li.innerHTML = `
                <i class="fa-solid fa-check-circle" style="color: var(--success);"></i>
                <span style="text-decoration: line-through; color: var(--text-muted);">${t.text}</span>
            `;
            ul.appendChild(li);
        });
        
        // Render pending
        pendingToday.forEach(t => {
            const li = document.createElement('li');
            li.style.display = 'flex';
            li.style.alignItems = 'center';
            li.style.gap = '0.5rem';
            li.style.padding = '0.5rem 0';
            li.style.borderBottom = '1px solid var(--border)';
            li.innerHTML = `
                <i class="fa-regular fa-circle" style="color: var(--text-muted);"></i>
                <span style="color: var(--text-color);">${t.text}</span>
            `;
            ul.appendChild(li);
        });
        
        todosContainer.appendChild(ul);
    }

    function renderDayChart(activities) {
        const ctx = document.getElementById('calendarDayChart');
        if (!ctx) return;

        if (dayChartInstance) {
            dayChartInstance.destroy();
        }

        const categoryTotals = {};
        activities.forEach(act => {
            const cat = Storage.getCategoryById(act.categoryId);
            const catName = cat.name;
            if (!categoryTotals[catName]) {
                categoryTotals[catName] = { duration: 0, color: cat.color || '#9CA3AF' };
            }
            categoryTotals[catName].duration += act.durationMinutes;
        });

        const labels = Object.keys(categoryTotals);
        const data = labels.map(l => categoryTotals[l].duration);
        const colors = labels.map(l => categoryTotals[l].color);

        dayChartInstance = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: colors,
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { color: getComputedStyle(document.body).getPropertyValue('--text-color') || '#fff' }
                    }
                }
            }
        });
    }
});
