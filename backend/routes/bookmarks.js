const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { verifyToken } = require('../middleware/auth');

// GET /api/bookmarks  — daftar bookmark user
router.get('/', verifyToken, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT bm.id AS bookmark_id, bm.created_at AS bookmarked_at,
              b.id, b.judul, b.penulis, b.penerbit, b.tahun_terbit,
              b.cover_image, b.file_pdf, c.nama AS kategori_nama
       FROM bookmarks bm
       JOIN books b ON bm.book_id = b.id AND b.is_active = 1
       LEFT JOIN categories c ON b.kategori_id = c.id
       WHERE bm.user_id = ?
       ORDER BY bm.created_at DESC`, [req.user.id]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gagal mengambil bookmark', error: err.message });
  }
});

// POST /api/bookmarks/:bookId  — toggle bookmark
router.post('/:bookId', verifyToken, async (req, res) => {
  try {
    const bookId = req.params.bookId;
    const [exist] = await db.query(
      'SELECT id FROM bookmarks WHERE user_id=? AND book_id=?', [req.user.id, bookId]
    );
    if (exist.length > 0) {
      await db.query('DELETE FROM bookmarks WHERE user_id=? AND book_id=?', [req.user.id, bookId]);
      return res.json({ success: true, bookmarked: false, message: 'Bookmark dihapus.' });
    }
    await db.query('INSERT INTO bookmarks (user_id, book_id) VALUES (?,?)', [req.user.id, bookId]);
    res.json({ success: true, bookmarked: true, message: 'Buku disimpan ke bookmark.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gagal toggle bookmark', error: err.message });
  }
});

// GET /api/bookmarks/check/:bookId
router.get('/check/:bookId', verifyToken, async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT id FROM bookmarks WHERE user_id=? AND book_id=?', [req.user.id, req.params.bookId]
    );
    res.json({ success: true, bookmarked: rows.length > 0 });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gagal cek bookmark' });
  }
});

module.exports = router;