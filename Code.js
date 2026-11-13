/**
 * ============================================================================
 * GASITE: GENERAL AFFAIRS SITE MANAGEMENT SYSTEM (GOOGLE APPS SCRIPT)
 * PT. PRATAMA NUSANTARA SAKTI (PT. PNS)
 * 
 * Standards: SNI ISO 9001:2015, SMK3 PP No. 50/2012, Prinsip 6S
 * Modules: Housekeeping (GA-03), WTP (GA-04A), RO (GA-04B), Laundry (GA-06)
 * ============================================================================
 */

// Configuration: Bind to active spreadsheet or create if standalone
function getDatabase() {
  try {
    return SpreadsheetApp.getActiveSpreadsheet();
  } catch (err) {
    // If running as standalone script, bind to default property or create
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
    'Satisfaction_GA16': [
      'Timestamp', 'Tanggal_Survei', 'Nama_Karyawan', 'Departemen', 'Lokasi', 
      'Peraturan_A', 'Peraturan_B', 'Komunikasi_A', 'Komunikasi_B', 
      'Kerjasama_A', 'Kerjasama_B', 'Pelayanan_A', 'Pelayanan_B', 
      'Rata_Rata_Skor', 'Masukan_Saran'
    ]
  };

  for (var sheetName in schemas) {
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      sheet.appendRow(schemas[sheetName]);
      sheet.getRange(1, 1, 1, schemas[sheetName].length).setFontWeight('bold').setBackground('#0f172a').setFontColor('#ffffff');
      sheet.setFrozenRows(1);
    }
  }

  return { status: 'success', message: 'Spreadsheet GASITE berhasil diinisialisasi', spreadsheetUrl: ss.getUrl() };
}

/**
 * Web App Entry Point: Handles GET Requests
 */
function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) ? e.parameter.action : 'ping';
  var ss = getDatabase();

  if (action === 'getDashboardData') {
    return jsonResponse(getDashboardMetrics(ss));
  } else if (action === 'getSpotChecks') {
    return jsonResponse(getSheetRows(ss, 'SpotCheck_GA04B'));
  } else if (action === 'getWtpLogs') {
    return jsonResponse(getSheetRows(ss, 'WTP_Log_GA06A'));
  } else if (action === 'getRoLogs') {
    return jsonResponse(getSheetRows(ss, 'RO_Log_GA06B'));
  } else if (action === 'getLaundryOrders') {
    return jsonResponse(getSheetRows(ss, 'Laundry_Log_GA29'));
  } else if (action === 'init') {
    return jsonResponse(initializeGasSiteSpreadsheet());
  }

  return jsonResponse({
    status: 'online',
    app: 'GASITE Google Apps Script Backend',
    company: 'PT. Pratama Nusantara Sakti',
    version: '1.0.0',
    time: new Date().toISOString()
  });
}

/**
 * Web App Entry Point: Handles POST Requests
 */
