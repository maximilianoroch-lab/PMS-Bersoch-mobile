const test=require('node:test');const assert=require('node:assert/strict');
const {createPrivacy}=require('../privacy-client.js');
function fixture({mode='private',configFails=false,denied=false}={}){
 const elements=Object.fromEntries(['privacyMessage','privateLogout','privateSignIn'].map(k=>[k,{}]));
 const stored=new Map([['pms-v2-monthly-black-annual-20261027','synthetic cached data'],['DEMO-UNRELATED','keep']]);
 const timers=[];const calls=[];let idCallback,script;
 const w={document:{body:{dataset:{}},getElementById:k=>elements[k],createElement:()=>({}),head:{appendChild:s=>{script=s;}}},
  localStorage:{removeItem:k=>stored.delete(k)},sessionStorage:{removeItem:()=>{}},
  setTimeout:(cb,ms)=>{timers.push({cb,ms});return timers.length;},clearTimeout:()=>{},
  atob:s=>Buffer.from(s,'base64').toString(),location:{reload:()=>{}},
  google:{accounts:{id:{initialize:o=>{idCallback=o.callback},renderButton:()=>{}}}},
  fetch:async(url,options)=>{calls.push({url,options});if(url.endsWith('auth-config'))return {ok:!configFails,json:async()=>({mode,clientId:'fixture.apps.googleusercontent.com'})};return {ok:!denied,status:denied?403:200,json:async()=>({tables:{positions:'synthetic'}})};}
 };
 const p=createPrivacy(w);return {p,w,calls,stored,timers,elements,signIn:async()=>{script.onload();await idCallback({credential:'header.'+Buffer.from(JSON.stringify({exp:Math.floor(Date.now()/1000)+300})).toString('base64url')+'.synthetic'});}};
}
test('private config purges personal cache and retains unrelated DEMO cache',async()=>{
 const f=fixture();await f.p.init();assert.equal(f.p.mode(),'private');assert.equal(f.stored.has('pms-v2-monthly-black-annual-20261027'),false);assert.equal(f.stored.get('DEMO-UNRELATED'),'keep');assert.equal(f.w.document.body.dataset.privacyState,'locked');
});
test('configuration failure never reveals cached data',async()=>{
 const f=fixture({configFails:true});let reads=0;await f.p.init({onReady:()=>reads++});assert.equal(reads,0);assert.equal(f.p.mode(),'blocked');assert.equal(f.w.document.body.dataset.privacyState,'locked');
});
test('authorized load uses bearer memory then expiry clears it',async()=>{
 const f=fixture();await f.p.init({onReady:async()=>{await f.p.tables();f.p.reveal();}});await f.signIn();assert.equal(f.w.document.body.dataset.privacyState,'open');assert.match(f.calls[1].options.headers.Authorization,/Bearer /);assert.equal(f.calls[1].options.cache,'no-store');f.timers[0].cb();assert.deepEqual(f.p.headers(),{});assert.equal(f.w.document.body.dataset.privacyState,'locked');await assert.rejects(f.p.tables());
});
test('denied account cannot reveal data or keep bearer',async()=>{
 const f=fixture({denied:true});await f.p.init({onReady:async()=>{await f.p.tables();f.p.reveal();}});await f.signIn();assert.equal(f.w.document.body.dataset.privacyState,'locked');assert.deepEqual(f.p.headers(),{});
});
test('legacy public mode remains available without Google login',async()=>{
 const f=fixture({mode:'public'});let ready=0;await f.p.init({onReady:()=>ready++});assert.equal(ready,1);assert.equal(f.w.document.body.dataset.privacyState,'public');assert.equal(f.stored.has('pms-v2-monthly-black-annual-20261027'),true);
});
