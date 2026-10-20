const config = require('../config');
const { mediaUrl } = require('../utils/validation');
const LIMIT = 1024;
const escape = s => String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
function link(label,url) {
  try { const u = new URL(url); if(u.protocol!=='https:' || u.username || u.password) return ''; return '<a href="'+escape(u.href)+'">'+escape(label)+'</a>'; } catch { return ''; }
}
function buildCaption(news,detailUrl) {
  const category = String(news.category?.name || '').replace(/[^\p{L}\p{N}_]/gu,'').slice(0,40);
  const header = (category ? '#'+category+'\n\n' : '') + '<b>Buxara Best</b>\n';
  const footer = '\n\n'+link('Batafsil o‘qish →',detailUrl)+'\n'+[
    link('Telegram',config.socialTelegram),link('Instagram',config.socialInstagram),
    link('Facebook',config.socialFacebook),link('YouTube',config.socialYoutube)
  ].filter(Boolean).join(' · ');
  const raw = String(news.shortDescription || news.content || '').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
  let title = Array.from(String(news.title || '')).slice(0,240).join('');
  let body = Array.from(raw).slice(0,380).join('');
  let caption = header+'<b>'+escape(title)+'</b>'+(body ? '\n\n'+escape(body) : '')+footer;
  while(caption.length > LIMIT && (body.length || title.length)) {
    if(body.length) body = Array.from(body).slice(0,-8).join('');
    else title = Array.from(title).slice(0,-8).join('');
    caption = header+'<b>'+escape(title)+'</b>'+(body ? '\n\n'+escape(body)+'…' : '')+footer;
  }
  // Never truncate serialized HTML; tags, entities and links remain balanced.
  return caption.length <= LIMIT ? caption : '<b>Buxara Best</b>\n'+link('Batafsil o‘qish →',detailUrl);
}
const fetchHosts = new Set(['files.catbox.moe','res.cloudinary.com','i.ibb.co','iili.io',...(process.env.MEDIA_FETCH_HOSTS || '').split(',').map(s=>s.trim()).filter(Boolean)]);
async function downloadMedia(url,limit,redirects=0) {
  const parsed = new URL(mediaUrl(url));
  if(!fetchHosts.has(parsed.hostname) || parsed.port || redirects>3) throw Error('Media host is not allowed for Telegram upload');
  const r = await fetch(parsed.href,{redirect:'manual',signal:AbortSignal.timeout(25000)});
  if(r.status>=300 && r.status<400) return downloadMedia(new URL(r.headers.get('location'),url).href,limit,redirects+1);
  if(!r.ok || !r.body || Number(r.headers.get('content-length'))>limit) throw Error('Media download failed or is too large');
  const chunks=[]; let size=0;
  for await(const chunk of r.body) { size+=chunk.length; if(size>limit) { await r.body.cancel().catch(()=>{}); throw Error('Media exceeds Telegram limit'); } chunks.push(chunk); }
  const buffer=Buffer.concat(chunks);
  if(!buffer.length || /<!doctype|<html/i.test(buffer.subarray(0,100).toString())) throw Error('Invalid media response');
  return buffer;
}
function safeError(description) {
  return String(description || 'Telegram rejected the request').replace(/bot\d+:[A-Za-z0-9_-]+/g,'bot[redacted]').slice(0,500);
}
async function sendToTelegram(news) {
  if(news.status!=='published') return {success:false,status:'skipped',error:'Draft articles are never sent'};
  if(news.telegramMessageId || news.telegramStatus==='published') return {success:true,status:'published',messageId:news.telegramMessageId,alreadyPublished:true,publishedAt:news.telegramPublishedAt};
  if(config.telegramDryRun) return {success:false,status:'skipped',error:'DRY_RUN: Telegram yuborilmadi'};
  if(!config.telegramBotToken || !config.telegramChannelId) return {success:false,status:'skipped',error:'Telegram bot token or channel ID is not configured'};
  const caption=buildCaption(news,config.frontendUrl+'/post.html?id='+encodeURIComponent(news.id));
  const method=news.video ? 'sendVideo' : news.mainImage ? 'sendPhoto' : 'sendMessage';
  const field=news.video ? 'video' : 'photo';
  const url=news.video || news.mainImage;
  const endpoint='https://api.telegram.org/bot'+config.telegramBotToken+'/'+method;
  let requestStarted=false;
  try {
    const payload={chat_id:config.telegramChannelId,parse_mode:'HTML',...(url ? {[field]:mediaUrl(url),caption} : {text:caption}),...(news.video ? {supports_streaming:true} : {})};
    requestStarted=true;
    let response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),signal:AbortSignal.timeout(30000)});
    let result=await response.json();
    // Multipart fallback only after an explicit non-delivery response. No retry after timeout or 5xx.
    if(!result.ok && response.status===400 && url && /failed to get|wrong file|webpage|url content|file is too big|file too large/i.test(result.description || '')) {
      requestStarted=false;
      const buffer=await downloadMedia(url,news.video ? 49*1024*1024 : 10*1024*1024);
      const form=new FormData();
      form.set('chat_id',String(config.telegramChannelId)); form.set('caption',caption); form.set('parse_mode','HTML');
      const webm=buffer.subarray(0,4).equals(Buffer.from([0x1a,0x45,0xdf,0xa3]));
      const type=news.video ? (webm?'video/webm':'video/mp4') : 'image/jpeg';
      form.set(field,new Blob([buffer],{type}),news.video ? (webm?'video.webm':'video.mp4') : 'photo.jpg');
      if(news.video) form.set('supports_streaming','true');
      requestStarted=true;
      response=await fetch(endpoint,{method:'POST',body:form,signal:AbortSignal.timeout(60000)});
      result=await response.json();
    }
    if(result.ok && result.result?.message_id) return {success:true,status:'published',messageId:String(result.result.message_id),publishedAt:new Date()};
    return {success:false,status:'failed',uncertain:response.status>=500,error:safeError(result.description)};
  } catch(e) {
    return {success:false,status:'failed',uncertain:requestStarted,error:requestStarted ? 'Telegram javobi olinmadi. Kanalni tekshirmasdan qayta yubormang.' : 'Media tayyorlanmadi. Fayl manzilini tekshiring.'};
  }
}
module.exports = { sendToTelegram, buildCaption, downloadMedia };
