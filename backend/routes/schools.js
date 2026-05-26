const express = require('express');
const router  = express.Router();
const path    = require('path');
const fs      = require('fs');
const multer  = require('multer');
const db      = require('../config/db');
const { verifyToken, adminOnly } = require('../middleware/auth');

// ── Multer untuk logo sekolah ─────────────────────────────────
const logoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../uploads/logos');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext    = path.extname(file.originalname);
    const unique = `school-${Date.now()}${ext}`;
    cb(null, unique);
  }
});
const logoFilter = (req, file, cb) => {
  const allowed = ['image/jpeg','image/jpg','image/png','image/webp','image/svg+xml'];
  allowed.includes(file.mimetype)
    ? cb(null, true)
    : cb(new Error('Hanya file gambar yang diizinkan'), false);
};
const uploadLogo = multer({
  storage: logoStorage,
  fileFilter: logoFilter,
  limits: { fileSize: 3 * 1024 * 1024 }
});

// ── GET /api/schools  (publik — dipakai login page, hanya publish) ──
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT s.*, COUNT(u.id) AS jumlah_siswa
      FROM schools s
      LEFT JOIN users u ON u.school_id = s.id
        AND u.role = 'siswa' AND u.is_active = 1
      WHERE s.status = 'publish'
      GROUP BY s.id
      ORDER BY s.is_primary DESC, s.nama_sekolah ASC
    `);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gagal mengambil data sekolah', error: err.message });
  }
});

// ── GET /api/schools/all  (admin — semua termasuk draft) ─────
router.get('/all', verifyToken, adminOnly, async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT s.*, COUNT(u.id) AS jumlah_siswa
      FROM schools s
      LEFT JOIN users u ON u.school_id = s.id AND u.role = 'siswa'
      GROUP BY s.id
      ORDER BY s.is_primary DESC, s.nama_sekolah ASC
    `);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gagal mengambil data sekolah', error: err.message });
  }
});

// ── GET /api/schools/:id ──────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM schools WHERE id = ?', [req.params.id]);
    if (!rows.length)
      return res.status(404).json({ success: false, message: 'Sekolah tidak ditemukan.' });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gagal mengambil detail sekolah' });
  }
});

// ── POST /api/schools ─────────────────────────────────────────
router.post('/', verifyToken, adminOnly, uploadLogo.single('logo'), async (req, res) => {
  try {
    const { nama_sekolah, status } = req.body;
    if (!nama_sekolah)
      return res.status(400).json({ success: false, message: 'Nama sekolah wajib diisi.' });

    const logo = req.file ? req.file.filename : null;

    // Sekolah baru TIDAK bisa langsung jadi primary
    const [result] = await db.query(
      'INSERT INTO schools (nama_sekolah, logo, status, is_primary) VALUES (?, ?, ?, 0)',
      [nama_sekolah.trim(), logo, status || 'publish']
    );
    res.status(201).json({
      success: true,
      message: 'Sekolah berhasil ditambahkan.',
      schoolId: result.insertId
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gagal menambahkan sekolah', error: err.message });
  }
});

// ── PUT /api/schools/:id ──────────────────────────────────────
router.put('/:id', verifyToken, adminOnly, uploadLogo.single('logo'), async (req, res) => {
  try {
    const [existing] = await db.query('SELECT * FROM schools WHERE id = ?', [req.params.id]);
    if (!existing.length)
      return res.status(404).json({ success: false, message: 'Sekolah tidak ditemukan.' });

    const old = existing[0];

    // Proteksi sekolah utama: tidak bisa diubah menjadi draft
    if (old.is_primary && req.body.status === 'draft') {
      return res.status(403).json({
        success: false,
        message: 'Sekolah utama tidak dapat diubah menjadi draft.'
      });
    }

    const { nama_sekolah, status } = req.body;

    let logo = old.logo;
    if (req.file) {
      if (old.logo && old.logo !== 'logo_mts.png') {
        const oldPath = path.join(__dirname, '../uploads/logos', old.logo);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
      logo = req.file.filename;
    }

    await db.query(
      `UPDATE schools
       SET nama_sekolah = ?, logo = ?, status = ?, updated_at = NOW()
       WHERE id = ?`,
      [
        nama_sekolah || old.nama_sekolah,
        logo,
        // Sekolah utama selalu publish
        old.is_primary ? 'publish' : (status || old.status),
        req.params.id
      ]
    );
    res.json({ success: true, message: 'Sekolah berhasil diperbarui.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gagal memperbarui sekolah', error: err.message });
  }
});

// ── DELETE /api/schools/:id ───────────────────────────────────
router.delete('/:id', verifyToken, adminOnly, async (req, res) => {
  try {
    const [existing] = await db.query('SELECT * FROM schools WHERE id = ?', [req.params.id]);
    if (!existing.length)
      return res.status(404).json({ success: false, message: 'Sekolah tidak ditemukan.' });

    // Proteksi sekolah utama: tidak bisa dihapus
    if (existing[0].is_primary) {
      return res.status(403).json({
        success: false,
        message: 'Sekolah utama tidak dapat dihapus.'
      });
    }

    // Cek siswa aktif
    const [[{ total }]] = await db.query(
      "SELECT COUNT(*) AS total FROM users WHERE school_id = ? AND is_active = 1",
      [req.params.id]
    );
    if (total > 0) {
      return res.status(409).json({
        success: false,
        message: `Sekolah tidak dapat dihapus karena masih memiliki ${total} siswa aktif.`
      });
    }

    if (existing[0].logo && existing[0].logo !== 'logo_mts.png') {
      const logoPath = path.join(__dirname, '../uploads/logos', existing[0].logo);
      if (fs.existsSync(logoPath)) fs.unlinkSync(logoPath);
    }

    await db.query('DELETE FROM schools WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Sekolah berhasil dihapus.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gagal menghapus sekolah', error: err.message });
  }
});

module.exports = router;