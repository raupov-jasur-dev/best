const { Sequelize } = require('sequelize');
require('dotenv').config();
if (process.env.NODE_ENV === 'production' && !process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');

let databaseUrl=process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/bukhara_best';
// Normalize a copy of legacy URL aliases, preserving the saved credential and
// the current verified TLS behavior when pg adopts libpq's newer semantics.
if(process.env.NODE_ENV==='production' && process.env.DATABASE_SSL_REJECT_UNAUTHORIZED!=='false'){
  const parsed=new URL(databaseUrl);
  if(['prefer','require','verify-ca'].includes(parsed.searchParams.get('sslmode'))){parsed.searchParams.set('sslmode','verify-full');databaseUrl=parsed.href;}
}
const sequelize = new Sequelize(databaseUrl, {
  dialect: 'postgres',
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  dialectOptions: process.env.NODE_ENV === 'production' ? {
    ssl: { require: true, rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== 'false', ...(process.env.DATABASE_CA_CERT ? { ca: process.env.DATABASE_CA_CERT.replace(/\\n/g, '\n') } : {}) }
  } : {},
  pool: {
    max: process.env.NODE_ENV === 'test' ? 4 : 10,
    min: process.env.NODE_ENV === 'test' ? 2 : 0,
    acquire: 30000,
    idle: process.env.NODE_ENV === 'test' ? 600000 : 10000
  }
});

module.exports = sequelize;
