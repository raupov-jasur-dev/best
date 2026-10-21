(function(w) {
'use strict';
const B=w.BB=w.BB || {};
B.apiBase=String(w.__API_URL__ || location.origin).replace(/\/$/,'')+'/api';
B.api=async function(path,options={}) {
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),options.timeout || 35000);
 try {
  const r=await fetch(B.apiBase+path,{cache:'no-store',...options,signal:options.signal || controller.signal});
  const d=await r.json().catch(()=>({}));
  if(!r.ok || d.success===false) throw Object.assign(new Error(d.message || 'Ma’lumotni yuklab bo‘lmadi.'),{status:r.status,code:d.code});
  return d;
 }catch(e){if(e.name==='AbortError' || e instanceof TypeError) throw Object.assign(new Error('Ulanish uzildi. Internetni tekshirib, qayta urinib ko‘ring.'),{status:0});throw e;}
 finally{clearTimeout(timer);}
};
B.escape=s=>String(s ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
B.excerpt=(s,n=140)=>{const t=String(s || '').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();return t.length>n?t.slice(0,n).trim()+'…':t;};
B.safeUrl=value=>{if(!value)return '';try{const u=new URL(value,B.apiBase);if(!['https:','http:'].includes(u.protocol)||u.username||u.password)return '';if(u.protocol==='http:'&&!['localhost','127.0.0.1',location.hostname].includes(u.hostname))return '';return u.href;}catch{return '';}};
// Share ICU formatters across the feed; constructing one per card blocks slower phones.
const dateFormat=new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'numeric',year:'numeric',timeZone:'Asia/Tashkent'});
const timeFormat=new Intl.DateTimeFormat('uz-UZ',{hour:'2-digit',minute:'2-digit',timeZone:'Asia/Tashkent'});
const numberFormat=new Intl.NumberFormat('uz-UZ');
B.formatDate=iso=>{const date=new Date(iso);if(!iso||Number.isNaN(date.getTime()))return '';const parts=dateFormat.formatToParts(date);const get=type=>parts.find(p=>p.type===type)?.value;return get('day')+' '+['yanvar','fevral','mart','aprel','may','iyun','iyul','avgust','sentabr','oktabr','noyabr','dekabr'][Number(get('month'))-1]+' '+get('year');};
B.time=iso=>!iso||Number.isNaN(new Date(iso).getTime())?'':timeFormat.format(new Date(iso));
B.number=n=>numberFormat.format(Number(n)||0);
B.postUrl=n=>'/post.html?id='+encodeURIComponent(n.id);
B.catUrl=c=>'/category.html?id='+encodeURIComponent(c.id);
B.icon=name=>'<svg class="icon" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">'+({
arrow:'<path d="M5 12h14M13 6l6 6-6 6"/>',search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
menu:'<path d="M4 7h16M4 12h16M4 17h16"/>',close:'<path d="m6 6 12 12M6 18 18 6"/>',
eye:'<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12"/><circle cx="12" cy="12" r="2.5"/>',
play:'<path d="m9 5 10 7-10 7z"/>',external:'<path d="M14 4h6v6M20 4l-9 9M10 4H4v16h16v-6"/>',
plus:'<path d="M12 5v14M5 12h14"/>',check:'<path d="m5 12 4 4L19 6"/>',
grid:'<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
news:'<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h4"/>',
tag:'<path d="M3 4h8l10 10-7 7L3 10z"/><circle cx="7.5" cy="7.5" r="1"/>',
comment:'<path d="M21 11a9 9 0 0 1-9 9c-2 0-3-.5-4-1l-6 2 2-6c-1-1-1-2-1-4a9 9 0 0 1 18 0Z"/>',
settings:'<path d="M4 6h16M4 12h16M4 18h16"/><circle cx="9" cy="6" r="2" fill="currentColor"/><circle cx="15" cy="12" r="2" fill="currentColor"/><circle cx="9" cy="18" r="2" fill="currentColor"/>',
logout:'<path d="M9 4H4v16h5M9 12h12m-5-5 5 5-5 5"/>',upload:'<path d="M12 16V3m-5 5 5-5 5 5M4 16v5h16v-5"/>',
chevron:'<path d="m9 5 7 7-7 7"/>',moon:'<path d="M20 15A9 9 0 0 1 9 4a9 9 0 1 0 11 11Z"/>',
sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1 1m12 12 1 1M5 19l1-1M18 6l1-1"/>',send:'<path d="m22 2-7 20-4-9-9-4Zm0 0L11 13"/>'
}[name] || '<circle cx="12" cy="12" r="8"/>')+'</svg>';
B.empty=(title,detail='',action='')=>'<div class="empty-state"><span class="empty-mark">b.</span><h2>'+B.escape(title)+'</h2><p>'+B.escape(detail)+'</p>'+action+'</div>';
B.error=e=>B.empty('Bir oz tanaffus',e.message,'<button type="button" class="button" data-reload>Qayta urinish '+B.icon('arrow')+'</button>');
B.skeleton=()=>'<div class="skeleton-grid" aria-hidden="true"><div class="skeleton"></div><div class="skeleton"></div><div class="skeleton"></div></div><p class="loading-copy" role="status">Yangiliklar yuklanmoqda…</p>';
document.addEventListener('click',e=>{if(e.target.closest('[data-reload]'))location.reload();});
document.addEventListener('error',e=>{if(e.target.tagName==='IMG'){e.target.hidden=true;e.target.parentElement?.classList.add('image-unavailable');}},true);
document.addEventListener('error',e=>{
 const video=e.target;if(video.tagName!=='VIDEO'||video.dataset.errorShown)return;
 video.dataset.errorShown='true';const message=document.createElement('p');message.className='field-help';message.setAttribute('role','status');
 message.textContent='Video ochilmadi. Ulanish yoki video formatini tekshiring. ';const url=B.safeUrl(video.currentSrc||video.src);
 if(url){const a=document.createElement('a');a.href=url;a.target='_blank';a.rel='noopener noreferrer';a.textContent='Videoni alohida ochish';message.append(a);}video.after(message);
},true);
})(window);
