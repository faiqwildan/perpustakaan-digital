const express = require('express');
const router  = express.Router();
const db      = require('../config/db');
const supabase = require('../config/supabase');
const { verifyToken, adminOnly } = require('../middleware/auth');
const { uploadBookFiles }        = require('../middleware/upload');

// ── GET /api/books ────────────────────────────────────────────
router.get('/', verifyToken, async (req, res) => {
  try {
    const { search, kategori_id, page = 1, limit = 12 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    let where  = 'WHERE b.is_active = 1';
    const params = [];

    if (search) {
      where += ' AND (b.judul LIKE ? OR b.penulis LIKE ? OR b.penerbit LIKE ?)';
      const s = `%${search}%`;
      params.push(s, s, s);
    }
    if (kategori_id) { where += ' AND b.kategori_id = ?'; params.push(kategori_id); }

    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) AS total FROM books b
       LEFT JOIN categories c ON b.kategori_id = c.id ${where}`,
      params
    );
    const [books] = await db.query(
      `SELECT b.*, c.nama AS kategori_nama
       FROM books b
       LEFT JOIN categories c ON b.kategori_id = c.id
       ${where}
       ORDER BY b.created_at DESC LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );

    res.json({
      success: true, data: books,
      pagination: {
        total, page: parseInt(page), limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gagal mengambil data buku', error: err.message });
  }
});

// ── GET /api/books/:id ────────────────────────────────────────
// Tidak log view di sini — log HANYA saat klik "Baca Online"
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT b.*, c.nama AS kategori_nama
       FROM books b
       LEFT JOIN categories c ON b.kategori_id = c.id
       WHERE b.id = ? AND b.is_active = 1`,
      [req.params.id]
    );
    if (rows.length === 0)
      return res.status(404).json({ success: false, message: 'Buku tidak ditemukan.' });

    const [bm] = await db.query(
      'SELECT id FROM bookmarks WHERE user_id = ? AND book_id = ?',
      [req.user.id, req.params.id]
    );

    res.json({ success: true, data: { ...rows[0], is_bookmarked: bm.length > 0 } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gagal mengambil detail buku' });
  }
});

// ── POST /api/books/:id/log-view ──────────────────────────────
// Dipanggil saat siswa klik "Baca Online" di BookDetail.
// school_id diambil dari JWT (req.user.school_id), bukan dari body.
router.post('/:id/log-view', verifyToken, async (req, res) => {
  try {
    const bookId   = req.params.id;
    const userId   = req.user.id;
    const schoolId = req.user.school_id || null;   // ← dari JWT

    const [rows] = await db.query(
      'SELECT judul FROM books WHERE id = ? AND is_active = 1',
      [bookId]
    );
    if (rows.length === 0)
      return res.status(404).json({ success: false, message: 'Buku tidak ditemukan.' });

    await db.query(
      `INSERT INTO activity_logs
         (user_id, school_id, book_id, action, detail, ip_address)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [userId, schoolId, bookId, 'view', `Membaca: ${rows[0].judul}`, req.ip]
    );

    res.json({ success: true, message: 'Log view dicatat.' });
  } catch (err) {
    console.error('log-view error:', err);
    res.status(500).json({ success: false, message: 'Gagal mencatat log view' });
  }
});

