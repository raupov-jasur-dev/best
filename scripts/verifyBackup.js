require('dotenv').config();
const fs=require('fs');
const {Client}=require('pg');
const {hash,fingerprint,connection,run}=require('./dbTools');
async function verify(){
  const receiptPath=process.env.BACKUP_RECEIPT,restoreUrl=process.env.RESTORE_DATABASE_URL;
  if(!receiptPath || !restoreUrl || fingerprint(restoreUrl)===fingerprint())throw Error('Set BACKUP_RECEIPT and a separate, empty RESTORE_DATABASE_URL.');
  const receipt=JSON.parse(fs.readFileSync(receiptPath,'utf8'));
  if(receipt.sha256!==hash(receipt.file) || receipt.databaseFingerprint!==fingerprint())throw Error('Backup fingerprint or checksum mismatch.');
  const parsed=new URL(restoreUrl);
  const client=new Client({connectionString:restoreUrl,ssl:['localhost','127.0.0.1'].includes(parsed.hostname)?false:{rejectUnauthorized:true}});
  await client.connect();
  try{
    const {rows}=await client.query("SELECT tablename FROM pg_tables WHERE schemaname='public'");
    if(rows.length)throw Error('Restore destination is not empty. Refusing to modify it.');
    run('pg_restore',['--exit-on-error','--no-owner','--no-acl','--dbname',decodeURIComponent(parsed.pathname.slice(1)),receipt.file],connection(restoreUrl));
    const result=await client.query("SELECT tablename FROM pg_tables WHERE schemaname='public'");
    if(!result.rows.some(r=>r.tablename==='news'))throw Error('Restore lacks the news table.');
    receipt.restoreVerified=true;receipt.restoreVerifiedAt=new Date().toISOString();
    fs.writeFileSync(receiptPath,JSON.stringify(receipt,null,2));console.log('Backup restore verified in the separate database.');
  }finally{await client.end();}
}
if(require.main===module)verify().catch(()=>{console.error('Backup restore verification failed; check tools, receipt and empty restore database.');process.exitCode=1;});
module.exports=verify;
