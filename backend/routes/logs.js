const express = require('express');
const router  = express.Router();
const ExcelJS = require('exceljs');
const db      = require('../config/db');
const { verifyToken, adminOnly } = require('../middleware/auth');

// ── GET /api/logs ─────────────────────────────────────────────
// Hanya tampilkan log dari sekolah dengan status = 'publish'.
// Jika school_id dikirim → tambah filter sekolah spesifik.
router.get('/', verifyToken, adminOnly, async (req, res) => {
  try {
    const { action, kelas, school_id, start_date, end_date, page = 1, limit = 30 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // JOIN schools — hanya sekolah publish
    let where  = `WHERE s.status = 'publish'`;
    const params = [];

    if (school_id) { where += ' AND al.school_id = ?';  params.push(school_id); }
    if (action)    { where += ' AND al.action = ?';      params.push(action); }
    if (kelas)     { where += ' AND u.kelas = ?';        params.push(kelas); }

    if (start_date) {
      where += ' AND DATE(al.created_at) >= STR_TO_DATE(?, "%d/%m/%Y")';
      params.push(start_date);
    }
    if (end_date) {
      where += ' AND DATE(al.created_at) <= STR_TO_DATE(?, "%d/%m/%Y")';
      params.push(end_date);
    }

    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) AS total
       FROM activity_logs al
       LEFT JOIN users   u ON al.user_id   = u.id
       LEFT JOIN schools s ON al.school_id = s.id
       ${where}`,
      params
    );

    const [logs] = await db.query(
      `SELECT al.*,
              u.nama  AS user_nama,
              u.nisn  AS user_nisn,
              u.kelas AS user_kelas,
              b.judul AS book_judul,
              s.nama_sekolah
       FROM activity_logs al
       LEFT JOIN users   u ON al.user_id   = u.id
       LEFT JOIN books   b ON al.book_id   = b.id
       LEFT JOIN schools s ON al.school_id = s.id
       ${where}
       ORDER BY al.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );

    res.json({
      success: true, data: logs,
      pagination: {
        total, page: parseInt(page), limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gagal mengambil log', error: err.message });
  }
});

// ── GET /api/logs/stats/dashboard ────────────────────────────
// Hanya sekolah publish. Jika school_id dikirim → filter 1 sekolah.
router.get('/stats/dashboard', verifyToken, adminOnly, async (req, res) => {
  try {
    const { school_id } = req.query;
    const sid = school_id ? parseInt(school_id) : null;

    // Ambil semua ID sekolah publish
    const [publishRows] = await db.query(
      "SELECT id FROM schools WHERE status = 'publish'"
    );
    const publishIds = publishRows.map(r => r.id);

    if (publishIds.length === 0) {
      return res.json({
        success: true,
        stats: {
          total_buku: 0, total_kategori: 0, total_siswa: 0,
          total_aktivitas: 0, total_download: 0, total_view: 0
        },
        popularBooks: [], dailyActivity: [], recentActivity: []
      });
    }

    // Sekolah yang dipakai untuk filter:
    // sid ada → [sid], tidak ada → semua publishIds
    const useIds = sid ? [sid] : publishIds;
    const ph     = useIds.map(() => '?').join(',');   // placeholder "?,?,?"

    // ── Statistik ──────────────────────────────────────────
    const [[{ total_buku }]]     = await db.query(
      'SELECT COUNT(*) AS total_buku FROM books WHERE is_active = 1'
    );
    const [[{ total_kategori }]] = await db.query(
      'SELECT COUNT(*) AS total_kategori FROM categories'
    );

    // Siswa dari sekolah publish (dan sekolah spesifik jika ada filter)
    const [[{ total_siswa }]] = await db.query(
      `SELECT COUNT(*) AS total_siswa
       FROM users u
       JOIN schools s ON s.id = u.school_id
       WHERE u.role = 'siswa'
         AND u.is_active = 1
         AND u.school_id IN (${ph})
         AND s.status = 'publish'`,
      useIds
    );

    const [[{ total_aktivitas }]] = await db.query(
      `SELECT COUNT(*) AS total_aktivitas
       FROM activity_logs al
       JOIN schools s ON s.id = al.school_id
       WHERE al.school_id IN (${ph})
         AND s.status = 'publish'`,
      useIds
    );

    const [[{ total_download }]] = await db.query(
      `SELECT COUNT(*) AS total_download
       FROM activity_logs al
       JOIN schools s ON s.id = al.school_id
       WHERE al.action = 'download'
         AND al.school_id IN (${ph})
         AND s.status = 'publish'`,
      useIds
    );

    const [[{ total_view }]] = await db.query(
      `SELECT COUNT(*) AS total_view
       FROM activity_logs al
       JOIN schools s ON s.id = al.school_id
       WHERE al.action = 'view'
         AND al.school_id IN (${ph})
         AND s.status = 'publish'`,
      useIds
    );

    // ── Buku terpopuler ─────────────────────────────────────
    const [popularBooks] = await db.query(
      `SELECT b.id, b.judul, b.penulis,
              COUNT(al.id) AS total_akses
       FROM books b
       LEFT JOIN activity_logs al
         ON  b.id = al.book_id
         AND al.action IN ('view', 'download')
         AND al.school_id IN (${ph})
       WHERE b.is_active = 1
       GROUP BY b.id
       ORDER BY total_akses DESC
       LIMIT 5`,
      useIds
    );

    // ── Aktivitas harian 7 hari terakhir ────────────────────
    const [dailyActivity] = await db.query(
      `SELECT DATE(al.created_at) AS tanggal, COUNT(*) AS total
       FROM activity_logs al
       JOIN schools s ON s.id = al.school_id
       WHERE al.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
         AND al.school_id IN (${ph})
         AND s.status = 'publish'
       GROUP BY DATE(al.created_at)
       ORDER BY tanggal ASC`,
      useIds
    );

    // ── Aktivitas terbaru (10 baris) ────────────────────────
    const [recentActivity] = await db.query(
      `SELECT al.*,
              u.nama  AS user_nama,
              b.judul AS book_judul,
              s.nama_sekolah
       FROM activity_logs al
       LEFT JOIN users   u ON al.user_id   = u.id
       LEFT JOIN books   b ON al.book_id   = b.id
       JOIN  schools s ON al.school_id = s.id
       WHERE al.school_id IN (${ph})
         AND s.status = 'publish'
       ORDER BY al.created_at DESC
       LIMIT 10`,
      useIds
    );

    res.json({
      success: true,
      stats: {
        total_buku, total_kategori, total_siswa,
        total_aktivitas, total_download, total_view
      },
      popularBooks, dailyActivity, recentActivity
    });
  } catch (err) {
    console.error('Stats error:', err);
    res.status(500).json({ success: false, message: 'Gagal mengambil statistik', error: err.message });
  }
});

// ── GET /api/logs/export/excel ────────────────────────────────
// Kolom identik dengan PDF: No, Nama Siswa, NISN, Kelas, Aktivitas, Judul Buku, Waktu
router.get('/export/excel', verifyToken, adminOnly, async (req, res) => {
  try {
    const { action, kelas, school_id, start_date, end_date, school_name } = req.query;

    let where  = `WHERE s.status = 'publish'`;
    const params = [];

    if (school_id)  { where += ' AND al.school_id = ?'; params.push(school_id); }
    if (action)     { where += ' AND al.action = ?';    params.push(action); }
    if (kelas)      { where += ' AND u.kelas = ?';      params.push(kelas); }
    if (start_date) {
      where += ' AND DATE(al.created_at) >= STR_TO_DATE(?, "%d/%m/%Y")';
      params.push(start_date);
    }
    if (end_date) {
      where += ' AND DATE(al.created_at) <= STR_TO_DATE(?, "%d/%m/%Y")';
      params.push(end_date);
    }

    // SELECT field sama dengan export/pdf — 7 kolom identik
    const [logs] = await db.query(
      `SELECT al.id,
              u.nama  AS user_nama,
              u.nisn  AS user_nisn,
              u.kelas AS user_kelas,
              al.action,
              b.judul AS book_judul,
              al.created_at
       FROM activity_logs al
       LEFT JOIN users   u ON al.user_id   = u.id
       LEFT JOIN books   b ON al.book_id   = b.id
       JOIN  schools s ON al.school_id = s.id
       ${where}
       ORDER BY al.created_at DESC`,
      params
    );

    const labelSekolah = decodeURIComponent(school_name || 'Semua Sekolah');
    const now          = new Date();
    const tglCetak     = now.toLocaleDateString('id-ID', {
      day: '2-digit', month: 'long', year: 'numeric'
    });
    const jamCetak     = now.toLocaleTimeString('id-ID', {
      hour: '2-digit', minute: '2-digit', hour12: false
    });

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Laporan Aktivitas');

    // ── Baris 1: Judul (identik dengan header PDF baris 1) ──
    ws.mergeCells('A1:G1');
    const r1 = ws.getCell('A1');
    r1.value     = 'LAPORAN AKTIVITAS SISTEM PERPUSTAKAAN DIGITAL';
    r1.font      = { bold: true, size: 13, color: { argb: 'FFFFFFFF' } };
    r1.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0D2F45' } };
    r1.alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getRow(1).height = 22;

    // ── Baris 2: Nama sekolah (identik dengan header PDF baris 2) ──
    ws.mergeCells('A2:G2');
    const r2 = ws.getCell('A2');
    r2.value     = labelSekolah;
    r2.font      = { size: 11, color: { argb: 'FFFFFFFF' } };
    r2.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A5276' } };
    r2.alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getRow(2).height = 18;

    // ── Baris 3: Tanggal cetak + total (identik dengan header PDF baris 3) ──
    ws.mergeCells('A3:G3');
    const r3 = ws.getCell('A3');
    r3.value     = `Dicetak: ${tglCetak} ${jamCetak} WIB   |   Total: ${logs.length} data`;
    r3.font      = { size: 9, italic: true, color: { argb: 'FF64748B' } };
    r3.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
    r3.alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getRow(3).height = 15;

    ws.addRow([]); // baris kosong sebelum header tabel

    // ── 7 kolom identik dengan PDF ──
    ws.columns = [
      { key: 'no',         width: 6  },
      { key: 'nama',       width: 30 },
      { key: 'nisn',       width: 16 },
      { key: 'kelas',      width: 10 },
      { key: 'action',     width: 14 },
      { key: 'book_judul', width: 40 },
      { key: 'waktu',      width: 24 },
    ];

    // ── Header tabel baris 5 ──
    const headerRow = ws.addRow(['No', 'Nama Siswa', 'NISN', 'Kelas', 'Aktivitas', 'Judul Buku', 'Waktu']);
    headerRow.height = 18;
    headerRow.eachCell(cell => {
      cell.font      = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A5276' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border    = { bottom: { style: 'medium', color: { argb: 'FF0D2F45' } } };
    });

    const actionLabels = {
      login: 'Login', logout: 'Logout', view: 'Baca', download: 'Download'
    };

    // ── Data rows — urutan & format identik dengan PDF ──
    logs.forEach((log, i) => {
      const waktuStr = new Date(log.created_at).toLocaleString('id-ID', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      });
      const row = ws.addRow({
        no:         i + 1,
        nama:       log.user_nama  || '-',
        nisn:       log.user_nisn  || '-',
        kelas:      log.user_kelas || '-',
        action:     actionLabels[log.action] || log.action,
        book_judul: log.book_judul || '-',
        waktu:      waktuStr,
      });
      if (i % 2 === 0) {
        row.eachCell(cell => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F4F8' } };
        });
      }
      // Center: No, NISN, Kelas, Aktivitas
      [1, 3, 4, 5].forEach(col => {
        row.getCell(col).alignment = { horizontal: 'center', vertical: 'middle' };
      });
    });

    ws.autoFilter = { from: 'A5', to: 'G5' };

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=laporan-aktivitas-${Date.now()}.xlsx`);
    await wb.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error('Export Excel error:', err);
    res.status(500).json({ success: false, message: 'Gagal export Excel', error: err.message });
  }
});

// ── GET /api/logs/export/pdf ─────────────────────────────────
// Kembalikan JSON — PDF dirender di frontend (jsPDF)
router.get('/export/pdf', verifyToken, adminOnly, async (req, res) => {
  try {
    const { action, kelas, school_id, start_date, end_date, school_name } = req.query;

    let where  = `WHERE s.status = 'publish'`;
    const params = [];

    if (school_id)  { where += ' AND al.school_id = ?'; params.push(school_id); }
    if (action)     { where += ' AND al.action = ?';    params.push(action); }
    if (kelas)      { where += ' AND u.kelas = ?';      params.push(kelas); }
    if (start_date) {
      where += ' AND DATE(al.created_at) >= STR_TO_DATE(?, "%d/%m/%Y")';
      params.push(start_date);
    }
    if (end_date) {
      where += ' AND DATE(al.created_at) <= STR_TO_DATE(?, "%d/%m/%Y")';
      params.push(end_date);
    }

    const [logs] = await db.query(
      `SELECT al.id, u.nama AS user_nama, u.nisn, u.kelas,
              al.action, b.judul AS book_judul, al.created_at,
              s.nama_sekolah
       FROM activity_logs al
       LEFT JOIN users   u ON al.user_id   = u.id
       LEFT JOIN books   b ON al.book_id   = b.id
       JOIN  schools s ON al.school_id = s.id
       ${where}
       ORDER BY al.created_at DESC
       LIMIT 500`,
      params
    );

    const labelSekolah = decodeURIComponent(school_name || 'Semua Sekolah');

    // Format tanggal dan jam untuk header PDF
    const now      = new Date();
    const tglCetak = now.toLocaleDateString('id-ID', {
      day: '2-digit', month: 'long', year: 'numeric'
    });
    const jamCetak = now.toLocaleTimeString('id-ID', {
      hour: '2-digit', minute: '2-digit', hour12: false
    });

    res.json({
      success: true,
      data:  logs,
      meta:  {
        generated_at:  now.toISOString(),
        total:         logs.length,
        // Field yang dibaca frontend Logs.jsx
        nama_sekolah:  labelSekolah,
        label_sekolah: labelSekolah,
        tgl_cetak:     tglCetak,
        jam_cetak:     jamCetak,
        filter:        { action, kelas, school_id, start_date, end_date }
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gagal export PDF', error: err.message });
  }
});

// ── DELETE /api/logs/clear — hapus log lama ───────────────────
router.delete('/clear', verifyToken, adminOnly, async (req, res) => {
  try {
    const { before_date } = req.body;
    let query = 'DELETE FROM activity_logs';
    const params = [];
    if (before_date) {
      query += ' WHERE DATE(created_at) < STR_TO_DATE(?, "%d/%m/%Y")';
      params.push(before_date);
    }
    const [result] = await db.query(query, params);
    res.json({
      success: true,
      message: `${result.affectedRows} log berhasil dihapus.`,
      deleted: result.affectedRows
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gagal menghapus log', error: err.message });
  }
});

// ── POST /api/logs  (log manual dari client — TIDAK DIGUNAKAN LAGI) ──
// Endpoint ini dipertahankan untuk kompatibilitas mundur.
// Log view dan download sekarang dicatat langsung di books.js via JWT.
router.post('/', verifyToken, async (req, res) => {
  try {
    const { book_id, action, detail } = req.body;
    if (!['login','logout','view','download'].includes(action))
      return res.status(400).json({ success: false, message: 'Action tidak valid.' });

    const schoolId = req.user.school_id || null;   // ← selalu dari JWT

    await db.query(
      `INSERT INTO activity_logs
         (user_id, school_id, book_id, action, detail, ip_address)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [req.user.id, schoolId, book_id || null, action, detail || null, req.ip]
    );
    res.json({ success: true, message: 'Log dicatat.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gagal mencatat log' });
  }
});

module.exports = router;