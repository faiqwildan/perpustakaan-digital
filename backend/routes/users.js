const express = require('express');
const router  = express.Router();
const bcrypt  = require('bcryptjs');
const multer  = require('multer');
const ExcelJS = require('exceljs');
const db      = require('../config/db');
const { verifyToken, adminOnly } = require('../middleware/auth');

// multer untuk import excel (memory storage)
const xlsUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }
});

const KELAS_LIST = [
  '7A','7B','7C','7D','7E',
  '8A','8B','8C','8D','8E',
  '9A','9B','9C','9D','9E'
];

// ── GET /api/users ─────────────────────────────────────────────
// Hanya tampilkan siswa dari sekolah dengan status = 'publish'.
// Jika school_id dikirim → tambah filter sekolah spesifik.
router.get('/', verifyToken, adminOnly, async (req, res) => {
  try {
    const { search, kelas, school_id, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // JOIN schools agar hanya sekolah publish yang tampil
    let where  = `WHERE u.role = 'siswa'
                    AND s.status = 'publish'`;
    const params = [];

    // Filter sekolah spesifik (dari sidebar admin)
    if (school_id) {
      where += ' AND u.school_id = ?';
      params.push(school_id);
    }

    if (search) {
      where += ' AND (u.nama LIKE ? OR u.nisn LIKE ?)';
      const s = `%${search}%`;
      params.push(s, s);
    }
    if (kelas) {
      where += ' AND u.kelas = ?';
      params.push(kelas);
    }

    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) AS total
       FROM users u
       JOIN schools s ON s.id = u.school_id
       ${where}`,
      params
    );

    const [users] = await db.query(
      `SELECT u.id, u.nama, u.nisn, u.kelas, u.school_id,
              u.is_active, u.created_at,
              s.nama_sekolah
       FROM users u
       JOIN schools s ON s.id = u.school_id
       ${where}
       ORDER BY s.nama_sekolah ASC, u.kelas ASC, u.nama ASC
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );

    res.json({
      success: true, data: users,
      pagination: {
        total, page: parseInt(page), limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gagal mengambil data siswa', error: err.message });
  }
});

// ── POST /api/users ────────────────────────────────────────────
router.post('/', verifyToken, adminOnly, async (req, res) => {
  try {
    const { nama, nisn, password, kelas, school_id } = req.body;
    if (!nama || !nisn || !password)
      return res.status(400).json({ success: false, message: 'Nama, NISN, dan password wajib diisi.' });
    if (!school_id)
      return res.status(400).json({ success: false, message: 'Sekolah wajib dipilih.' });

    // Validasi NISN: hanya angka, tepat 10 digit
    if (!/^\d+$/.test(nisn))
      return res.status(400).json({ success: false, message: 'NISN hanya boleh berisi angka.' });
    if (nisn.length !== 10)
      return res.status(400).json({
        success: false,
        message: `NISN harus tepat 10 digit (saat ini ${nisn.length} digit).`
      });

    // Validasi password
    if (password.length < 8)
      return res.status(400).json({ success: false, message: 'Password minimal 8 karakter.' });
    if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password))
      return res.status(400).json({ success: false, message: 'Password harus mengandung huruf dan angka.' });

    // Pastikan sekolah publish
    const [schoolCheck] = await db.query(
      "SELECT id FROM schools WHERE id = ? AND status = 'publish'",
      [school_id]
    );
    if (!schoolCheck.length)
      return res.status(400).json({ success: false, message: 'Sekolah tidak ditemukan atau tidak aktif.' });

    const [exist] = await db.query('SELECT id FROM users WHERE nisn = ?', [nisn]);
    if (exist.length > 0)
      return res.status(409).json({ success: false, message: 'NISN sudah terdaftar.' });

    const hashed = await bcrypt.hash(password, 10);
    const [result] = await db.query(
      'INSERT INTO users (nama, nisn, password, kelas, school_id, role) VALUES (?,?,?,?,?,?)',
      [nama, nisn, hashed, kelas || null, school_id, 'siswa']
    );
    res.status(201).json({ success: true, message: 'Siswa berhasil ditambahkan.', userId: result.insertId });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gagal menambahkan siswa', error: err.message });
  }
});

