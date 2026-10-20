const fs=require('fs');
const path=require('path');
const crypto=require('crypto');
const {spawnSync}=require('child_process');
function fingerprint(value=process.env.DATABASE_URL){const u=new URL(value);return crypto.createHash('sha256').update(u.hostname+':'+(u.port||5432)+u.pathname).digest('hex');}
function hash(file){
  const digest=crypto.createHash('sha256'),buffer=Buffer.allocUnsafe(1024*1024),fd=fs.openSync(file,'r');
  try{let size;while((size=fs.readSync(fd,buffer,0,buffer.length,null)))digest.update(buffer.subarray(0,size));}
  finally{fs.closeSync(fd);}
  return digest.digest('hex');
}
function connection(value){const u=new URL(value);return {...process.env,PGHOST:u.hostname,PGPORT:u.port||'5432',PGDATABASE:decodeURIComponent(u.pathname.slice(1)),PGUSER:decodeURIComponent(u.username),PGPASSWORD:decodeURIComponent(u.password),PGSSLMODE:u.hostname==='localhost'||u.hostname==='127.0.0.1'?'disable':'verify-full'};}
function run(binary,args,env){
  const executable=process.env.PG_BIN?path.join(process.env.PG_BIN,binary+(process.platform==='win32'?'.exe':'')):binary;
  const r=spawnSync(executable,args,{env,encoding:'utf8',windowsHide:true,timeout:300000,maxBuffer:8*1024*1024});
  if(r.error || r.status!==0)throw Error(binary+' failed. Check PostgreSQL client installation, TLS and database access.');
  return r.stdout;
}
function verifyReceipt(receiptPath){
  if(!receiptPath)throw Error('BACKUP_RECEIPT must point to a verified backup receipt.');
  const r=JSON.parse(fs.readFileSync(receiptPath,'utf8'));
  const createdAt=Date.parse(r.createdAt),now=Date.now();
  if(r.restoreVerified!==true || !Number.isFinite(createdAt) || createdAt>now+60000 || now-createdAt>86400000 || r.databaseFingerprint!==fingerprint() || !r.file || hash(r.file)!==r.sha256)throw Error('Backup receipt must match this database, be restored successfully and be less than 24 hours old.');
  return r;
}
module.exports={fingerprint,hash,connection,run,verifyReceipt};
