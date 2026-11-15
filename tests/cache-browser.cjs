const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage();
  await page.route('https://docs.google.com/**',route=>route.abort('failed'));
  await page.goto('file://'+process.cwd()+'/index.html',{waitUntil:'domcontentloaded'});
  const out=await page.evaluate(()=>{
   const bundle={positions:[{Ticker:'AAPL','Valor USD':'100'},{Ticker:'MSFT','Valor USD':'200'}],home:[{'HOME APP V2':'Patrimonio total',Valor:'300'}],types:[{Tipo:'Cedear','Valor USD':'300'}]};
   validateBersochBundle(bundle);
   const good={ts:Date.now(),data:bundle};
   localStorage.setItem(CACHE_KEY,JSON.stringify(good));
   const restored=loadCache();
   const results={restored:restored?.data?.positions?.length};
   localStorage.setItem(CACHE_KEY,JSON.stringify({ts:Date.now(),data:{positions:[],home:[],types:[]}}));
   results.badCache=loadCache();
   const repeated={...bundle,positions:[bundle.positions[0],bundle.positions[0]]};
   try{validateBersochBundle(repeated);results.duplicateRejected=false}catch(e){results.duplicateRejected=true}
   const missing={...bundle,positions:[{Ticker:'AAPL','Valor USD':''}]};
   try{validateBersochBundle(missing);results.missingRejected=false}catch(e){results.missingRejected=true}
   const garbage={...bundle,positions:[{Ticker:'AAPL','Valor USD':'n/d'}]};
   try{validateBersochBundle(garbage);results.garbageRejected=false}catch(e){results.garbageRejected=true}
   const noHome={...bundle,home:[]};
   try{validateBersochBundle(noHome);results.emptyHomeRejected=false}catch(e){results.emptyHomeRejected=true}
   return results;
  });
  assert.equal(out.restored,2);
  assert.equal(out.badCache,null);
  assert.equal(out.duplicateRejected,true);
  assert.equal(out.missingRejected,true);
  assert.equal(out.emptyHomeRejected,true);
  assert.equal(out.garbageRejected,true);
  console.log('PASS: cached Bersoch data is validated, missing or duplicate instruments rejected');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
