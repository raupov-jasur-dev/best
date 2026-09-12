const app = require('./app');
const { sequelize, User } = require('./models');
const config = require('./config');

/**
 * Railway / production da ADMIN_USERNAME + ADMIN_PASSWORD env orqali
 * admin avtomatik yaratiladi yoki paroli yangilanadi.
 */
async function ensureAdminFromEnv() {
  const username = process.env.ADMIN_USERNAME || process.env.ADMIN_USER;
  const password = process.env.ADMIN_PASSWORD || process.env.ADMIN_PASS;

  if (!username || !password) {
    console.log(
      '[admin] ADMIN_USERNAME / ADMIN_PASSWORD o‘rnatilmagan. ' +
        'Admin yaratish uchun Railway Variables ga qo‘ying yoki: node scripts/createAdmin.js user pass'
    );
    return;
  }

  try {
    let user = await User.findOne({ where: { username } });
    if (!user) {
      user = await User.create({
        username,
        password,
        role: 'admin',
        isActive: true
      });
      console.log(`[admin] Yangi admin yaratildi: ${username}`);
    } else {
      // Parolni env dagi qiymatga yangilash (Railway da oson boshqarish uchun)
      user.password = password;
      user.role = 'admin';
      user.isActive = true;
      await user.save();
      console.log(`[admin] Admin yangilandi (parol env dan): ${username}`);
    }
  } catch (err) {
    console.error('[admin] Admin yaratishda xato:', err.message);
  }
}

async function start() {
  try {
    await sequelize.authenticate();
    console.log('PostgreSQL connected');

    // Jadvalar mavjudligini ta'minlash (Railway birinchi deploy uchun muhim)
    await sequelize.sync({ alter: true });
    console.log('Database synced');

    await ensureAdminFromEnv();

    app.listen(config.port, () => {
      console.log(`Server running on port ${config.port} [${config.nodeEnv}]`);
    });
  } catch (err) {
    console.error('Failed to start:', err);
    process.exit(1);
  }
}

start();
