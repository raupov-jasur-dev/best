const config = require('../config');
const FormData = require('form-data');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { pipeline } = require('stream/promises');
const { Readable } = require('stream');

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
 * Video ni Telegram player sifatida yuborish (qora ekran / file bo'lmasligi uchun)
 * form-data + vaqtinchalik fayl — Node da eng ishonchli usul
 */
async function sendVideoProperly(token, chatId, videoUrl, caption) {
  let tmpPath = null;
  try {
    const fileRes = await fetch(videoUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        Accept: '*/*'
      },
      redirect: 'follow'
    });

    if (!fileRes.ok) {
      throw new Error('Video yuklab bo‘lmadi: HTTP ' + fileRes.status);
    }

    const buf = Buffer.from(await fileRes.arrayBuffer());
    if (!buf.length) throw new Error('Video fayl bo‘sh');

    if (buf.length > 49 * 1024 * 1024) {
      throw new Error('Video 50MB dan katta — Telegram bot limiti');
    }

    // HTML xato sahifa kelganmi?
    const head = buf.slice(0, 200).toString('utf8');
    if (/<!DOCTYPE|<html/i.test(head)) {
      throw new Error('Video URL dan HTML qaytdi, media emas');
    }

    const filename = forceVideoFilename(videoUrl, buf);
    tmpPath = path.join(os.tmpdir(), `bb-tg-${Date.now()}-${filename}`);
    fs.writeFileSync(tmpPath, buf);

    const form = new FormData();
    form.append('chat_id', String(chatId));
    form.append('caption', caption.slice(0, CAPTION_LIMIT));
    form.append('parse_mode', 'HTML');
    form.append('supports_streaming', 'true');
    form.append('video', fs.createReadStream(tmpPath), {
      filename,
      contentType: mimeFromName(filename),
      knownLength: buf.length
    });

    const json = await submitForm(`https://api.telegram.org/bot${token}/sendVideo`, form);
    if (json.ok) return json;

    console.warn('[telegram] form-data sendVideo failed:', json.description);

    // Fallback: URL orqali
    const res2 = await fetch(`https://api.telegram.org/bot${token}/sendVideo`, {
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
    return res2.json();
  } catch (e) {
    console.warn('[telegram] sendVideoProperly error:', e.message);
    // Oxirgi urinish — URL
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
  } finally {
    if (tmpPath) {
      try { fs.unlinkSync(tmpPath); } catch {}
    }
  }
}

async function sendPhotoProperly(token, chatId, photoUrl, caption) {
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

  // Fallback multipart
  try {
    const fileRes = await fetch(photoUrl);
    if (!fileRes.ok) return json;
    const buf = Buffer.from(await fileRes.arrayBuffer());
    const filename = guessFilename(photoUrl, 'photo.jpg');
    const form = new FormData();
    form.append('chat_id', String(chatId));
    form.append('caption', caption.slice(0, CAPTION_LIMIT));
    form.append('parse_mode', 'HTML');
    form.append('photo', buf, {
      filename,
      contentType: mimeFromName(filename),
      knownLength: buf.length
    });
    return await submitForm(`https://api.telegram.org/bot${token}/sendPhoto`, form);
  } catch {
    return json;
  }
}

function submitForm(url, form) {
  return new Promise((resolve, reject) => {
    form.submit(url, (err, res) => {
      if (err) return reject(err);
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch {
          resolve({ ok: false, description: data.slice(0, 300) });
        }
      });
      res.on('error', reject);
    });
  });
}

/** MP4/WebM magic bytes asosida to'g'ri kengaytma */
function forceVideoFilename(url, buf) {
  // MP4: ....ftyp
  if (buf.length > 12 && buf.slice(4, 8).toString('ascii') === 'ftyp') {
    return 'video.mp4';
  }
  // WebM / MKV: 0x1A45DFA3
  if (buf.length > 4 && buf[0] === 0x1a && buf[1] === 0x45 && buf[2] === 0xdf && buf[3] === 0xa3) {
    return 'video.webm';
  }
  const fromUrl = guessFilename(url, '');
  if (/\.(mp4|webm|mov)$/i.test(fromUrl)) return fromUrl;
  // Default — Telegram eng yaxshi mp4 ni o'ynatadi
  return 'video.mp4';
}

function guessFilename(url, fallback) {
  try {
    const u = new URL(url);
    const base = (u.pathname.split('/').pop() || '').split('?')[0];
    if (base && base.includes('.')) return base;
  } catch {}
  return fallback || 'file.bin';
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
  if (catName) lines.push(`#${toHashtag(catName)}`);
  lines.push('');

  let body = (news.shortDescription || news.content || news.title || '').replace(/\s+/g, ' ').trim();
  const footer = buildFooter();
  const maxBody = Math.max(60, CAPTION_LIMIT - footer.length - 30);
  if (body.length > maxBody - 20) body = body.slice(0, maxBody - 20).trim() + '…';

  lines.push(`${escapeHtml(body)} <a href="${escapeAttr(detailUrl)}">Batafsil</a>`);
  lines.push('');
  lines.push(footer);

  let caption = lines.join('\n');
  if (caption.length > CAPTION_LIMIT) caption = caption.slice(0, CAPTION_LIMIT - 1) + '…';
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
  return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function escapeAttr(text) {
  return String(text).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
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