// ── POST /api/books  (admin only) ────────────────────────────
router.post('/', verifyToken, adminOnly,
  uploadBookFiles.fields([
    { name: 'file_pdf',     maxCount: 1 },
    { name: 'cover_image',  maxCount: 1 }
  ]),
  async (req, res) => {
    try {
      const { judul, penulis, penerbit, tahun_terbit, kategori_id, deskripsi } = req.body;
      if (!judul || !penulis)
        return res.status(400).json({ success: false, message: 'Judul dan penulis wajib diisi.' });
      if (!req.files?.['file_pdf'])
        return res.status(400).json({ success: false, message: 'File PDF wajib diunggah.' });

      const pdfFile = req.files['file_pdf'][0];

const pdfName = `${Date.now()}-${pdfFile.originalname}`;

const { error: pdfError } = await supabase.storage
  .from('books-pdf')
  .upload(pdfName, pdfFile.buffer, {
    contentType: pdfFile.mimetype
  });

if (pdfError) {
  return res.status(500).json({
    success: false,
    message: pdfError.message
  });
}

const filePdf =
  `${process.env.SUPABASE_URL}/storage/v1/object/public/books-pdf/${pdfName}`;

let coverImage = null;

if (req.files?.['cover_image']) {

  const coverFile = req.files['cover_image'][0];

  const coverName = `${Date.now()}-${coverFile.originalname}`;

  const { error: coverError } = await supabase.storage
    .from('book-covers')
    .upload(coverName, coverFile.buffer, {
      contentType: coverFile.mimetype
    });

  if (!coverError) {
    coverImage =
      `${process.env.SUPABASE_URL}/storage/v1/object/public/book-covers/${coverName}`;
  }
}

      const [result] = await db.query(
        `INSERT INTO books
           (judul, penulis, penerbit, tahun_terbit, kategori_id, deskripsi, file_pdf, cover_image)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [judul, penulis, penerbit || null, tahun_terbit || null,
         kategori_id || null, deskripsi || null, filePdf, coverImage]
      );
      res.status(201).json({ success: true, message: 'Buku berhasil ditambahkan.', bookId: result.insertId });
    } catch (err) {
      res.status(500).json({ success: false, message: 'Gagal menambahkan buku', error: err.message });
    }
  }
);

// ── PUT /api/books/:id  (admin only) ─────────────────────────
router.put('/:id', verifyToken, adminOnly,
  uploadBookFiles.fields([
    { name: 'file_pdf',    maxCount: 1 },
    { name: 'cover_image', maxCount: 1 }
  ]),
  async (req, res) => {
    try {
      const [existing] = await db.query('SELECT * FROM books WHERE id = ?', [req.params.id]);
      if (existing.length === 0)
        return res.status(404).json({ success: false, message: 'Buku tidak ditemukan.' });
      const old = existing[0];

      let filePdf    = old.file_pdf;
      let coverImage = old.cover_image;

      if (req.files?.['file_pdf']) {

  const pdfFile = req.files['file_pdf'][0];

  const pdfName = `${Date.now()}-${pdfFile.originalname}`;

  const { error } = await supabase.storage
    .from('books-pdf')
    .upload(pdfName, pdfFile.buffer, {
      contentType: pdfFile.mimetype
    });

  if (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }

  filePdf =
    `${process.env.SUPABASE_URL}/storage/v1/object/public/books-pdf/${pdfName}`;
}
      if (req.files?.['cover_image']) {

  const coverFile = req.files['cover_image'][0];

  const coverName = `${Date.now()}-${coverFile.originalname}`;

  const { error } = await supabase.storage
    .from('book-covers')
    .upload(coverName, coverFile.buffer, {
      contentType: coverFile.mimetype
    });

  if (!error) {
    coverImage =
      `${process.env.SUPABASE_URL}/storage/v1/object/public/book-covers/${coverName}`;
  }
}

      const { judul, penulis, penerbit, tahun_terbit, kategori_id, deskripsi } = req.body;
      await db.query(
        `UPDATE books
         SET judul=?, penulis=?, penerbit=?, tahun_terbit=?, kategori_id=?,
             deskripsi=?, file_pdf=?, cover_image=?, updated_at=NOW()
         WHERE id=?`,
        [
          judul       || old.judul,
          penulis     || old.penulis,
          penerbit    || old.penerbit,
          tahun_terbit|| old.tahun_terbit,
          kategori_id || old.kategori_id,
          deskripsi   || old.deskripsi,
          filePdf, coverImage, req.params.id
        ]
      );
      res.json({ success: true, message: 'Buku berhasil diperbarui.' });
    } catch (err) {
      res.status(500).json({ success: false, message: 'Gagal memperbarui buku', error: err.message });
    }
  }
);

// ── DELETE /api/books/:id  (admin only, soft delete) ─────────
router.delete('/:id', verifyToken, adminOnly, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT id FROM books WHERE id = ?', [req.params.id]);
    if (rows.length === 0)
      return res.status(404).json({ success: false, message: 'Buku tidak ditemukan.' });
    await db.query('UPDATE books SET is_active = 0 WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Buku berhasil dihapus.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gagal menghapus buku', error: err.message });
  }
});

// ── GET /api/books/:id/download ───────────────────────────────
// school_id diambil dari JWT (req.user.school_id), bukan dari body/query.
router.get('/:id/download', verifyToken, async (req, res) => {
  try {
    const userId   = req.user.id;
    const schoolId = req.user.school_id || null;   // ← dari JWT

    const [rows] = await db.query(
      'SELECT * FROM books WHERE id = ? AND is_active = 1',
      [req.params.id]
    );
    if (rows.length === 0)
      return res.status(404).json({ success: false, message: 'Buku tidak ditemukan.' });

    const book     = rows[0];
    const filePath = path.join(__dirname, '../uploads/pdf', book.file_pdf);

if (!fs.existsSync(filePath))
  return res.status(404).json({ success: false, message: 'File PDF tidak ditemukan di server.' });
    if (!fs.existsSync(filePath))
      return res.status(404).json({ success: false, message: 'File PDF tidak ditemukan di server.' });

    // Log download — school_id dari JWT
    await db.query(
      `INSERT INTO activity_logs
         (user_id, school_id, book_id, action, detail, ip_address)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [userId, schoolId, book.id, 'download', `Download: ${book.judul}`, req.ip]
    );

    res.redirect(book.file_pdf);
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gagal mengunduh buku', error: err.message });
  }
});

module.exports = router;
