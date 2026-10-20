const fs=require('fs'),path=require('path'),net=require('net'),crypto=require('crypto');
async function freePort(){return new Promise(resolve=>{const s=net.createServer();s.listen(0,'127.0.0.1',()=>{const port=s.address().port;s.close(()=>resolve(port));});});}
async function database(){
  const {default:EmbeddedPostgres}=await import('embedded-postgres');
  const root=path.resolve('.qa');fs.mkdirSync(root,{recursive:true});
  const dir=fs.mkdtempSync(path.join(root,'postgres-'));
  if(!dir.startsWith(root+path.sep))throw Error('Invalid temporary database path');
  const port=await freePort(),password=crypto.randomBytes(24).toString('hex');
  const pg=new EmbeddedPostgres({databaseDir:dir,user:'postgres',password,port,persistent:true,
    postgresFlags:['-h','127.0.0.1','-F'],initdbFlags:['--locale=C','--encoding=UTF8','--no-sync'],onLog:message=>{if(process.env.QA_VERBOSE)console.log(String(message).replace(/password[^\r\n]*/gi,'[redacted]'));},onError:()=>{}});
  await pg.initialise();await pg.start();await pg.createDatabase('buxara_test');
  process.env.NODE_ENV='test';process.env.DATABASE_URL='postgresql://postgres:'+password+'@127.0.0.1:'+port+'/buxara_test';
  process.env.JWT_SECRET=crypto.randomBytes(48).toString('hex');process.env.TELEGRAM_DRY_RUN='true';
  process.env.ADMIN_USERNAME='';process.env.ADMIN_PASSWORD='';
  const models=require('../backend/src/models');
  require('../backend/src/models/SiteSetting');
  await models.sequelize.sync();
  // Windows creates a native PostgreSQL process per connection. Warm the small QA
  // pool once rather than measuring process startup on every browser navigation.
  await Promise.all(Array.from({length:4},()=>models.sequelize.query('SELECT pg_sleep(0.02)')));
  return {models,close:async()=>{
    await models.sequelize.close();
    // Graceful pg_ctl shutdown avoids Windows taskkill and preserves useful local QA logs.
    const platform=process.platform==='win32'?'windows':process.platform;
    const native=await import('@embedded-postgres/'+platform+'-'+process.arch);
    await new Promise((resolve,reject)=>{
      const child=require('child_process').spawn(native.pg_ctl,['-D',dir,'-m','fast','-w','stop'],{windowsHide:true,stdio:'ignore'});
      child.on('error',reject);child.on('exit',code=>code===0?resolve():reject(Error('Temporary PostgreSQL shutdown failed')));
    });
    pg.process=undefined;
  }};
}
module.exports={database};
