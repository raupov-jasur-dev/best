function fail(message, status = 400, code = 'VALIDATION_ERROR') { return Object.assign(new Error(message), { status, code }); }
function text(value, name, max, required = false) {
  if (value === undefined && !required) return undefined;
  if (typeof value !== 'string' || value.trim().length > max || (required && !value.trim())) throw fail(name + ': qiymatni tekshiring (maks. ' + max + ').');
  return value.trim();
}
function bool(value) {
  if (![true, false, 'true', 'false'].includes(value)) throw fail('Mantiqiy maydon true yoki false bo‘lishi kerak.');
  return value === true || value === 'true';
}
function id(value) {
  if (!/^[1-9]\d{0,9}$/.test(String(value)) || Number(value) > 2147483647) throw fail('Noto‘g‘ri identifikator.');
  return Number(value);
}
function mediaUrl(value) {
  try { const u = new URL(value); if (u.protocol !== 'https:' || u.username || u.password || value.length > 500) throw Error(); return u.href; }
  catch { throw fail('Media manzili yaroqsiz.'); }
}
module.exports = { fail, text, bool, id, mediaUrl };
