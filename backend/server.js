require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();

// Pastikan folder uploads ada
['uploads/pdf', 'uploads/covers', 'uploads/logos'].forEach(dir => {
  const p = path.join(__dirname, dir);
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
});

// Middleware
app.use(cors({ origin: ['http://localhost:5173','http://localhost:3000'], credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth',       require('./routes/auth'));
app.use('/api/schools',    require('./routes/schools'));
app.use('/api/books',      require('./routes/books'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/users',      require('./routes/users'));
app.use('/api/logs',       require('./routes/logs'));
app.use('/api/bookmarks',  require('./routes/bookmarks'));
app.use('/api/history',    require('./routes/history'));

app.get('/api/health', (_, res) => res.json({ status: 'OK', timestamp: new Date() }));

app.use((req, res) => res.status(404).json({ success: false, message: 'Endpoint tidak ditemukan' }));
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: 'Terjadi kesalahan server', error: err.message });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`\n🚀 Server berjalan di http://localhost:${PORT}`);
  console.log(`📚 MTs Nurul Islam Randudongkal\n`);
});