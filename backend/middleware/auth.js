const jwt = require('jsonwebtoken');

// Verifikasi token
const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ success: false, message: 'Token tidak ditemukan. Silakan login.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ success: false, message: 'Token tidak valid atau sudah kadaluarsa.' });
  }
};

// Hanya admin
const adminOnly = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Akses ditolak. Hanya admin yang diizinkan.' });
  }
  next();
};

// Admin atau siswa (semua yang login)
const allUsers = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Tidak terautentikasi.' });
  }
  next();
};

module.exports = { verifyToken, adminOnly, allUsers };