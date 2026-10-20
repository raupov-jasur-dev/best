(function(C){
  'use strict';
  const {B,E}=C;
  C.renderers['news-create']=()=>C.renderers.editor();
  C.renderers.editor=async id=>{
    const [categoryResult,newsResult]=await Promise.all([C.api('/admin/categories'),id?C.api('/admin/news/'+encodeURIComponent(id)):Promise.resolve({data:null})]);
    const cats=categoryResult.data,n=newsResult.data;
    if(!cats.length)return {html:C.heading('KONTENT / MAQOLA','Avval bir rukn yarating.')+B.empty('Maqolaga kategoriya kerak','Kategoriya yarating, so‘ng hikoyangizni yozishni boshlang.','<a class="button" href="#categories">Kategoriyalarga o‘tish '+B.icon('arrow')+'</a>')};
    const uncertain=/^(IN_FLIGHT|DELIVERY_UNCERTAIN):/.test(n?.telegramError || '');
    const preview=(url,video=false)=>B.safeUrl(url)?(video?'<video src="'+E(B.safeUrl(url))+'" controls playsinline preload="metadata" aria-label="Mavjud video"></video>':'<img src="'+E(B.safeUrl(url))+'" alt="Mavjud maqola rasmi" loading="lazy">'):'';
    const upload=(field,label,accept,multiple=false,existing='')=>'<div class="upload-zone">'+B.icon('upload')+'<label for="upload-'+field+'">'+label+'</label><input id="upload-'+field+'" name="'+field+'" type="file" accept="'+accept+'" '+(multiple?'multiple':'')+'><p class="field-help">'+(field==='video'?'MP4, WebM yoki MOV · 50 MB gacha':'JPEG, PNG, WebP yoki GIF · har biri 10 MB gacha')+'</p><div class="media-previews" id="preview-'+field+'">'+existing+'</div></div>';
    return {html:C.heading('KONTENT / '+(n?'TAHRIR':'YANGI MAQOLA'),n?'Hikoyani takomillashtiring.':'Yangi hikoya boshlanadi.','Matn, media va nashr sozlamalarini bir joyda boshqaring.',n?.status==='published'?'<a class="button button-ghost" target="_blank" rel="noopener" href="'+B.postUrl(n)+'">Saytda ko‘rish '+B.icon('external')+'</a>':'')+
      '<form id="newsForm" class="editor-grid"><section class="panel editor-content"><div class="field"><label for="newsTitle">Sarlavha</label><input id="newsTitle" name="title" placeholder="Hikoyangizning sarlavhasi…" value="'+E(n?.title || '')+'" required maxlength="1000"><p class="field-help" id="titleCount">Sarlavha qisqa, aniq va mazmunli bo‘lsin.</p></div><div class="field"><label for="newsSummary">Qisqa tavsif</label><textarea id="newsSummary" name="shortDescription" rows="3" maxlength="10000" placeholder="O‘quvchi bilishi kerak bo‘lgan asosiy fikr…">'+E(n?.shortDescription || '')+'</textarea></div><div class="field"><label for="newsContent">Maqola matni</label><textarea id="newsContent" name="content" rows="15" maxlength="1000000" placeholder="Hikoyangizni yozing…">'+E(n?.content || '')+'</textarea><p class="field-help" id="wordCount"></p></div><div class="section-heading"><h2>Surat va video</h2></div>'+upload('mainImage','Asosiy surat','image/jpeg,image/png,image/webp,image/gif',false,preview(n?.mainImage))+upload('additionalImages','Qo‘shimcha suratlar (5 tagacha)','image/jpeg,image/png,image/webp,image/gif',true,(n?.images || []).map(img=>preview(img.url)).join(''))+upload('video','Maqolaga oid video','video/mp4,video/webm,video/quicktime',false,preview(n?.video,true))+'</section>'+
      '<aside class="editor-aside"><section class="panel editor-settings"><h2>Nashr sozlamalari</h2><div class="field"><label for="newsCategory">Kategoriya</label><select id="newsCategory" name="categoryId" required>'+cats.map(c=>'<option value="'+E(c.id)+'" '+(n?.categoryId===c.id?'selected':'')+'>'+E(c.name)+'</option>').join('')+'</select></div><div class="field"><label for="newsStatus">Nashr holati</label><select id="newsStatus" name="status"><option value="draft" '+(n?.status!=='published'?'selected':'')+'>Qoralama</option><option value="published" '+(n?.status==='published'?'selected':'')+'>Nashr qilingan</option></select><p class="field-help">Birinchi nashrda Telegramga ham yuboriladi. Qoralamalar yuborilmaydi.</p></div><div class="field"><label class="check-label"><input type="checkbox" name="featured" '+(n?.featured?'checked':'')+'> Bosh sahifa uchun tanlash</label><p class="field-help">Eng yangi tanlangan maqola asosiy blokda ko‘rinadi.</p></div><div class="editor-actions"><button class="button" type="submit" data-action="save">'+B.icon('check')+' O‘zgarishlarni saqlash</button><button class="button button-accent" type="submit" data-action="publish">Nashr qilish '+B.icon('arrow')+'</button></div><progress id="uploadProgress" class="upload-progress" max="100" value="0" aria-label="Serverga yuklash" hidden></progress><p id="uploadProgressText" class="cms-progress-copy" role="status"></p><p class="form-status" id="editorStatus" role="status"></p></section>'+
      '<section class="panel editor-settings"><span class="eyebrow">TELEGRAM / KANAL</span><h2>Nashr holati</h2>'+(n?C.status(n.telegramStatus,'telegram'):'<p class="field-help">Maqola saqlangandan keyin holat ko‘rinadi.</p>')+(n?.telegramPublishedAt?'<p class="field-help">'+E(B.formatDate(n.telegramPublishedAt))+' · Xabar #'+E(n.telegramMessageId)+'</p>':'')+(n?.telegramError?'<div class="telegram-error">'+E(n.telegramError.replace(/^IN_FLIGHT:[\w-]+/,'Yuborish jarayonda.'))+'</div>':'')+
      (n?.status==='published' && ['failed','skipped'].includes(n.telegramStatus) && !uncertain?'<button class="button button-ghost" type="button" id="retryTelegram">Qayta yuborish '+B.icon('send')+'</button>':'')+
      (uncertain?'<div class="field"><p class="field-help">Kanalni qo‘lda tekshiring. Xabar mavjud bo‘lsa ID sini kiriting. Javob noaniq bo‘lganda avtomatik qayta yuborilmaydi.</p><label for="telegramMessageId">Kanaldagi xabar ID si</label><input id="telegramMessageId" inputmode="numeric" pattern="[0-9]+" maxlength="19"><button class="small-button" type="button" id="resolveSent">Yuborilgan deb belgilash</button></div><button class="small-button danger-button" type="button" id="resolveNotSent">Tekshirdim: kanalga yuborilmagan</button>':'')+'</section></aside></form>',bind(){
      const form=document.getElementById('newsForm'),status=document.getElementById('editorStatus');
      form.addEventListener('input',()=>{C.dirty=true;});
      const count=()=>{const words=form.elements.content.value.trim().split(/\s+/).filter(Boolean).length;document.getElementById('wordCount').textContent=B.number(words)+' ta so‘z · taxminan '+Math.max(1,Math.ceil(words/200))+' daqiqa o‘qish';};count();form.elements.content.addEventListener('input',count);
      form.querySelectorAll('input[type=file]').forEach(input=>input.onchange=()=>{
        const files=[...input.files],host=document.getElementById('preview-'+input.name),isVideo=input.name==='video';
        if((input.multiple && files.length>5) || files.some(f=>f.size>(isVideo?50:10)*1024*1024)) {C.toast(input.multiple && files.length>5?'Ko‘pi bilan 5 ta surat tanlang.':'Fayl hajmi belgilangan chegaradan katta.',true);input.value='';return;}
        host.replaceChildren();
        for(const file of files){const url=URL.createObjectURL(file);C.previewUrls.push(url);const media=document.createElement(isVideo?'video':'img');media.src=url;if(isVideo){media.controls=true;media.preload='metadata';media.setAttribute('playsinline','');}else media.alt=file.name;host.append(media);}
        C.dirty=true;
      });
      form.onsubmit=async e=>{
        e.preventDefault();const publishing=e.submitter?.dataset.action==='publish';
        const finalStatus=publishing?'published':form.elements.status.value;
        if(finalStatus==='published' && n?.status!=='published' && !await C.confirm('Maqola saytda nashr qilinadi va Telegram kanaliga yuboriladi.','Maqolani nashr qilish'))return;
        const fd=new FormData(form);fd.set('featured',String(form.elements.featured.checked));fd.set('status',finalStatus);
        if(publishing)fd.set('publishAndTelegram','true');
        for(const name of ['mainImage','additionalImages','video']){if(!form.elements[name].files.length)fd.delete(name);}
        const buttons=form.querySelectorAll('button');buttons.forEach(b=>b.disabled=true);
        const progress=document.getElementById('uploadProgress'),progressText=document.getElementById('uploadProgressText');progress.hidden=false;status.textContent='';
        try{
          const result=await C.upload('/admin/news'+(n?'/'+encodeURIComponent(n.id):''),n?'PUT':'POST',fd,percent=>{progress.value=percent;progressText.textContent=percent<100?'Serverga uzatilmoqda: '+percent+'%':'Serverga uzatildi. Media va maqola saqlanmoqda…';});
          C.dirty=false;
          C.toast(result.data.status==='published'?'Maqola nashr qilindi.':'Qoralama saqlandi.');
          if(result.telegram && !result.telegram.success)C.toast('Maqola saqlandi. Telegram: '+(result.telegram.error || 'Yuborilmadi.'),true);
          C.go('news-edit-'+result.data.id);
        }catch(err){status.textContent=err.message;C.toast(err.message,true);}
        finally{buttons.forEach(b=>b.disabled=false);progress.hidden=true;progressText.textContent='';}
      };
      document.getElementById('retryTelegram')?.addEventListener('click',e=>C.action(e.currentTarget,async()=>{
        if(!await C.confirm('Telegram kanaliga qayta yuborilsinmi? Yetkazilishi noaniq xabarlar avval tekshiriladi.','Telegram nashri'))return;
        const r=await C.api('/admin/news/'+encodeURIComponent(n.id)+'/telegram-retry',{method:'POST'});
        C.toast(r.telegram?.success?'Telegramga yuborildi.':'Yuborilmadi: '+(r.telegram?.error || 'Holatni tekshiring.'),!r.telegram?.success);C.route();
      }));
      document.getElementById('resolveSent')?.addEventListener('click',e=>C.action(e.currentTarget,async()=>{
        const messageId=document.getElementById('telegramMessageId').value;if(!/^[1-9]\d{0,18}$/.test(messageId))throw Error('To‘g‘ri xabar ID sini kiriting.');
        if(!await C.confirm('Kanalda shu maqolaning #'+messageId+' xabari borligini tekshirdingizmi?'))return;
        await C.api('/admin/news/'+encodeURIComponent(n.id)+'/telegram-resolve',{method:'POST',body:JSON.stringify({messageId})});C.toast('Telegram holati tasdiqlandi.');C.route();
      }));
      document.getElementById('resolveNotSent')?.addEventListener('click',e=>C.action(e.currentTarget,async()=>{
        if(!await C.confirm('Kanalni tekshirdingiz va shu maqola yuborilmaganiga ishonchingiz komilmi? Keyingi qayta yuborish alohida amalga oshiriladi.'))return;
        await C.api('/admin/news/'+encodeURIComponent(n.id)+'/telegram-resolve',{method:'POST',body:JSON.stringify({confirmedNotSent:true})});C.toast('Qayta yuborish imkoniyati ochildi.');C.route();
      }));
    }};
  };
})(window.CMS);
