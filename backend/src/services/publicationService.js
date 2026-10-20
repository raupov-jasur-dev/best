const { Op } = require('sequelize');
const { News, Category } = require('../models');
const { sendToTelegram } = require('./telegramService');
const { fail } = require('../utils/validation');
async function publishToTelegram(id) {
  let news=await News.findByPk(id,{include:[{model:Category,as:'category'}]});
  if(!news) throw fail('Maqola topilmadi.',404,'NOT_FOUND');
  if(news.status!=='published') throw fail('Avval maqolani nashr qiling.');
  if(news.telegramStatus==='published' || news.telegramMessageId) return {status:'published',success:true,alreadyPublished:true,messageId:news.telegramMessageId};
  if(/^(IN_FLIGHT|DELIVERY_UNCERTAIN):/.test(news.telegramError || '')) throw fail('Telegram yetkazilishi noaniq yoki jarayonda. Kanalni tekshirib, holatni tasdiqlang.',409,'DELIVERY_UNCERTAIN');
  const marker='IN_FLIGHT:'+require('crypto').randomUUID();
  const [claimed]=await News.update({telegramStatus:'pending',telegramError:marker},{where:{
    id,status:'published',telegramMessageId:null,telegramStatus:{[Op.ne]:'published'},
    [Op.or]:[{telegramError:null},{[Op.and]:[{telegramError:{[Op.notLike]:'IN_FLIGHT:%'}},{telegramError:{[Op.notLike]:'DELIVERY_UNCERTAIN:%'}}]}]
  }});
  if(!claimed) throw fail('Telegram nashri allaqachon boshlandi yoki yuborilgan.',409,'PUBLICATION_LOCKED');
  news=await News.findByPk(id,{include:[{model:Category,as:'category'}]});
  const result=await sendToTelegram(news);
  await News.update({telegramStatus:result.status,telegramMessageId:result.messageId || null,telegramPublishedAt:result.publishedAt || null,
    telegramError:result.uncertain ? 'DELIVERY_UNCERTAIN:'+result.error : result.error || null},{where:{id,telegramError:marker}});
  return result;
}
module.exports = { publishToTelegram };
