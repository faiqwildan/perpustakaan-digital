const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { verifyToken, adminOnly } = require('../middleware/auth');

// ── GET /api/categories ───────────────────────────────────────
router.get('/', verifyToken, async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT c.*, COUNT(b.id) AS jumlah_buku
      FROM categories c
      LEFT JOIN books b ON c.id = b.kategori_id AND b.is_active = 1
      GROUP BY c.id
      ORDER BY c.nama ASC
    `);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gagal mengambil data kategori', error: err.message });
  }
});

// ── GET /api/categories/:id ───────────────────────────────────
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM categories WHERE id = ?', [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Kategori tidak ditemukan.' });
    }
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gagal mengambil detail kategori' });
  }
});

// ── POST /api/categories ──────────────────────────────────────
router.post('/', verifyToken, adminOnly, async (req, res) => {
  try {
    const { nama, deskripsi } = req.body;
    if (!nama) {
      return res.status(400).json({ success: false, message: 'Nama kategori wajib diisi.' });
    }

    // Cek duplikat
    const [exist] = await db.query('SELECT id FROM categories WHERE nama = ?', [nama]);
    if (exist.length > 0) {
      return res.status(409).json({ success: false, message: 'Nama kategori sudah ada.' });
    }

    const [result] = await db.query(
      'INSERT INTO categories (nama, deskripsi) VALUES (?, ?)',
      [nama, deskripsi || null]
    );

    res.status(201).json({
      success: true,
      message: 'Kategori berhasil ditambahkan.',
      categoryId: result.insertId
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gagal menambahkan kategori', error: err.message });
  }
});

// ── PUT /api/categories/:id ───────────────────────────────────
router.put('/:id', verifyToken, adminOnly, async (req, res) => {
  try {
    const { nama, deskripsi } = req.body;
    const catId = req.params.id;

    const [exist] = await db.query('SELECT * FROM categories WHERE id = ?', [catId]);
    if (exist.length === 0) {
      return res.status(404).json({ success: false, message: 'Kategori tidak ditemukan.' });
    }

    await db.query(
      'UPDATE categories SET nama=?, deskripsi=?, updated_at=NOW() WHERE id=?',
      [nama || exist[0].nama, deskripsi !== undefined ? deskripsi : exist[0].deskripsi, catId]
    );

    res.json({ success: true, message: 'Kategori berhasil diperbarui.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gagal memperbarui kategori', error: err.message });
  }
});

// ── DELETE /api/categories/:id ────────────────────────────────
router.delete('/:id', verifyToken, adminOnly, async (req, res) => {
  try {
    const [exist] = await db.query('SELECT * FROM categories WHERE id = ?', [req.params.id]);
    if (exist.length === 0) {
      return res.status(404).json({ success: false, message: 'Kategori tidak ditemukan.' });
    }

    // Cek apakah ada buku yang pakai kategori ini
    const [books] = await db.query(
      'SELECT COUNT(*) AS total FROM books WHERE kategori_id = ? AND is_active = 1',
      [req.params.id]
    );

    if (books[0].total > 0) {
      return res.status(409).json({
        success: false,
        message: `Kategori tidak dapat dihapus karena masih digunakan oleh ${books[0].total} buku.`
      });
    }

    await db.query('DELETE FROM categories WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Kategori berhasil dihapus.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gagal menghapus kategori', error: err.message });
  }
});

module.exports = router;