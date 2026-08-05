import { chromium } from 'playwright';

const baseUrl=process.env.PREVIEW_URL||'http://127.0.0.1:4173/marmoo-fb/';
const routes=[
  {hash:'',label:'Форма'},
  {hash:'#dashboard',label:'Відгуки'},
  {hash:'#dashboard_sales',label:'Продажі'},
  {hash:'#dashboard_menu',label:'Страви'},
  {hash:'#dashboard_channels',label:'Канали'},
  {hash:'#dashboard_executive',label:'Головна'},
  {hash:'#dashboard_daypart',label:'Години'},
  {hash:'#dashboard_weekday',label:'Дні тижня'},
  {hash:'#dashboard_categories',label:'Категорії'},
];

const browser=await chromium.launch({headless:true});
const failures=[];
try{
  for(const route of routes){
    const page=await browser.newPage({viewport:{width:1440,height:1000}});
    const errors=[];
    page.on('pageerror',error=>errors.push(`pageerror: ${error.message}`));
    page.on('console',message=>{
      if(message.type()==='error')errors.push(`console: ${message.text()}`);
    });
    try{
      const response=await page.goto(`${baseUrl}${route.hash}`,{waitUntil:'networkidle',timeout:45000});
      if(!response||!response.ok())errors.push(`HTTP ${response?.status()??'no response'}`);
      await page.locator('body').waitFor({state:'visible',timeout:10000});
      const bodyText=(await page.locator('body').innerText()).trim();
      if(bodyText.length<20)errors.push('Page body is unexpectedly empty');
      if(/Cannot read properties|ReferenceError|TypeError:/i.test(bodyText))errors.push('Runtime error text rendered in page');
    }catch(error){
      errors.push(error instanceof Error?error.message:String(error));
    }
    if(errors.length)failures.push({route:route.label,errors});
    else console.log(`✓ ${route.label}`);
    await page.close();
  }
}finally{
  await browser.close();
}

if(failures.length){
  console.error(JSON.stringify(failures,null,2));
  process.exit(1);
}
console.log(`Smoke test passed for ${routes.length} routes.`);
