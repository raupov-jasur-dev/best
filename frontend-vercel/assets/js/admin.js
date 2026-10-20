(function(w){
  'use strict';
  const B=w.BB,E=B.escape;
  const C=w.CMS={B,E,renderers:{},dirty:false,user:null,routeId:0,previewUrls:[]};
  let token='';
  try{token=sessionStorage.getItem('bb_admin_session') || '';localStorage.removeItem('admin_token');localStorage.removeItem('API_URL');}catch{}
  C.api=async(path,options={})=>{
    try{return await B.api(path,{...options,headers:{...(token?{Authorization:'Bearer '+token}:{}),...(options.body && !(options.body instanceof FormData)?{'Content-Type':'application/json'}:{}),...options.headers}});}
    catch(e){if(e.status===401 && token)C.logout();throw e;}
  };
  C.toast=(message,error=false)=>{
    const el=document.createElement('div');el.className='toast'+(error?' toast-error':'');
    el.innerHTML='<span>'+E(message)+'</span><button type="button" aria-label="Xabarni yopish">'+B.icon('close')+'</button>';
    el.querySelector('button').onclick=()=>el.remove();document.getElementById('toasts').append(el);setTimeout(()=>el.remove(),error?15000:6500);
  };
  C.confirm=(message,title='Amalni tasdiqlang')=>new Promise(resolve=>{
    const d=document.getElementById('confirmDialog');d.returnValue='cancel';
    document.getElementById('confirmTitle').textContent=title;document.getElementById('confirmText').textContent=message;
    d.addEventListener('close',()=>resolve(d.returnValue==='yes'),{once:true});d.showModal();
  });
  C.closeSidebar=()=>{const sidebar=document.getElementById('sidebar');sidebar.classList.remove('open');sidebar.inert=matchMedia('(max-width:1000px)').matches;document.getElementById('sidebarOverlay').classList.remove('open');document.getElementById('openSidebar').setAttribute('aria-expanded','false');};
  C.logout=()=>{token='';C.user=null;C.dirty=false;C.routeId++;try{sessionStorage.removeItem('bb_admin_session');}catch{}document.getElementById('workspace').hidden=true;document.getElementById('loginPage').hidden=false;document.getElementById('password').value='';C.closeSidebar();};
  C.show=()=>{document.getElementById('loginPage').hidden=true;document.getElementById('workspace').hidden=false;document.getElementById('userName').textContent=C.user.username;C.route();};
  C.heading=(eyebrow,title,description='',action='')=>'<div class="page-heading"><div><span class="eyebrow">'+E(eyebrow)+'</span><h1>'+E(title)+'</h1>'+(description?'<p>'+E(description)+'</p>':'')+'</div>'+action+'</div>';
  C.newButton=()=>'<a class="button button-accent" href="#news-create">'+B.icon('plus')+' Yangi maqola</a>';
  C.status=(value,type='news')=>'<span class="status status-'+E(value)+'">'+E(({published:type==='telegram'?'Yuborilgan':'Nashr qilingan',draft:'Qoralama',pending:'Kutilmoqda',failed:'Xatolik',skipped:'Yuborilmagan'})[value] || value)+'</span>';
  C.pagination=p=>!p?'':'<div class="table-pagination"><span>'+B.number(p.total)+' ta yozuv · '+p.page+' / '+Math.max(1,p.pages)+' sahifa</span><div><button class="small-button" data-page="'+(p.page-1)+'" '+(p.page<=1?'disabled':'')+' aria-label="Oldingi sahifa">←</button><button class="small-button" data-page="'+(p.page+1)+'" '+(p.page>=p.pages?'disabled':'')+' aria-label="Keyingi sahifa">→</button></div></div>';
  C.go=(page,query={})=>{const next='#'+page+(Object.keys(query).length?'?'+new URLSearchParams(query):'');if(location.hash===next)C.route();else location.hash=next;};
  C.query=()=>new URLSearchParams((location.hash.split('?')[1] || ''));
  C.tableStory=n=>'<a class="table-story" href="#news-edit-'+encodeURIComponent(n.id)+'">'+(B.safeUrl(n.mainImage)?'<img src="'+E(B.safeUrl(n.mainImage))+'" alt="" loading="lazy">':'<span class="thumb-fallback" aria-hidden="true">b.</span>')+'<span><strong>'+E(n.title)+'</strong><small>'+E(n.category?.name || '')+' · '+E(B.formatDate(n.publishedAt || n.createdAt))+'</small></span></a>';
  let previousHash=location.hash || '#dashboard';
  C.route=async()=>{
    if(!C.user)return;
    const id=++C.routeId,hash=location.hash || '#dashboard',page=hash.slice(1).split('?')[0];
    previousHash=hash;C.closeSidebar();
    C.previewUrls.forEach(url=>URL.revokeObjectURL(url));C.previewUrls=[];
    document.querySelectorAll('[data-nav]').forEach(a=>{const active=a.dataset.nav===page || (page.startsWith('news-edit-')&&a.dataset.nav==='news');if(active)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
    document.getElementById('sectionName').textContent=({dashboard:'Umumiy ko‘rinish',news:'Yangiliklar','news-create':'Yangi maqola',categories:'Kategoriyalar',comments:'Izohlar',presentation:'Sayt taqdimoti'})[page] || 'Maqola tahriri';
    const content=document.getElementById('content');content.setAttribute('aria-busy','true');content.innerHTML=B.skeleton();
    try{
      const render=page.startsWith('news-edit-')?C.renderers.editor:C.renderers[page];
      const result=render?await render(page.startsWith('news-edit-')?page.slice(10):null):{html:B.empty('Bo‘lim topilmadi','Navigatsiyadan kerakli bo‘limni tanlang.')};
      if(id!==C.routeId || !C.user)return;
      content.innerHTML=result.html;result.bind?.();
      content.querySelectorAll('[data-page]').forEach(btn=>btn.onclick=()=>{const q=C.query();q.set('page',btn.dataset.page);C.go(page,Object.fromEntries(q));});
    }catch(e){if(id===C.routeId && C.user)content.innerHTML=B.error(e);}
    finally{if(id===C.routeId)content.setAttribute('aria-busy','false');}
  };
  C.upload=(path,method,body,onProgress)=>new Promise((resolve,reject)=>{
    const xhr=new XMLHttpRequest();xhr.open(method,B.apiBase+path);xhr.timeout=180000;xhr.setRequestHeader('Authorization','Bearer '+token);
    xhr.upload.onprogress=e=>{if(e.lengthComputable)onProgress(Math.round(e.loaded/e.total*100));};
    xhr.onload=()=>{let data;try{data=JSON.parse(xhr.responseText);}catch{data={};}if(xhr.status===401)C.logout();if(xhr.status<200 || xhr.status>=300 || !data.success)reject(new Error(data.message || 'Saqlash amalga oshmadi.'));else resolve(data);};
    xhr.onerror=()=>reject(new Error('Ulanish uzildi. Yozuv saqlanganini ro‘yxatdan tekshiring.'));xhr.ontimeout=()=>reject(new Error('Javob kechikdi. Qayta yuborishdan avval ro‘yxatni tekshiring.'));xhr.send(body);
  });
  C.action=async(button,operation)=>{button.disabled=true;try{await operation();}catch(e){C.toast(e.message,true);}finally{button.disabled=false;}};
  document.addEventListener('DOMContentLoaded',async()=>{
    document.documentElement.dataset.theme='light';
    document.querySelectorAll('.brand-slot').forEach(el=>el.innerHTML=B.brand());
    document.querySelectorAll('[data-icon]').forEach(el=>el.innerHTML=B.icon(el.dataset.icon));
    document.getElementById('today').textContent=B.formatDate(new Date());
    document.getElementById('openSidebar').onclick=()=>{document.getElementById('sidebar').inert=false;document.getElementById('sidebar').classList.add('open');document.getElementById('sidebarOverlay').classList.add('open');document.getElementById('openSidebar').setAttribute('aria-expanded','true');document.querySelector('#sidebar nav a')?.focus();};
    matchMedia('(max-width:1000px)').addEventListener('change',()=>C.closeSidebar());
    document.getElementById('sidebarOverlay').onclick=C.closeSidebar;
    document.getElementById('logout').onclick=async()=>{if(!C.dirty || await C.confirm('Saqlanmagan o‘zgarishlar yo‘qoladi. Tizimdan chiqasizmi?'))C.logout();};
    document.addEventListener('keydown',e=>{if(e.key==='Escape')C.closeSidebar();});
    document.getElementById('loginForm').onsubmit=async e=>{
      e.preventDefault();const form=e.currentTarget,button=form.querySelector('button'),error=document.getElementById('loginError');button.disabled=true;error.hidden=true;
      try{const data=await C.api('/admin/login',{method:'POST',body:JSON.stringify({username:form.elements.username.value.trim(),password:form.elements.password.value})});if(data.user.role!=='admin')throw new Error('Bu hisobga administrator huquqi kerak.');token=data.token;try{sessionStorage.setItem('bb_admin_session',token);}catch{}C.user=data.user;form.elements.password.value='';C.show();}
      catch(err){error.textContent=err.message;error.hidden=false;}finally{button.disabled=false;}
    };
    window.addEventListener('hashchange',async()=>{if(C.dirty && !await C.confirm('Saqlanmagan o‘zgarishlar yo‘qoladi. Boshqa bo‘limga o‘tasizmi?')){history.replaceState(null,'',previousHash);return;}C.dirty=false;C.route();});
    window.addEventListener('beforeunload',e=>{if(C.dirty){e.preventDefault();e.returnValue='';}});
    if(token){try{C.user=(await C.api('/admin/me')).user;if(C.user.role!=='admin')throw Error();C.show();}catch{C.logout();}}else C.logout();
  });
})(window);
