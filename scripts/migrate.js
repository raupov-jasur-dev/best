require('dotenv').config();
const {sequelize}=require('../backend/src/models');
const SiteSetting=require('../backend/src/models/SiteSetting');
const {verifyReceipt}=require('./dbTools');
async function migrate(){
  if(process.env.NODE_ENV==='production')verifyReceipt(process.env.BACKUP_RECEIPT);
  await sequelize.authenticate();
  const tables=await sequelize.getQueryInterface().showAllTables();
  const required=['users','categories','news','news_images','comments'];
  if(!required.every(t=>tables.includes(t))){
    if(process.env.NODE_ENV==='production' || !process.argv.includes('--init') || tables.length)throw Error('Base schema is missing. Only a new empty development database may use --init.');
    await sequelize.sync(); // Empty development database only; never alter or force.
  }
  await sequelize.transaction(async transaction=>{
    await sequelize.query('SELECT pg_advisory_xact_lock(71820461)',{transaction});
    await sequelize.query('CREATE TABLE IF NOT EXISTS schema_migrations (name varchar(100) PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())',{transaction});
    const [rows]=await sequelize.query("SELECT name FROM schema_migrations WHERE name='001_editorial_presentation'",{transaction});
    if(rows.length)return;
    await sequelize.getQueryInterface().createTable('site_settings',{
      key:{type:require('sequelize').DataTypes.STRING(80),primaryKey:true},value:{type:require('sequelize').DataTypes.JSONB,allowNull:false},
      created_at:{type:require('sequelize').DataTypes.DATE,allowNull:false},updated_at:{type:require('sequelize').DataTypes.DATE,allowNull:false}
    },{transaction});
    await sequelize.query('CREATE INDEX IF NOT EXISTS news_public_feed_idx ON news (status, published_at DESC, id DESC)',{transaction});
    await sequelize.query('CREATE INDEX IF NOT EXISTS news_category_feed_idx ON news (category_id, status, published_at DESC)',{transaction});
    await sequelize.query("INSERT INTO schema_migrations(name) VALUES ('001_editorial_presentation')",{transaction});
  });
  console.log('Additive migration completed. Existing tables, content, users and URLs retained.');
}
if(require.main===module)migrate().catch(()=>{console.error('Migration refused or failed. Check backup receipt, schema and connection.');process.exitCode=1;}).finally(()=>sequelize.close());
module.exports={migrate,SiteSetting};
