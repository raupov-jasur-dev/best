const {test,expect}=require('@playwright/test');
const {default:AxeBuilder}=require('@axe-core/playwright');
const visit=(page,url)=>page.goto(url,{waitUntil:'domcontentloaded'});
async function ready(page){await expect(page.locator('#app')).toHaveAttribute('aria-busy','false');}
async function login(page){await visit(page,'/admin/');await page.getByLabel('Foydalanuvchi nomi',{exact:true}).fill('qa-admin');await page.getByLabel('Parol',{exact:true}).fill('qa-only-editorial-password');await page.getByRole('button',{name:'Tizimga kirish'}).click();await expect(page.getByRole('heading',{name:'Nashringiz bir qarashda.'})).toBeVisible();}
async function noOverflow(page){expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);}
test('public homepage, article, category, search, pagination, accessibility and no overflow',async({page},info)=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));await visit(page,'/');await ready(page);
  await expect(page.locator('.lead-story h1')).toContainText('Sinov maqolasi');await noOverflow(page);
  await expect.poll(()=>page.locator('.lead-story img').evaluate(img=>img.complete && img.naturalWidth>0)).toBe(true);
  await page.screenshot({path:'.qa/public-'+info.project.name+'.png',animations:'disabled'});
  const a11y=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa']).analyze();expect(a11y.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)}))).toEqual([]);
  await page.locator('.lead-story>a').click();await ready(page);await expect(page.locator('.article-heading h1')).toContainText('Sinov maqolasi');await noOverflow(page);
  await page.getByLabel('Ismingiz',{exact:true}).fill('QA o‘quvchi');await page.getByLabel('Izoh',{exact:true}).fill('Avtomatik brauzer sinovi izohi');await page.getByRole('button',{name:'Fikr yuborish'}).click();await expect(page.locator('#commentStatus')).toContainText('moderatsiyaga');
  await visit(page,'/category.html?id=1');await ready(page);await expect(page.locator('h1')).toHaveText('Buxoro');await noOverflow(page);
  await visit(page,'/search.html');await ready(page);await expect(page.getByRole('navigation',{name:'Sahifalar'})).toBeVisible();await page.getByRole('link',{name:'Keyingi →'}).click();await ready(page);expect(page.url()).toContain('page=2');
  await page.getByRole('searchbox',{name:'Yangilik qidirish',exact:true}).fill('Sinov maqolasi 01');await page.getByRole('button',{name:'Qidirish',exact:true}).click();await ready(page);await expect(page.locator('.archive-grid .story-card')).toHaveCount(1);expect(errors).toEqual([]);
  await page.getByRole('searchbox',{name:'Yangilik qidirish',exact:true}).fill('\"><img src=x onerror=window.xss=1>');await page.getByRole('button',{name:'Qidirish',exact:true}).click();await ready(page);await expect(page.locator('.archive-heading img')).toHaveCount(0);expect(await page.evaluate(()=>window.xss)).toBeUndefined();
});
test('404, empty results, reduced motion and mobile keyboard menu',async({page},info)=>{
  await page.emulateMedia({reducedMotion:'reduce'});await visit(page,'/missing-page');await ready(page);await expect(page.getByRole('heading',{name:'Hikoya boshqa manzilda.'})).toBeVisible();
  await visit(page,'/search.html?q=missing-no-result');await ready(page);await expect(page.getByRole('heading',{name:'Hech narsa topilmadi'})).toBeVisible();
  if(info.project.name!=='desktop'){
    await page.getByRole('button',{name:'Menyuni ochish'}).click();await expect(page.getByRole('dialog')).toBeVisible();await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).not.toBeVisible();await expect(page.getByRole('button',{name:'Menyuni ochish'})).toHaveAttribute('aria-expanded','false');
  }
  await noOverflow(page);
});
test('admin real CRUD, moderation, presentation, session security and responsive accessibility',async({page},info)=>{
  await login(page);await noOverflow(page);await page.screenshot({path:'.qa/admin-'+info.project.name+'.png',animations:'disabled'});
  const a11y=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa']).analyze();expect(a11y.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)}))).toEqual([]);
  expect(await page.evaluate(()=>localStorage.getItem('admin_token'))).toBe(null);
  await visit(page,'/admin/#categories');await page.getByRole('button',{name:'Yangi kategoriya'}).click();
  const name='QA '+info.project.name+' '+Date.now()+' "<img src=x onerror=window.xss=1>';await page.getByLabel('Nomi',{exact:true}).fill(name);await page.getByLabel('Tavsif',{exact:true}).fill('Avtomatik integratsion tekshiruv');await page.getByRole('button',{name:'Saqlash',exact:true}).click();await expect(page.getByRole('heading',{name,exact:true})).toBeVisible();expect(await page.evaluate(()=>window.xss)).toBeUndefined();
  await visit(page,'/admin/#news-create');await page.getByLabel('Sarlavha',{exact:true}).fill('QA brauzer '+info.project.name);await page.getByLabel('Maqola matni',{exact:true}).fill('Izolyatsiyalangan brauzer testi.');await page.getByLabel('Kategoriya',{exact:true}).selectOption({label:name});await page.getByRole('button',{name:'O‘zgarishlarni saqlash'}).click();await expect(page.getByRole('heading',{name:'Hikoyani takomillashtiring.'})).toBeVisible();
  await page.screenshot({path:'.qa/editor-'+info.project.name+'.png',animations:'disabled'});await noOverflow(page);
  await page.getByRole('button',{name:'Nashr qilish',exact:true}).click();await page.getByRole('button',{name:'Tasdiqlash',exact:true}).click();await expect(page.getByText('Maqola nashr qilindi.',{exact:true})).toBeVisible();
  await visit(page,'/admin/#news?search=QA%20brauzer');await expect(page.locator('.data-table tbody tr')).not.toHaveCount(0);
  await visit(page,'/admin/#comments');await expect(page.getByRole('heading',{name:'O‘quvchining ovozi.'})).toBeVisible();
  const approve=page.getByRole('button',{name:'Tasdiqlash',exact:true});if(await approve.count()){await approve.first().click();await expect(page.getByText('Izoh holati yangilandi.',{exact:true})).toBeVisible();}
  await visit(page,'/admin/#presentation');await expect(page.getByRole('heading',{name:'Bosh sahifa sizning qo‘lingizda.'})).toBeVisible();await page.getByRole('button',{name:'Tartibni saqlash'}).click();await expect(page.getByText('Sayt taqdimoti saqlandi.',{exact:true})).toBeVisible();await noOverflow(page);
});
