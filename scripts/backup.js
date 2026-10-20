require('dotenv').config();
const fs=require('fs'),path=require('path');
const {fingerprint,hash,connection,run}=require('./dbTools');
function backup(options={}){
  if(!process.env.DATABASE_URL)throw Error('DATABASE_URL is required.');
  const dir=path.resolve('backups');fs.mkdirSync(dir,{recursive:true});
  const file=path.join(dir,'buxara-best-'+new Date().toISOString().replace(/[:.]/g,'-')+'.dump');
  if(options.snapshot && !/^[0-9A-Fa-f-]{1,80}$/.test(options.snapshot))throw Error('Invalid exported snapshot identifier.');
  run('pg_dump',['--format=custom','--no-owner','--no-acl',...(options.snapshot?['--snapshot',options.snapshot]:[]),'--file',file],connection(process.env.DATABASE_URL));
  run('pg_restore',['--list',file],process.env);
  fs.writeFileSync(file+'.json',JSON.stringify({file,sha256:hash(file),databaseFingerprint:fingerprint(),createdAt:new Date().toISOString(),restoreVerified:false},null,2));
  console.log('Backup created. Verify a restore in an empty disposable PostgreSQL database before migrations. Receipt: '+file+'.json');
}
if(require.main===module)try{backup();}catch(e){console.error(e.message);process.exitCode=1;}
module.exports=backup;
