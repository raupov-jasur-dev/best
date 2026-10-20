// Disposable browser QA server. Never connects to the configured production database.
const {database}=require('./database');
async function start(){
  const db=await database();const {Category,News,User}=db.models;
  await User.create({username:'qa-admin',password:'qa-only-editorial-password',role:'admin'});
  const names=['Buxoro','Jamiyat','Dunyo','Madaniyat','Sport','Texnologiya'];
  const cats=[];for(let i=0;i<names.length;i++)cats.push(await Category.create({name:names[i],slug:'qa-'+i,description:'Izolyatsiyalangan brauzer sinov rukni.'}));
  for(let i=0;i<29;i++)await News.create({title:'Sinov maqolasi '+String(i+1).padStart(2,'0')+' — '+names[i%names.length]+' voqealari',slug:'qa-story-'+i,
    shortDescription:'Bu faqat izolyatsiyalangan avtomatik test ma’lumoti. Production bazasiga yozilmaydi.',
    content:'Bu faqat izolyatsiyalangan avtomatik test ma’lumoti.\n\nMaqola matni va navigatsiya brauzerda tekshiriladi.',
    categoryId:cats[i%cats.length].id,status:i===28?'draft':'published',featured:i===0,views:29-i,
    mainImage:'/static/assets/img/post-landscape-'+(i%8+1)+'.jpg',publishedAt:new Date(Date.now()-i*3600000),telegramStatus:'skipped'});
  const server=require('../backend/src/app').listen(3100,'127.0.0.1',()=>console.log('QA server: http://127.0.0.1:3100 (isolated PostgreSQL, Telegram dry-run)'));
  const shutdown=()=>server.close(async()=>{await db.close();process.exit(0);});process.on('SIGTERM',shutdown);process.on('SIGINT',shutdown);
  process.stdin.resume();process.stdin.on('data',chunk=>{if(String(chunk).trim()==='stop')shutdown();});
}
start().catch(()=>{console.error('QA server startup failed');process.exit(1);});
