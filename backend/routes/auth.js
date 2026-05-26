const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { verifyToken } = require('../middleware/auth');

// POST /api/auth/login  — login dengan NISN + password + school_id (opsional jika 1 sekolah)
router.post('/login', async (req, res) => {
  try {
    const { nisn, password, school_id } = req.body;
    if (!nisn || !password)
      return res.status(400).json({ success: false, message: 'NISN dan password wajib diisi.' });

    // Bangun query: gabung dengan schools untuk cek status
    let query  = `SELECT u.*, s.nama_sekolah, s.logo AS school_logo, s.status AS school_status
                  FROM users u
                  LEFT JOIN schools s ON u.school_id = s.id
                  WHERE u.nisn = ? AND u.is_active = 1`;
    const args = [nisn];
    if (school_id) { query += ' AND u.school_id = ?'; args.push(school_id); }

    const [rows] = await db.query(query, args);
    if (rows.length === 0)
      return res.status(401).json({ success: false, message: 'NISN atau password salah.' });

    const user = rows[0];

    // Blokir siswa dari sekolah draft (admin tetap bisa login)
    if (user.role === 'siswa' && user.school_status === 'draft') {
      return res.status(403).json({
        success: false,
        message: 'Akses sekolah Anda sementara dinonaktifkan. Hubungi administrator.'
      });
    }

    if (!user.password) {
      return res.status(500).json({
        success: false,
        message: 'Password tidak ditemukan di database'
      });
    }
    
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(401).json({ success: false, message: 'NISN atau password salah.' });

    const token = jwt.sign(
      { id: user.id, nisn: user.nisn, role: user.role, nama: user.nama, school_id: user.school_id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    // Log login dengan school_id
    try {
      await db.query(
        'INSERT INTO activity_logs (user_id, school_id, action, detail, ip_address)',
        [user.id, user.school_id, 'login', `${user.nama} login`, req.ip]
      );
    } catch (err) {
      console.log("activity_logs error diabaikan:", err.message);
    }

    res.json({
      success: true, message: 'Login berhasil', token,
      user: {
        id: user.id, nama: user.nama, nisn: user.nisn,
        kelas: user.kelas, role: user.role,
        school_id: user.school_id,
        nama_sekolah: user.nama_sekolah,
        school_logo: user.school_logo,
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, message: 'Gagal login', error: err.message });
  }
});

// GET /api/auth/me
router.get('/me', verifyToken, async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT id, nama, nisn, kelas, role, created_at FROM users WHERE id = ?', [req.user.id]
    );
    if (rows.length === 0)
      return res.status(404).json({ success: false, message: 'User tidak ditemukan.' });
    res.json({ success: true, user: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gagal mengambil data user' });
  }
});

// PUT /api/auth/change-password
router.put('/change-password', verifyToken, async (req, res) => {
  try {
    const { old_password, new_password } = req.body;
    if (!old_password || !new_password)
      return res.status(400).json({ success: false, message: 'Password lama dan baru wajib diisi.' });
    if (new_password.length < 6)
      return res.status(400).json({ success: false, message: 'Password baru minimal 6 karakter.' });

    const [rows] = await db.query('SELECT password FROM users WHERE id = ?', [req.user.id]);
    const isMatch = await bcrypt.compare(old_password, rows[0].password);
    if (!isMatch)
      return res.status(401).json({ success: false, message: 'Password lama tidak cocok.' });

    const hashed = await bcrypt.hash(new_password, 10);
    await db.query('UPDATE users SET password=?, updated_at=NOW() WHERE id=?', [hashed, req.user.id]);
    res.json({ success: true, message: 'Password berhasil diubah.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gagal mengubah password', error: err.message });
  }
});

// POST /api/auth/logout
router.post('/logout', verifyToken, async (req, res) => {
  try {
    await db.query(
      'INSERT INTO activity_logs (user_id, school_id, action, detail, ip_address) VALUES (?,?,?,?,?)',
      [req.user.id, req.user.school_id || null, 'logout', `${req.user.nama} logout dari sistem`, req.ip]
    );
    res.json({ success: true, message: 'Logout berhasil.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gagal logout' });
  }
});

module.exports = router;
