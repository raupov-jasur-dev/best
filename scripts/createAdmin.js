/**
 * Admin yaratish / parolni yangilash
 *
 * Foydalanish:
 *   node scripts/createAdmin.js
 *   node scripts/createAdmin.js myuser mypass
 *
 * Yoki faqat env:
 *   ADMIN_USERNAME=admin ADMIN_PASSWORD=secret node scripts/createAdmin.js
 */
require('dotenv').config();
const { sequelize, User } = require('../backend/src/models');

async function main() {
  const username =
    process.argv[2] || process.env.ADMIN_USERNAME || process.env.ADMIN_USER || 'admin';
  const password =
    process.argv[3] || process.env.ADMIN_PASSWORD || process.env.ADMIN_PASS || 'admin123';

  console.log('Connecting to database...');
  await sequelize.authenticate();
  await sequelize.sync({ alter: true });

  let user = await User.findOne({ where: { username } });
  if (!user) {
    user = await User.create({ username, password, role: 'admin', isActive: true });
    console.log('✅ Admin yaratildi:', username);
  } else {
    user.password = password;
    user.role = 'admin';
    user.isActive = true;
    await user.save();
    console.log('✅ Admin yangilandi (parol o‘zgardi):', username);
  }
  console.log('Login: username =', username);
  process.exit(0);
}

main().catch((e) => {
  console.error('❌ Xato:', e.message);
  process.exit(1);
});