// ── PUT /api/users/:id ─────────────────────────────────────────
router.put('/:id', verifyToken, adminOnly, async (req, res) => {
  try {
    const { nama, nisn, password, kelas, is_active } = req.body;
    const [existing] = await db.query('SELECT * FROM users WHERE id = ?', [req.params.id]);
    if (existing.length === 0)
      return res.status(404).json({ success: false, message: 'Siswa tidak ditemukan.' });

    if (nisn && nisn !== existing[0].nisn) {
      if (!/^\d+$/.test(nisn))
        return res.status(400).json({ success: false, message: 'NISN hanya boleh berisi angka.' });
      if (nisn.length !== 10)
        return res.status(400).json({
          success: false,
          message: `NISN harus tepat 10 digit (saat ini ${nisn.length} digit).`
        });
      const [dup] = await db.query(
        'SELECT id FROM users WHERE nisn = ? AND id != ?', [nisn, req.params.id]
      );
      if (dup.length > 0)
        return res.status(409).json({ success: false, message: 'NISN sudah digunakan.' });
    }

    if (password) {
      if (password.length < 8)
        return res.status(400).json({ success: false, message: 'Password minimal 8 karakter.' });
      if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password))
        return res.status(400).json({ success: false, message: 'Password harus mengandung huruf dan angka.' });
    }

    let hashed = existing[0].password;
    if (password) hashed = await bcrypt.hash(password, 10);

    await db.query(
      `UPDATE users
       SET nama=?, nisn=?, password=?, kelas=?, is_active=?, updated_at=NOW()
       WHERE id=?`,
      [
        nama      || existing[0].nama,
        nisn      || existing[0].nisn,
        hashed,
        kelas     !== undefined ? kelas     : existing[0].kelas,
        is_active !== undefined ? is_active : existing[0].is_active,
        req.params.id
      ]
    );
    res.json({ success: true, message: 'Siswa berhasil diperbarui.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gagal memperbarui siswa', error: err.message });
  }
});

// ── DELETE /api/users/:id  (hapus permanen) ────────────────────
router.delete('/:id', verifyToken, adminOnly, async (req, res) => {
  try {
    if (parseInt(req.params.id) === req.user.id)
      return res.status(400).json({ success: false, message: 'Tidak dapat menghapus akun sendiri.' });

    const [exist] = await db.query('SELECT id, role FROM users WHERE id = ?', [req.params.id]);
    if (exist.length === 0)
      return res.status(404).json({ success: false, message: 'Siswa tidak ditemukan.' });
    if (exist[0].role === 'admin')
      return res.status(403).json({ success: false, message: 'Akun admin tidak dapat dihapus.' });

    await db.query('DELETE FROM users WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Siswa berhasil dihapus.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gagal menghapus siswa', error: err.message });
  }
});

