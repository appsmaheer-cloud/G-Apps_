/**
 * GASITE Frontend Client for Google Apps Script Web App
 * PT. Pratama Nusantara Sakti
 */

const DEFAULT_GAS_URL = 'https://script.google.com/macros/s/AKfycbz_GASITE_DEMO_DEPLOYMENT_ID/exec';

let gasUrl = localStorage.getItem('GASITE_ENDPOINT') || DEFAULT_GAS_URL;

document.addEventListener('DOMContentLoaded', () => {
    // Set default dates
    const today = new Date().toISOString().slice(0, 10);
    const dateIds = ['scDate', 'wtpDate', 'roDate'];
    dateIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = today;
    });

    const urlInput = document.getElementById('gasUrlInput');
    if (urlInput) urlInput.value = gasUrl;

    checkOnlineStatus();
    window.addEventListener('online', checkOnlineStatus);
    window.addEventListener('offline', checkOnlineStatus);
});

function toggleEndpointSettings() {
    const box = document.getElementById('settingsBox');
    if (box) box.classList.toggle('hidden');
}

function saveGasUrl() {
    const input = document.getElementById('gasUrlInput');
    if (input && input.value) {
        gasUrl = input.value.trim();
        localStorage.setItem('GASITE_ENDPOINT', gasUrl);
        showToast('✓ URL Google Apps Script tersimpan', 'success');
        toggleEndpointSettings();
    }
}

function switchTab(tabId) {
    document.querySelectorAll('.tab-pane').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('text-amber-400', 'text-blue-400', 'text-cyan-400', 'text-purple-400');
        btn.classList.add('text-slate-400');
    });

    const target = document.getElementById('tab-' + tabId);
    if (target) target.classList.remove('hidden');

    const navBtn = document.getElementById('nav-' + tabId);
    if (navBtn) {
        navBtn.classList.remove('text-slate-400');
        if (tabId === 'spotcheck') navBtn.classList.add('text-amber-400');
        if (tabId === 'wtp') navBtn.classList.add('text-blue-400');
        if (tabId === 'ro') navBtn.classList.add('text-cyan-400');
        if (tabId === 'laundry') navBtn.classList.add('text-purple-400');
    }
}

function checkOnlineStatus() {
    const isOnline = navigator.onLine;
    const badge = document.getElementById('connectionStatus');
    const text = document.getElementById('statusText');
    const notice = document.getElementById('offlineNotice');

    if (isOnline) {
        badge.className = 'flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30';
        text.textContent = 'Online / Sheets Connected';
        if (notice) notice.classList.add('hidden');
        syncOfflineQueue();
    } else {
        badge.className = 'flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30';
        text.textContent = 'Mode Offline (Lokal)';
        if (notice) notice.classList.remove('hidden');
    }
}

async function submitForm(e, actionName) {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);
    const data = { action: actionName };

    formData.forEach((val, key) => {
        data[key] = val;
    });

    // If offline, save in queue
    if (!navigator.onLine) {
        saveOffline(data);
        showToast('📦 Disimpan ke Antrean Offline (akan otomatis sinkron saat sinyal pulih)', 'warning');
        form.reset();
        return;
    }

    showToast('Sedang mengirim ke Google Sheets...', 'info');

    try {
        const response = await fetch(gasUrl, {
            method: 'POST',
            mode: 'no-cors', // Google Apps Script redirects require no-cors or simple payload
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        // Note: Google Apps Script Web App in no-cors returns opaque response
        showToast('✓ Berhasil dikirim ke Google Sheets PT. PNS', 'success');
        form.reset();

        // Restore default dates
        const today = new Date().toISOString().slice(0, 10);
        ['scDate', 'wtpDate', 'roDate'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = today;
        });

    } catch (err) {
        console.warn('Network error or CORS, queuing offline:', err);
        saveOffline(data);
        showToast('Tersimpan di Penyimpanan Lokal HP (Cek Koneksi Sheets)', 'warning');
    }
}

function saveOffline(data) {
    const queue = JSON.parse(localStorage.getItem('GASITE_OFFLINE_QUEUE') || '[]');
    queue.push({ timestamp: new Date().toISOString(), payload: data });
    localStorage.setItem('GASITE_OFFLINE_QUEUE', JSON.stringify(queue));
}

function syncOfflineQueue() {
    const queue = JSON.parse(localStorage.getItem('GASITE_OFFLINE_QUEUE') || '[]');
    if (queue.length === 0) return;

    showToast(`Mensinkronkan ${queue.length} data tersimpan ke Google Sheets...`, 'info');
    
    // Attempt sending queued items
    Promise.all(queue.map(item => {
        return fetch(gasUrl, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(item.payload)
        }).catch(err => console.error('Failed to sync item:', err));
    })).then(() => {
        localStorage.removeItem('GASITE_OFFLINE_QUEUE');
        showToast('✓ Seluruh data offline berhasil disinkronkan!', 'success');
    });
}

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    if (!toast) return;

    toast.className = 'fixed bottom-20 left-1/2 transform -translate-x-1/2 z-50 px-5 py-3 rounded-2xl text-xs font-bold shadow-2xl transition duration-300 ' +
        (type === 'success' ? 'bg-emerald-600 text-white' :
        (type === 'warning' ? 'bg-amber-600 text-white' :
        (type === 'info' ? 'bg-blue-600 text-white' : 'bg-rose-600 text-white')));

    toast.textContent = message;
    toast.classList.remove('hidden');

    setTimeout(() => {
        toast.classList.add('hidden');
    }, 3500);
}
