const config = require('../config');

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

  const base = (config.siteBaseUrl || config.frontendUrl || 'https://bukharabest.uz').replace(/\/$/, '');
  const siteUrl = `${base}/post.html?id=${news.id}`;
  const caption = buildCaption(news, siteUrl);

  try {
    let result;

    if (news.video) {
      // Video — fayl sifatida emas, playable video sifatida
      result = await sendVideoProperly(token, chatId, news.video, caption);
    } else if (news.mainImage) {
      result = await sendPhotoProperly(token, chatId, news.mainImage, caption);
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
      error: result.description || JSON.stringify(result).slice(0, 300) || 'Unknown Telegram error',
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
 * Video ni Telegram da PLAYER sifatida yuborish.
 * URL orqali ba'zan "file" bo'lib ketadi — shuning uchun
 * avval faylni yuklab, multipart sendVideo qilamiz.
 */
async function sendVideoProperly(token, chatId, videoUrl, caption) {
  // 1) URL dan video yuklab olish
  try {
    const fileRes = await fetch(videoUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
      }
    });
    if (fileRes.ok) {
      const buf = Buffer.from(await fileRes.arrayBuffer());
      // Telegram sendVideo limit ~50MB bot API
      if (buf.length > 0 && buf.length <= 49 * 1024 * 1024) {
        const filename = guessFilename(videoUrl, 'video.mp4');
        const form = new FormData();
        form.append('chat_id', String(chatId));
        form.append('caption', caption.slice(0, CAPTION_LIMIT));
        form.append('parse_mode', 'HTML');
        form.append('supports_streaming', 'true');
        form.append('video', new Blob([buf], { type: mimeFromName(filename) }), filename);

        const res = await fetch(`https://api.telegram.org/bot${token}/sendVideo`, {
          method: 'POST',
          body: form
        });
        const json = await res.json();
        if (json.ok) return json;
        console.warn('[telegram] multipart sendVideo failed:', json.description);
      }
    }
  } catch (e) {
    console.warn('[telegram] download video failed:', e.message);
  }

  // 2) Fallback — URL orqali sendVideo (ba'zan ishlaydi)
  const res = await fetch(`https://api.telegram.org/bot${token}/sendVideo`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      video: videoUrl,
      caption: caption.slice(0, CAPTION_LIMIT),
      parse_mode: 'HTML',
      supports_streaming: true
    })
  });
  return res.json();
}

async function sendPhotoProperly(token, chatId, photoUrl, caption) {
  // Avval URL (oddiy va tez)
  let res = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      photo: photoUrl,
      caption: caption.slice(0, CAPTION_LIMIT),
      parse_mode: 'HTML'
    })
  });
  let json = await res.json();
  if (json.ok) return json;

  // Fallback — fayl sifatida yuklash
  try {
    const fileRes = await fetch(photoUrl);
    if (!fileRes.ok) return json;
    const buf = Buffer.from(await fileRes.arrayBuffer());
    const filename = guessFilename(photoUrl, 'photo.jpg');
    const form = new FormData();
    form.append('chat_id', String(chatId));
    form.append('caption', caption.slice(0, CAPTION_LIMIT));
    form.append('parse_mode', 'HTML');
    form.append('photo', new Blob([buf], { type: mimeFromName(filename) }), filename);
    res = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
      method: 'POST',
      body: form
    });
    return res.json();
  } catch {
    return json;
  }
}

function guessFilename(url, fallback) {
  try {
    const u = new URL(url);
    const base = u.pathname.split('/').pop() || '';
    if (/\.(mp4|webm|mov|mkv|avi|jpg|jpeg|png|webp|gif)$/i.test(base)) return base;
  } catch {}
  return fallback;
}

function mimeFromName(name) {
  const lower = String(name).toLowerCase();
  if (lower.endsWith('.mp4')) return 'video/mp4';
  if (lower.endsWith('.webm')) return 'video/webm';
  if (lower.endsWith('.mov')) return 'video/quicktime';
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.gif')) return 'image/gif';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  return 'application/octet-stream';
}

function buildCaption(news, detailUrl) {
  const lines = [];

  const catName = news.category?.name || news.Category?.name;
  if (catName) {
    lines.push(`#${toHashtag(catName)}`);
  }

  lines.push('');

  let body = (news.shortDescription || news.content || news.title || '').replace(/\s+/g, ' ').trim();
  const footer = buildFooter(detailUrl);
  const reserved = footer.length + 30;
  const maxBody = Math.max(60, CAPTION_LIMIT - reserved);
  if (body.length > maxBody - 20) {
    body = body.slice(0, maxBody - 20).trim() + '…';
  }

  lines.push(`${escapeHtml(body)} <a href="${escapeAttr(detailUrl)}">Batafsil</a>`);
  lines.push('');
  lines.push(footer);

  let caption = lines.join('\n');
  if (caption.length > CAPTION_LIMIT) {
    caption = caption.slice(0, CAPTION_LIMIT - 1) + '…';
  }
  return caption;
}

function buildFooter() {
  const telegram = config.socialTelegram || 'https://t.me/Buxarabest';
  const instagram = config.socialInstagram || 'https://www.instagram.com/buxarabest_/';
  const facebook =
    config.socialFacebook ||
    'https://www.facebook.com/groups/716578230428961/?ref=share&mibextid=NSMWBT';
  const youtube = config.socialYoutube || 'https://www.youtube.com/@bukharabest2436';
  const site = config.socialSite || config.siteBaseUrl || 'https://bukharabest.uz';

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
  return (
    String(name)
      .replace(/\s+/g, '')
      .replace(/[^\p{L}\p{N}_]/gu, '')
      .slice(0, 40) || 'Yangilik'
  );
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

module.exports = { sendToTelegram };
