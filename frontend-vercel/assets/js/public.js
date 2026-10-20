(async function() {
  'use strict';
  const B=window.BB,E=B.escape,app=document.getElementById('app'),params=new URLSearchParams(location.search),page=document.body.dataset.page;
  const key=params.get('id') || params.get('slug') || '';
  let cats=[];
  B.shell([],page==='home'?'home':'');
  app.innerHTML=B.skeleton();
  const notFound=()=>'<div class="not-found"><span class="eyebrow">BUXARA BEST / 404</span><div class="error-number">4<span>0</span>4</div><h1>Hikoya boshqa manzilda.</h1><p>Bu sahifa topilmadi. So‘nggi yangiliklar bilan davom eting.</p><a class="button" href="/">Bosh sahifaga '+B.icon('arrow')+'</a></div>';
  // A missing page remains readable when the content API is asleep or unavailable.
  if(page==='404'){
    app.innerHTML=notFound();app.setAttribute('aria-busy','false');
    const result=await B.api('/categories').catch(()=>({data:[]}));B.shell(result.data || []);return;
  }
  function metadata(title,description,image) {
    document.title=title+' — Buxara Best';
    document.querySelector('meta[name="description"]').content=description;
    document.querySelector('meta[property="og:title"]').content=document.title;
    document.querySelector('meta[property="og:description"]').content=description;
    const canonical=new URL(location.href);canonical.hash='';canonical.searchParams.delete('page');
    document.querySelector('link[rel="canonical"]').href=canonical.href;
    document.querySelector('meta[property="og:url"]').content=canonical.href;
    if(B.safeUrl(image)) document.querySelector('meta[property="og:image"]').content=B.safeUrl(image);
  }
  function pager(p) {
    if(!p || p.pages<=1) return '';
    const url=number=>{const u=new URL(location.href);u.searchParams.set('page',number);return u.pathname+u.search;};
    return '<nav class="pagination" aria-label="Sahifalar">'+(p.page>1?'<a class="button button-ghost" href="'+E(url(p.page-1))+'">← Oldingi</a>':'<span></span>')+'<span>'+p.page+' / '+p.pages+'</span>'+(p.page<p.pages?'<a class="button button-ghost" href="'+E(url(p.page+1))+'">Keyingi →</a>':'<span></span>')+'</nav>';
  }
  const storyRows=news=>news.map(n=>'<a class="feed-row" href="'+B.postUrl(n)+'"><span class="feed-time">'+E(B.time(n.publishedAt))+'</span><div><span class="eyebrow">'+E(n.category?.name || '')+'</span><h3>'+E(n.title)+'</h3></div>'+B.icon('arrow')+'</a>').join('');
  async function home() {
    let data;
    try{data=(await B.api('/home')).data;}
    catch(e) {
      if(e.status!==404) throw e;
      // Independently query each category when an older backend is still deployed.
      const [latest,featured,trending,...sections]=await Promise.all([
        B.api('/news?limit=12'),B.api('/news?featured=true&limit=1'),B.api('/news?sort=views&limit=5'),
        ...cats.filter(c=>c.showOnHomepage!==false).map(c=>B.api('/news?category='+encodeURIComponent(c.id)+'&limit=4').then(r=>({category:c,news:r.data})))
      ]);
      data={latest:latest.data,featured:featured.data[0] || latest.data[0],trending:trending.data,sections:sections.filter(s=>s.news.length)};
    }
    const f=data.featured,latest=data.latest || [],side=latest.filter(n=>n.id!==f?.id).slice(0,4);
    app.innerHTML='<section class="edition-intro"><div><span class="eyebrow"><span class="live-dot"></span> BUXARA BEST / KUN TARTIBI</span><p>Yaqin voqealar.<br><em>Kengroq nigoh.</em></p></div><span class="edition-caption">Shahardan boshlanadi.<br>Dunyoga ulanadi.</span></section>'+
      (f?'<section class="lead-grid" aria-label="Asosiy yangilik"><article class="lead-story"><a href="'+B.postUrl(f)+'">'+B.image(f,true)+'<div class="lead-copy"><span class="eyebrow">'+E(f.category?.name || 'Diqqat markazida')+'</span><h1>'+E(f.title)+'</h1><p>'+E(B.excerpt(f.shortDescription || f.content,230))+'</p><div class="lead-bottom">'+B.meta(f)+'<span class="round-arrow">'+B.icon('arrow')+'</span></div></div></a></article><aside class="latest-feed"><div class="feed-heading"><h2>So‘nggi xabarlar</h2><span class="live-dot"></span></div>'+(side.length?storyRows(side):'<div class="quiet-note"><span class="eyebrow">Yangiliklar oqimi</span><p>Eng so‘nggi xabar<br>diqqat markazida.</p><span>Yangi maqolalar shu yerda ko‘rinadi.</span></div>')+'<a class="text-link" href="/search.html">Barcha yangiliklar '+B.icon('arrow')+'</a></aside></section>':B.empty('Yangi hikoyalar shu yerdan boshlanadi','Nashr qilingan yangiliklar tez orada shu yerda ko‘rinadi.'))+
      ((data.trending || []).length?'<section class="trending-section reveal">'+B.sectionTitle('O‘QUVCHILAR TANLOVI','Diqqat markazida')+'<div class="trending-list">'+data.trending.map((n,i)=>'<a href="'+B.postUrl(n)+'"><span class="trending-number">'+String(i+1).padStart(2,'0')+'</span><div><span class="eyebrow">'+E(n.category?.name || 'Yangiliklar')+'</span><h3>'+E(n.title)+'</h3>'+B.meta(n)+'</div></a>').join('')+'</div></section>':'')+
      '<section class="discovery-band reveal"><span class="eyebrow">BIR MANZIL. TURLI NIGOH.</span><h2>Sizni qiziqtirgan<br><em>mavzuni toping.</em></h2><div class="topic-links">'+cats.map(c=>'<a href="'+B.catUrl(c)+'">'+E(c.name)+B.icon('arrow')+'</a>').join('')+'</div></section>'+
      (data.sections || []).map((s,i)=>'<section class="category-section '+(i%2===0 && s.news.length>2?'section-featured':'')+'">'+B.sectionTitle(String(i+1).padStart(2,'0')+' / YANGILIKLAR',s.category.name,B.catUrl(s.category))+'<div class="news-grid">'+s.news.map(n=>B.cardHtml(n,{showExcerpt:true})).join('')+'</div></section>').join('');
  }
  async function listing() {
    let category=page==='category'?cats.find(c=>String(c.id)===key || c.slug===key):null;
    if(page==='category' && !category) category=(await B.api('/categories/'+encodeURIComponent(key))).data;
    const query=params.get('q') || '';
    const q=new URLSearchParams({page:params.get('page') || '1',limit:'12'});
    if(category) q.set('category',category.id);
    if(query) q.set('search',query);
    if(params.get('sort')==='views') q.set('sort','views');
    const result=await B.api('/news?'+q);
    const title=category?.name || (query?'“'+query+'”':'Barcha yangiliklar');
    metadata(title,category?.description || 'Buxara Best yangiliklar arxivi va qidiruv.');
    app.innerHTML='<header class="archive-heading"><span class="eyebrow">'+(category?'RUKN / BUXARA BEST':'ARXIV / QIDIRUV')+'</span><h1>'+E(title)+'</h1><p>'+E(category?.description || 'Muhim voqealar, kerakli mavzular. Izlaganingiz shu yerda.')+'</p></header>'+
      (!category?'<form class="search-form archive-search" action="/search.html"><label class="sr-only" for="archiveQuery">Yangilik qidirish</label><input id="archiveQuery" type="search" name="q" value="'+E(query)+'" maxlength="200" placeholder="Yangiliklar orasidan qidiring"><button class="button" type="submit">'+B.icon('search')+' Qidirish</button></form>':'')+
      '<div class="results-toolbar"><span>'+B.number(result.pagination?.total)+' ta maqola</span><label>Saralash <select id="sortSelect"><option value="latest">Eng yangi</option><option value="views" '+(params.get('sort')==='views'?'selected':'')+'>Eng ko‘p o‘qilgan</option></select></label></div>'+
      (result.data.length?'<div class="news-grid archive-grid">'+result.data.map(n=>B.cardHtml(n,{showExcerpt:true})).join('')+'</div>':B.empty(query?'Hech narsa topilmadi':'Bu ruknda hali yangilik yo‘q',query?'Boshqa so‘z yoki qisqaroq ibora bilan qidiring.':'Boshqa ruknlardagi voqealarni kuzatib boring.','<a class="button" href="/">Bosh sahifaga '+B.icon('arrow')+'</a>'))+pager(result.pagination);
    document.getElementById('sortSelect').addEventListener('change',e=>{const u=new URL(location.href);u.searchParams.set('sort',e.target.value);u.searchParams.delete('page');location.href=u;});
  }
  async function article() {
    if(!key) throw Object.assign(new Error('Maqola manzili ko‘rsatilmagan.'),{status:404});
    const n=(await B.api('/news/'+encodeURIComponent(key))).data;
    metadata(n.title,B.excerpt(n.shortDescription || n.content,160),n.mainImage);
    document.querySelector('meta[property="og:type"]').content='article';
    B.shell(cats,'cat-'+n.categoryId);
    const related=await B.api('/news?category='+encodeURIComponent(n.categoryId)+'&limit=4').then(r=>r.data.filter(x=>x.id!==n.id).slice(0,3)).catch(()=>[]);
    app.innerHTML='<article class="article-page"><nav class="breadcrumbs" aria-label="Yo‘l"><a href="/">Bosh sahifa</a><span>/</span>'+(n.category?'<a href="'+B.catUrl(n.category)+'">'+E(n.category.name)+'</a>':'Yangilik')+'</nav><header class="article-heading"><span class="eyebrow category-label">'+E(n.category?.name || 'Yangiliklar')+'</span><h1>'+E(n.title)+'</h1>'+(n.shortDescription?'<p class="article-deck">'+E(n.shortDescription)+'</p>':'')+'<div class="article-byline"><span class="byline-logo">b.</span><span><strong>Buxara Best</strong><br><span class="meta">'+E(B.formatDate(n.publishedAt))+'</span></span><span class="reading-time">'+Math.max(1,Math.ceil(String(n.content || '').split(/\s+/).length/200))+' daqiqa o‘qish</span></div></header>'+
      (n.mainImage?'<figure class="article-hero">'+B.image(n,true)+'</figure>':'')+
      '<div class="article-layout"><aside class="article-tools"><span class="eyebrow">ULASHISH</span><a class="icon-button" href="https://t.me/share/url?url='+encodeURIComponent(location.href)+'&text='+encodeURIComponent(n.title)+'" target="_blank" rel="noopener noreferrer" aria-label="Telegramda ulashish">'+B.icon('send')+'</a><button class="icon-button" id="shareArticle" aria-label="Havolani ulashish">'+B.icon('external')+'</button><span>'+B.icon('eye')+' '+B.number(n.views)+'</span><span id="shareStatus" role="status"></span></aside><div class="article-prose">'+String(n.content || n.shortDescription || '').split(/\n\s*\n/).map(p=>'<p>'+E(p).replace(/\n/g,'<br>')+'</p>').join('')+
      (B.safeUrl(n.video)?'<figure class="article-video"><video src="'+E(B.safeUrl(n.video))+'" controls playsinline preload="metadata" '+(B.safeUrl(n.mainImage)?'poster="'+E(B.safeUrl(n.mainImage))+'"':'')+' aria-label="'+E(n.title)+'"></video><figcaption>Maqolaga oid video</figcaption></figure>':'')+
      '<div class="article-gallery">'+(n.images || []).map(img=>B.safeUrl(img.url)?'<figure><img src="'+E(B.safeUrl(img.url))+'" alt="'+E(n.title)+' — qo‘shimcha surat" width="960" height="640" loading="lazy"></figure>':'').join('')+'</div>'+
      '<div class="article-end"><span>Buxara Best</span><span class="brand-dot">●</span></div><section class="comments-box"><div class="section-heading"><h2>Fikrlar</h2><span>'+B.number((n.comments || []).length)+'</span></div><div class="comments-list">'+(n.comments || []).map(c=>'<article class="comment"><strong>'+E(c.authorName || 'Mehmon')+'</strong><time>'+E(B.formatDate(c.publishedAt))+'</time><p>'+E(c.content)+'</p></article>').join('')+'</div><form id="commentForm" class="comment-form"><h3>Sizning fikringiz</h3><p>Izohingiz moderator tasdig‘idan keyin ko‘rinadi.</p><label for="commentName">Ismingiz</label><input id="commentName" name="authorName" maxlength="120" autocomplete="name" placeholder="Ismingiz"><label for="commentText">Izoh</label><textarea id="commentText" name="content" required minlength="2" maxlength="5000" rows="4" placeholder="Mavzu haqida fikringiz…"></textarea><button class="button" type="submit">Fikr yuborish '+B.icon('arrow')+'</button><p id="commentStatus" role="status"></p></form></section></div></div></article>'+
      (related.length?'<section class="related-section">'+B.sectionTitle('O‘QISHDA DAVOM ETING','Mavzuga yaqin')+'<div class="news-grid">'+related.map(n=>B.cardHtml(n)).join('')+'</div></section>':'');
    document.getElementById('shareArticle').onclick=async()=>{
      try{if(navigator.share)await navigator.share({title:n.title,url:location.href});else{await navigator.clipboard.writeText(location.href);document.getElementById('shareStatus').textContent='Nusxalandi';}}
      catch(e){if(e.name!=='AbortError')document.getElementById('shareStatus').textContent='Havolani manzil satridan nusxalang.';}
    };
    document.getElementById('commentForm').onsubmit=async e=>{
      e.preventDefault();const form=e.currentTarget,button=form.querySelector('button'),status=document.getElementById('commentStatus');button.disabled=true;
      try{await B.api('/news/'+encodeURIComponent(n.id)+'/comments',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(Object.fromEntries(new FormData(form)))});form.reset();status.textContent='Rahmat. Fikringiz moderatsiyaga yuborildi.';}
      catch(err){status.textContent=err.message;}finally{button.disabled=false;}
    };
  }
  try {
    const results=await Promise.allSettled([B.api('/categories'),B.api('/config')]);
    if(results[1].status==='fulfilled')B.config=results[1].value.data;
    if(results[0].status==='rejected')throw results[0].reason;
    cats=results[0].value.data || [];
    B.shell(cats,page==='home'?'home':page==='category'?'cat-'+key:'');
    if(page==='home')await home();
    else if(page==='article')await article();
    else await listing();
    B.reveal();
  }catch(e){app.innerHTML=e.status===404?B.empty('Sahifa topilmadi',e.message,'<a class="button" href="/">Bosh sahifaga '+B.icon('arrow')+'</a>'):B.error(e);}
  finally{app.setAttribute('aria-busy','false');}
})();
