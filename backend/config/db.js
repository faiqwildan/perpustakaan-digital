const mysql = require('mysql2');

const pool = mysql.createPool({
  host:     process.env.DB_HOST     || 'localhost',
  user:     process.env.DB_USER     || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME     || 'perpustakaan_digital',
  port:     process.env.DB_PORT     || 3306,
  waitForConnections: true,
  connectionLimit:    10,
  queueLimit:         0,
  charset:            'utf8mb4'
});

// Test koneksi saat server start
pool.getConnection((err, connection) => {
  if (err) {
    console.error('❌ Koneksi database GAGAL:', err.message);
    return;
  }
  console.log('✅ Database MySQL terhubung!');
  connection.release();
});

module.exports = pool.promise();