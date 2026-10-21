const { Op } = require('sequelize');
const { sequelize, News, Category, NewsImage, Comment } = require('../models');
const { makeSlug, paginate } = require('../utils/helpers');
const { uploadImage, uploadVideo, validateFile } = require('../services/uploadService');
const { publishToTelegram } = require('../services/publicationService');
const { fail, text, id, bool } = require('../utils/validation');
const includeCategory = [{model:Category,as:'category',attributes:['id','name','slug']}];
const publicAttributes = {exclude:['mainImagePublicId','videoPublicId','telegramError','telegramMessageId']};
const order = [['publishedAt','DESC'],['id','DESC']];
function searchWhere(search,withContent=true) {
  if(search===undefined || search==='') return {};
  const q=text(search,'Qidiruv',200,true).replace(/[\\%_]/g,'\\$&');
  return {[Op.or]:['title','shortDescription',...(withContent?['content']:[])].map(field=>({[field]:{[Op.iLike]:'%'+q+'%'}}))};
}
async function listNews(req,res,next) {
  try {
    const paging=paginate(null,req.query.page,req.query.limit);
    const where={status:'published',...searchWhere(req.query.search)};
    if(req.query.category) {
      const category=/^\d+$/.test(req.query.category) ? await Category.findByPk(id(req.query.category)) : await Category.findOne({where:{slug:text(req.query.category,'Kategoriya',200,true)}});
      if(!category) throw fail('Kategoriya topilmadi.',404,'NOT_FOUND');
      where.categoryId=category.id;
    }
    if(req.query.featured==='true') where.featured=true;
    if(req.query.featured==='false') where.featured=false;
    const {count,rows}=await News.findAndCountAll({where,attributes:publicAttributes,include:includeCategory,offset:paging.offset,limit:paging.limit,
      order:req.query.sort==='views' ? [['views','DESC'],...order] : order});
    res.json({success:true,data:rows,pagination:{total:count,page:paging.page,limit:paging.limit,pages:Math.ceil(count/paging.limit)}});
  } catch(e){next(e);}
}
async function getNewsBySlugOrId(req,res,next) {
  try {
    const key=req.params.idOrSlug;
    const news=await News.findOne({where:{...(/^\d+$/.test(key)?{id:id(key)}:{slug:key}),status:'published'},attributes:publicAttributes,
      include:[...includeCategory,{model:NewsImage,as:'images',attributes:['id','url','sortOrder']},{model:Comment,as:'comments',where:{isApproved:true},required:false}],
      order:[[{model:NewsImage,as:'images'},'sortOrder','ASC']]});
    if(!news) throw fail('Yangilik topilmadi.',404,'NOT_FOUND');
    const views=Number(news.views)||0; await News.increment('views',{where:{id:news.id},returning:false}); news.setDataValue('views',views+1);
    res.json({success:true,data:news});
  } catch(e){next(e);}
}
async function adminList(req,res,next) {
  try {
    const p=paginate(null,req.query.page,req.query.limit || 20);
    const where=searchWhere(req.query.search,false);
    if(req.query.status) { if(!['draft','published'].includes(req.query.status)) throw fail('Noto‘g‘ri holat.'); where.status=req.query.status; }
    if(req.query.category) where.categoryId=id(req.query.category);
    if(req.query.telegramStatus) { if(!['pending','published','failed','skipped'].includes(req.query.telegramStatus)) throw fail('Noto‘g‘ri Telegram holati.'); where.telegramStatus=req.query.telegramStatus; }
    if(req.query.featured==='true') where.featured=true;
    const {count,rows}=await News.findAndCountAll({where,include:includeCategory,offset:p.offset,limit:p.limit,order:[['createdAt','DESC'],['id','DESC']]});
    res.json({success:true,data:rows,pagination:{total:count,page:p.page,limit:p.limit,pages:Math.ceil(count/p.limit)}});
  } catch(e){next(e);}
}
async function adminGet(req,res,next) {
  try {
    const news=await News.findByPk(id(req.params.id),{include:[...includeCategory,{model:NewsImage,as:'images'}]});
    if(!news) throw fail('Yangilik topilmadi.',404,'NOT_FOUND');
    res.json({success:true,data:news});
  } catch(e){next(e);}
}
async function values(body,existing) {
  const data={};
  if(!existing || body.title!==undefined) data.title=text(body.title,'Sarlavha',1000,true);
  for(const field of ['shortDescription','content']) if(body[field]!==undefined) data[field]=text(body[field],field,field==='content'?1000000:10000);
  if(!existing || body.categoryId!==undefined) {
    data.categoryId=id(body.categoryId);
    if(!await Category.findByPk(data.categoryId)) throw fail('Kategoriya topilmadi.');
  }
  if(body.status!==undefined && !['draft','published'].includes(body.status)) throw fail('Noto‘g‘ri nashr holati.');
  if(body.featured!==undefined) data.featured=bool(body.featured);
  const publish=body.publishAndTelegram!==undefined && bool(body.publishAndTelegram);
  data.status=publish?'published':body.status || existing?.status || 'draft';
  if(data.status==='published') data.publishedAt=existing?.publishedAt || new Date();
  if(!existing) {data.slug=makeSlug(data.title);data.telegramStatus=data.status==='draft'?'skipped':'pending';}
  return data;
}
async function media(req,signal) {
  const data={}; const gallery=[];
  for(const [field,files]of Object.entries(req.files||{}))for(const file of files)validateFile(file,field==='video');
  if(req.files?.mainImage?.[0]) {const up=await uploadImage(req.files.mainImage[0],signal);data.mainImage=up.url;data.mainImagePublicId=up.publicId;}
  if(req.files?.video?.[0]) {const up=await uploadVideo(req.files.video[0],signal);data.video=up.url;data.videoPublicId=up.publicId;}
  for(const file of req.files?.additionalImages || []) gallery.push(await uploadImage(file,signal));
  return {data,gallery};
}
async function save(req,res,next,editing=false) {
  const disconnect=new AbortController();const abort=()=>{if(!res.writableEnded)disconnect.abort();};res.on('close',abort);
  const signal=AbortSignal.any([disconnect.signal,AbortSignal.timeout(120000)]);
  try {
    const existing=editing?await News.findByPk(id(req.params.id)):null;
    if(editing && !existing) throw fail('Yangilik topilmadi.',404,'NOT_FOUND');
    const data=await values(req.body,existing);
    if(existing && /^(IN_FLIGHT):/.test(existing.telegramError || '') && data.status==='draft') throw fail('Telegram yuborilmoqda. Jarayon tugashini kuting.',409);
    // Upload all files before saving. Existing media is retained for recovery.
    const uploaded=await media(req,signal);
    if(signal.aborted)throw Object.assign(new Error('Media saqlash vaqti tugadi. Maqola saqlanmadi.'),{status:504,code:'MEDIA_TIMEOUT',expose:true});
    const previousStatus=existing?.status;
    const news=await sequelize.transaction(async transaction=>{
      let record;
      if(existing){
        record=await News.findByPk(existing.id,{transaction,lock:transaction.LOCK.UPDATE});
        if(!record)throw fail('Yangilik topilmadi.',404,'NOT_FOUND');
        if(/^IN_FLIGHT:/.test(record.telegramError || '') && data.status==='draft')throw fail('Telegram yuborilmoqda. Jarayon tugashini kuting.',409);
        await record.update({...data,...uploaded.data},{transaction});
      }else record=await News.create({...data,...uploaded.data},{transaction});
      const count=await NewsImage.count({where:{newsId:record.id},transaction});
      for(let i=0;i<uploaded.gallery.length;i++) await NewsImage.create({newsId:record.id,url:uploaded.gallery[i].url,publicId:uploaded.gallery[i].publicId,sortOrder:count+i},{transaction});
      return record;
    });
    let telegram;
    if(news.status==='published' && (previousStatus!=='published' || req.body.publishAndTelegram===true || req.body.publishAndTelegram==='true')) telegram=await publishToTelegram(news.id);
    const full=await News.findByPk(news.id,{include:[...includeCategory,{model:NewsImage,as:'images'}]});
    res.status(editing?200:201).json({success:true,data:full,...(telegram?{telegram}:{})});
  } catch(e){next(e);}finally{res.removeListener('close',abort);}
}
const createNews=(req,res,next)=>save(req,res,next,false);
const updateNews=(req,res,next)=>save(req,res,next,true);
async function deleteNews(req,res,next) {
  try {
    await sequelize.transaction(async transaction=>{
      const news=await News.findByPk(id(req.params.id),{transaction,lock:transaction.LOCK.UPDATE});
      if(!news) throw fail('Yangilik topilmadi.',404,'NOT_FOUND');
      if(/^IN_FLIGHT:/.test(news.telegramError || '')) throw fail('Telegram nashri jarayonda.',409);
      await Comment.destroy({where:{newsId:news.id},transaction});
      await NewsImage.destroy({where:{newsId:news.id},transaction});
      await news.destroy({transaction});
    });
    res.json({success:true,message:'Yangilik o‘chirildi. Media fayllar saqlandi.'});
  } catch(e){next(e);}
}
async function retryTelegram(req,res,next) {
  try { const telegram=await publishToTelegram(id(req.params.id)); res.json({success:true,data:await News.findByPk(req.params.id),telegram}); }
  catch(e){next(e);}
}
async function publishNews(req,res,next) {
  try {
    const news=await News.findByPk(id(req.params.id));
    if(!news) throw fail('Yangilik topilmadi.',404,'NOT_FOUND');
    await news.update({status:'published',publishedAt:news.publishedAt || new Date()});
    const telegram=await publishToTelegram(news.id);
    res.json({success:true,data:await News.findByPk(news.id),telegram});
  } catch(e){next(e);}
}
async function resolveTelegram(req,res,next) {
  try {
    const news=await News.findByPk(id(req.params.id));
    if(!news) throw fail('Yangilik topilmadi.',404,'NOT_FOUND');
    if(!/^(IN_FLIGHT|DELIVERY_UNCERTAIN):/.test(news.telegramError || '')) throw fail('Tasdiqlash talab qilinmagan.',409);
    if(/^IN_FLIGHT:/.test(news.telegramError) && Date.now()-new Date(news.updatedAt).getTime()<180000) throw fail('Jarayon tugashini kamida 3 daqiqa kuting.',409);
    let changes;
    if(req.body.messageId) {
      const messageId=String(req.body.messageId);
      if(!/^[1-9]\d{0,18}$/.test(messageId)) throw fail('Telegram xabar ID sini tekshiring.');
      changes={telegramStatus:'published',telegramMessageId:messageId,telegramPublishedAt:new Date(),telegramError:null};
    } else if(req.body.confirmedNotSent===true) changes={telegramStatus:'failed',telegramError:'Operator kanalni tekshirdi: yuborilmagan.'};
    else throw fail('Kanalni tekshirish tasdig‘i talab qilinadi.');
    const [changed]=await News.update(changes,{where:{id:news.id,telegramError:news.telegramError}});
    if(!changed) throw fail('Holat o‘zgardi. Sahifani yangilang.',409);
    res.json({success:true,data:await News.findByPk(news.id)});
  } catch(e){next(e);}
}
module.exports={listNews,getNewsBySlugOrId,adminList,adminGet,createNews,updateNews,deleteNews,retryTelegram,publishNews,resolveTelegram};
