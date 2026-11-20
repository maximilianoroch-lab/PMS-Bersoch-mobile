// Local browser integration with synthetic feeds and mocked Google/API endpoints.
// Does not contact Google, Netlify, Sheets or paid services.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');const http=require('node:http');const fs=require('node:fs');
const {FEEDS}=require('../server/private-access.cjs');
const tables=Object.fromEntries(FEEDS.map(([k])=>[k,'Key,Value\n']));
tables.positions='Ticker,Nombre,Tipo,Clase,Cantidad,Valor USD,Peso,Moneda\nSYNTH,Synthetic,CEDEAR,CEDEAR,2,300,100,USD\n';
tables.home='HOME APP V2,Valor,Variación\nPatrimonio total,300,0\nPatrimonio sin Crypto,300,0\nCrypto USD,0,0\nCantidad posiciones,1,0\n';
tables.types='Tipo,Valor USD,Peso\nCEDEAR,300,100\n';
tables.exposure='Región,Valor USD,Peso,,Sector,Valor USD,Peso\n';
const root=require('node:path').join(__dirname,'..');
const server=http.createServer((req,res)=>{
 const name=req.url==='/'?'index.html':req.url.slice(1);
 if(!['index.html','privacy-client.js','sw.js','manifest.webmanifest','icon-192.png','icon-512.png','audio-summary.png','ai-advisor.png'].includes(name)){res.writeHead(404);res.end();return;}
 res.setHeader('Content-Type',name.endsWith('.js')?'text/javascript':name.endsWith('.html')?'text/html':'application/octet-stream');res.end(fs.readFileSync(require('node:path').join(root,name)));
});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage();let bundleCalls=0,publicCalls=0,deny=false;const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{localStorage.setItem('pms-v2-monthly-black-annual-20261027','old synthetic personal');localStorage.setItem('DEMO-UNRELATED','keep');});
  await page.route('**/*',async route=>{
   const url=route.request().url();
   if(url.includes('docs.google.com')){publicCalls++;return route.abort();}
   if(url==='https://accounts.google.com/gsi/client')return route.fulfill({contentType:'text/javascript',body:`window.google={accounts:{id:{initialize:o=>window.__testGIS=o.callback,renderButton:el=>{const b=document.createElement('button');b.textContent='Ingresar fixture';b.onclick=()=>window.__testGIS({credential:'header.'+btoa(JSON.stringify({exp:Math.floor(Date.now()/1000)+300}))+'.synthetic'});el.appendChild(b);}}}};`});
   if(url.endsWith('/.netlify/functions/auth-config'))return route.fulfill({json:{mode:'private',clientId:'fixture.apps.googleusercontent.com'}});
   if(url.endsWith('/.netlify/functions/private-bundle')){bundleCalls++;assert.match(route.request().headers().authorization,/^Bearer /);return route.fulfill({status:deny?403:200,json:deny?{error:'denied'}:{tables}});}
   if(!url.startsWith(origin))return route.abort();return route.continue();
  });
  await page.goto(origin);await page.getByRole('button',{name:'Ingresar fixture'}).waitFor();
  assert.equal(bundleCalls,0);assert.equal(publicCalls,0);assert.equal(await page.locator('.brand').isVisible(),false);
  assert.equal(await page.evaluate(()=>localStorage.getItem('pms-v2-monthly-black-annual-20261027')),null);
  assert.equal(await page.evaluate(()=>localStorage.getItem('DEMO-UNRELATED')),'keep');
  await page.getByRole('button',{name:'Ingresar fixture'}).click();
  await page.waitForFunction(()=>document.body.dataset.privacyState==='open');
  assert.equal(bundleCalls,1);assert.equal(publicCalls,0);assert.match(await page.locator('#totalWealth').innerText(),/300/);
  assert.equal(await page.evaluate(()=>localStorage.getItem('pms-v2-monthly-black-annual-20261027')),null);
  await page.getByRole('button',{name:'Cerrar sesión',exact:true}).click();
  await page.getByRole('button',{name:'Ingresar fixture'}).waitFor();
  assert.equal(await page.locator('.brand').isVisible(),false);assert.equal(bundleCalls,1);
  deny=true;await page.getByRole('button',{name:'Ingresar fixture'}).click();
  await page.waitForFunction(()=>document.getElementById('privacyMessage').textContent.includes('Ingresá nuevamente'));
  assert.equal(await page.locator('.brand').isVisible(),false);assert.equal(publicCalls,0);assert.equal(errors.length,0,errors.join('; '));
  console.log('PASS private browser: no pre-login reads, one authenticated bundle, no persistent personal cache, logout clears view, denied user blocked, DEMO cache retained');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>server.close());
