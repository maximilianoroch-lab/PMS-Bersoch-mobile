const test=require('node:test');const assert=require('node:assert/strict');
const {FEEDS,handlers,authorizeClaims,credentials}=require('../server/private-access.cjs');
const env={PMS_DATA_MODE:'private',PMS_GOOGLE_CLIENT_ID:'fixture.apps.googleusercontent.com',PMS_ALLOWED_EMAILS:'owner@gmail.com',PMS_PERSONAL_SPREADSHEET_ID:'synthetic-personal'};
const claims=()=>({iss:'https://accounts.google.com',aud:env.PMS_GOOGLE_CLIENT_ID,sub:'synthetic-sub',email:'owner@gmail.com',email_verified:true,iat:Date.now()/1000-1,exp:Date.now()/1000+300});
const event={httpMethod:'GET',headers:{authorization:'Bearer synthetic.token.value'}};
const cfg={clientId:env.PMS_GOOGLE_CLIENT_ID,emails:['owner@gmail.com'],subjects:[]};
test('private claims require verified Google identity, audience and expiry',()=>{
 assert.equal(authorizeClaims(claims(),cfg),true);
 for(const x of [{iss:'https://invalid.example'},{aud:'other'},{email:'stranger@gmail.com'},{email_verified:'true'},{exp:0},{iat:Date.now()/1000+300},{sub:''}])assert.equal(authorizeClaims({...claims(),...x},cfg),false);
 assert.equal(authorizeClaims(claims(),{...cfg,subjects:['other']}),false);
});
test('public config does not expose private metadata',async()=>{
 const r=await handlers({}).authConfig({httpMethod:'GET'});assert.deepEqual(JSON.parse(r.body),{mode:'public'});
});
test('private config exposes only public client ID and no-store',async()=>{
 const r=await handlers(env).authConfig(event);assert.deepEqual(JSON.parse(r.body),{mode:'private',clientId:env.PMS_GOOGLE_CLIENT_ID});assert.match(r.headers['Cache-Control'],/no-store/);
 assert.ok(!r.body.includes(env.PMS_PERSONAL_SPREADSHEET_ID));assert.ok(!r.body.includes('owner@gmail.com'));
});
test('missing private settings fail closed',async()=>{
 assert.equal((await handlers({PMS_DATA_MODE:'private'}).authConfig(event)).statusCode,503);
 assert.equal((await handlers({PMS_DATA_MODE:'typo'}).authConfig(event)).statusCode,503);
});
test('anonymous bundle does not read Sheets',async()=>{
 let reads=0;const h=handlers(env,{read:async()=>{reads++;}});
 assert.equal((await h.bundle({httpMethod:'GET',headers:{}})).statusCode,401);assert.equal(reads,0);
});
test('invalid signature blocks before Sheets',async()=>{
 let reads=0;const h=handlers(env,{verify:async()=>{throw Error('fake signature')},read:async()=>{reads++;}});
 assert.equal((await h.bundle(event)).statusCode,401);assert.equal(reads,0);
});
test('different account blocks before Sheets',async()=>{
 let reads=0;const h=handlers(env,{verify:async()=>({...claims(),email:'other@gmail.com'}),read:async()=>{reads++;}});
 assert.equal((await h.bundle(event)).statusCode,403);assert.equal(reads,0);
});
test('one authorized request produces all eleven CSV sections',async()=>{
 let reads=0;const h=handlers(env,{verify:async()=>claims(),read:async(c)=>{reads++;assert.equal(c.sheetId,'synthetic-personal');return FEEDS.map(()=>({values:[['Ticker','Value'],['SYNTH','1,25']]}));}});
 const r=await h.bundle(event);assert.equal(r.statusCode,200);assert.equal(reads,1);assert.equal(Object.keys(JSON.parse(r.body).tables).length,11);assert.match(r.headers.Vary,/Authorization/);
});
test('partial API response cannot become success',async()=>{
 const h=handlers(env,{verify:async()=>claims(),read:async()=>[]});assert.equal((await h.bundle(event)).statusCode,502);
});
test('internal exceptions and secrets never appear in response',async()=>{
 const h=handlers(env,{verify:async()=>claims(),read:async()=>{throw Error('SYNTHETIC_SECRET_DO_NOT_LEAK')}});
 const r=await h.bundle(event);assert.equal(r.statusCode,502);assert.ok(!r.body.includes('SYNTHETIC_SECRET'));
});
test('bundle refuses POST and disabled mode',async()=>{
 assert.equal((await handlers(env).bundle({httpMethod:'POST'})).statusCode,405);
 assert.equal((await handlers({}).bundle({httpMethod:'GET'})).statusCode,409);
});
test('credential endpoints restricted to Google OAuth',()=>{
 assert.throws(()=>credentials({PMS_GOOGLE_SERVICE_ACCOUNT:JSON.stringify({type:'service_account',token_uri:'https://invalid.example'})}));
});
test('private advisor rejects anonymous requests without paid calls',async()=>{
 const saved=process.env.PMS_DATA_MODE;process.env.PMS_DATA_MODE='private';
 try{const r=await require('../netlify/functions/advisor.js').handler({httpMethod:'POST',headers:{},body:'{}'});assert.equal(r.statusCode,403);}
 finally{if(saved===undefined)delete process.env.PMS_DATA_MODE;else process.env.PMS_DATA_MODE=saved;}
});
