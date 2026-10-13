import assert from 'node:assert/strict';
import { chromium } from 'playwright';
const browser = await chromium.launch(process.env.BROWSER_PATH ? { executablePath: process.env.BROWSER_PATH } : {});
const base=process.env.PREVIEW_URL || 'http://127.0.0.1:4173/marmoo-fb/';
try {
for (const width of [1440,390]) {
  const page=await browser.newPage({viewport:{width,height:900}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  let reviews=[{id:'fixture',source:'Google',author:'Test author',date:'2026-10-12',content:'Initial review',rating:2,url:'https://example.com',images:[],tags:[],reply:'Wrong reply',internalNote:'',assignee:'',status:'sent',respondedAt:'2026-10-12',updatedAt:'v1'}];
  let fail=false, failWrite=false, lists=0;
  let holdNext=false, releaseRead;
  let heldReady;
  await page.route('**/exec*',async route=>{
    if(fail) return route.abort();
    const body=route.request().postDataJSON();let result;
    if (!body) {
      lists++;result={ok:true,reviews};
      if (holdNext) {
        holdNext=false;
        const snapshot=structuredClone(result);
        return new Promise(resolve => { releaseRead=async () => { await route.fulfill({json:snapshot});resolve(); }; heldReady(); });
      }
    }
    else if(failWrite) result={ok:false,error:'Test write failed'};
    else if(body.action==='create') {const review=body.review;reviews.push(review);result={ok:true,review};}
    else if(body.action==='update') {const review={...reviews.find(r=>r.id===body.id),...body.changes,updatedAt:'v2'};reviews=reviews.map(r=>r.id===body.id?review:r);result={ok:true,review};}
    else if(body.action==='delete') {reviews=reviews.filter(r=>r.id!==body.id);result={ok:true,deleted:true,id:body.id};}
    else throw new Error('Unexpected action');
    await route.fulfill({json:result});
  });
  await page.goto(base+'?view=dashboard_reviews');
  await page.getByText('Initial review',{exact:true}).waitFor();
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'no page horizontal overflow');
  await page.getByRole('button',{name:'Опрацювати',exact:true}).click();
  const modal=page.getByRole('dialog');
  await modal.getByLabel('Автор',{exact:true}).fill('Edited author');
  await modal.getByLabel('Джерело',{exact:true}).fill('Bolt');
  await modal.locator('fieldset textarea').fill('Edited text');
  await modal.getByLabel('Оцінка',{exact:true}).selectOption('5');
  await modal.getByRole('button',{name:'Очистити відповідь'}).click();
  failWrite=true;
  await modal.getByRole('button',{name:'Зберегти',exact:true}).click();
  await modal.getByRole('alert').filter({hasText:'Test write failed'}).waitFor();
  assert.equal(reviews[0].reply,'Wrong reply');
  failWrite=false;
  const before=lists;
  await modal.getByRole('button',{name:'Зберегти',exact:true}).click();
  await page.waitForFunction(()=>document.body.innerText.includes('Зміни збережено'));
  assert.equal(reviews[0].reply,'');assert.equal(reviews[0].content,'Edited text');assert.equal(reviews[0].source,'Bolt');assert.ok(lists>before);
  await page.screenshot({path:`reviews-${width}.png`,fullPage:true});
  await modal.getByRole('button',{name:'Закрити',exact:true}).click();
  // A slow pre-mutation list must not overwrite a confirmed quick action.
  const ready=new Promise(resolve=>{heldReady=resolve;});holdNext=true;
  await page.getByRole('button',{name:'Оновити',exact:true}).click();await ready;
  const readsBeforeFocus=lists;
  await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
  assert.equal(lists,readsBeforeFocus,'do not overlap slow reads');
  await page.getByRole('button',{name:'Закрити відгук',exact:true}).click();
  await page.getByRole('status').filter({hasText:'Зміни збережено'}).waitFor();
  await releaseRead();
  await page.waitForTimeout(100);
  await page.getByRole('button',{name:'Повернути в роботу',exact:true}).waitFor();
  await page.getByRole('button',{name:'Додати відгук',exact:true}).click();
  await modal.getByPlaceholder('Введіть текст відгуку...').fill('Created review');
  await modal.getByRole('button',{name:'Додати',exact:true}).click();
  await page.getByText('Created review',{exact:true}).waitFor();
  assert.equal(reviews.length,2);
  await page.locator('article').filter({hasText:'Created review'}).getByRole('button',{name:'Опрацювати'}).click();
  page.once('dialog',d=>d.dismiss());await modal.getByRole('button',{name:'Видалити',exact:true}).click();assert.equal(reviews.length,2);
  page.once('dialog',d=>d.accept());await modal.getByRole('button',{name:'Видалити',exact:true}).click();
  await modal.waitFor({state:'hidden'});assert.equal(reviews.length,1);
  await page.getByRole('combobox',{name:'Джерело',exact:true}).selectOption('Bolt');
  assert.equal(await page.locator('article').count(),1);
  // A persisted cache must never resurrect records during an outage.
  await page.evaluate(()=>localStorage.setItem('marmoo-review-management-cache-v2',JSON.stringify([{id:'stale',content:'STALE CACHE'}])));
  fail=true;await page.reload();
  await page.getByRole('status').filter({hasText:'Дані можуть бути застарілими'}).waitFor();
  assert.equal(await page.locator('article').count(),0);
  assert.equal(errors.length,0,errors.join('\n'));
  await page.close();console.log(`Reviews UI ${width}px: CRUD, error retention, cache outage and layout passed`);
}
} finally {await browser.close();}
