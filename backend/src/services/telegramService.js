const config = require('../config');

async function sendToTelegram(news, options = {}) {
  const token = config.telegramBotToken;
  const chatId = config.telegramChannelId;

  if (!token || !chatId) {
    return {
      success: false,
      error: 'Telegram bot token or channel ID is not configured',
      status: 'skipped'
    };
  }

  const siteUrl = `${config.siteBaseUrl}/post/${news.id}`;
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

function buildCaption(news, siteUrl) {
  const title = escapeHtml(news.title || '');
  const desc = escapeHtml((news.shortDescription || news.content || '').slice(0, 300));
  let text = `<b>${title}</b>\n\n`;
  if (desc) text += `${desc}\n\n`;
  text += `👉 <a href="${siteUrl}">Batafsil o‘qish</a>`;
  return text;
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
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
