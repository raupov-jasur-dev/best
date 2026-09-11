require('dotenv').config();
const { sequelize, User } = require('../backend/src/models');

async function main() {
  const username = process.argv[2] || 'admin';
  const password = process.argv[3] || 'admin123';
  await sequelize.authenticate();
  await sequelize.sync();
  const existing = await User.findOne({ where: { username } });
  if (existing) {
    console.log('User already exists:', username);
    process.exit(0);
  }
  const user = await User.create({ username, password, role: 'admin' });
  console.log('Admin created:', user.username, '(password:', password + ')');
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
