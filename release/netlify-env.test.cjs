const test=require('node:test'),assert=require('node:assert/strict');
const {productionValue,checkVariables,configurePersonalEnv}=require('./netlify-env.cjs');
const desired={PMS_DATA_MODE:'private',PMS_GOOGLE_CLIENT_ID:'synthetic-client',PMS_GOOGLE_SERVICE_ACCOUNT:'{"synthetic":true}'};
const site={id:'synthetic-site',account_slug:'synthetic-account'};
const entry=(key,value,secret=false)=>({key,scopes:['functions'],is_secret:secret,values:[{context:'production',...(secret?{}:{value})}]});
test('reports missing keys without silently treating an incorrect value as absent',()=>{
 assert.deepEqual(checkVariables([],desired),Object.keys(desired));
 assert.throws(()=>checkVariables([entry('PMS_DATA_MODE','public')],desired),/diferente/);
 assert.throws(()=>productionValue({key:'X',scopes:['builds'],values:[{context:'production',value:'a'}]},'X'),/alcance/);
 assert.throws(()=>checkVariables([entry('PMS_GOOGLE_SERVICE_ACCOUNT',null,true)],desired),/preexistente/);
});
test('creates site-scoped values once, confirms readback and protects reader secret',async()=>{
 let state=[],posts=0;
 const fetcher=async(url,opts)=>{if(opts.method==='POST'){posts++;assert.match(url,/accounts\/synthetic-account\/env\?site_id=synthetic-site/);const items=JSON.parse(opts.body);assert.deepEqual(items.map(x=>x.key),Object.keys(desired));assert.deepEqual(items.find(x=>x.key==='PMS_GOOGLE_SERVICE_ACCOUNT').is_secret,true);assert.deepEqual(items.find(x=>x.key==='PMS_GOOGLE_SERVICE_ACCOUNT').scopes,['builds','functions','runtime']);assert.ok(items.filter(x=>!x.is_secret).every(x=>!Object.hasOwn(x,'scopes')));state=items.map(x=>entry(x.key,x.values[0].value,x.is_secret));return {ok:true,json:async()=>state};}return {ok:true,json:async()=>state};};
 await configurePersonalEnv(site,'synthetic-token',desired,fetcher);
 assert.equal(posts,1);
 assert.equal(checkVariables(state,{PMS_DATA_MODE:'private',PMS_GOOGLE_CLIENT_ID:'synthetic-client'}).length,0);
});
test('fail closed if API did not persist a variable',async()=>{
 let posts=0;
 const fetcher=async(url,opts)=>({ok:true,json:async()=>opts.method==='POST'?(posts++,Object.keys(desired).map(key=>({key}))):[]});
 await assert.rejects(configurePersonalEnv(site,'synthetic-token',desired,fetcher),/No persiste/);
 assert.equal(posts,1);
});
test('does not overwrite prior variables or unreadable credentials',async()=>{
 let writes=0;
 const fetcher=async()=>({ok:true,json:async()=>[entry('PMS_DATA_MODE','public')]});
 await assert.rejects(configurePersonalEnv(site,'synthetic-token',desired,fetcher),/diferente/);
 assert.equal(writes,0);
});

test('reviewed update preserves configured protected secret without any writes',async()=>{let writes=0;const state=Object.entries(desired).map(([k,v])=>entry(k,v,k==='PMS_GOOGLE_SERVICE_ACCOUNT'));const fetcher=async(url,opts)=>{if(opts.method!=='GET')writes++;return {ok:true,json:async()=>state};};await configurePersonalEnv(site,'synthetic-token',desired,fetcher,{preserveExisting:true});assert.equal(writes,0);state.pop();await assert.rejects(configurePersonalEnv(site,'synthetic-token',desired,fetcher,{preserveExisting:true}),/faltan variables/);assert.equal(writes,0);});
