const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { verifyToken } = require('../middleware/auth');

// GET /api/history  — riwayat baca user (view + download)
router.get('/', verifyToken, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const [[{ total }]] = await db.query(
      `SELECT COUNT(DISTINCT book_id) AS total FROM activity_logs
       WHERE user_id=? AND action IN('view','download') AND book_id IS NOT NULL`,
      [req.user.id]
    );

    const [rows] = await db.query(
      `SELECT b.id, b.judul, b.penulis, b.cover_image, b.file_pdf,
              c.nama AS kategori_nama,
              MAX(al.created_at) AS last_accessed,
              SUM(CASE WHEN al.action='view'     THEN 1 ELSE 0 END) AS view_count,
              SUM(CASE WHEN al.action='download' THEN 1 ELSE 0 END) AS download_count
       FROM activity_logs al
       JOIN books b ON al.book_id = b.id AND b.is_active = 1
       LEFT JOIN categories c ON b.kategori_id = c.id
       WHERE al.user_id=? AND al.action IN('view','download')
       GROUP BY b.id
       ORDER BY last_accessed DESC
       LIMIT ? OFFSET ?`,
      [req.user.id, parseInt(limit), offset]
    );

    res.json({ success: true, data: rows,
      pagination: { total, page: parseInt(page), limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit)) } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gagal mengambil riwayat', error: err.message });
  }
});

module.exports = router;