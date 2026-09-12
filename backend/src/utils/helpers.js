const slugify = require('slugify');

function makeSlug(title) {
  let base = slugify(String(title || 'news'), {
    lower: true,
    strict: true,
    locale: 'ru'
  });
  // Agar faqat kirill/bo'sh bo'lsa — fallback
  if (!base || base.length < 2) {
    base = 'news';
  }
  return base.slice(0, 80) + '-' + Date.now().toString(36);
}

function paginate(query, page = 1, limit = 9) {
  const p = Math.max(1, parseInt(page, 10) || 1);
  const l = Math.min(50, Math.max(1, parseInt(limit, 10) || 9));
  return {
    offset: (p - 1) * l,
    limit: l,
    page: p
  };
}

module.exports = { makeSlug, paginate };
