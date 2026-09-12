(function (w) {
  const BB = w.BB;

  BB.renderHeader = function (categories, active) {
    const cats = categories || [];
    const navLinks = [
      { href: '/', label: 'Bosh sahifa', key: 'home' },
      ...cats.slice(0, 6).map(c => ({ href: '/category.html?id=' + c.id, label: c.name, key: 'cat-' + c.id }))
    ];

    const navHtml = navLinks.map(l =>
      `<a href="${l.href}" class="${active === l.key ? 'active' : ''}">${BB.escape(l.label)}</a>`
    ).join('');

    const mobileHtml = navLinks.map(l =>
      `<a href="${l.href}">${BB.escape(l.label)}</a>`
    ).join('') + `<a href="/search.html">Qidiruv</a>`;

    const chips = [
      `<a class="cat-chip ${active === 'home' ? 'active' : ''}" href="/">Barchasi</a>`,
      ...cats.map(c =>
        `<a class="cat-chip ${active === 'cat-' + c.id ? 'active' : ''}" href="/category.html?id=${c.id}">${BB.escape(c.name)}</a>`
      )
    ].join('');

    return `
<header class="site-header">
  <div class="container header-inner">
    <a href="/" class="brand">
      <span class="brand-mark">BB</span>
      <span class="brand-text">Bukhara <span>Best</span></span>
    </a>
    <nav class="nav-main">${navHtml}</nav>
    <div class="header-actions">
      <a href="/search.html" class="icon-btn" title="Qidiruv" aria-label="Qidiruv"><i class="bi bi-search"></i></a>
      <button type="button" class="menu-toggle" id="menuToggle" aria-label="Menu"><i class="bi bi-list"></i></button>
    </div>
  </div>
  <div class="mobile-nav" id="mobileNav">
    <div class="mobile-search">
      <form action="/search.html" method="get">
        <input name="q" type="search" placeholder="Qidirish..." autocomplete="off">
      </form>
    </div>
    ${mobileHtml}
  </div>
</header>
<div class="cat-strip">
  <div class="container cat-strip-inner">${chips}</div>
</div>`;
  };

  BB.renderFooter = function (categories) {
    const cats = (categories || []).slice(0, 8);
    const year = new Date().getFullYear();
    return `
<footer class="site-footer">
  <div class="container">
    <div class="footer-grid">
      <div class="footer-brand">
        <a href="/" class="brand">
          <span class="brand-mark">BB</span>
          <span class="brand-text">Bukhara <span>Best</span></span>
        </a>
        <p>Bukhara-best.uz — rasmiy elektron OAV. Respublika va Buxoro viloyatidagi eng so‘nggi yangiliklar.</p>
      </div>
      <div class="footer-col">
        <h4>Navigatsiya</h4>
        <a href="/">Bosh sahifa</a>
        <a href="/search.html">Qidiruv</a>
        <a href="/admin/">Admin</a>
      </div>
      <div class="footer-col">
        <h4>Kategoriyalar</h4>
        ${cats.map(c => `<a href="/category.html?id=${c.id}">${BB.escape(c.name)}</a>`).join('') || '<span style="opacity:.5">—</span>'}
      </div>
      <div class="footer-col">
        <h4>Aloqa</h4>
        <a href="https://t.me/Jurnalisttv" target="_blank" rel="noopener">@Jurnalisttv</a>
        <a href="/search.html">Qidiruv</a>
      </div>
    </div>
    <div class="footer-bottom">
      <span>© ${year} Bukhara Best. Barcha huquqlar himoyalangan.</span>
      <span>bukhara-best.uz</span>
    </div>
  </div>
</footer>`;
  };

  BB.bindHeader = function () {
    const btn = document.getElementById('menuToggle');
    const nav = document.getElementById('mobileNav');
    if (btn && nav) {
      btn.addEventListener('click', () => nav.classList.toggle('open'));
    }
  };

  BB.cardHtml = function (n, opts) {
    opts = opts || {};
    const large = opts.large ? ' large' : '';
    const img = n.mainImage
      ? `<img src="${BB.escape(n.mainImage)}" alt="" loading="lazy">`
      : `<div style="width:100%;height:100%;background:#e8ebef"></div>`;
    const cat = n.category ? `<span class="badge-cat">${BB.escape(n.category.name)}</span>` : '';
    const desc = opts.showExcerpt
      ? `<p class="excerpt">${BB.escape(BB.excerpt(n.shortDescription || n.content, 110))}</p>`
      : '';
    return `
<article class="news-card${large}">
  <a href="/post.html?id=${n.id}">
    <div class="news-card-img-wrap">${img}</div>
    <div class="news-card-body">
      ${cat}
      <h3>${BB.escape(n.title)}</h3>
      ${desc}
      <div class="meta">
        <span><i class="bi bi-clock"></i> ${BB.formatDate(n.publishedAt)}</span>
        <span class="dot"><i class="bi bi-eye"></i> ${n.views || 0}</span>
      </div>
    </div>
  </a>
</article>`;
  };
})(window);
