const bcrypt = require('bcrypt');

const SALT_ROUNDS = 10;

async function generateHash() {
  const password = '123';
  const hash = await bcrypt.hash(password, SALT_ROUNDS);

  console.log('Password asli :', password);
  console.log('Hash bcrypt   :', hash);
}

generateHash();