const { chromium } = require('playwright');
(async()=>{
 const browser=await chromium.launch({headless:true});
 const page=await browser.newPage();
 const errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 await page.addInitScript(()=>{
  window.speechSynthesis.speak=()=>{};
 });
 await page.goto('file://'+process.cwd()+'/index.html',{waitUntil:'domcontentloaded'});
 await page.locator('#voiceSummaryBtn').click();
 if(!await page.locator('#voiceDialog.open').count())throw Error('Summary dialog did not open');
 if(!await page.locator('#voiceDialog').innerText().then(s=>s.includes('Resumen')))throw Error('Missing summary');
 await page.locator('#voiceClose').click();
 if(await page.locator('#voiceDialog.open').count())throw Error('Summary dialog did not close');
 if(await page.locator('#voiceAdvisorBtn').isVisible())throw Error('Unready advisor button is visible');
 const custodianLayout=await page.evaluate(()=>{const s=document.querySelector('script')?.textContent||'';return s.includes('grid-column:1/3')&&s.includes('x.Nombre')});
 if(!custodianLayout)throw Error('Custodian ticker/name layout is missing');
 if(errors.length)throw Error('Page JavaScript errors: '+errors.join('; '));
 await browser.close();
 console.log('Browser smoke: summary opens/closes and unavailable advisor remains hidden');
})().catch(e=>{console.error(e);process.exit(1)});
