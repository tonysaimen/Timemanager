// js/notifications.js
document.addEventListener("DOMContentLoaded", async () => {
    let notificationsEnabled = Storage.getSettings().notificationsEnabled || false;
    const toggleNotifications = document.getElementById('toggle-notifications');
    
    if (toggleNotifications) {
        toggleNotifications.checked = notificationsEnabled;
        toggleNotifications.addEventListener('change', (e) => {
            notificationsEnabled = e.target.checked;
            Storage.updateSettings({ notificationsEnabled });
            manageNotifications(notificationsEnabled);
        });
    }
    
    // Ensure plugin availability
    if (window.Capacitor && window.Capacitor.isNativePlatform()) {
        const { LocalNotifications } = Capacitor.Plugins;
        
        async function requestPermissionsIfneeded() {
            let permStatus = await LocalNotifications.checkPermissions();
            if (permStatus.display !== 'granted') {
                permStatus = await LocalNotifications.requestPermissions();
            }
            return permStatus.display === 'granted';
        }

        async function manageNotifications(enable) {
            const hasPermissions = await requestPermissionsIfneeded();
            if (!hasPermissions) {
                console.log("No notification permissions");
                if (toggleNotifications) toggleNotifications.checked = false;
                Storage.updateSettings({ notificationsEnabled: false });
                return;
            }

            if (enable) {
                // Schedule daily reminder at 20:00 (8:00 PM)
                await LocalNotifications.schedule({
                    notifications: [
                        {
                            title: 'Time Manager',
                            body: "Don't forget to log your time today! Check your daily goals.",
                            id: 100,
                            schedule: {
                                allowWhileIdle: true,
                                on: { hour: 20, minute: 0 }
                            }
                        }
                    ]
                });
                console.log("Daily notification scheduled at 20:00");
            } else {
                // Cancel scheduled notification
                await LocalNotifications.cancel({ notifications: [{ id: 100 }] });
                console.log("Notifications cancelled");
            }
        }
        
        window.AppNotifications = {
            createTimerChannel: async () => {
                const hasPermissions = await requestPermissionsIfneeded();
                if (!hasPermissions) return;
                try {
                    await LocalNotifications.createChannel({
                        id: 'timer_status',
                        name: 'Timer Status',
                        description: 'Ongoing timer updates',
                        importance: 2, // Low importance = no sound/vibration
                        vibration: false
                    });
                } catch (e) {
                    console.log("Channel creation not supported or failed", e);
                }
            },
            showTimerNotification: async (activityName, timeStr = "") => {
                const hasPermissions = await requestPermissionsIfneeded();
                if (!hasPermissions) return;
                
                let bodyText = `Tracking time for: ${activityName}`;
                if (timeStr) {
                    bodyText += ` - ${timeStr}`;
                }

                await LocalNotifications.schedule({
                    notifications: [{
                        title: 'Timer Running',
                        body: bodyText,
                        id: 200,
                        ongoing: true,
                        autoCancel: false,
                        channelId: 'timer_status'
                    }]
                });
            },
            clearTimerNotification: async () => {
                await LocalNotifications.cancel({ notifications: [{ id: 200 }] });
            },
            showStreakNotification: async (streak) => {
                const hasPermissions = await requestPermissionsIfneeded();
                if (!hasPermissions) return;
                
                await LocalNotifications.schedule({
                    notifications: [{
                        title: 'Streak Maintained! 🔥',
                        body: `You are on a ${streak} day streak! Keep it going!`,
                        id: 300,
                        autoCancel: true
                    }]
                });
            }
        };

        // Create the channel right away
        window.AppNotifications.createTimerChannel();

        // Initial setup
        if (notificationsEnabled) {
            manageNotifications(true);
        }
    }
});
