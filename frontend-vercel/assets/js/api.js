(function (w) {
  const base = (w.__API_URL__ || '').replace(/\/$/, '');
  w.BB = w.BB || {};
  w.BB.apiBase = base + '/api';

  w.BB.api = async function (path, opts) {
    const res = await fetch(w.BB.apiBase + path, opts);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || ('API xato: ' + res.status));
    return data;
  };

  w.BB.formatDate = function (iso) {
    if (!iso) return '';
    try {
      return new Date(iso).toLocaleString('uz-UZ', {
        day: 'numeric', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      });
    } catch { return ''; }
  };

  w.BB.escape = function (s) {
    return String(s || '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  };

  w.BB.excerpt = function (s, n) {
    s = String(s || '').replace(/\s+/g, ' ').trim();
    if (s.length <= n) return s;
    return s.slice(0, n).trim() + '…';
  };
})(window);
