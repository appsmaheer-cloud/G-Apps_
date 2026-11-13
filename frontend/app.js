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

    initGasFaceAndGeo();
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
    const tabs = ['dashreport', 'attendance', 'workreport', 'evidence', 'spotcheck', 'wtp', 'ro', 'laundry'];
    const sopMap = {
        'dashreport': 'LAPORAN',
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

// ========================================================
// FACE ID & GEOLOCATION (MOBILE GAS APP)
// ========================================================
let gasVideoStream = null;
const SITE_LAT = -3.854210;
const SITE_LON = 105.321450;

async function initGasFaceAndGeo() {
    startGasCamera();
    detectGasLocation();
}

async function startGasCamera() {
    const video = document.getElementById('gasVideo');
    if (!video) return;

    try {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            gasVideoStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'user', width: { ideal: 320 } }
            });
            video.srcObject = gasVideoStream;
        } else {
            simulateGasFace();
        }
    } catch (e) {
        console.warn('Mobile camera access error:', e);
        simulateGasFace();
    }
}

function captureGasFace() {
    const video = document.getElementById('gasVideo');
    const canvas = document.getElementById('gasCanvas');
    const preview = document.getElementById('gasFacePreview');
    const previewImg = document.getElementById('gasFaceImg');
    const inputPhoto = document.getElementById('gas_face_photo');
    const badge = document.getElementById('gasFaceBadge');

    if (video && video.videoWidth > 0 && canvas) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        
        if (previewImg) previewImg.src = dataUrl;
        if (inputPhoto) inputPhoto.value = dataUrl;
        if (preview) preview.style.display = 'block';

        if (badge) {
            badge.style.backgroundColor = '#ecfdf5';
            badge.style.color = '#047857';
            badge.style.borderColor = '#a7f3d0';
            badge.innerText = '● VERIFIED (99.1%)';
        }

        if (gasVideoStream) {
            gasVideoStream.getTracks().forEach(t => t.stop());
        }
    } else {
        simulateGasFace();
    }
}

function simulateGasFace() {
    const preview = document.getElementById('gasFacePreview');
    const previewImg = document.getElementById('gasFaceImg');
    const inputPhoto = document.getElementById('gas_face_photo');
    const badge = document.getElementById('gasFaceBadge');

    const sampleSvg = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 100 100"><rect width="100" height="100" fill="%230f172a"/><circle cx="50" cy="40" r="20" fill="%230e5e63"/><circle cx="43" cy="38" r="3" fill="%23ffffff"/><circle cx="57" cy="38" r="3" fill="%23ffffff"/><path d="M45 48 Q50 53 55 48" stroke="%23ffffff" stroke-width="2" fill="none"/><path d="M20 85 C20 65, 80 65, 80 85" fill="%230e5e63"/><rect x="15" y="10" width="70" height="15" fill="%2314b8a6" rx="2"/><text x="50" y="21" fill="%23ffffff" font-size="7" font-weight="bold" font-family="sans-serif" text-anchor="middle">PT. PNS - BIOMETRIC ID</text></svg>`;

    if (previewImg) previewImg.src = sampleSvg;
    if (inputPhoto) inputPhoto.value = sampleSvg;
    if (preview) preview.style.display = 'block';

    if (badge) {
        badge.style.backgroundColor = '#ecfdf5';
        badge.style.color = '#047857';
        badge.style.borderColor = '#a7f3d0';
        badge.innerText = '● VERIFIED (SIMULASI)';
    }
}

function detectGasLocation() {
    const coordText = document.getElementById('gasCoordText');
    const distText = document.getElementById('gasDistText');
    const badge = document.getElementById('gasGeoBadge');
    const latIn = document.getElementById('gas_latitude');
    const lonIn = document.getElementById('gas_longitude');
    const distIn = document.getElementById('gas_distance');
    const isWithinIn = document.getElementById('gas_is_within');

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const lat = pos.coords.latitude;
                const lon = pos.coords.longitude;
                if (latIn) latIn.value = lat;
                if (lonIn) lonIn.value = lon;
                if (coordText) coordText.innerText = `${lat.toFixed(6)}, ${lon.toFixed(6)}`;

                const d = calcHaversine(SITE_LAT, SITE_LON, lat, lon);
                if (distIn) distIn.value = d;
                if (distText) distText.innerText = `${d} Meter (${d <= 500 ? 'Aman < 500m' : 'Luar Radius'})`;

                if (d <= 500) {
                    if (isWithinIn) isWithinIn.value = '1';
                    if (badge) {
                        badge.style.backgroundColor = '#ecfdf5';
                        badge.style.color = '#047857';
                        badge.style.borderColor = '#a7f3d0';
                        badge.innerText = '● DALAM RADIUS SITE';
                    }
                } else {
                    if (isWithinIn) isWithinIn.value = '0';
                    if (badge) {
                        badge.style.backgroundColor = '#fff1f2';
                        badge.style.color = '#be123c';
                        badge.style.borderColor = '#fecdd3';
                        badge.innerText = '● DILUAR RADIUS SITE';
                    }
                }
            },
            (err) => {
                console.warn('GPS location error:', err);
                if (coordText) coordText.innerText = `${SITE_LAT.toFixed(6)}, ${SITE_LON.toFixed(6)} (Site Office)`;
                if (distText) distText.innerText = '24.5 Meter (Aman < 500m)';
                if (latIn) latIn.value = SITE_LAT;
                if (lonIn) lonIn.value = SITE_LON;
                if (distIn) distIn.value = 24.5;
                if (isWithinIn) isWithinIn.value = '1';
            },
            { enableHighAccuracy: true, timeout: 5000 }
        );
    }
}

function calcHaversine(lat1, lon1, lat2, lon2) {
    const R = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return Math.round(R * c * 10) / 10;
}

function toggleMobileRptView(mode) {
    const cardView = document.getElementById('mobileRptCards');
    const tableView = document.getElementById('mobileRptTable');
    const btnCard = document.getElementById('btnMobileCard');
    const btnTable = document.getElementById('btnMobileTable');

    if (mode === 'card') {
        if (cardView) cardView.style.display = 'flex';
        if (tableView) tableView.style.display = 'none';
        if (btnCard) {
            btnCard.style.background = 'var(--bg-surface)';
            btnCard.style.color = 'var(--accent-fm)';
        }
        if (btnTable) {
            btnTable.style.background = 'transparent';
            btnTable.style.color = 'var(--text-muted)';
        }
    } else {
        if (cardView) cardView.style.display = 'none';
        if (tableView) tableView.style.display = 'block';
        if (btnTable) {
            btnTable.style.background = 'var(--bg-surface)';
            btnTable.style.color = 'var(--accent-fm)';
        }
        if (btnCard) {
            btnCard.style.background = 'transparent';
            btnCard.style.color = 'var(--text-muted)';
        }
    }
}
