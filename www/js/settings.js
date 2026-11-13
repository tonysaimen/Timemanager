// js/settings.js
document.addEventListener("DOMContentLoaded", () => {
    const categoryList = document.getElementById('settings-category-list');
    const newCatName = document.getElementById('new-category-name');
    const newCatProd = document.getElementById('new-category-productive');
    const btnAddCat = document.getElementById('btn-add-category');
    
    const goalHours = document.getElementById('goal-productive-hours');
    const btnSaveGoals = document.getElementById('btn-save-goals');
    const btnClearData = document.getElementById('btn-clear-data');

    const btnExportCSV = document.getElementById('btn-export-csv');
    const inputImportCSV = document.getElementById('import-csv-file');
    const dataMsg = document.getElementById('data-msg');

    // Init
    renderSettings();

    // Listeners
    document.addEventListener('dataChanged', renderSettings);

    function renderSettings() {
        // Render Categories
        const categories = Storage.getCategories();
        categoryList.innerHTML = '';
        
        categories.forEach(cat => {
            const isProdText = cat.isProductive ? '<span style="color:var(--secondary); font-size: 0.8rem;">Productive</span>' : '<span style="color:var(--danger); font-size: 0.8rem;">Other</span>';
            const li = document.createElement('li');
            
            // Generate a random pastel color for new categories UI if it doesn't have one
            const colorDot = `<span style="display:inline-block; width:10px; height:10px; background-color:${cat.color || 'var(--primary)'}; border-radius:50%; margin-right:8px;"></span>`;

            li.innerHTML = `
                <div style="display:flex; align-items:center;">
                    ${colorDot}
                    <span>${cat.name} <br> ${isProdText}</span>
                </div>
            `;
            
            // Don't allow deleting default categories easily, or allow it all, string starts with 'cat_' are defaults
            if (!cat.id.startsWith('cat_')) {
                const delBtn = document.createElement('button');
                delBtn.className = 'btn-delete-cat';
                delBtn.innerHTML = '<i class="fa-solid fa-trash"></i>';
                delBtn.onclick = () => {
                    if (confirm(`Delete category "${cat.name}"?`)) {
                        Storage.deleteCategory(cat.id);
                    }
                };
                li.appendChild(delBtn);
            } else {
                const defSpan = document.createElement('span');
                defSpan.style.fontSize = '0.8rem';
                defSpan.style.color = 'var(--text-muted)';
                defSpan.innerText = 'Default';
                li.appendChild(defSpan);
            }

            categoryList.appendChild(li);
        });

        // Render Settings
        const settings = Storage.getSettings();
        goalHours.value = settings.productiveGoalHours;
    }

    // Add Category
    btnAddCat.addEventListener('click', () => {
        const name = newCatName.value.trim();
        if (!name) {
            alert('Please enter a category name');
            return;
        }

        // Generate random color
        const randomColor = `hsl(${Math.floor(Math.random() * 360)}, 70%, 60%)`;

        Storage.addCategory({
            id: Utils.generateId(),
            name: name,
            isProductive: newCatProd.checked,
            color: randomColor
        });

        newCatName.value = '';
        newCatProd.checked = false;
        alert('Category added!');
    });

    // Save Goals
    btnSaveGoals.addEventListener('click', () => {
        const hours = parseFloat(goalHours.value);
        if (isNaN(hours) || hours <= 0) {
            alert('Please enter a valid goal in hours.');
            return;
        }

        Storage.updateSettings({
            productiveGoalHours: hours
        });
        alert('Goals saved successfully!');
    });

    // Export CSV
    btnExportCSV.addEventListener('click', async () => {
        try {
            const csvContent = Storage.exportToCSV();
            const filename = `TimeManager_Export_${Utils.getTodayString()}.csv`;

            if (window.Capacitor && window.Capacitor.isNativePlatform()) {
                const { Filesystem, Directory, Encoding } = Capacitor.Plugins;
                const { Share } = Capacitor.Plugins;

                let permStatus = await Filesystem.checkPermissions();
                if (permStatus.publicStorage !== 'granted') {
                    permStatus = await Filesystem.requestPermissions();
                }
                
                if (permStatus.publicStorage !== 'granted') {
                    alert('Storage permission is required to export data on this device.');
                    return;
                }

                // Write file to Cache directory
                const result = await Filesystem.writeFile({
                    path: filename,
                    data: csvContent,
                    directory: Directory.Cache,
                    encoding: Encoding.UTF8
                });

                showDataMsg('CSV ready to share');

                // Share or open file
                await Share.share({
                    title: 'Time Manager Data',
                    text: 'Here is my exported time tracking data.',
                    url: result.uri,
                    dialogTitle: 'Share CSV Data'
                });
            } else {
                // Fallback for Web
                const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                const link = document.createElement('a');
                if (link.download !== undefined) {
                    link.setAttribute('href', URL.createObjectURL(blob));
                    link.setAttribute('download', filename);
                    link.style.visibility = 'hidden';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    showDataMsg('Data exported successfully!');
                }
            }
        } catch (e) {
            console.error('Export failed', e);
            alert('Failed to export. Please ensure storage permissions are granted.');
        }
    });

    // Import CSV
    inputImportCSV.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function(e) {
            const contents = e.target.result;
            const count = Storage.importFromCSV(contents);
            if (count > 0) {
                showDataMsg(`Successfully imported ${count} activities!`);
            } else {
                alert('Failed to import data or no valid activities found. Please check CSV format.');
            }
        };
        reader.readAsText(file);
        inputImportCSV.value = '';
    });

    // Export Excel
    const btnExportExcel = document.getElementById('btn-export-excel');
    if (btnExportExcel) {
        btnExportExcel.addEventListener('click', async () => {
            try {
                const base64Data = Storage.exportToExcel();
                const filename = `TimeManager_Export_${Utils.getTodayString()}.xlsx`;

                if (window.Capacitor && window.Capacitor.isNativePlatform()) {
                    const { Filesystem, Directory } = Capacitor.Plugins;
                    const { Share } = Capacitor.Plugins;

                    let permStatus = await Filesystem.checkPermissions();
                    if (permStatus.publicStorage !== 'granted') {
                        permStatus = await Filesystem.requestPermissions();
                    }
                    
                    if (permStatus.publicStorage !== 'granted') {
                        alert('Storage permission is required to export data on this device.');
                        return;
                    }

                    const result = await Filesystem.writeFile({
                        path: filename,
                        data: base64Data,
                        directory: Directory.Cache
                    });

                    showDataMsg('Excel ready to share');

                    await Share.share({
                        title: 'Time Manager Data',
                        text: 'Here is my exported time tracking Excel spreadsheet.',
                        url: result.uri,
                        dialogTitle: 'Share Excel Data'
                    });
                } else {
                    // Web Fallback
                    const binaryStr = atob(base64Data);
                    const len = binaryStr.length;
                    const bytes = new Uint8Array(len);
                    for (let i = 0; i < len; i++) {
                        bytes[i] = binaryStr.charCodeAt(i);
                    }
                    const blob = new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
                    const link = document.createElement('a');
                    if (link.download !== undefined) {
                        link.setAttribute('href', URL.createObjectURL(blob));
                        link.setAttribute('download', filename);
                        link.style.visibility = 'hidden';
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        showDataMsg('Excel exported successfully!');
                    }
                }
            } catch (e) {
                console.error('Excel Export failed', e);
                alert('Failed to export Excel spreadsheet.');
            }
        });
    }

    // Google Drive Sync Integration
    const inputClientId = document.getElementById('gdrive-client-id');
    const statusDot = document.getElementById('gdrive-status-dot');
    const statusText = document.getElementById('gdrive-status-text');
    const btnConnect = document.getElementById('btn-gdrive-connect');
    const btnDisconnect = document.getElementById('btn-gdrive-disconnect');
    const gdriveActions = document.getElementById('gdrive-actions');
    const btnBackup = document.getElementById('btn-gdrive-backup');
    const btnRestore = document.getElementById('btn-gdrive-restore');

    let tokenClient = null;
    let oauthToken = localStorage.getItem('tm_gdrive_token') || null;
    let oauthTokenExpiry = parseInt(localStorage.getItem('tm_gdrive_token_expiry') || '0', 10);

    // Load saved Client ID
    const savedClientId = localStorage.getItem('tm_gdrive_client_id') || '';
    if (inputClientId && savedClientId) {
        inputClientId.value = savedClientId;
    }

    // Save Client ID when changed
    if (inputClientId) {
        inputClientId.addEventListener('input', () => {
            localStorage.setItem('tm_gdrive_client_id', inputClientId.value.trim());
        });
    }

    function updateGDriveUI() {
        const isConnected = oauthToken && oauthTokenExpiry > Date.now();
        if (isConnected) {
            if (statusDot) statusDot.className = 'status-dot status-connected';
            if (statusText) statusText.innerText = 'Connected';
            if (btnConnect) btnConnect.style.display = 'none';
            if (btnDisconnect) btnDisconnect.style.display = 'block';
            if (gdriveActions) gdriveActions.style.display = 'flex';
        } else {
            const clientIdVal = inputClientId ? inputClientId.value.trim() : '';
            if (clientIdVal) {
                if (statusDot) statusDot.className = 'status-dot status-pending';
                if (statusText) statusText.innerText = 'Ready to Connect';
            } else {
                if (statusDot) statusDot.className = 'status-dot status-disconnected';
                if (statusText) statusText.innerText = 'Missing Client ID';
            }
            if (btnConnect) btnConnect.style.display = 'block';
            if (btnDisconnect) btnDisconnect.style.display = 'none';
            if (gdriveActions) gdriveActions.style.display = 'none';
        }
    }

    if (inputClientId) {
        inputClientId.addEventListener('change', updateGDriveUI);
    }

    function requestGoogleToken() {
        const clientId = inputClientId.value.trim();
        if (!clientId) {
            alert('Please enter a Google Client ID first.');
            return;
        }

        if (!window.google || !window.google.accounts || !window.google.accounts.oauth2) {
            alert('Google Identity Services client library is still loading. Please try again in a moment.');
            return;
        }

        tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: clientId,
            scope: 'https://www.googleapis.com/auth/drive.file',
            callback: (response) => {
                if (response.error) {
                    alert('Authentication failed: ' + response.error);
                    return;
                }
                oauthToken = response.access_token;
                oauthTokenExpiry = Date.now() + (response.expires_in * 1000);
                
                localStorage.setItem('tm_gdrive_token', oauthToken);
                localStorage.setItem('tm_gdrive_token_expiry', oauthTokenExpiry.toString());
                
                updateGDriveUI();
                alert('Successfully connected to Google Drive!');
            }
        });

        tokenClient.requestAccessToken();
    }

    if (btnConnect) {
        btnConnect.addEventListener('click', requestGoogleToken);
    }

    if (btnDisconnect) {
        btnDisconnect.addEventListener('click', () => {
            oauthToken = null;
            oauthTokenExpiry = 0;
            localStorage.removeItem('tm_gdrive_token');
            localStorage.removeItem('tm_gdrive_token_expiry');
            updateGDriveUI();
            alert('Disconnected from Google Drive.');
        });
    }

    async function findBackupFile() {
        const url = `https://www.googleapis.com/drive/v3/files?q=name='TimeManager_Backup.json' and trashed=false&fields=files(id,name)`;
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${oauthToken}`
            }
        });
        if (response.status === 401) {
            handleTokenExpired();
            throw new Error('Unauthorized');
        }
        if (!response.ok) {
            throw new Error('Search failed: ' + response.statusText);
        }
        const data = await response.json();
        return data.files && data.files.length > 0 ? data.files[0] : null;
    }

    function handleTokenExpired() {
        alert('Google Drive session expired. Re-connecting...');
        requestGoogleToken();
    }

    if (btnBackup) {
        btnBackup.addEventListener('click', async () => {
            if (!oauthToken || oauthTokenExpiry <= Date.now()) {
                handleTokenExpired();
                return;
            }

            btnBackup.disabled = true;
            btnBackup.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Backing up...';

            try {
                const backupData = Storage.exportBackupJSON();
                const fileContent = JSON.stringify(backupData, null, 2);
                const existingFile = await findBackupFile();
                
                let url = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
                let method = 'POST';
                
                if (existingFile) {
                    url = `https://www.googleapis.com/upload/drive/v3/files/${existingFile.id}?uploadType=multipart`;
                    method = 'PATCH';
                }

                const metadata = {
                    name: 'TimeManager_Backup.json',
                    mimeType: 'application/json'
                };

                const boundary = 'tm_boundary_marker';
                const delimiter = `\r\n--${boundary}\r\n`;
                const closeDelimiter = `\r\n--${boundary}--`;

                let body = delimiter +
                    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
                    JSON.stringify(metadata) +
                    delimiter +
                    'Content-Type: application/json\r\n\r\n' +
                    fileContent +
                    closeDelimiter;

                const response = await fetch(url, {
                    method: method,
                    headers: {
                        'Authorization': `Bearer ${oauthToken}`,
                        'Content-Type': `multipart/related; boundary=${boundary}`
                    },
                    body: body
                });

                if (response.status === 401) {
                    handleTokenExpired();
                    return;
                }

                if (!response.ok) {
                    throw new Error('Backup failed with status: ' + response.status);
                }

                alert('Backup successfully saved to Google Drive!');
            } catch (err) {
                console.error(err);
                if (err.message !== 'Unauthorized') {
                    alert('Error creating backup on Google Drive: ' + err.message);
                }
            } finally {
                btnBackup.disabled = false;
                btnBackup.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> Backup Now';
            }
        });
    }

    if (btnRestore) {
        btnRestore.addEventListener('click', async () => {
            if (!oauthToken || oauthTokenExpiry <= Date.now()) {
                handleTokenExpired();
                return;
            }

            if (!confirm('Are you sure you want to restore from Google Drive? This will overwrite all your current local data!')) {
                return;
            }

            btnRestore.disabled = true;
            btnRestore.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Restoring...';

            try {
                const existingFile = await findBackupFile();
                if (!existingFile) {
                    alert('No backup file (TimeManager_Backup.json) found on your Google Drive.');
                    return;
                }

                const downloadUrl = `https://www.googleapis.com/drive/v3/files/${existingFile.id}?alt=media`;
                const response = await fetch(downloadUrl, {
                    headers: {
                        'Authorization': `Bearer ${oauthToken}`
                    }
                });

                if (response.status === 401) {
                    handleTokenExpired();
                    return;
                }

                if (!response.ok) {
                    throw new Error('Restore download failed: ' + response.statusText);
                }

                const backupData = await response.json();
                const success = Storage.importBackupJSON(backupData);

                if (success) {
                    alert('Data successfully restored from Google Drive backup!');
                } else {
                    alert('Failed to parse backup data. Ensure the backup file is valid.');
                }
            } catch (err) {
                console.error(err);
                if (err.message !== 'Unauthorized') {
                    alert('Error restoring from Google Drive: ' + err.message);
                }
            } finally {
                btnRestore.disabled = false;
                btnRestore.innerHTML = '<i class="fa-solid fa-cloud-arrow-down"></i> Restore';
            }
        });
    }

    // Initial UI run
    updateGDriveUI();

    function showDataMsg(msg) {
        dataMsg.innerText = msg;
        dataMsg.style.display = 'block';
        setTimeout(() => { dataMsg.style.display = 'none'; }, 3000);
    }

    // Clear Data
    btnClearData.addEventListener('click', () => {
        if (confirm("Are you SURE you want to clear all data? This cannot be undone.")) {
            if (confirm("Final warning! Deleting ALL tracked time and custom categories.")) {
                Storage.clearAllData();
                alert('All data cleared.');
            }
        }
    });
});
