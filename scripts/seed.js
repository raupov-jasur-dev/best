require('dotenv').config();
const { sequelize, Category } = require('../backend/src/models');
const slugify = require('slugify');
async function main() {
  if(process.env.NODE_ENV==='production') throw Error('Default category seed is development-only.');
  await sequelize.authenticate();
  for(const name of ['Yangiliklar','Buxoro','Sport','Madaniyat']) await Category.findOrCreate({where:{slug:slugify(name,{lower:true,strict:true})},defaults:{name}});
  console.log('Default categories added; existing data retained. No users or stories created.');
}
main().catch(()=>{console.error('Seed failed. Check development database and migrations.');process.exitCode=1;}).finally(()=>sequelize.close());
