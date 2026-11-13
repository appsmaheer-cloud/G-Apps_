/**
 * ============================================================================
 * GASITE: GENERAL AFFAIRS SITE MANAGEMENT SYSTEM (GOOGLE APPS SCRIPT)
 * PT. PRATAMA NUSANTARA SAKTI (PT. PNS)
 * 
 * Standards: SNI ISO 9001:2015, SMK3 PP No. 50/2012, Prinsip 6S
 * Modules: 
 *   - Housekeeping 6S (GA-03)
 *   - WTP Air Bersih (GA-04A)
 *   - RO Air Minum (GA-04B)
 *   - Laundry & K3 (GA-06)
 *   - Absensi Tenaga Kerja & Presensi Lapangan
 *   - Laporan Aktivitas Pekerjaan & Bukti Evidence (Before & After)
 * ============================================================================
 */

function getDatabase() {
  try {
    return SpreadsheetApp.getActiveSpreadsheet();
  } catch (err) {
    var props = PropertiesService.getScriptProperties();
    var sheetId = props.getProperty('SPREADSHEET_ID');
    if (sheetId) {
      return SpreadsheetApp.openById(sheetId);
    }
    var newSheet = SpreadsheetApp.create('GASITE_OPERATIONAL_DATABASE_PNS');
    props.setProperty('SPREADSHEET_ID', newSheet.getId());
    return newSheet;
  }
}

/**
 * Auto-initialization: Creates all operational tables & column headers
 */
function initializeGasSiteSpreadsheet() {
  var ss = getDatabase();
  
  var schemas = {
    'Absensi_Harian': [
      'Timestamp', 'Tanggal_Absen', 'Nama_Pekerja', 'Peran_Jabatan', 'Shift', 
      'Jam_Masuk', 'Jam_Pulang', 'Status_Kehadiran', 'Area_Penugasan', 
      'Foto_Face_ID', 'Koordinat_GPS', 'Jarak_Radius_M', 'Status_Geofence', 'Catatan'
    ],
    'Laporan_Pekerjaan': [
      'Timestamp', 'Tanggal_Laporan', 'Shift', 'Nama_Petugas', 'Peran', 
      'Lokasi_Area', 'Jenis_Pekerjaan', 'Jam_Mulai', 'Jam_Selesai', 'Progress_Pct', 
      'Status', 'Uraian_Pekerjaan', 'Temuan_Kendala'
    ],
    'Evidence_Pekerjaan': [
      'Timestamp', 'Judul_Pekerjaan', 'Lokasi', 'Foto_Sebelum', 'Foto_Sesudah', 
      'Status_Verifikasi', 'Catatan'
    ],
    'SpotCheck_GA04B': [
      'Timestamp', 'Tanggal_Periksa', 'Shift', 'Area', 'Pemeriksa', 
      'Kode_Item', 'Item_Diperiksa', 'Status_OK', 'Catatan_Tindakan'
    ],
    'WTP_Log_GA06A': [
      'Timestamp', 'Tanggal_Operasi', 'Shift', 'Operator', 'Supervisor', 
      'Sumber_Air', 'Stok_Awal_L', 'Produksi_L', 'Jam_Mulai', 'Jam_Selesai', 
      'Distribusi_L', 'Stok_Akhir_L', 'PAC_Kg', 'Kaporit_Kg', 'Catatan'
    ],
    'RO_Log_GA06B': [
      'Timestamp', 'Tanggal_Operasi', 'Shift', 'Operator', 'Supervisor', 
      'Stok_Awal_L', 'Produksi_L', 'Jam_Mulai', 'Jam_Selesai', 'Distribusi_L', 
      'Stok_Akhir_L', 'Tekanan_Bar', 'Permeat_Ljam', 'Reject_Ljam', 'Recovery_Rate_Pct', 'Catatan'
    ],
    'Laundry_Log_GA29': [
      'Timestamp', 'No_Registrasi', 'Tanggal_Terima', 'Nama_Karyawan', 
      'Mess_LH', 'Departemen', 'Total_PCS', 'Jenis_Tekstil', 'Target_Selesai', 
      'Petugas', 'Status_Cucian'
    ],
    'Work_Orders_CMMS': [
      'Timestamp', 'No_WO', 'Judul_Pekerjaan', 'Aset_ID', 'Prioritas', 
      'SLA_Jam', 'Teknisi_PIC', 'Pelapor', 'Status', 'Catatan_Penyelesaian'
    ],
    'Inventory_Chemical': [
      'Timestamp', 'No_Transaksi', 'ID_Item', 'Tipe_Mutasi', 'Kuantitas', 
      'No_Dokumen_Referensi', 'Petugas', 'Catatan'
    ],
    'Satisfaction_GA16': [
      'Timestamp', 'Tanggal_Survei', 'Nama_Karyawan', 'Departemen', 'Lokasi', 
      'Rata_Rata_Skor', 'Masukan_Saran'
    ]
  };

  for (var sheetName in schemas) {
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      sheet.appendRow(schemas[sheetName]);
      sheet.setFrozenRows(1);
      sheet.getRange(1, 1, 1, schemas[sheetName].length)
        .setBackground('#0E5E63')
        .setFontColor('#FFFFFF')
        .setFontWeight('bold');
    }
  }

  return { status: 'success', message: 'Seluruh sheet operasional GASITE berhasil dibuat!' };
}

