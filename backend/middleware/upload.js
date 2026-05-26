const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Pastikan direktori ada
const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
};

// Storage untuk PDF
const pdfStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../uploads/pdf');
    ensureDir(dir);
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'book-' + uniqueSuffix + ext);
  }
});

// Storage untuk Cover Image
const coverStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../uploads/covers');
    ensureDir(dir);
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'cover-' + uniqueSuffix + ext);
  }
});

// Filter file PDF
const pdfFilter = (req, file, cb) => {
  if (file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new Error('Hanya file PDF yang diizinkan!'), false);
  }
};

// Filter file gambar
const imageFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Hanya file gambar (jpg, png, webp) yang diizinkan!'), false);
  }
};

// Export upload handlers
const uploadPDF = multer({
  storage: pdfStorage,
  fileFilter: pdfFilter,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB
});

const uploadCover = multer({
  storage: coverStorage,
  fileFilter: imageFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

// Upload keduanya sekaligus (untuk form buku)
const uploadBookFiles = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      let dir;
      if (file.fieldname === 'file_pdf') {
        dir = path.join(__dirname, '../uploads/pdf');
      } else {
        dir = path.join(__dirname, '../uploads/covers');
      }
      ensureDir(dir);
      cb(null, dir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const ext = path.extname(file.originalname);
      const prefix = file.fieldname === 'file_pdf' ? 'book' : 'cover';
      cb(null, `${prefix}-${uniqueSuffix}${ext}`);
    }
  }),
  fileFilter: (req, file, cb) => {
    if (file.fieldname === 'file_pdf' && file.mimetype === 'application/pdf') {
      cb(null, true);
    } else if (file.fieldname === 'cover_image') {
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Format gambar tidak valid'), false);
      }
    } else if (file.fieldname === 'file_pdf') {
      cb(new Error('Hanya file PDF yang diizinkan'), false);
    } else {
      cb(null, true);
    }
  },
  limits: { fileSize: 50 * 1024 * 1024 }
});

module.exports = { uploadPDF, uploadCover, uploadBookFiles };