// Read-only release diagnostics. Never publishes, migrates, seeds or updates content.
require('dotenv').config();
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const {Client}=require('pg');
const base='https://best-cda1.onrender.com';
const out=path.resolve('.qa');fs.mkdirSync(out,{recursive:true});
const auditSource=process.env.AUDIT_ENV_SOURCE||'local environment; Render environment is not assumed identical';
const report={checkedAt:new Date().toISOString(),apiOrigin:base,public:[],admin:{},databases:[],telegram:{source:auditSource}};
const redact=value=>{
  let text=String(value || '');
  for(const secret of [process.env.TELEGRAM_BOT_TOKEN,process.env.ADMIN_PASSWORD,process.env.JWT_SECRET,process.env.DATABASE_URL])if(secret)text=text.split(secret).join('[redacted]');
  return text.replace(/bot\d+:[A-Za-z0-9_-]+/g,'bot[redacted]').slice(0,400);
};
async function api(endpoint,options={}){
  const response=await fetch(base+endpoint,{redirect:'manual',signal:AbortSignal.timeout(45000),...options});
  const body=await response.json().catch(()=>({}));return {response,body};
}
const summary=(endpoint,r)=>({endpoint,status:r.response.status,success:r.body.success,ok:r.body.ok,total:r.body.pagination?.total,rows:Array.isArray(r.body.data)?r.body.data.length:undefined,cache:r.response.headers.get('cache-control')});
async function publicAudit(){
  for(const endpoint of ['/health','/api/v1/config','/api/news','/api/news?limit=1','/api/news?limit=50&page=1','/api/news?featured=true&limit=1','/api/categories']){
    try{
      const r=await api(endpoint,{headers:{'Cache-Control':'no-cache',Pragma:'no-cache',Origin:'https://bukharabest.vercel.app'}});
      const row=summary(endpoint,r);
      if(endpoint==='/api/categories')row.categories=(r.body.data||[]).map(c=>({id:c.id,name:c.name,postsCount:c.postsCount,createdAt:c.createdAt,updatedAt:c.updatedAt}));
      if(endpoint==='/api/news')report.publicNewsSample=(r.body.data||[]).map(n=>({id:n.id,status:n.status,categoryId:n.categoryId,publishedAt:n.publishedAt}));
      if(endpoint==='/api/news')for(const n of (r.body.data||[]).slice(0,2))for(const value of [n.mainImage,n.video].filter(Boolean)){
        try{const url=new URL(value,base);if(url.username||url.password||url.protocol!=='https:')continue;const media=await fetch(url,{method:'HEAD',redirect:'manual',signal:AbortSignal.timeout(15000)});(report.media||=[]).push({host:url.hostname,status:media.status,type:media.headers.get('content-type'),corp:media.headers.get('cross-origin-resource-policy')});}
        catch(e){(report.media||=[]).push({status:'unverified',error:e.cause?.code||e.name});}
      }
      report.public.push(row);
    }catch(e){report.public.push({endpoint,error:e.cause?.code||e.name});}
  }
  try{
    const response=await fetch('https://bukharabest.vercel.app/config.js',{signal:AbortSignal.timeout(30000)});
    const source=await response.text();const urls=[...source.matchAll(/https?:\/\/[^'"\s;]+/g)].map(m=>{try{const u=new URL(m[0]);return u.username||u.password?'[redacted]':u.origin;}catch{return 'invalid public URL';}});
    report.frontendConfig={status:response.status,publicOrigins:urls};
  }catch(e){report.frontendConfig={error:e.cause?.code||e.name};}
  try{const response=await fetch(base+'/static/assets/img/post-landscape-1.jpg',{method:'HEAD',signal:AbortSignal.timeout(20000)});report.legacyMedia={status:response.status,type:response.headers.get('content-type'),corp:response.headers.get('cross-origin-resource-policy')};}catch(e){report.legacyMedia={error:e.cause?.code||e.name};}
}
async function adminAudit(){
  const username=process.env.ADMIN_USERNAME,password=process.env.ADMIN_PASSWORD;
  if(!username||!password||/^(REPLACE_|YOUR_|\[SENSITIVE\])/i.test(password)){report.admin={status:'credentials unavailable; no attempt made'};return;}
  // Exactly one existing-credential attempt. No guessing, reset or retry.
  try{
    const r=await api('/api/admin/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username,password})});
    report.admin.loginStatus=r.response.status;
    if(!r.response.ok||!r.body.token){report.admin.code=r.body.code;report.admin.message=redact(r.body.message);return;}
    const headers={Authorization:'Bearer '+r.body.token};
    for(const endpoint of ['/api/admin/me','/api/admin/dashboard','/api/admin/news?limit=50&page=1','/api/admin/categories']){
      const a=await api(endpoint,{headers});const row=summary(endpoint,a);
      if(endpoint==='/api/admin/me')row.role=a.body.user?.role;
      if(endpoint==='/api/admin/dashboard'){
        const data=a.body.data||{};row.counts=Object.fromEntries(Object.entries(data).filter(([,v])=>typeof v==='number'));
      }
      if(endpoint.startsWith('/api/admin/news'))row.statusCounts=(a.body.data||[]).reduce((s,n)=>(s[n.status]=(s[n.status]||0)+1,s),{});
      (report.admin.reads||=[]).push(row);
    }
  }catch(e){report.admin.error=e.cause?.code||e.name;}
}
async function databaseAudit(){
  const value=process.env.DATABASE_URL;if(!value||!/^postgres(?:ql)?:\/\//.test(value)){report.databases.push({source:'local environment',status:'no usable DATABASE_URL'});return;}
  const u=new URL(value);const fp=crypto.createHash('sha256').update(u.hostname+':'+(u.port||5432)+u.pathname).digest('hex');
  const local=['localhost','127.0.0.1'].includes(u.hostname);
  // Normalize a copy, never the saved secret. pg warns about weaker future
  // sslmode=require semantics; this diagnostic always verifies remote TLS.
  if(!local && ['prefer','require','verify-ca'].includes(u.searchParams.get('sslmode')))u.searchParams.set('sslmode','verify-full');
  const client=new Client({connectionString:u.href,connectionTimeoutMillis:15000,statement_timeout:10000,application_name:'buxara_readonly_release_audit',options:'-c default_transaction_read_only=on',ssl:local?false:{rejectUnauthorized:true,...(process.env.DATABASE_CA_CERT?{ca:process.env.DATABASE_CA_CERT.replace(/\\n/g,'\n')}:{})}});
  const row={source:auditSource,fingerprint:fp};
  try{
    await client.connect();await client.query('BEGIN READ ONLY');
    const identity=await client.query("SELECT current_schema() AS schema, current_setting('search_path') AS search_path, current_setting('transaction_read_only') AS read_only, current_setting('server_version_num') AS server_version_num");row.connection=identity.rows[0];
    const tables=await client.query("SELECT schemaname AS table_schema,tablename AS table_name FROM pg_catalog.pg_tables WHERE schemaname NOT IN ('pg_catalog','information_schema') ORDER BY schemaname,tablename");row.tables=tables.rows;
    row.counts={};
    for(const table of ['news','categories','users','news_images','comments'])if(tables.rows.some(t=>t.table_schema==='public'&&t.table_name===table)){
      const result=await client.query('SELECT count(*)::integer AS count FROM public."'+table+'"');row.counts[table]=result.rows[0].count;
    }
    if(row.counts.news!==undefined){const statuses=await client.query('SELECT status,count(*)::integer AS count FROM public.news GROUP BY status ORDER BY status');row.newsStatuses=statuses.rows;}
    await client.query('ROLLBACK');row.status='read-only inspection complete';
  }catch(e){row.status='unverified';row.error=e.code||e.name;}
  finally{await client.end().catch(()=>{});report.databases.push(row);}
}
async function telegramAudit(){
  const token=process.env.TELEGRAM_BOT_TOKEN,channel=process.env.TELEGRAM_CHANNEL_ID;
  if(!token||!channel||/^(REPLACE_|YOUR_|\[SENSITIVE\])/i.test(token)){report.telegram.status='configuration unavailable';return;}
  report.telegram.channelFormat=/^-100\d+$/.test(channel)?'numeric channel ID':/^@[a-zA-Z0-9_]{5,}$/.test(channel)?'public username':'unexpected format';
  async function call(method,payload={}){
    try{
      const r=await fetch('https://api.telegram.org/bot'+token+'/'+method,{method:'POST',redirect:'manual',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),signal:AbortSignal.timeout(30000)});
      const d=await r.json().catch(()=>({}));report.telegram[method]={status:r.status,telegramOk:d.ok===true,apiErrorCode:d.error_code,description:d.description?redact(d.description):undefined,responseType:r.headers.get('content-type')};return d;
    }catch(e){report.telegram[method]={error:e.cause?.code||e.name};return {};}
  }
  const me=await call('getMe');if(!me.ok)return;
  report.telegram.botUsername=me.result.username;
  const chat=await call('getChat',{chat_id:channel});if(chat.ok)report.telegram.chatType=chat.result.type;
  const member=await call('getChatMember',{chat_id:channel,user_id:me.result.id});
  if(member.ok){report.telegram.membership=member.result.status;report.telegram.canPostMessages=member.result.status==='creator'||member.result.can_post_messages===true;}
  report.telegram.publicationPerformed=false;
}
async function main(){
  if(!process.argv.includes('--database-only'))await publicAudit();
  if(process.argv.includes('--admin'))await adminAudit();
  if(process.argv.includes('--database')||process.argv.includes('--database-only'))await databaseAudit();
  if(process.argv.includes('--telegram'))await telegramAudit();
  report.completedAt=new Date().toISOString();
  fs.writeFileSync(path.join(out,process.argv.includes('--database-only')?'database-release-audit.json':'release-audit.json'),JSON.stringify(report,null,2));
  console.log(JSON.stringify(report));
}
if(require.main===module)main().catch(e=>{console.error('Read-only release audit failed:',e.code||e.name);process.exitCode=1;});