// ── POST /api/users/import  — bulk import Excel ────────────────
router.post('/import', verifyToken, adminOnly,
  xlsUpload.single('file'),
  async (req, res) => {
    try {
      if (!req.file)
        return res.status(400).json({ success: false, message: 'File Excel wajib diunggah.' });

      const school_id = req.query.school_id || req.body.school_id || null;
      if (!school_id)
        return res.status(400).json({ success: false, message: 'school_id wajib disertakan.' });

      // Pastikan sekolah ada dan publish
      const [schoolCheck] = await db.query(
        "SELECT id FROM schools WHERE id = ? AND status = 'publish'",
        [school_id]
      );
      if (!schoolCheck.length)
        return res.status(404).json({ success: false, message: 'Sekolah tidak ditemukan atau tidak aktif.' });

      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(req.file.buffer);
      const sheet = workbook.worksheets[0];

      if (!sheet || sheet.rowCount < 2)
        return res.status(400).json({ success: false, message: 'Sheet kosong atau tidak ada data.' });

      let inserted = 0, skipped = 0;
      const errors = [];

      const isOnlyDigits = (s) => /^\d+$/.test(s);
      const hasLetter    = (s) => /[A-Za-z]/.test(s);
      const hasDigit     = (s) => /[0-9]/.test(s);

      for (let i = 2; i <= sheet.rowCount; i++) {
        const row     = sheet.getRow(i);
        const nama    = (row.getCell(1).value ?? '').toString().trim();
        const nisnRaw = (row.getCell(2).value ?? '').toString().trim();
        const kelas   = (row.getCell(3).value ?? '').toString().trim();
        const pass    = (row.getCell(4).value ?? '').toString().trim();

        if (!nama && !nisnRaw && !kelas && !pass) continue;

        const rowErrors = [];

        if (!nama)
          rowErrors.push('nama tidak boleh kosong');

        if (!nisnRaw) {
          rowErrors.push('NISN tidak boleh kosong');
        } else if (!isOnlyDigits(nisnRaw)) {
          rowErrors.push(`NISN "${nisnRaw}" hanya boleh berisi angka`);
        } else if (nisnRaw.length !== 10) {
          rowErrors.push(`NISN "${nisnRaw}" harus tepat 10 digit (saat ini ${nisnRaw.length} digit)`);
        }

        if (!kelas) {
          rowErrors.push('kelas wajib diisi');
        } else if (!KELAS_LIST.includes(kelas)) {
          rowErrors.push(`kelas "${kelas}" tidak valid (gunakan: 7A-7E, 8A-8E, 9A-9E)`);
        }

        if (!pass) {
          rowErrors.push('password tidak boleh kosong');
        } else if (pass.length < 8) {
          rowErrors.push('password minimal 8 karakter');
        } else if (!hasLetter(pass)) {
          rowErrors.push('password harus mengandung huruf');
        } else if (!hasDigit(pass)) {
          rowErrors.push('password harus mengandung angka');
        }

        if (rowErrors.length > 0) {
          errors.push(`Baris ${i} (${nama || 'tanpa nama'}): ${rowErrors.join('; ')}`);
          skipped++;
          continue;
        }

        const [exist] = await db.query('SELECT id FROM users WHERE nisn = ?', [nisnRaw]);
        if (exist.length > 0) {
          errors.push(`Baris ${i} (${nama}): NISN ${nisnRaw} sudah terdaftar`);
          skipped++;
          continue;
        }

        const hashed = await bcrypt.hash(pass, 10);
        await db.query(
          'INSERT INTO users (nama, nisn, password, kelas, school_id, role) VALUES (?,?,?,?,?,?)',
          [nama, nisnRaw, hashed, kelas, school_id, 'siswa']
        );
        inserted++;
      }

      res.json({
        success: true,
        message: `Import selesai: ${inserted} berhasil, ${skipped} dilewati.`,
        inserted, skipped, errors,
      });
    } catch (err) {
      console.error('Import error:', err);
      res.status(500).json({ success: false, message: 'Gagal import data', error: err.message });
    }
  }
);

// ── GET /api/users/template-excel — download template ─────────
router.get('/template-excel', verifyToken, adminOnly, async (req, res) => {
  try {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Data Siswa');

    ws.columns = [
      { header: 'Nama Lengkap', key: 'nama',  width: 30 },
      { header: 'NISN (10 digit)', key: 'nisn', width: 20 },
      { header: 'Kelas',        key: 'kelas', width: 10 },
      { header: 'Password',     key: 'pass',  width: 20 },
    ];

    ws.getRow(1).eachCell(cell => {
      cell.font      = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A5276' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });

    ws.addRow({ nama: 'Ahmad Fauzi', nisn: '1234567890', kelas: '7A', pass: 'password123' });
    ws.addRow({ nama: 'Siti Rahayu', nisn: '0987654321', kelas: '8B', pass: 'password123' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=template-import-siswa.xlsx');
    await wb.xlsx.write(res);
    res.end();
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gagal membuat template', error: err.message });
  }
});

// ── POST /api/users/naik-kelas — Tahun Ajaran Baru ────────────
router.post('/naik-kelas', verifyToken, adminOnly, async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const [del] = await conn.query(
      "DELETE FROM users WHERE role='siswa' AND kelas LIKE '9%'"
    );
    await conn.query(`
      UPDATE users SET kelas = CONCAT('9', SUBSTRING(kelas, 2)), updated_at=NOW()
      WHERE role='siswa' AND kelas LIKE '8%'
    `);
    await conn.query(`
      UPDATE users SET kelas = CONCAT('8', SUBSTRING(kelas, 2)), updated_at=NOW()
      WHERE role='siswa' AND kelas LIKE '7%'
    `);

    await conn.commit();
    res.json({
      success: true,
      message: `Tahun ajaran baru berhasil diproses. ${del.affectedRows} siswa kelas 9 dihapus (lulus).`
    });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ success: false, message: 'Gagal proses tahun ajaran baru', error: err.message });
  } finally {
    conn.release();
  }
});

module.exports = router;