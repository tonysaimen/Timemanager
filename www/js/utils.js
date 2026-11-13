// js/utils.js
const Utils = {
    generateId: () => {
        return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
    },
    
    // Format minutes to "Xh Ym"
    formatDuration: (totalMinutes) => {
        const h = Math.floor(totalMinutes / 60);
        const m = totalMinutes % 60;
        if (h === 0) return `${m}m`;
        if (m === 0) return `${h}h`;
        return `${h}h ${m}m`;
    },

    // Get current date string YYYY-MM-DD
    getTodayString: () => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    },

    getDateString: (date) => {
        const d = new Date(date);
        return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    },

    // Format JS Date to YYYY-MM-DDTHH:MM for datetime-local input
    formatDatetimeLocal: (date) => {
        const d = new Date(date);
        d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
        return d.toISOString().slice(0,16);
    },

    // Check if timestamp is today
    isToday: (timestamp) => {
        const d = new Date(timestamp);
        const today = new Date();
        return d.getDate() === today.getDate() &&
               d.getMonth() === today.getMonth() &&
               d.getFullYear() === today.getFullYear();
    },
    
    // Get start of day timestamp
    getStartOfDay: (dateString = null) => {
        const d = dateString ? new Date(dateString) : new Date();
        d.setHours(0, 0, 0, 0);
        return d.getTime();
    },

    // Simple time formatter HH:MM:SS for timer
    formatTimeHHMMSS: (totalSeconds) => {
        const h = Math.floor(totalSeconds / 3600);
        const m = Math.floor((totalSeconds % 3600) / 60);
        const s = totalSeconds % 60;
        return [
            h.toString().padStart(2, '0'),
            m.toString().padStart(2, '0'),
            s.toString().padStart(2, '0')
        ].join(':');
    }
};
