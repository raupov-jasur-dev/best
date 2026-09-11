require('dotenv').config();
const { sequelize, Category, News, User } = require('../backend/src/models');
const slugify = require('slugify');

async function main() {
  await sequelize.authenticate();
  await sequelize.sync({ alter: true });

  const [admin] = await User.findOrCreate({
    where: { username: 'admin' },
    defaults: { password: 'admin123', role: 'admin' }
  });
  console.log('Admin:', admin.username);

  const cats = [
    { name: 'Yangiliklar', description: 'Asosiy yangiliklar' },
    { name: 'Buxoro', description: 'Buxoro viloyati' },
    { name: 'Sport', description: 'Sport yangiliklari' },
    { name: 'Madaniyat', description: 'Madaniyat va san\'at' }
  ];
  for (const c of cats) {
    await Category.findOrCreate({
      where: { name: c.name },
      defaults: { ...c, slug: slugify(c.name, { lower: true, strict: true }) }
    });
  }
  console.log('Categories seeded');
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
