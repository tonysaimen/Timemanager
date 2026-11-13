// js/storage.js
const Storage = {
    KEYS: {
        ACTIVITIES: 'tm_activities',
        CATEGORIES: 'tm_categories',
        SETTINGS: 'tm_settings',
        TODOS: 'tm_todos',
        ACTIVE_TIMER: 'tm_active_timer',
        STREAK: 'tm_streak'
    },

    DEFAULT_CATEGORIES: [
        { id: 'cat_study', name: 'Study', isProductive: true, color: '#4F46E5' },
        { id: 'cat_work', name: 'Work', isProductive: true, color: '#10B981' },
        { id: 'cat_fitness', name: 'Fitness', isProductive: true, color: '#F59E0B' },
        { id: 'cat_sleep', name: 'Sleep', isProductive: true, color: '#8B5CF6' },
        { id: 'cat_social', name: 'Social Media', isProductive: false, color: '#EF4444' },
        { id: 'cat_entertain', name: 'Entertainment', isProductive: false, color: '#EC4899' }
    ],

    DEFAULT_SETTINGS: {
        productiveGoalHours: 4
    },

    init: () => {
        if (!localStorage.getItem(Storage.KEYS.CATEGORIES)) {
            localStorage.setItem(Storage.KEYS.CATEGORIES, JSON.stringify(Storage.DEFAULT_CATEGORIES));
        }
        if (!localStorage.getItem(Storage.KEYS.ACTIVITIES)) {
            localStorage.setItem(Storage.KEYS.ACTIVITIES, JSON.stringify([]));
        }
        if (!localStorage.getItem(Storage.KEYS.SETTINGS)) {
            localStorage.setItem(Storage.KEYS.SETTINGS, JSON.stringify(Storage.DEFAULT_SETTINGS));
        }
        if (!localStorage.getItem(Storage.KEYS.TODOS)) {
            localStorage.setItem(Storage.KEYS.TODOS, JSON.stringify([]));
        }
        if (!localStorage.getItem(Storage.KEYS.STREAK)) {
            localStorage.setItem(Storage.KEYS.STREAK, JSON.stringify({
                currentStreak: 0,
                lastLoginDate: null,
                excusesRemaining: 3,
                lastExcuseMonth: new Date().toISOString().substring(0, 7)
            }));
        }
    },

    // --- Activities ---
    getActivities: () => {
        return JSON.parse(localStorage.getItem(Storage.KEYS.ACTIVITIES) || '[]');
    },
    
    addActivity: (activity) => {
        const activities = Storage.getActivities();
        const now = Date.now();
        const start = activity.startTime || activity.timestamp || now;
        const end = activity.endTime || (start + (activity.durationMinutes || 0) * 60000);

        // Ensures required fields are preset
        const newActivity = {
            id: activity.id || Utils.generateId(),
            name: activity.name || 'Unnamed Activity',
            categoryId: activity.categoryId,
            durationMinutes: activity.durationMinutes || 0,
            timestamp: start, // legacy support
            startTime: start,
            endTime: end,
            dateString: activity.dateString || Utils.getTodayString()
        };

        activities.push(newActivity);
        
        // Sort by timestamp descending
        activities.sort((a, b) => b.timestamp - a.timestamp);
        
        localStorage.setItem(Storage.KEYS.ACTIVITIES, JSON.stringify(activities));
        
        // Broadcast custom event that data changed
        document.dispatchEvent(new CustomEvent('activityAdded', { detail: newActivity }));
        document.dispatchEvent(new CustomEvent('dataChanged'));
    },

    editActivity: (id, updatedData) => {
        let activities = Storage.getActivities();
        const index = activities.findIndex(a => a.id === id);
        if (index !== -1) {
            // Update fields
            activities[index] = { ...activities[index], ...updatedData };
            
            // Recalculate end time just in case
            if (updatedData.durationMinutes !== undefined || updatedData.startTime !== undefined) {
                const start = activities[index].startTime || activities[index].timestamp;
                activities[index].endTime = start + (activities[index].durationMinutes * 60000);
            }

            activities.sort((a, b) => (b.startTime || b.timestamp) - (a.startTime || a.timestamp));
            localStorage.setItem(Storage.KEYS.ACTIVITIES, JSON.stringify(activities));
            document.dispatchEvent(new CustomEvent('dataChanged'));
        }
    },

    deleteActivity: (id) => {
        let activities = Storage.getActivities();
        activities = activities.filter(a => a.id !== id);
        localStorage.setItem(Storage.KEYS.ACTIVITIES, JSON.stringify(activities));
        document.dispatchEvent(new CustomEvent('dataChanged'));
    },

    // Get activities for specific date (YYYY-MM-DD)
    getActivitiesByDate: (dateString) => {
        const activities = Storage.getActivities();
        return activities.filter(a => a.dateString === dateString);
    },

    // --- Categories ---
    getCategories: () => {
        return JSON.parse(localStorage.getItem(Storage.KEYS.CATEGORIES) || '[]');
    },
    
    addCategory: (category) => {
        const categories = Storage.getCategories();
        categories.push(category);
        localStorage.setItem(Storage.KEYS.CATEGORIES, JSON.stringify(categories));
        document.dispatchEvent(new CustomEvent('categoryAdded', { detail: category }));
        document.dispatchEvent(new CustomEvent('dataChanged'));
    },
    
    deleteCategory: (id) => {
        let categories = Storage.getCategories();
        categories = categories.filter(c => c.id !== id);
        localStorage.setItem(Storage.KEYS.CATEGORIES, JSON.stringify(categories));
        document.dispatchEvent(new CustomEvent('dataChanged'));
    },

    getCategoryById: (id) => {
        const categories = Storage.getCategories();
        return categories.find(c => c.id === id) || { name: 'Unknown', isProductive: false, color: '#9CA3AF' };
    },

    // --- Settings ---
    getSettings: () => {
        return JSON.parse(localStorage.getItem(Storage.KEYS.SETTINGS) || JSON.stringify(Storage.DEFAULT_SETTINGS));
    },
    
    updateSettings: (newSettings) => {
        const current = Storage.getSettings();
        const updated = { ...current, ...newSettings };
        localStorage.setItem(Storage.KEYS.SETTINGS, JSON.stringify(updated));
        document.dispatchEvent(new CustomEvent('settingsChanged'));
        document.dispatchEvent(new CustomEvent('dataChanged'));
    },

    // --- Streak ---
    getStreakData: () => {
        return JSON.parse(localStorage.getItem(Storage.KEYS.STREAK));
    },

    updateStreakData: (data) => {
        localStorage.setItem(Storage.KEYS.STREAK, JSON.stringify(data));
        document.dispatchEvent(new CustomEvent('streakChanged'));
    },

    // --- Todos ---
    getTodos: (forDateString) => {
        const todos = JSON.parse(localStorage.getItem(Storage.KEYS.TODOS) || '[]');
        const todayStr = forDateString || Utils.getTodayString();
        return todos.map(t => {
            // Migrate old data structure
            if (t.completedDates === undefined) {
                t.completedDates = t.completed ? [t.completedDateString || t.dateString || todayStr] : [];
            }
            // Add dynamic completed property for today/filter date
            t.completed = t.completedDates.includes(todayStr);
            return t;
        });
    },
    
    addTodo: (todoText, daysOfWeek = []) => {
        const todos = Storage.getTodos();
        const newTodo = {
            id: Utils.generateId(),
            text: todoText,
            completed: false,
            completedDates: [],
            daysOfWeek: daysOfWeek,
            dateString: Utils.getTodayString()
        };
        todos.push(newTodo);
        localStorage.setItem(Storage.KEYS.TODOS, JSON.stringify(todos));
        document.dispatchEvent(new CustomEvent('todosChanged'));
    },

    editTodo: (id, updatedData) => {
        let todos = JSON.parse(localStorage.getItem(Storage.KEYS.TODOS) || '[]');
        const index = todos.findIndex(t => t.id === id);
        if (index !== -1) {
            let todo = todos[index];
            const targetDateStr = updatedData.completedDateString || Utils.getTodayString();

            if (todo.completedDates === undefined) {
                todo.completedDates = todo.completed ? [todo.completedDateString || todo.dateString || targetDateStr] : [];
            }
            
            if (updatedData.completed !== undefined) {
                if (updatedData.completed) {
                    if (!todo.completedDates.includes(targetDateStr)) {
                        todo.completedDates.push(targetDateStr);
                    }
                } else {
                    todo.completedDates = todo.completedDates.filter(d => d !== targetDateStr);
                }
            }
            
            // Apply other updates
            Object.keys(updatedData).forEach(key => {
                if (key !== 'completed' && key !== 'completedDateString') {
                    todo[key] = updatedData[key];
                }
            });

            // Update legacy fields based on today's state
            todo.completed = todo.completedDates.includes(targetDateStr);
            todo.completedDateString = todo.completed ? targetDateStr : null;

            todos[index] = todo;
            localStorage.setItem(Storage.KEYS.TODOS, JSON.stringify(todos));
            document.dispatchEvent(new CustomEvent('todosChanged'));
        }
    },

    deleteTodo: (id) => {
        let todos = JSON.parse(localStorage.getItem(Storage.KEYS.TODOS) || '[]');
        todos = todos.filter(t => t.id !== id);
        localStorage.setItem(Storage.KEYS.TODOS, JSON.stringify(todos));
        document.dispatchEvent(new CustomEvent('todosChanged'));
    },

    // --- Active Timer ---
    getActiveTimer: () => {
        const timerData = localStorage.getItem(Storage.KEYS.ACTIVE_TIMER);
        return timerData ? JSON.parse(timerData) : null;
    },

    setActiveTimer: (timerData) => {
        localStorage.setItem(Storage.KEYS.ACTIVE_TIMER, JSON.stringify(timerData));
    },

    clearActiveTimer: () => {
        localStorage.removeItem(Storage.KEYS.ACTIVE_TIMER);
    },

    // --- System ---
    clearAllData: () => {
        localStorage.removeItem(Storage.KEYS.ACTIVITIES);
        localStorage.removeItem(Storage.KEYS.CATEGORIES);
        localStorage.removeItem(Storage.KEYS.SETTINGS);
        Storage.init();
        document.dispatchEvent(new CustomEvent('dataChanged'));
    },

    // --- CSV Export/Import ---
    exportToCSV: () => {
        const activities = Storage.getActivities();
        // Headers: id, activity, category, duration, date, start_time, end_time
        const headers = ['id', 'activity', 'category', 'duration', 'date', 'start_time', 'end_time'];
        
        const escapeCSV = (str) => `"${String(str).replace(/"/g, '""')}"`;

        const rows = activities.map(act => {
            const cat = Storage.getCategoryById(act.categoryId);
            const startObj = new Date(act.startTime || act.timestamp);
            const endObj = new Date(act.endTime || (act.startTime || act.timestamp) + (act.durationMinutes * 60000));
            
            const startStr = startObj.toISOString();
            const endStr = endObj.toISOString();

            return [
                escapeCSV(act.id),
                escapeCSV(act.name),
                escapeCSV(cat ? cat.name : 'Unknown'),
                act.durationMinutes,
                escapeCSV(act.dateString),
                escapeCSV(startStr),
                escapeCSV(endStr)
            ].join(',');
        });

        const csvContent = headers.join(',') + '\n' + rows.join('\n');
        return csvContent;
    },

    importFromCSV: (csvText) => {
        if (!csvText || !csvText.trim()) return 0;
        const lines = csvText.trim().split('\n');
        if (lines.length < 2) return 0; // Only headers or empty

        // Basic CSV parse 
        const parseRegex = /(?:"([^"]*(?:""[^"]*)*)"|([^,"]*))(?:,|$)/g;
        const parseRow = (line) => {
            const row = [];
            let m;
            while (m = parseRegex.exec(line)) {
                if (m[1] !== undefined) row.push(m[1].replace(/""/g, '"'));
                else if (m[2] !== undefined) row.push(m[2]);
                if (m.index === parseRegex.lastIndex) parseRegex.lastIndex++;
                if (m[0].length === 0 && line.length > 0) break;
            }
            return row;
        };

        const headers = parseRow(lines[0]).map(h => h.trim().toLowerCase());
        const idIdx = headers.indexOf('id');
        const nameIdx = headers.indexOf('activity');
        const catIdx = headers.indexOf('category');
        const durIdx = headers.indexOf('duration');
        const dateIdx = headers.indexOf('date');
        const startIdx = headers.indexOf('start_time');
        const endIdx = headers.indexOf('end_time');

        if (nameIdx === -1 || durIdx === -1) return 0; // Minimum required columns missing

        let importCount = 0;
        let currentActivities = Storage.getActivities();
        const categories = Storage.getCategories();

        for (let i = 1; i < lines.length; i++) {
            const row = parseRow(lines[i]);
            if (row.length < 2) continue;

            const activityName = row[nameIdx];
            if (!activityName) continue;

            // Resolve Category
            let categoryName = catIdx !== -1 ? row[catIdx] : 'Imported';
            let catRecord = categories.find(c => c.name.toLowerCase() === categoryName.toLowerCase());
            if (!catRecord) {
                catRecord = {
                    id: Utils.generateId(),
                    name: categoryName,
                    isProductive: false,
                    color: `#9CA3AF`
                };
                Storage.addCategory(catRecord);
                categories.push(catRecord);
            }

            const importedId = (idIdx !== -1 && row[idIdx]) ? row[idIdx] : Utils.generateId();
            const durationObj = (durIdx !== -1 && row[durIdx]) ? parseInt(row[durIdx], 10) : 0;
            const startTimeObj = (startIdx !== -1 && row[startIdx]) ? new Date(row[startIdx]).getTime() : Date.now();
            const endTimeObj = (endIdx !== -1 && row[endIdx]) ? new Date(row[endIdx]).getTime() : (startTimeObj + durationObj * 60000);
            const dateStrObj = (dateIdx !== -1 && row[dateIdx]) ? row[dateIdx] : Utils.getTodayString();

            // Prevent duplicates if ID already exists
            const existIdx = currentActivities.findIndex(a => a.id === importedId);
            const actRecord = {
                id: importedId,
                name: activityName,
                categoryId: catRecord.id,
                durationMinutes: durationObj,
                timestamp: startTimeObj,
                startTime: startTimeObj,
                endTime: endTimeObj,
                dateString: dateStrObj
            };

            if (existIdx !== -1) {
                currentActivities[existIdx] = actRecord;
            } else {
                currentActivities.push(actRecord);
            }
            importCount++;
        }

        currentActivities.sort((a, b) => (b.startTime || b.timestamp) - (a.startTime || a.timestamp));
        localStorage.setItem(Storage.KEYS.ACTIVITIES, JSON.stringify(currentActivities));
        document.dispatchEvent(new CustomEvent('dataChanged'));
        return importCount;
    },

    exportBackupJSON: () => {
        return {
            activities: Storage.getActivities(),
            categories: Storage.getCategories(),
            todos: JSON.parse(localStorage.getItem(Storage.KEYS.TODOS) || '[]'),
            settings: Storage.getSettings(),
            streak: Storage.getStreakData()
        };
    },

    importBackupJSON: (backupData) => {
        if (!backupData) return false;
        
        if (backupData.categories && Array.isArray(backupData.categories)) {
            localStorage.setItem(Storage.KEYS.CATEGORIES, JSON.stringify(backupData.categories));
        }
        if (backupData.activities && Array.isArray(backupData.activities)) {
            localStorage.setItem(Storage.KEYS.ACTIVITIES, JSON.stringify(backupData.activities));
        }
        if (backupData.todos && Array.isArray(backupData.todos)) {
            localStorage.setItem(Storage.KEYS.TODOS, JSON.stringify(backupData.todos));
        }
        if (backupData.settings && typeof backupData.settings === 'object') {
            localStorage.setItem(Storage.KEYS.SETTINGS, JSON.stringify(backupData.settings));
        }
        if (backupData.streak && typeof backupData.streak === 'object') {
            localStorage.setItem(Storage.KEYS.STREAK, JSON.stringify(backupData.streak));
        }
        
        // Dispatch events to update UI
        document.dispatchEvent(new CustomEvent('dataChanged'));
        document.dispatchEvent(new CustomEvent('todosChanged'));
        document.dispatchEvent(new CustomEvent('settingsChanged'));
        document.dispatchEvent(new CustomEvent('streakChanged'));
        return true;
    },

    exportToExcel: () => {
        const activities = Storage.getActivities();
        const categories = Storage.getCategories();
        const todos = Storage.getTodos();

        const activitiesSheetData = activities.map(act => {
            const cat = Storage.getCategoryById(act.categoryId);
            const startObj = new Date(act.startTime || act.timestamp);
            const endObj = new Date(act.endTime || (act.startTime || act.timestamp) + (act.durationMinutes * 60000));
            return {
                'Activity ID': act.id,
                'Activity Name': act.name,
                'Category': cat ? cat.name : 'Unknown',
                'Is Productive': cat ? (cat.isProductive ? 'Yes' : 'No') : 'No',
                'Duration (Minutes)': act.durationMinutes,
                'Date': act.dateString,
                'Start Time': startObj.toLocaleString(),
                'End Time': endObj.toLocaleString()
            };
        });

        const categoriesSheetData = categories.map(cat => ({
            'Category ID': cat.id,
            'Category Name': cat.name,
            'Is Productive': cat.isProductive ? 'Yes' : 'No',
            'Color Code': cat.color
        }));

        const todosSheetData = todos.map(todo => ({
            'Todo ID': todo.id,
            'Todo Text': todo.text,
            'Completed': todo.completed ? 'Yes' : 'No',
            'Completed Dates': (todo.completedDates || []).join(', '),
            'Date Created': todo.dateString
        }));

        const wb = XLSX.utils.book_new();
        const ws_activities = XLSX.utils.json_to_sheet(activitiesSheetData);
        const ws_categories = XLSX.utils.json_to_sheet(categoriesSheetData);
        const ws_todos = XLSX.utils.json_to_sheet(todosSheetData);

        XLSX.utils.book_append_sheet(wb, ws_activities, "Activities");
        XLSX.utils.book_append_sheet(wb, ws_categories, "Categories");
        XLSX.utils.book_append_sheet(wb, ws_todos, "Todos");

        return XLSX.write(wb, { bookType: 'xlsx', type: 'base64' });
    }
};

// Initialize right away
Storage.init();
