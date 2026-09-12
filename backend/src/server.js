const app = require('./app');
const { sequelize, User, Category } = require('./models');
const config = require('./config');
const slugify = require('slugify');

async function ensureAdminFromEnv() {
  const username = process.env.ADMIN_USERNAME || process.env.ADMIN_USER;
  const password = process.env.ADMIN_PASSWORD || process.env.ADMIN_PASS;

  if (!username || !password) {
    console.log('[admin] ADMIN_USERNAME / ADMIN_PASSWORD o‘rnatilmagan');
    return;
  }

  try {
    let user = await User.findOne({ where: { username } });
    if (!user) {
      user = await User.create({ username, password, role: 'admin', isActive: true });
      console.log(`[admin] Yangi admin yaratildi: ${username}`);
    } else {
      user.password = password;
      user.role = 'admin';
      user.isActive = true;
      await user.save();
      console.log(`[admin] Admin yangilandi: ${username}`);
    }
  } catch (err) {
    console.error('[admin] Xato:', err.message);
  }
}

/** Bo'sh bo'lsa default kategoriyalarni yaratadi */
async function ensureDefaultCategories() {
  try {
    const count = await Category.count();
    if (count > 0) {
      console.log(`[categories] Mavjud: ${count} ta`);
      return;
    }
    const defaults = [
      { name: 'Yangiliklar', description: 'Asosiy yangiliklar' },
      { name: 'Buxoro', description: 'Buxoro viloyati yangiliklari' },
      { name: 'O‘zbekiston', description: 'Respublika yangiliklari' },
      { name: 'Dunyo', description: 'Xalqaro yangiliklar' },
      { name: 'Sport', description: 'Sport yangiliklari' },
      { name: 'Madaniyat', description: 'Madaniyat va san’at' },
      { name: 'Jamiyat', description: 'Ijtimoiy hayot' },
      { name: 'Texnologiya', description: 'IT va innovatsiyalar' }
    ];
    for (const c of defaults) {
      await Category.create({
        name: c.name,
        slug: slugify(c.name, { lower: true, strict: true }),
        description: c.description
      });
    }
    console.log(`[categories] Default ${defaults.length} ta kategoriya yaratildi`);
  } catch (err) {
    console.error('[categories] Seed xato:', err.message);
  }
}

async function start() {
  try {
    await sequelize.authenticate();
    console.log('PostgreSQL connected');
    await sequelize.sync({ alter: true });
    console.log('Database synced');

    await ensureAdminFromEnv();
    await ensureDefaultCategories();

    app.listen(config.port, () => {
      console.log(`Server running on port ${config.port} [${config.nodeEnv}]`);
    });
  } catch (err) {
    console.error('Failed to start:', err);
    process.exit(1);
  }
}

start();
