require('dotenv').config();
const { sequelize, User } = require('../backend/src/models');
async function main() {
  const username=process.env.ADMIN_USERNAME || process.env.ADMIN_USER;
  const password=process.env.ADMIN_PASSWORD || process.env.ADMIN_PASS;
  if(!username || !password || password.length<12) throw Error('Set ADMIN_USERNAME and ADMIN_PASSWORD (at least 12 characters) in the environment.');
  await sequelize.authenticate();
  const existing=await User.findOne({where:{username}});
  if(existing) {
    if(!process.argv.includes('--reset-password')) throw Error('Account exists. Use --reset-password for an intentional password reset.');
    // Preserve the existing role and active status.
    await existing.update({password});
  } else await User.create({username,password,role:'admin',isActive:true});
  console.log('Administrator operation completed.');
}
main().catch(()=>{ console.error('Administrator operation failed; check configuration and whether the account already exists.'); process.exitCode=1; }).finally(()=>sequelize.close());
