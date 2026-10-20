const config = require('../config');
const { Category, News } = require('../models');
const { readPresentation, applyPresentation, writePresentation } = require('../services/presentationService');
const include = [{ model: Category, as: 'category', attributes: ['id','name','slug'] }];
const attributes = { exclude: ['mainImagePublicId','videoPublicId','telegramError','telegramMessageId'] };
async function publicConfig(req,res,next) {
  try {
    const settings = await readPresentation();
    res.json({ success:true, data: { brand: { name:'Buxara Best', accent:'#ad3e29' }, apiVersion:'v1',
      websiteUrl:config.frontendUrl, social: { telegram:config.socialTelegram, instagram:config.socialInstagram, facebook:config.socialFacebook, youtube:config.socialYoutube },
      presentation:settings, capabilities: { comments:true, pagination:true, maxPageSize:50, contentFormat:'plain-text' } } });
  } catch(e) { next(e); }
}
async function home(req,res,next) {
  try {
    const settings = await readPresentation();
    const categories = applyPresentation(await Category.findAll(), settings);
    const query = (where,limit,order=[['publishedAt','DESC'],['id','DESC']]) => News.findAll({ where:{status:'published',...where},attributes,include,limit,order });
    const [latest, featured, trending, sections] = await Promise.all([
      query({},12), query({featured:true},1), query({},5,[['views','DESC'],['publishedAt','DESC'],['id','DESC']]),
      Promise.all(categories.filter(c=>c.showOnHomepage).map(async category => ({category,news:await query({categoryId:category.id},4)})))
    ]);
    res.json({ success:true, data:{ latest, featured:featured[0] || latest[0] || null, trending, sections:sections.filter(s=>s.news.length) } });
  } catch(e) { next(e); }
}
async function getPresentation(req,res,next) { try { res.json({success:true,data:await readPresentation()}); } catch(e){next(e);} }
async function updatePresentation(req,res,next) {
  try { const cats = await Category.findAll({attributes:['id']}); res.json({success:true,data:await writePresentation(req.body,cats.map(c=>c.id))}); } catch(e){next(e);}
}
module.exports = { publicConfig, home, getPresentation, updatePresentation };
