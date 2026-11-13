// js/todo.js
document.addEventListener("DOMContentLoaded", () => {
    const todoForm = document.getElementById('todo-form');
    const todoInput = document.getElementById('todo-input');
    const activeList = document.getElementById('active-todos-list');
    const completedList = document.getElementById('completed-todos-list');

    const DAYS_MAP = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    let activeFilter = 'Today';

    // Day Selection in Todo Form
    const dayButtons = document.querySelectorAll('#todo-form .day-btn');
    dayButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            btn.classList.toggle('active');
        });
    });

    // Filter Chips Row
    const filterChips = document.querySelectorAll('.todo-filter-container .filter-chip');
    filterChips.forEach(chip => {
        chip.addEventListener('click', () => {
            filterChips.forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            activeFilter = chip.getAttribute('data-filter');
            renderTodos();
        });
    });

    function getFilterDateString() {
        if (activeFilter === 'All' || activeFilter === 'Today') {
            return Utils.getTodayString();
        }
        
        // Find most recent date of the weekday matching activeFilter
        const targetDayIndex = DAYS_MAP.indexOf(activeFilter);
        if (targetDayIndex === -1) return Utils.getTodayString();

        const today = new Date();
        const todayIndex = today.getDay();
        
        let diff = todayIndex - targetDayIndex;
        if (diff < 0) {
            diff += 7;
        }
        
        const targetDate = new Date(today);
        targetDate.setDate(today.getDate() - diff);
        
        const yyyy = targetDate.getFullYear();
        const mm = String(targetDate.getMonth() + 1).padStart(2, '0');
        const dd = String(targetDate.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
    }

    // Render Todos
    function renderTodos() {
        const filterDateStr = getFilterDateString();
        const todos = Storage.getTodos(filterDateStr);
        
        activeList.innerHTML = '';
        completedList.innerHTML = '';

        const todayDayName = DAYS_MAP[new Date().getDay()];
        const filterDayName = activeFilter === 'Today' ? todayDayName : activeFilter;

        const filteredTodos = todos.filter(t => {
            const scheduledDays = t.daysOfWeek || [];
            
            if (activeFilter === 'All') return true;
            
            // If they didn't specify scheduled days, show on all days
            if (scheduledDays.length === 0) return true;
            
            // Otherwise, show only if scheduled on filterDayName
            return scheduledDays.includes(filterDayName);
        });

        const active = filteredTodos.filter(t => !t.completed);
        const completed = filteredTodos.filter(t => t.completed);

        if (active.length === 0) {
            activeList.innerHTML = `<li class="empty-state">No active tasks for ${activeFilter === 'Today' ? 'today' : activeFilter.toLowerCase()}.</li>`;
        } else {
            active.forEach(t => activeList.appendChild(createTodoElement(t)));
        }

        if (completed.length === 0) {
            completedList.innerHTML = '<li class="empty-state">No completed tasks yet.</li>';
        } else {
            completed.forEach(t => completedList.appendChild(createTodoElement(t)));
        }
    }

    function createTodoElement(todo) {
        const li = document.createElement('li');
        li.className = 'todo-item';
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = todo.completed;
        checkbox.className = 'todo-checkbox';
        checkbox.addEventListener('change', () => {
            const filterDateStr = getFilterDateString();
            const updatePayload = { 
                completed: checkbox.checked,
                completedDateString: filterDateStr
            };
            Storage.editTodo(todo.id, updatePayload);
        });

        const span = document.createElement('span');
        span.className = 'todo-text';
        span.style.flex = '1';
        
        const textNode = document.createElement('div');
        textNode.innerText = todo.text;
        if (todo.completed) textNode.style.textDecoration = 'line-through';
        span.appendChild(textNode);

        if (todo.daysOfWeek && todo.daysOfWeek.length > 0) {
            const sub = document.createElement('small');
            sub.style.display = 'block';
            sub.style.color = 'var(--text-muted)';
            sub.style.fontSize = '0.75rem';
            sub.style.marginTop = '0.2rem';
            
            const dayAbbrs = todo.daysOfWeek.map(d => d.substring(0, 3));
            sub.innerText = `Scheduled: ${dayAbbrs.join(', ')}`;
            span.appendChild(sub);
        }

        const actions = document.createElement('div');
        actions.className = 'todo-actions';
        actions.style.display = 'flex';
        actions.style.gap = '0.5rem';

        // Repeat next day button
        const repeatBtn = document.createElement('button');
        repeatBtn.className = 'icon-btn small';
        repeatBtn.title = "Repeat Next Day";
        repeatBtn.innerHTML = '<i class="fa-solid fa-clock-rotate-left"></i>';
        repeatBtn.addEventListener('click', () => {
            Storage.addTodo(todo.text, todo.daysOfWeek || []);
            alert("Task repeated!");
        });

        const delBtn = document.createElement('button');
        delBtn.className = 'icon-btn small danger-text';
        delBtn.innerHTML = '<i class="fa-solid fa-trash"></i>';
        delBtn.addEventListener('click', () => {
            if(confirm("Delete this task?")) {
                Storage.deleteTodo(todo.id);
            }
        });

        actions.appendChild(repeatBtn);
        actions.appendChild(delBtn);

        li.style.display = 'flex';
        li.style.alignItems = 'center';
        li.style.gap = '0.75rem';
        li.style.padding = '0.75rem';
        li.style.backgroundColor = 'var(--surface)';
        li.style.borderRadius = 'var(--radius-md)';
        li.style.marginBottom = '0.5rem';

        li.appendChild(checkbox);
        li.appendChild(span);
        li.appendChild(actions);

        return li;
    }

    // Add new Todo
    todoForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const text = todoInput.value.trim();
        if (text) {
            const selectedDays = [];
            dayButtons.forEach(btn => {
                if (btn.classList.contains('active')) {
                    selectedDays.push(btn.getAttribute('data-day'));
                }
            });

            Storage.addTodo(text, selectedDays);
            
            todoInput.value = '';
            dayButtons.forEach(btn => btn.classList.remove('active'));
        }
    });

    // Listen for changes
    document.addEventListener('todosChanged', renderTodos);
    document.addEventListener('dataChanged', renderTodos);
    document.addEventListener('viewChanged', (e) => {
        if (e.detail.viewId === 'view-todos') {
            renderTodos();
        }
    });

    // --- Daily Report Modal ---
    const btnDailyReport = document.getElementById('btn-daily-report');
    const reportModal = document.getElementById('daily-report-modal');
    const btnCloseReport = document.getElementById('btn-close-report');
    const reportContent = document.getElementById('daily-report-content');

    if (btnDailyReport && reportModal) {
        btnDailyReport.addEventListener('click', () => {
            renderDailyReport();
            reportModal.classList.remove('hidden');
        });

        btnCloseReport.addEventListener('click', () => {
            reportModal.classList.add('hidden');
        });

        reportModal.addEventListener('click', (e) => {
            if (e.target === reportModal) {
                reportModal.classList.add('hidden');
            }
        });
    }

    function renderDailyReport() {
        const todos = Storage.getTodos();
        
        reportContent.innerHTML = '';

        const groups = {};
        let hasAnyCompleted = false;

        todos.forEach(t => {
            if (t.completedDates && t.completedDates.length > 0) {
                t.completedDates.forEach(dateKey => {
                    if (!groups[dateKey]) groups[dateKey] = [];
                    groups[dateKey].push(t);
                    hasAnyCompleted = true;
                });
            }
        });

        if (!hasAnyCompleted) {
            reportContent.innerHTML = '<p class="empty-state">No completed tasks yet.</p>';
            return;
        }

        // Sort keys descending
        const sortedKeys = Object.keys(groups).sort((a, b) => {
            if (a === 'Unknown Date') return 1;
            if (b === 'Unknown Date') return -1;
            return b.localeCompare(a); // "2026-05-03" > "2026-05-02"
        });

        const todayStr = Utils.getTodayString();

        sortedKeys.forEach(date => {
            let displayDate = date;
            if (date === todayStr) {
                displayDate = 'Today';
            } else if (date !== 'Unknown Date') {
                const dateObj = new Date(date + 'T00:00:00');
                if (!isNaN(dateObj)) {
                    displayDate = dateObj.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
                }
            }

            const header = document.createElement('h4');
            header.style.marginTop = '1rem';
            header.style.marginBottom = '0.5rem';
            header.style.color = 'var(--primary)';
            header.innerText = displayDate;
            reportContent.appendChild(header);

            const ul = document.createElement('ul');
            ul.className = 'todo-list';
            
            groups[date].forEach(t => {
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

            reportContent.appendChild(ul);
        });
    }

    // Initial render
    renderTodos();
});
