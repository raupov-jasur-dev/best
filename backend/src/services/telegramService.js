const config = require('../config');

// Telegram photo/video caption limiti
const CAPTION_LIMIT = 1024;

async function sendToTelegram(news) {
  const token = config.telegramBotToken;
  const chatId = config.telegramChannelId;

  if (!token || !chatId) {
    return {
      success: false,
      error: 'Telegram bot token or channel ID is not configured',
      status: 'skipped'
    };
  }

  // "Batafsil" → sayt (vercel yoki asosiy domen)
  const base = (config.siteBaseUrl || config.frontendUrl || 'https://bukharabest.uz').replace(/\/$/, '');
  // Production sayt linki
  const siteUrl = `${base}/post.html?id=${news.id}`;
  const caption = buildCaption(news, siteUrl);

  try {
    let result;

    if (news.video) {
      result = await sendMedia(token, chatId, news.video, caption, 'video');
    } else if (news.mainImage) {
      result = await sendMedia(token, chatId, news.mainImage, caption, 'photo');
    } else {
      result = await sendMessage(token, chatId, caption);
    }

    if (result.ok) {
      return {
        success: true,
        messageId: String(result.result.message_id),
        status: 'published',
        publishedAt: new Date()
      };
    }

    return {
      success: false,
      error: result.description || 'Unknown Telegram error',
      status: 'failed'
    };
  } catch (err) {
    return {
      success: false,
      error: err.message || String(err),
      status: 'failed'
    };
  }
}

/**
 * Namuna format:
 *
 * #Prokuratura
 * #Jinoyat
 *
 * Matn matn... Batafsil
 *
 * Telegram | Instagram | Facebook | YouTube | Sayt
 */
function buildCaption(news, detailUrl) {
  const lines = [];

  // Hashtag — kategoriya
  const catName = news.category?.name || news.Category?.name;
  if (catName) {
    lines.push(`#${toHashtag(catName)}`);
  }

  // Qo'shimcha hashtag title dan (ixtiyoriy, qisqa)
  // Foydalanuvchi namunasida 2 ta hashtag bor — kategoriya yetarli

  lines.push(''); // bo'sh qator

  // Matn (short description yoki content)
  let body = (news.shortDescription || news.content || news.title || '').replace(/\s+/g, ' ').trim();

  const footer = buildFooter(detailUrl);
  const reserved = footer.length + 30;
  const maxBody = Math.max(60, CAPTION_LIMIT - reserved);

  if (body.length > maxBody - 20) {
    body = body.slice(0, maxBody - 20).trim() + '…';
  }

  // "Batafsil" — saytga link
  const withMore = `${escapeHtml(body)} <a href="${escapeAttr(detailUrl)}">Batafsil</a>`;
  lines.push(withMore);
  lines.push('');
  lines.push(footer);

  let caption = lines.join('\n');
  if (caption.length > CAPTION_LIMIT) {
    caption = caption.slice(0, CAPTION_LIMIT - 1) + '…';
  }
  return caption;
}

function buildFooter(detailUrl) {
  // Foydalanuvchi bergan linklar
  const telegram = config.socialTelegram || 'https://t.me/Buxarabest';
  const instagram = config.socialInstagram || 'https://www.instagram.com/buxarabest_/';
  const facebook =
    config.socialFacebook ||
    'https://www.facebook.com/groups/716578230428961/?ref=share&mibextid=NSMWBT';
  const youtube = config.socialYoutube || 'https://www.youtube.com/@bukharabest2436';
  const site = config.socialSite || config.siteBaseUrl || 'https://bukharabest.uz';

  // Telegram HTML: <a href="...">Telegram</a> | ...
  return [
    link('Telegram', telegram),
    link('Instagram', instagram),
    link('Facebook', facebook),
    link('YouTube', youtube),
    link('Sayt', site)
  ].join(' | ');
}

function link(label, url) {
  return `<a href="${escapeAttr(url)}">${escapeHtml(label)}</a>`;
}

function toHashtag(name) {
  return String(name)
    .replace(/\s+/g, '')
    .replace(/[^\p{L}\p{N}_]/gu, '')
    .slice(0, 40) || 'Yangilik';
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeAttr(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;');
}

async function sendMessage(token, chatId, text) {
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      disable_web_page_preview: false
    })
  });
  return res.json();
}

async function sendMedia(token, chatId, mediaUrl, caption, type = 'photo') {
  const endpoint = type === 'video' ? 'sendVideo' : 'sendPhoto';
  const payload = {
    chat_id: chatId,
    caption,
    parse_mode: 'HTML'
  };
  if (type === 'video') payload.video = mediaUrl;
  else payload.photo = mediaUrl;

  const res = await fetch(`https://api.telegram.org/bot${token}/${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return res.json();
}

module.exports = { sendToTelegram };