function doPost(e) {
  try {
    var payload = {};
    if (e.postData && e.postData.contents) {
      payload = JSON.parse(e.postData.contents);
    } else {
      payload = e.parameter || {};
    }

    var action = payload.action;
    var ss = getDatabase();
    initializeGasSiteSpreadsheet(); // Ensure tables exist

    if (action === 'submitSpotCheck') {
      var sheet = ss.getSheetByName('SpotCheck_GA04B');
      sheet.appendRow([
        new Date(), payload.check_date || new Date().toISOString().slice(0, 10),
        payload.shift || 'Pagi', payload.area || 'Office', payload.inspector || 'Staff GA',
        payload.item_code || 'SC-' + new Date().getTime(), payload.item_name || '',
        payload.is_ok ? 'OK' : 'TIDAK OK', payload.notes_action || ''
      ]);
      return jsonResponse({ status: 'success', message: 'Spot Check berhasil disimpan ke Google Sheets' });
    }

    if (action === 'submitWtpLog') {
      var sheet = ss.getSheetByName('WTP_Log_GA06A');
      var init = Number(payload.initial_stock) || 0;
      var prod = Number(payload.production_vol) || 0;
      var dist = Number(payload.distributed_vol) || 0;
      var finalStock = init + prod - dist;

      sheet.appendRow([
        new Date(), payload.op_date || new Date().toISOString().slice(0, 10),
        payload.shift || 'Pagi', payload.operator_name || 'Operator WTP',
        payload.supervisor_name || 'Budi Santoso', payload.water_source || 'Sumur Bor',
        init, prod, payload.op_start || '06:00', payload.op_end || '14:00',
        dist, finalStock, Number(payload.pac_usage) || 0, Number(payload.chlorine_usage) || 0,
        payload.remarks || ''
      ]);
      return jsonResponse({ status: 'success', message: 'Log WTP berhasil disimpan ke Google Sheets' });
    }

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
        new Date(), payload.op_date || new Date().toISOString().slice(0, 10),
        payload.shift || 'Pagi', payload.operator_name || 'Operator RO',
        payload.supervisor_name || 'Budi Santoso', init, prod,
        payload.op_start || '07:00', payload.op_end || '13:00', dist,
        finalStock, Number(payload.feed_pressure) || 12.0, perm, rej,
        recovery + '%', payload.remarks || ''
      ]);
      return jsonResponse({ status: 'success', message: 'Log RO berhasil disimpan ke Google Sheets' });
    }

    if (action === 'submitLaundryOrder') {
      var sheet = ss.getSheetByName('Laundry_Log_GA29');
      var regNo = 'LND-GAS-' + new Date().getTime().toString().slice(-6);

      sheet.appendRow([
        new Date(), regNo, payload.order_date || new Date().toISOString().slice(0, 10),
        payload.employee_name || '', payload.mess_name || '', payload.department || 'Site',
        Number(payload.total_pcs) || 1, payload.laundry_type || 'Umum (Reguler)',
        payload.finish_date || '', payload.operator_name || 'Petugas Laundry',
        payload.status || 'Diterima'
      ]);
      return jsonResponse({ status: 'success', message: 'Order Laundry tercatat: ' + regNo, regNo: regNo });
    }

    if (action === 'submitSatisfaction') {
      var sheet = ss.getSheetByName('Satisfaction_GA16');
      var scores = [
        Number(payload.rule_a) || 4, Number(payload.rule_b) || 4,
        Number(payload.comm_a) || 4, Number(payload.comm_b) || 4,
        Number(payload.team_a) || 4, Number(payload.team_b) || 4,
        Number(payload.serv_a) || 4, Number(payload.serv_b) || 4
      ];
      var avg = (scores.reduce(function(a, b){ return a + b; }, 0) / scores.length).toFixed(2);

      sheet.appendRow([
        new Date(), payload.survey_date || new Date().toISOString().slice(0, 10),
        payload.employee_name || 'Anonim', payload.department || 'Site', payload.office_location || 'Main Site',
        scores[0], scores[1], scores[2], scores[3], scores[4], scores[5], scores[6], scores[7],
        avg, payload.suggestions || ''
      ]);
      return jsonResponse({ status: 'success', message: 'Survei kepuasan FM-16 berhasil dikirim ke Google Sheets', score: avg });
    }

    return jsonResponse({ status: 'error', message: 'Action tidak dikenal: ' + action });

  } catch (error) {
    return jsonResponse({ status: 'error', message: error.toString() });
  }
}

/**
 * Helper: Extract rows as JSON array of objects
 */
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
  return rows.reverse(); // Most recent first
}

/**
 * Helper: Dashboard metrics computation
 */
function getDashboardMetrics(ss) {
  var spotChecks = getSheetRows(ss, 'SpotCheck_GA04B');
  var wtpLogs = getSheetRows(ss, 'WTP_Log_GA06A');
  var roLogs = getSheetRows(ss, 'RO_Log_GA06B');
  var laundry = getSheetRows(ss, 'Laundry_Log_GA29');

  return {
    totalSpotChecks: spotChecks.length,
    totalWtpLogs: wtpLogs.length,
    totalRoLogs: roLogs.length,
    totalLaundryOrders: laundry.length,
    latestSpotChecks: spotChecks.slice(0, 5),
    latestWtpLogs: wtpLogs.slice(0, 5),
    latestRoLogs: roLogs.slice(0, 5)
  };
}

/**
 * Helper: JSON Response builder for Google Web Apps
 */
function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

