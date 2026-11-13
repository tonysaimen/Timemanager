// js/reports.js
document.addEventListener("DOMContentLoaded", () => {
    let pieChartInstance = null;
    let barChartInstance = null;
    let todoChartInstance = null;
    let currentPeriod = 'today'; // 'today', 'weekly', 'monthly'

    // Tab buttons
    const btnToday = document.getElementById('report-tab-today');
    const btnWeekly = document.getElementById('report-tab-weekly');
    const btnMonthly = document.getElementById('report-tab-monthly');

    const breakdownTitle = document.getElementById('breakdown-chart-title');
    const trendTitle = document.getElementById('trend-chart-title');
    const todoTitle = document.getElementById('todo-chart-title');

    // Click Event Listeners
    if (btnToday && btnWeekly && btnMonthly) {
        btnToday.addEventListener('click', () => setPeriod('today'));
        btnWeekly.addEventListener('click', () => setPeriod('weekly'));
        btnMonthly.addEventListener('click', () => setPeriod('monthly'));
    }

    function setPeriod(period) {
        currentPeriod = period;
        [btnToday, btnWeekly, btnMonthly].forEach(btn => btn.classList.remove('active'));
        
        if (period === 'today') {
            btnToday.classList.add('active');
            if (breakdownTitle) breakdownTitle.innerText = "Today's Breakdowns";
            if (trendTitle) trendTitle.innerText = "Weekly Trend";
            if (todoTitle) todoTitle.innerText = "Completed Tasks Trend (7 Days)";
        } else if (period === 'weekly') {
            btnWeekly.classList.add('active');
            if (breakdownTitle) breakdownTitle.innerText = "Weekly Breakdowns";
            if (trendTitle) trendTitle.innerText = "Weekly Trend";
            if (todoTitle) todoTitle.innerText = "Completed Tasks Trend (7 Days)";
        } else if (period === 'monthly') {
            btnMonthly.classList.add('active');
            if (breakdownTitle) breakdownTitle.innerText = "Monthly Breakdowns";
            if (trendTitle) trendTitle.innerText = "Monthly Trend";
            if (todoTitle) todoTitle.innerText = "Completed Tasks Trend (30 Days)";
        }
        renderCharts();
    }

    // Listeners
    document.addEventListener('dataChanged', renderCharts);
    document.addEventListener('themeChanged', renderCharts);
    document.addEventListener('viewChanged', (e) => {
        if (e.detail.viewId === 'view-reports') {
            renderCharts();
        }
    });

    function getChartTheme() {
        const isDark = document.body.getAttribute('data-theme') === 'dark';
        return {
            textColor: isDark ? '#F9FAFB' : '#1F2937',
            gridColor: isDark ? '#374151' : '#E5E7EB'
        };
    }

    function getLastNDays(n) {
        const dates = [];
        for (let i = n - 1; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            dates.push(Utils.getDateString(d));
        }
        return dates;
    }

    function renderCharts() {
        // Only render if view is active or they exist
        if (!document.getElementById('view-reports').classList.contains('active') && !pieChartInstance) {
            return;
        }

        const theme = getChartTheme();
        Chart.defaults.color = theme.textColor;
        Chart.defaults.font.family = "'Outfit', sans-serif";

        renderPieChart();
        renderBarChart(theme);
        renderTodoChart(theme);
        renderCompletedTodoList();
    }

    function renderPieChart() {
        const ctx = document.getElementById('categoryPieChart').getContext('2d');
        const categories = Storage.getCategories();
        
        let targetDates = [];
        if (currentPeriod === 'today') {
            targetDates = [Utils.getTodayString()];
        } else if (currentPeriod === 'weekly') {
            targetDates = getLastNDays(7);
        } else if (currentPeriod === 'monthly') {
            targetDates = getLastNDays(30);
        }

        const catData = {};
        
        // Aggregate durations by category over all target dates
        targetDates.forEach(dateStr => {
            const activities = Storage.getActivitiesByDate(dateStr);
            activities.forEach(act => {
                if (!catData[act.categoryId]) {
                    catData[act.categoryId] = 0;
                }
                catData[act.categoryId] += act.durationMinutes;
            });
        });

        const labels = [];
        const data = [];
        const bgColors = [];

        Object.keys(catData).forEach(catId => {
            const catInfo = Storage.getCategoryById(catId);
            labels.push(catInfo.name);
            data.push(catData[catId]);
            bgColors.push(catInfo.color || '#9CA3AF');
        });

        if (pieChartInstance) {
            pieChartInstance.destroy();
        }

        if (data.length === 0) {
            // Show empty state
            labels.push("No Data");
            data.push(1);
            bgColors.push(document.body.getAttribute('data-theme') === 'dark' ? '#374151' : '#E5E7EB');
        }

        pieChartInstance = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: bgColors,
                    borderWidth: 0,
                    hoverOffset: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { padding: 20 }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                if (context.label === "No Data") return " No activities tracked";
                                const val = context.raw;
                                return ` ${context.label}: ${Utils.formatDuration(val)}`;
                            }
                        }
                    }
                }
            }
        });
    }

    function renderBarChart(theme) {
        const ctx = document.getElementById('weeklyBarChart').getContext('2d');
        
        const numDays = currentPeriod === 'monthly' ? 30 : 7;
        const targetDates = getLastNDays(numDays);
        
        const labels = [];
        const prodData = [];
        const nonProdData = [];

        targetDates.forEach(dateStr => {
            // Generate label: e.g. "Mon" or "15" for 30 days
            const d = new Date(dateStr + 'T00:00:00');
            let label = '';
            if (numDays === 30) {
                label = d.getDate(); // Just day of month for brevity
            } else {
                label = new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(d);
            }
            labels.push(label);

            const activities = Storage.getActivitiesByDate(dateStr);
            let p = 0;
            let np = 0;

            activities.forEach(act => {
                const cat = Storage.getCategoryById(act.categoryId);
                if (cat.isProductive) p += act.durationMinutes;
                else np += act.durationMinutes;
            });

            prodData.push(p / 60); // In hours
            nonProdData.push(np / 60);
        });

        if (barChartInstance) {
            barChartInstance.destroy();
        }

        const isDark = document.body.getAttribute('data-theme') === 'dark';
        const prodColor = isDark ? '#34D399' : '#10B981';
        const nonProdColor = isDark ? '#F87171' : '#EF4444';

        barChartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Productive (h)',
                        data: prodData,
                        backgroundColor: prodColor,
                        borderRadius: 4
                    },
                    {
                        label: 'Other (h)',
                        data: nonProdData,
                        backgroundColor: nonProdColor,
                        borderRadius: 4
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        stacked: true,
                        grid: { display: false }
                    },
                    y: {
                        stacked: true,
                        grid: { color: theme.gridColor },
                        beginAtZero: true
                    }
                },
                plugins: {
                    legend: { position: 'top' },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return ` ${context.dataset.label}: ${context.raw.toFixed(1)}h`;
                            }
                        }
                    }
                }
            }
        });
    }

    function renderTodoChart(theme) {
        const ctx = document.getElementById('todoBarChart').getContext('2d');
        
        const numDays = currentPeriod === 'monthly' ? 30 : 7;
        const targetDates = getLastNDays(numDays);
        
        const labels = [];
        const todoCounts = [];
        const allTodos = Storage.getTodos();

        targetDates.forEach(dateStr => {
            const d = new Date(dateStr + 'T00:00:00');
            let label = '';
            if (numDays === 30) {
                label = d.getDate();
            } else {
                label = new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(d);
            }
            labels.push(label);

            // Count completed on this date
            const count = allTodos.filter(t => t.completedDates && t.completedDates.includes(dateStr)).length;
            todoCounts.push(count);
        });

        if (todoChartInstance) {
            todoChartInstance.destroy();
        }

        const isDark = document.body.getAttribute('data-theme') === 'dark';
        const todoColor = isDark ? '#60A5FA' : '#2563EB';

        todoChartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Completed Tasks',
                        data: todoCounts,
                        backgroundColor: todoColor,
                        borderRadius: 4
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        grid: { display: false }
                    },
                    y: {
                        grid: { color: theme.gridColor },
                        beginAtZero: true,
                        ticks: { stepSize: 1 }
                    }
                },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return ` Completed: ${context.raw} task(s)`;
                            }
                        }
                    }
                }
            }
        });
    }

    function renderCompletedTodoList() {
        const listContainer = document.getElementById('reports-completed-todos-list');
        if (!listContainer) return;

        listContainer.innerHTML = '';
        
        const numDays = currentPeriod === 'today' ? 1 : (currentPeriod === 'weekly' ? 7 : 30);
        const periodDates = getLastNDays(numDays);
        
        const allTodos = Storage.getTodos();
        const completedInPeriod = [];

        allTodos.forEach(t => {
            if (t.completedDates) {
                t.completedDates.forEach(dateStr => {
                    if (periodDates.includes(dateStr)) {
                        completedInPeriod.push({
                            text: t.text,
                            date: dateStr
                        });
                    }
                });
            }
        });

        // Sort descending by date
        completedInPeriod.sort((a, b) => b.date.localeCompare(a.date));

        if (completedInPeriod.length === 0) {
            listContainer.innerHTML = '<li class="empty-state" style="padding: 1rem 0; text-align: center;">No tasks completed in this period.</li>';
            return;
        }

        completedInPeriod.forEach(item => {
            const li = document.createElement('li');
            li.style.display = 'flex';
            li.style.alignItems = 'center';
            li.style.justifyContent = 'space-between';
            li.style.padding = '0.75rem 0';
            li.style.borderBottom = '1px solid var(--border-color)';
            
            const leftDiv = document.createElement('div');
            leftDiv.style.display = 'flex';
            leftDiv.style.alignItems = 'center';
            leftDiv.style.gap = '0.75rem';
            leftDiv.innerHTML = `
                <i class="fa-solid fa-check-circle" style="color: var(--secondary);"></i>
                <span style="text-decoration: line-through; color: var(--text-muted);">${item.text}</span>
            `;
            
            const dateSpan = document.createElement('span');
            dateSpan.style.fontSize = '0.8rem';
            dateSpan.style.color = 'var(--text-muted)';
            dateSpan.style.backgroundColor = 'var(--bg-color)';
            dateSpan.style.padding = '0.2rem 0.5rem';
            dateSpan.style.borderRadius = 'var(--radius-md)';
            
            const todayStr = Utils.getTodayString();
            if (item.date === todayStr) {
                dateSpan.innerText = 'Today';
            } else {
                const dateObj = new Date(item.date + 'T00:00:00');
                if (!isNaN(dateObj)) {
                    dateSpan.innerText = dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                } else {
                    dateSpan.innerText = item.date;
                }
            }
            
            li.appendChild(leftDiv);
            li.appendChild(dateSpan);
            listContainer.appendChild(li);
        });
    }
});
