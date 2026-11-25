// Local browser integration with synthetic feeds and mocked Google/API endpoints.
// Does not contact Google, Netlify, Sheets or paid services.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');const http=require('node:http');const fs=require('node:fs');
const {FEEDS}=require('../server/private-access.cjs');
const tables=Object.fromEntries(FEEDS.map(([k])=>[k,'Key,Value\n']));
tables.positions="Ticker,Nombre,Tipo,Clase,Cantidad,Valor USD,Peso,Moneda\nSYNTH,SYNTH,CEDEAR,CEDEAR,2,300,27.272727272727273,USD\nSYNTHETF,SYNTHETF,ETF,ETF,2,250,22.727272727272727,USD\nSYNTHAR,SYNTHAR,Acción AR,Acción AR,2,200,18.181818181818183,USD\nSYNTHBOND,SYNTHBOND,Bono AR,Bono AR,2,150,13.636363636363637,USD\nSYNTHBTC,SYNTHBTC,Cripto,Cripto,2,100,9.090909090909092,USD\nCASH,CASH,CASH,CASH,2,100,9.090909090909092,USD\n";
tables.home="HOME APP V2,Valor,Variación\nPatrimonio total,1100,0\nPatrimonio sin Crypto,1000,0\nCrypto USD,100,0\nCantidad posiciones,6,0\n";
tables.types="Tipo,Valor USD,Peso\nCEDEAR,300,27.272727272727273\nETF,250,22.727272727272727\nAcción AR,200,18.181818181818183\nBono AR,150,13.636363636363637\nCripto,100,9.090909090909092\nCASH,100,9.090909090909092\n";
tables.exposure="Región,Valor USD,Peso,,Sector,Valor USD,Peso\nArgentina,350,31.8,,Finanzas,350,31.8\nEstados Unidos,550,50,,Tecnología,550,50\nGlobal,170,15.45,,Cripto,170,15.45\nChina,11,1,,Otros,11,1\nCash,19,1.73,,Cash,19,1.73\n";
tables.snapshots="Fecha,Valor total USD,Fuente\n2026-08-07,900,SINTETICO\n2026-08-14,940,SINTETICO\n2026-08-21,980,SINTETICO\n2026-08-28,945,SINTETICO\n2026-09-04,985,SINTETICO\n2026-09-11,1025,SINTETICO\n2026-09-18,990,SINTETICO\n2026-09-25,1030,SINTETICO\n2026-10-02,1070,SINTETICO\n2026-10-09,1035,SINTETICO\n2026-10-16,1075,SINTETICO\n2026-10-23,1115,SINTETICO\n";
tables.monthlyTypes="Mes,Cripto,ETF,CEDEAR,Bonos,Acciones,Estado\n2025-05,90,200,270,150,170,ESTIMADO\n2025-06,92,203,272,149,172,ESTIMADO\n2025-07,94,206,274,148,174,ESTIMADO\n2025-08,96,209,276,147,176,ESTIMADO\n2025-09,98,212,278,146,178,ESTIMADO\n2025-10,100,215,280,145,180,ESTIMADO\n2025-11,102,218,282,144,182,ESTIMADO\n2025-12,104,221,284,143,184,ESTIMADO\n2026-01,106,224,286,142,186,ESTIMADO\n2026-02,108,227,288,141,188,ESTIMADO\n2026-03,110,230,290,140,190,ESTIMADO\n2026-04,112,233,292,139,192,ESTIMADO\n2026-05,114,236,294,138,194,ESTIMADO\n2026-06,116,239,296,137,196,ESTIMADO\n2026-07,118,242,298,136,198,ESTIMADO\n2026-08,120,245,300,135,200,ESTIMADO\n2026-09,122,248,302,134,202,ESTIMADO\n2026-10,124,251,304,133,204,ESTIMADO\n";
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
  const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true});let bundleCalls=0,publicCalls=0,deny=false;const errors=[];
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
  await page.screenshot({path:'mobile-resumen.png',fullPage:true});
  const bar=page.locator('#currentTypeBars .chart-bar').first();assert.ok(await bar.isVisible());const bb=await bar.boundingBox();assert.ok(bb.width>3&&bb.height>5);
  assert.equal(await page.locator('#currentTypeBars .chart-bar').count(),5);
  await page.locator('[data-page="herramientas"]').click();
  assert.equal(await page.locator('#simFunding').isVisible(),true);
  assert.equal(await page.locator('#simTicker').evaluate(e=>getComputedStyle(e).borderRadius),'12px');
  await page.locator('#simFunding').selectOption('Aporte externo');
  await page.locator('#simAmount').fill('50');await page.locator('#simulateBtn').click();assert.match(await page.locator('#simResult').innerText(),/Resultado simulado/);
  await page.screenshot({path:'mobile-herramientas.png',fullPage:true});
  await page.locator('[data-page="diversificacion"]').click();
  const checkBars=async()=>{for(const id of ['regionBars','sectorBars']){const bars=await page.locator('#'+id+' .chart-bar').evaluateAll(es=>es.map(e=>({svg:decodeURIComponent(e.src.split(',').slice(1).join(',')),loaded:e.complete&&e.naturalWidth>0,height:e.getBoundingClientRect().height})));assert.ok(bars.length>=4,id);for(const b of bars){assert.ok(b.loaded&&b.height>=12,JSON.stringify(b));assert.match(b.svg,/fill="#79a9d2"/);assert.match(b.svg,/fill="#263b50"/);}}};
  await checkBars();
  const cdp=await page.context().newCDPSession(page);await cdp.send('Emulation.setAutoDarkModeOverride',{enabled:true});
  await checkBars();await page.screenshot({path:'mobile-dark-mode.png',fullPage:true});
  await cdp.send('Emulation.setAutoDarkModeOverride',{enabled:false});
  await page.waitForFunction(()=>{const e=document.querySelector('#shareLines > div:first-child');return e&&e.scrollWidth>e.clientWidth&&e.scrollLeft>=e.scrollWidth-e.clientWidth-2;});assert.equal(await page.locator('#shareLines svg polyline').count(),5);await page.screenshot({path:'mobile-diversificacion.png',fullPage:true});
  await page.locator('[data-page="evolucion"]').click();assert.match(await page.locator('#periods .active').innerText(),/Semanal/);await page.screenshot({path:'mobile-evolucion.png',fullPage:true});
  await page.locator('[data-page="resumen"]').click();
  assert.equal(bundleCalls,1);assert.equal(publicCalls,0);assert.match(await page.locator('#totalWealth').innerText(),/1[.,]?100/);
  assert.equal(await page.evaluate(()=>localStorage.getItem('pms-v2-monthly-black-annual-20261027')),null);
  assert.equal(await page.locator('#privateLogout').isVisible(),false);
  await page.reload();
  await page.getByRole('button',{name:'Ingresar fixture'}).waitFor();
  assert.equal(await page.locator('.brand').isVisible(),false);assert.equal(bundleCalls,1);
  deny=true;await page.getByRole('button',{name:'Ingresar fixture'}).click();
  await page.waitForFunction(()=>document.getElementById('privacyMessage').textContent.includes('Ingresá nuevamente'));
  assert.equal(await page.locator('.brand').isVisible(),false);assert.equal(publicCalls,0);assert.equal(errors.length,0,errors.join('; '));
  console.log('PASS private browser: no pre-login reads, one authenticated bundle, no persistent personal cache, reload clears view, denied user blocked, DEMO cache retained');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>server.close());
