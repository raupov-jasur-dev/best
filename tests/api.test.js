const {test,before,after}=require('node:test');
const assert=require('node:assert/strict');
const request=require('supertest');
let db,models,app,token,category,story,originalFetch,config;
const password='qa-only-editorial-password';
before(async()=>{
  db=await require('./database').database();models=db.models;app=require('../backend/src/app');config=require('../backend/src/config');
  await models.User.create({username:'qa-admin',password,role:'admin'});
  const r=await request(app).post('/api/admin/login').send({username:'qa-admin',password});assert.equal(r.status,200);token=r.body.token;
  originalFetch=global.fetch;
});
after(async()=>{global.fetch=originalFetch;if(db)await db.close();});
const auth=req=>req.set('Authorization','Bearer '+token);
const create=body=>auth(request(app).post('/api/admin/news')).send({title:'Sinov: asosiy maqola',categoryId:category.id,...body});
test('health checks actual PostgreSQL and public API aliases',async()=>{
  const r=await request(app).get('/health');assert.equal(r.status,200);assert.equal(r.body.brand,'Buxara Best');
  for(const prefix of ['/api','/api/v1']){const c=await request(app).get(prefix+'/config');assert.equal(c.body.data.brand.name,'Buxara Best');}
});
test('login validates credentials and never returns password hashes',async()=>{
  const bad=await request(app).post('/api/admin/login').send({username:'qa-admin',password:'wrong'});assert.equal(bad.status,401);
  const invalid=await request(app).post('/api/admin/login').send({username:{a:1},password});assert.equal(invalid.status,400);
  const me=await auth(request(app).get('/api/admin/me'));assert.equal(me.status,200);assert.equal(me.body.user.password,undefined);
});
test('mutations require active administrator, reject editor and forged tokens',async()=>{
  assert.equal((await request(app).post('/api/admin/categories').send({name:'blocked'})).status,401);
  await models.User.create({username:'qa-editor',password,role:'editor'});
  const login=await request(app).post('/api/admin/login').send({username:'qa-editor',password});
  assert.equal((await request(app).post('/api/admin/categories').set('Authorization','Bearer '+login.body.token).send({name:'blocked'})).status,403);
  assert.equal((await request(app).get('/api/admin/news').set('Authorization','Bearer forged')).status,401);
});
test('strict CORS rejects unrelated Vercel domains',async()=>{
  assert.equal((await request(app).get('/api/news').set('Origin','https://attacker.vercel.app')).status,403);
  const r=await request(app).get('/api/news').set('Origin',config.frontendUrl);assert.equal(r.status,200);assert.equal(r.headers['access-control-allow-origin'],config.frontendUrl);
  const same=await request(app).get('/api/news').set('Host','127.0.0.1:3100').set('Origin','http://127.0.0.1:3100');assert.equal(same.status,200);
});
test('category create, stable slug update, published counts and validation',async()=>{
  assert.equal((await auth(request(app).post('/api/admin/categories')).send({name:{a:1}})).status,400);
  const r=await auth(request(app).post('/api/admin/categories')).send({name:'Sinov rukni',description:'Izolyatsiyalangan test'});assert.equal(r.status,201);category=r.body.data;
  const edit=await auth(request(app).put('/api/admin/categories/'+category.id)).send({name:'Sinov rukni tahrirlangan'});assert.equal(edit.status,200);assert.equal(edit.body.data.slug,category.slug);
});
test('draft creation is private and never calls Telegram',async()=>{
  global.fetch=async()=>{throw Error('Draft must not use network');};
  const r=await create({content:'Sinov matni',status:'draft'});assert.equal(r.status,201);story=r.body.data;assert.equal(story.telegramStatus,'skipped');
  assert.equal((await request(app).get('/api/news/'+story.id)).status,404);
  assert.equal((await request(app).get('/api/news')).body.pagination.total,0);
  assert.equal((await auth(request(app).post('/api/admin/news/'+story.id+'/telegram-retry'))).status,400);
  global.fetch=originalFetch;
});
test('news validation rejects blank title, invalid category and invalid status',async()=>{
  for(const data of [{title:' '},{categoryId:99999},{status:'secret'},{featured:'yes'}])assert.equal((await create(data)).status,400);
});
test('media MIME, magic bytes and provider failure leave no article writes',async()=>{
  const initial=await models.News.count();
  let r=await auth(request(app).post('/api/admin/news')).field('title','Sinov media').field('categoryId',category.id).attach('mainImage',Buffer.from('<html>not an image</html>'),{filename:'bad.jpg',contentType:'image/jpeg'});assert.equal(r.status,400);
  r=await auth(request(app).post('/api/admin/news')).field('title','Sinov media').field('categoryId',category.id).attach('mainImage',Buffer.alloc(20),{filename:'file.mp4',contentType:'video/mp4'});assert.equal(r.status,400);
  const jpeg=Buffer.from([255,216,255,224,0,16,74,70,73,70,0,1,0,0,0,0]);
  process.env.STORAGE_PROVIDER='catbox';global.fetch=async()=>{throw Error('provider key must not leak');};
  r=await auth(request(app).post('/api/admin/news')).field('title','Sinov media').field('categoryId',category.id).attach('mainImage',jpeg,{filename:'good.jpg',contentType:'image/jpeg'});assert.equal(r.status,502);assert.doesNotMatch(r.text,/provider key/);assert.equal(await models.News.count(),initial);
  global.fetch=originalFetch;
});
test('failed replacement preserves existing media and successful uploads persist atomically',async()=>{
  const jpeg=Buffer.from([255,216,255,224,0,16,74,70,73,70,0,1,0,0,0,0]);
  await models.News.update({mainImage:'https://files.catbox.moe/original.jpg',mainImagePublicId:'private-deletion-id'},{where:{id:story.id}});
  global.fetch=async()=>{throw Error('upload unavailable');};
  let r=await auth(request(app).put('/api/admin/news/'+story.id)).attach('mainImage',jpeg,{filename:'image.jpg',contentType:'image/jpeg'});assert.equal(r.status,502);
  assert.equal((await models.News.findByPk(story.id)).mainImage,'https://files.catbox.moe/original.jpg');
  let calls=0;global.fetch=async()=>{calls++;return new Response('https://files.catbox.moe/upload-'+calls+'.jpg',{status:200});};
  r=await auth(request(app).put('/api/admin/news/'+story.id)).attach('mainImage',jpeg,{filename:'image.jpg',contentType:'image/jpeg'}).attach('additionalImages',jpeg,{filename:'gallery.jpg',contentType:'image/jpeg'});
  assert.equal(r.status,200);assert.equal(r.body.data.images.length,1);assert.match(r.body.data.mainImage,/upload-1/);
  global.fetch=originalFetch;
});
test('oversized image uploads are rejected before provider calls or database writes',async()=>{
  const before=await models.News.count(),buffer=Buffer.alloc(10*1024*1024+1);buffer.set([255,216,255]);
  global.fetch=async()=>{throw Error('Oversized uploads must not reach providers');};
  const r=await auth(request(app).post('/api/admin/news')).field('title','Sinov hajm').field('categoryId',category.id).attach('mainImage',buffer,{filename:'large.jpg',contentType:'image/jpeg'});
  assert.equal(r.status,400);assert.equal(r.body.code,'LIMIT_FILE_SIZE');assert.equal(await models.News.count(),before);global.fetch=originalFetch;
});
test('publish, listing by slug/id, edit, search and bounded pagination',async()=>{
  let r=await auth(request(app).post('/api/admin/news/'+story.id+'/publish'));assert.equal(r.status,200);assert.equal(r.body.data.status,'published');assert.equal(r.body.telegram.status,'skipped');
  r=await auth(request(app).put('/api/admin/news/'+story.id)).send({title:'Sinov: yangilangan sarlavha',featured:true});assert.equal(r.status,200);assert.equal(r.body.data.slug,story.slug);
  r=await request(app).get('/api/news/'+story.slug);assert.equal(r.status,200);assert.equal(r.body.data.title,'Sinov: yangilangan sarlavha');assert.equal(r.body.data.mainImagePublicId,undefined);
  r=await request(app).get('/api/v1/news?search=yangilangan&limit=1');assert.equal(r.body.pagination.total,1);assert.equal(r.body.data.length,1);
  r=await request(app).get('/api/news?limit=100000&page=-4');assert.equal(r.body.pagination.limit,50);assert.equal(r.body.pagination.page,1);
  assert.equal((await request(app).get('/api/news?search=not-present')).body.pagination.total,0);
  assert.equal((await auth(request(app).delete('/api/admin/categories/'+category.id))).status,400);
});
test('presentation persists order and homepage visibility; home uses category queries',async()=>{
  const c=await models.Category.create({name:'Sinov ikkinchi',slug:'sinov-ikkinchi'});
  const r=await auth(request(app).put('/api/admin/presentation')).send({categories:[{id:c.id,showOnHomepage:true},{id:category.id,showOnHomepage:false}]});assert.equal(r.status,200);
  const cats=await request(app).get('/api/categories');assert.equal(cats.body.data[0].id,c.id);
  let home=await request(app).get('/api/home');assert.equal(home.status,200);assert.equal(home.body.data.sections.some(s=>s.category.id===category.id),false);assert.equal(home.body.data.featured.id,story.id);
  await auth(request(app).put('/api/admin/presentation')).send({categories:[{id:category.id,showOnHomepage:true},{id:c.id,showOnHomepage:true}]});
  home=await request(app).get('/api/home');assert.equal(home.body.data.sections[0].news[0].id,story.id);
});
test('comments require moderation; string false never approves',async()=>{
  let r=await request(app).post('/api/news/'+story.id+'/comments').send({authorName:'Sinov o‘quvchi',content:'Izolyatsiyalangan sinov izohi'});assert.equal(r.status,201);assert.equal(r.body.data.isApproved,false);const commentId=r.body.data.id;
  r=await request(app).get('/api/news/'+story.id);assert.equal(r.body.data.comments.length,0);
  await auth(request(app).patch('/api/admin/comments/'+commentId)).send({isApproved:'false'});
  assert.equal((await models.Comment.findByPk(commentId)).isApproved,false);
  await auth(request(app).patch('/api/admin/comments/'+commentId)).send({isApproved:true});
  assert.equal((await request(app).get('/api/news/'+story.id)).body.data.comments.length,1);
});
test('Telegram sends text, photo, video without production network; retries are idempotent',async()=>{
  config.telegramDryRun=false;config.telegramBotToken='test-only-not-real';config.telegramChannelId='test-channel';let calls=[];
  global.fetch=async(url,opts)=>{assert.match(String(url),/api.telegram.org/);calls.push({url,body:JSON.parse(opts.body)});return new Response(JSON.stringify({ok:true,result:{message_id:100+calls.length}}),{status:200});};
  for(const media of [{},{mainImage:'https://files.catbox.moe/test.jpg'},{video:'https://files.catbox.moe/test.mp4'}]){
    const n=await models.News.create({title:'Sinov Telegram',slug:require('crypto').randomUUID(),categoryId:category.id,status:'published',...media});
    let r=await auth(request(app).post('/api/admin/news/'+n.id+'/telegram-retry'));assert.equal(r.status,200);assert.equal(r.body.telegram.status,'published');
    const count=calls.length;r=await auth(request(app).post('/api/admin/news/'+n.id+'/telegram-retry'));assert.equal(r.status,200);assert.equal(calls.length,count);
  }
  assert.match(calls[0].url,/sendMessage$/);assert.match(calls[1].url,/sendPhoto$/);assert.match(calls[2].url,/sendVideo$/);assert.match(calls[0].body.text,/Buxara Best/);assert.match(calls[0].body.text,new RegExp(config.frontendUrl.replace(/[.*+?^\x24{}()|[\]\\]/g,'\\$&')));
  global.fetch=originalFetch;
});
test('concurrent Telegram retries claim once; uncertain delivery blocks retransmission',async()=>{
  const n=await models.News.create({title:'Sinov parallel',slug:require('crypto').randomUUID(),categoryId:category.id,status:'published'});let calls=0;
  global.fetch=async()=>{calls++;await new Promise(resolve=>setTimeout(resolve,80));return new Response(JSON.stringify({ok:true,result:{message_id:500}}),{status:200});};
  const result=await Promise.all([1,2].map(()=>auth(request(app).post('/api/admin/news/'+n.id+'/telegram-retry'))));assert.equal(calls,1);assert.ok(result.some(r=>r.status===200));assert.ok(result.some(r=>r.status===409));
  const n2=await models.News.create({title:'Sinov noaniq',slug:require('crypto').randomUUID(),categoryId:category.id,status:'published'});
  global.fetch=async()=>{throw new Error('test timeout');};
  let r=await auth(request(app).post('/api/admin/news/'+n2.id+'/telegram-retry'));assert.equal(r.body.telegram.uncertain,true);
  r=await auth(request(app).post('/api/admin/news/'+n2.id+'/telegram-retry'));assert.equal(r.status,409);
  r=await auth(request(app).post('/api/admin/news/'+n2.id+'/telegram-resolve')).send({confirmedNotSent:true});assert.equal(r.status,200);
  global.fetch=originalFetch;config.telegramDryRun=true;
});
test('Telegram caption remains bounded, escaped and structurally balanced',()=>{
  const {buildCaption}=require('../backend/src/services/telegramService');
  const caption=buildCaption({title:'<&😃'.repeat(1000),content:'<script>evil</script>&'.repeat(2000),category:{name:'Sinov rukni'}},config.frontendUrl+'/post.html?id=1');
  assert.ok(caption.length<=1024);assert.doesNotMatch(caption,/<script>/);assert.equal((caption.match(/<a /g)||[]).length,(caption.match(/<\/a>/g)||[]).length);assert.equal((caption.match(/<b>/g)||[]).length,(caption.match(/<\/b>/g)||[]).length);
});
test('news deletion removes related records and category CRUD completes',async()=>{
  assert.equal((await auth(request(app).delete('/api/admin/news/'+story.id))).status,200);
  assert.equal(await models.Comment.count({where:{newsId:story.id}}),0);
  const cat=await models.Category.create({name:'Sinov o‘chirish',slug:'sinov-delete'});
  assert.equal((await auth(request(app).delete('/api/admin/categories/'+cat.id))).status,200);
});
test('fallback public/admin use one implementation and legacy links redirect',async()=>{
  const admin=await request(app).get('/admin/');assert.equal(admin.status,200);assert.match(admin.text,/cms-editor.js/);assert.doesNotMatch(admin.text,/bootstrap/);
  const home=await request(app).get('/').set('Accept','text/html');assert.equal(home.status,200);assert.match(home.text,/Buxara Best/);
  const root=await request(app).get('/');assert.equal(root.body.name,'Buxara Best API');assert.equal(root.body.endpoints.news,'GET /api/news');
  const legacy=await request(app).get('/category/post/3');assert.equal(legacy.status,301);assert.equal(legacy.headers.location,'/category.html?id=3');
  assert.equal((await request(app).get('/api/does-not-exist')).status,404);
});
test('restart leaves existing administrators, roles, passwords and content unchanged',async()=>{
  const user=await models.User.findOne({where:{username:'qa-admin'}}),hash=user.password,count=await models.News.count();
  process.env.ADMIN_USERNAME='qa-admin';process.env.ADMIN_PASSWORD='must-not-reset-existing-password';
  const previousPort=config.port;config.port=0;
  const server=await require('../backend/src/server').start();await new Promise(resolve=>server.close(resolve));config.port=previousPort;
  await user.reload();assert.equal(user.password,hash);assert.equal(user.role,'admin');assert.equal(await models.News.count(),count);
});
test('additive migrations are idempotent and production refuses missing backup',async()=>{
  const {migrate}=require('../scripts/migrate');const count=await models.News.count();await migrate();await migrate();assert.equal(await models.News.count(),count);
  process.env.NODE_ENV='production';const previousReceipt=process.env.BACKUP_RECEIPT;delete process.env.BACKUP_RECEIPT;
  try{await assert.rejects(migrate(),/BACKUP_RECEIPT/);}finally{process.env.NODE_ENV='test';if(previousReceipt)process.env.BACKUP_RECEIPT=previousReceipt;}
});