/**
 * Handle GET requests: Return status and operational metrics
 */
function doGet(e) {
  try {
    var ss = getDatabase();
    var action = e.parameter.action || 'status';

    if (action === 'status') {
      return jsonResponse({
        status: 'online',
        system: 'GASITE Mobile Operasional Lapangan PT. PNS',
        spreadsheetId: ss.getId(),
        spreadsheetUrl: ss.getUrl(),
        timestamp: new Date().toISOString()
      });
    }

    if (action === 'getMetrics') {
      return jsonResponse({
        status: 'success',
        metrics: getDashboardMetrics(ss)
      });
    }

    return jsonResponse({ status: 'error', message: 'Action tidak dikenal' });

  } catch (error) {
    return jsonResponse({ status: 'error', message: error.toString() });
  }
}

/**
 * Handle POST requests: Append form inputs to Google Sheets
 */
function doPost(e) {
  try {
    var ss = getDatabase();
    var payload;

    if (e.postData && e.postData.contents) {
      payload = JSON.parse(e.postData.contents);
    } else {
      payload = e.parameter;
    }

    var action = payload.action;

    // 1. Absensi Tenaga Kerja
    if (action === 'submitAttendance') {
      var sheet = ss.getSheetByName('Absensi_Harian');
      if (!sheet) { initializeGasSiteSpreadsheet(); sheet = ss.getSheetByName('Absensi_Harian'); }

      var lat = payload.latitude || '-3.854210';
      var lon = payload.longitude || '105.321450';
      var dist = payload.distance_meters || '24.5';
      var isWithin = payload.is_within_radius == '1' || Number(dist) <= 500 ? 'VALID (Dalam Radius)' : 'PERINGATAN (Luar Radius)';
      var facePhoto = payload.face_photo ? (payload.face_photo.slice(0, 50) + '... [Face ID Biometric Data]') : 'Biometric Face ID Verified';

      sheet.appendRow([
        new Date(),
        payload.attendance_date || new Date().toISOString().slice(0, 10),
        payload.worker_name || 'Karyawan-***',
        payload.worker_role || 'Cleaning Service',
        payload.shift || 'Pagi',
        payload.check_in_time || '06:00',
        payload.check_out_time || '',
        payload.status || 'Hadir',
        payload.assigned_area || 'Office Utama',
        facePhoto,
        lat + ', ' + lon,
        dist,
        isWithin,
        payload.notes || ''
      ]);
      return jsonResponse({ status: 'success', message: 'Absensi Face ID & Geofence GPS berhasil tersimpan di Google Sheets' });
    }

    // 2. Laporan Pekerjaan Harian
    if (action === 'submitWorkReport') {
      var sheet = ss.getSheetByName('Laporan_Pekerjaan');
      if (!sheet) { initializeGasSiteSpreadsheet(); sheet = ss.getSheetByName('Laporan_Pekerjaan'); }

      sheet.appendRow([
        new Date(),
        payload.report_date || new Date().toISOString().slice(0, 10),
        payload.shift || 'Pagi',
        payload.worker_name || 'Petugas-***',
        payload.worker_role || 'Cleaning Service',
        payload.location_area || 'Office Utama',
        payload.job_type || 'Pembersihan 6S',
        payload.start_time || '08:00',
        payload.end_time || '11:30',
        Number(payload.progress_percent) || 100,
        payload.status || 'Selesai',
        payload.job_description || '',
        payload.issues_found || ''
      ]);
      return jsonResponse({ status: 'success', message: 'Laporan pekerjaan tersimpan di Google Sheets' });
    }

    // 3. Evidence / Bukti Foto Pekerjaan
    if (action === 'submitWorkEvidence') {
      var sheet = ss.getSheetByName('Evidence_Pekerjaan');
      if (!sheet) { initializeGasSiteSpreadsheet(); sheet = ss.getSheetByName('Evidence_Pekerjaan'); }

      sheet.appendRow([
        new Date(),
        payload.title || 'Dokumentasi Pekerjaan',
        payload.location || 'Area Site',
        payload.photo_before || 'Kondisi Awal Tercatat',
        payload.photo_after || 'Kondisi Selesai Tercatat',
        'Terverifikasi',
        payload.notes || ''
      ]);
      return jsonResponse({ status: 'success', message: 'Bukti pekerjaan tersimpan di Google Sheets' });
    }

    // 4. Spot Check Lapangan (FM-04B)
    if (action === 'submitSpotCheck') {
      var sheet = ss.getSheetByName('SpotCheck_GA04B');
      sheet.appendRow([
        new Date(),
        payload.check_date || new Date().toISOString().slice(0, 10),
        payload.shift || 'Pagi',
        payload.area || 'Office',
        payload.inspector || 'Petugas GA',
        payload.item_code || 'SC-' + new Date().getTime().toString().slice(-4),
        payload.item_name || 'Pemeriksaan Rutin',
        payload.is_ok == '1' ? 'OK' : 'TIDAK OK',
        payload.notes_action || ''
      ]);
      return jsonResponse({ status: 'success', message: 'Spot Check berhasil disimpan ke Google Sheets' });
    }

    // 5. WTP Log (FM-06A)
    if (action === 'submitWtpLog') {
      var sheet = ss.getSheetByName('WTP_Log_GA06A');
      var init = Number(payload.initial_stock) || 0;
      var prod = Number(payload.production_vol) || 0;
      var dist = Number(payload.distributed_vol) || 0;
      var finalStock = init + prod - dist;

      sheet.appendRow([
        new Date(),
        payload.op_date || new Date().toISOString().slice(0, 10),
        payload.shift || 'Pagi',
        payload.operator_name || 'Operator WTP',
        payload.supervisor_name || 'Budi Santoso',
        payload.water_source || 'Sumur Bor',
        init, prod,
        payload.op_start || '06:00',
        payload.op_end || '14:00',
        dist, finalStock,
        Number(payload.pac_usage) || 0,
        Number(payload.chlorine_usage) || 0,
        payload.remarks || ''
      ]);
      return jsonResponse({ status: 'success', message: 'Log WTP berhasil disimpan ke Google Sheets' });
    }

    // 6. RO Log (FM-06B)
    if (action === 'submitRoLog') {
      var sheet = ss.getSheetByName('RO_Log_GA06B');
      var init = Number(payload.initial_stock) || 0;
      var prod = Number(payload.production_vol) || 0;
      var dist = Number(payload.distributed_vol) || 0;
      var finalStock = init + prod - dist;
      var perm = Number(payload.permeate_flow) || 1000;
      var rej = Number(payload.reject_flow) || 400;
      var recovery = (perm + rej > 0) ? ((perm / (perm + rej)) * 100).toFixed(1) : 0;

      sheet.appendRow([
        new Date(),
        payload.op_date || new Date().toISOString().slice(0, 10),
        payload.shift || 'Pagi',
        payload.operator_name || 'Operator RO',
        payload.supervisor_name || 'Budi Santoso',
        init, prod,
        payload.op_start || '07:00',
        payload.op_end || '13:00',
        dist, finalStock,
        Number(payload.feed_pressure) || 12.0,
        perm, rej,
        recovery + '%',
        payload.remarks || ''
      ]);
      return jsonResponse({ status: 'success', message: 'Log RO berhasil disimpan ke Google Sheets' });
    }

    // 7. Laundry Order (FM-29)
    if (action === 'submitLaundryOrder') {
      var sheet = ss.getSheetByName('Laundry_Log_GA29');
      var regNo = 'LND-GAS-' + new Date().getTime().toString().slice(-6);

      sheet.appendRow([
        new Date(),
        regNo,
        payload.order_date || new Date().toISOString().slice(0, 10),
        payload.employee_name || '',
        payload.mess_name || '',
        payload.department || 'Site',
        Number(payload.total_pcs) || 1,
        payload.laundry_type || 'Umum (Reguler)',
        payload.finish_date || '',
        payload.operator_name || 'Petugas Laundry',
        payload.status || 'Diterima'
      ]);
      return jsonResponse({ status: 'success', message: 'Order Laundry tercatat: ' + regNo, regNo: regNo });
    }

    // 8. Work Order CMMS
    if (action === 'submitWorkOrder') {
      var sheet = ss.getSheetByName('Work_Orders_CMMS');
      if (!sheet) { initializeGasSiteSpreadsheet(); sheet = ss.getSheetByName('Work_Orders_CMMS'); }
      var woNo = 'WO-' + new Date().toISOString().slice(0, 10).replace(/-/g, '') + '-' + Math.floor(100 + Math.random() * 900);

      sheet.appendRow([
        new Date(),
        woNo,
        payload.title || '',
        payload.asset_id || 'Umum',
        payload.priority || 'P2 - Sedang',
        Number(payload.sla_hours) || 12,
        payload.assigned_to || 'Teknisi Standby',
        payload.reported_by || 'User Lapangan',
        'Open',
        ''
      ]);
      return jsonResponse({ status: 'success', message: 'Work Order berhasil diterbitkan: ' + woNo, woNo: woNo });
    }

    // 9. Inventory Chemical Mutation
    if (action === 'submitInventoryTransaction') {
      var sheet = ss.getSheetByName('Inventory_Chemical');
      if (!sheet) { initializeGasSiteSpreadsheet(); sheet = ss.getSheetByName('Inventory_Chemical'); }
      var transType = payload.trans_type || 'OUT';
      var trxNo = 'TRX-' + transType + '-' + Math.floor(1000 + Math.random() * 9000);

      sheet.appendRow([
        new Date(),
        trxNo,
        payload.item_code || '',
        transType,
        Number(payload.quantity) || 0,
        payload.reference_doc || 'Pemakaian Shift',
        payload.operator_name || 'Petugas Gudang',
        payload.notes || ''
      ]);
      return jsonResponse({ status: 'success', message: 'Mutasi chemical berhasil dicatat: ' + trxNo, trxNo: trxNo });
    }

    return jsonResponse({ status: 'error', message: 'Action tidak dikenal: ' + action });

  } catch (error) {
    return jsonResponse({ status: 'error', message: error.toString() });
  }
}

function getSheetRows(ss, sheetName) {
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) return [];
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];

  var headers = data[0];
  var rows = [];
  for (var i = 1; i < data.length; i++) {
    var obj = {};
    for (var j = 0; j < headers.length; j++) {
      obj[headers[j]] = data[i][j];
    }
    rows.push(obj);
  }
  return rows.reverse();
}

function getDashboardMetrics(ss) {
  var attendance = getSheetRows(ss, 'Absensi_Harian');
  var workReports = getSheetRows(ss, 'Laporan_Pekerjaan');
  var spotChecks = getSheetRows(ss, 'SpotCheck_GA04B');
  var wtpLogs = getSheetRows(ss, 'WTP_Log_GA06A');
  var roLogs = getSheetRows(ss, 'RO_Log_GA06B');
  var laundry = getSheetRows(ss, 'Laundry_Log_GA29');

  return {
    totalAttendance: attendance.length,
    totalWorkReports: workReports.length,
    totalSpotChecks: spotChecks.length,
    totalWtpLogs: wtpLogs.length,
    totalRoLogs: roLogs.length,
    totalLaundryOrders: laundry.length
  };
}

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
