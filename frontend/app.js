/**
 * GASITE Frontend Client for Google Apps Script Web App
 * PT. Pratama Nusantara Sakti
 * Modules: Absensi, Laporan Kerja, Evidence, Spot Check, WTP, RO, Laundry
 */

const DEFAULT_GAS_URL = 'https://script.google.com/macros/s/AKfycbz_GASITE_DEMO_DEPLOYMENT_ID/exec';

let gasUrl = localStorage.getItem('GASITE_ENDPOINT') || DEFAULT_GAS_URL;

document.addEventListener('DOMContentLoaded', () => {
    // Initialize Theme
    const savedTheme = localStorage.getItem('GASITE_THEME') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);

    // Set default dates
    restoreDefaultDates();

    const urlInput = document.getElementById('gasUrlInput');
    if (urlInput) urlInput.value = gasUrl;

    updateQueueCount();
    checkOnlineStatus();
    window.addEventListener('online', checkOnlineStatus);
    window.addEventListener('offline', checkOnlineStatus);
});

function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('GASITE_THEME', next);
    updateThemeIcon(next);
}

function updateThemeIcon(theme) {
    const icon = document.getElementById('themeIcon');
    if (icon) {
        icon.setAttribute('data-lucide', theme === 'dark' ? 'sun' : 'moon');
        if (window.lucide) lucide.createIcons();
    }
}

function toggleEndpointSettings() {
    const box = document.getElementById('settingsBox');
    if (box) {
        box.style.display = (box.style.display === 'none' || box.style.display === '') ? 'block' : 'none';
    }
}

function saveGasUrl() {
    const input = document.getElementById('gasUrlInput');
    if (input && input.value) {
        gasUrl = input.value.trim();
        localStorage.setItem('GASITE_ENDPOINT', gasUrl);
        showToast('URL Google Apps Script berhasil disimpan', 'success');
        toggleEndpointSettings();
    }
}

function switchTab(tabId) {
    const tabs = ['attendance', 'workreport', 'evidence', 'spotcheck', 'wtp', 'ro', 'laundry'];
    const sopMap = {
        'attendance': 'ABSENSI',
        'workreport': 'LAP. KERJA',
        'evidence': 'EVIDENCE',
        'spotcheck': 'PK-GA-03',
        'wtp': 'PK-GA-04A',
        'ro': 'PK-GA-04B',
        'laundry': 'PK-GA-06'
    };

    tabs.forEach(t => {
        const pane = document.getElementById('tab-' + t);
        const pillBtn = document.getElementById('btn-tab-' + t);
        if (pane) pane.style.display = (t === tabId) ? 'block' : 'none';
        if (pillBtn) {
            if (t === tabId) {
                pillBtn.style.borderColor = 'var(--accent-fm)';
                pillBtn.style.color = 'var(--accent-fm)';
                pillBtn.style.fontWeight = '700';
            } else {
                pillBtn.style.borderColor = 'var(--border-subtle)';
                pillBtn.style.color = 'var(--text-muted)';
                pillBtn.style.fontWeight = 'normal';
            }
        }
    });

    // Update bottom nav active indicator
    const navItems = ['attendance', 'workreport', 'evidence', 'spotcheck'];
    navItems.forEach(n => {
        const navEl = document.getElementById('nav-' + n);
        if (navEl) {
            if (n === tabId || (n === 'spotcheck' && ['wtp', 'ro', 'laundry'].includes(tabId))) {
                navEl.classList.add('active');
            } else {
                navEl.classList.remove('active');
            }
        }
    });

    const sopTag = document.getElementById('currentSopTag');
    if (sopTag && sopMap[tabId]) {
        sopTag.textContent = sopMap[tabId];
    }
}

function updateQueueCount() {
    const queue = JSON.parse(localStorage.getItem('GASITE_OFFLINE_QUEUE') || '[]');
    const countEl = document.getElementById('offlineQueueCount');
    if (countEl) {
        countEl.textContent = queue.length;
    }
}

function checkOnlineStatus() {
    const isOnline = navigator.onLine;
    const dot = document.getElementById('statusDot');
    const text = document.getElementById('statusText');
    const notice = document.getElementById('offlineNotice');

    if (isOnline) {
        if (dot) {
            dot.className = 'status-dot';
        }
        if (text) text.textContent = 'Sheets Terhubung';
        if (notice) notice.style.display = 'none';
        syncOfflineQueue();
    } else {
        if (dot) {
            dot.className = 'status-dot warn';
        }
        if (text) text.textContent = 'Mode Offline';
        if (notice) notice.style.display = 'block';
    }
    updateQueueCount();
}

async function submitForm(e, actionName) {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);
    const data = { action: actionName, timestamp: new Date().toISOString() };

    formData.forEach((val, key) => {
        data[key] = val;
    });

    // If offline, save in queue
    if (!navigator.onLine) {
        saveOffline(data);
        showToast('Tersimpan di antrean offline lokal HP', 'warn');
        form.reset();
        restoreDefaultDates();
        return;
    }

    showToast('Mengirim data ke Google Sheets PT. PNS...', 'info');

    try {
        await fetch(gasUrl, {
            method: 'POST',
            mode: 'no-cors',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        showToast('Berhasil dikirim ke Google Sheets', 'success');
        form.reset();
        restoreDefaultDates();

    } catch (err) {
        console.warn('Network error, saving offline:', err);
        saveOffline(data);
        showToast('Jaringan lambat, data disimpan di memori lokal HP', 'warn');
    }
}

function restoreDefaultDates() {
    const today = new Date().toISOString().slice(0, 10);
    ['attDate', 'workDate', 'scDate', 'wtpDate', 'roDate'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = today;
    });
}

function saveOffline(data) {
    const queue = JSON.parse(localStorage.getItem('GASITE_OFFLINE_QUEUE') || '[]');
    queue.push({ timestamp: new Date().toISOString(), payload: data });
    localStorage.setItem('GASITE_OFFLINE_QUEUE', JSON.stringify(queue));
    updateQueueCount();
}

function syncOfflineQueue() {
    const queue = JSON.parse(localStorage.getItem('GASITE_OFFLINE_QUEUE') || '[]');
    if (queue.length === 0) return;

    showToast(`Mensinkronkan ${queue.length} rekaman offline...`, 'info');
    
    Promise.all(queue.map(item => {
        return fetch(gasUrl, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(item.payload)
        }).catch(err => console.error('Failed to sync item:', err));
    })).then(() => {
        localStorage.removeItem('GASITE_OFFLINE_QUEUE');
        updateQueueCount();
        showToast('Seluruh rekaman offline berhasil terkirim ke Sheets', 'success');
    });
}

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const toastDot = document.getElementById('toastDot');
    const toastText = document.getElementById('toastText');
    if (!toast || !toastText) return;

    if (toastDot) {
        toastDot.className = 'status-dot' + (type === 'warn' ? ' warn' : (type === 'danger' ? ' danger' : ''));
    }
    toastText.textContent = message;
    toast.classList.remove('hidden');

    setTimeout(() => {
        toast.classList.add('hidden');
    }, 3500);
}
