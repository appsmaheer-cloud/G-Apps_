# GASITE - Google Apps Script (GAS) & Frontend Web App
## PT. Pratama Nusantara Sakti (PT. PNS)
**Standar**: SNI ISO 9001:2015, SMK3 PP No. 50/2012, Prinsip 6S  
**Modul**: Housekeeping (GA-03), WTP (GA-04A), RO (GA-04B), Laundry (GA-06)

---

## 1. Ikhtisar Arsitektur
Aplikasi ini merupakan solusi mobile-first serverless yang menghubungkan form input lapangan secara langsung ke **Google Sheets** sebagai database cloud terpusat menggunakan **Google Apps Script (GAS)** REST API.

### Fitur Utama:
- **Zero Server Setup**: Tidak memerlukan hosting server PHP/MySQL; dapat berjalan sepenuhnya di Google Cloud/Google Drive.
- **Offline First**: Dilengkapi penyimpanan lokal HP (`localStorage queue`) jika petugas lapangan berada di area *blank spot* sinyal site, dan otomatis tersinkronisasi saat online.
- **Auto Sheet Generator**: Fungsi `initializeGasSiteSpreadsheet()` secara otomatis membuat tabel dan header kolom di Google Spreadsheet jika belum ada.
- **Standard Quality Compliance**: Seluruh kolom input sesuai dengan format resmi Formulir Mutu (`FM-HRGA-GA-04B`, `FM-HRGA-GA-06A`, `FM-HRGA-GA-06B`, `FM-HRGA-GA-29`, `FM-HRGA-GA-16`).

---

## 2. Struktur Proyek
```
gas-app/
├── .git/                  # Repositori Git terinisialisasi
├── .gitignore             # File ignore standar
├── .clasp.json            # Google Clasp Deployment CLI
├── appsscript.json        # Manifest konfigurasi Google Apps Script
├── Code.js                # Backend Google Apps Script (doGet & doPost API)
├── README.md              # Dokumentasi lengkap
└── frontend/              # Standalone Mobile-first Frontend App
    ├── index.html         # User Interface Responsive (Tailwind + Lucide)
    ├── app.js             # Logic, state & offline sync
    └── styles.css         # Styling mobile
```

---

## 3. Langkah Instalasi & Deploy ke Google Apps Script

### Metode A: Copy-Paste ke Google Sheets (Paling Mudah)
1. Buka [Google Sheets](https://sheets.new) di browser Anda dan buat spreadsheet baru dengan nama:  
   `GASITE_OPERASIONAL_DATABASE_PNS`.
2. Klik menu **Extensions (Ekstensi)** > **Apps Script**.
3. Hapus kode default di editor, lalu salin dan tempelkan seluruh isi file `Code.js`.
4. Di bagian atas editor Apps Script, pilih fungsi `initializeGasSiteSpreadsheet` dan klik **Run (Jalankan)** untuk membuat seluruh sheet tabel operasional secara otomatis.
5. Klik tombol **Deploy** (kanan atas) > **New deployment (Penerapan Baru)**.
6. Pilih jenis: **Web app**.
   - **Execute as**: *Me (email Anda)*.
   - **Who has access**: *Anyone (Siapa saja)*.
7. Klik **Deploy** dan salin **Web app URL** (berakhiran `/exec`).
8. Buka `gas-app/frontend/index.html` di browser Anda, klik menu *"Konfigurasi Google Apps Script URL"*, dan tempelkan Web app URL tersebut.

### Metode B: Menggunakan Google Clasp CLI
```bash
# 1. Login ke Google Account
npx @google/clasp login

# 2. Buat proyek script baru
npx @google/clasp create --title "GASITE_Backend" --type webapp

# 3. Push file lokal ke Google Apps Script
npx @google/clasp push
```

---

## 4. Alur Kerja Git & Version Control
Repositori ini telah diinisialisasi dengan Git:
```bash
# Cek status repositori
git status

# Commit perubahan baru
git add .
git commit -m "feat: your update message"

# Hubungkan ke remote GitHub perusahaan
git remote add origin https://github.com/your-company/gasite-mobile.git
git push -u origin main
```
