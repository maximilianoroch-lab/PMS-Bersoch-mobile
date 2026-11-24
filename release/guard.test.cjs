const test=require('node:test'),assert=require('node:assert/strict');const {guard,POLICY:p}=require('./controlled-mobile.cjs');
const now=Date.now(),sha='a'.repeat(40),input={sha,actualSha:sha,approval:`PUBLICAR ${p.site} ${sha}`,credits:'210',checkedAt:new Date(now).toISOString(),siteId:'fixture'};
const site={id:'fixture',name:p.site,build_settings:{stop_builds:true},published_deploy:{id:p.rollback}};
test('allows reviewed target with reserve and stopped builds',()=>assert.doesNotThrow(()=>guard(input,site,now)));
for(const [name,patch] of [['wrong SHA',{actualSha:'b'.repeat(40)}],['missing approval',{approval:''}],['insufficient reserve',{credits:'129'}],['old balance',{checkedAt:new Date(now-1800001).toISOString()}],['future balance',{checkedAt:new Date(now+1).toISOString()}]])test(name,()=>assert.throws(()=>guard({...input,...patch},site,now)));
for(const [name,patch] of [['wrong site',{name:'other'}],['active builds',{build_settings:{stop_builds:false}}],['unknown builds',{build_settings:{}}],['changed production',{published_deploy:{id:'changed'}}],['manual deployment forbidden',{prevent_non_git_prod_deploys:true}]])test(name,()=>assert.throws(()=>guard(input,{...site,...patch},now)));

test('accepts fixed Netlify domain instead of requiring a second secret',()=>assert.doesNotThrow(()=>guard({...input,siteId:p.site+'.netlify.app'},site,now)));

const {parseEnvValue}=require('./controlled-mobile.cjs');
test('only confirmed missing JSON value may be treated as optional',()=>{assert.equal(parseEnvValue('{}','KEY',true),'');assert.throws(()=>parseEnvValue('{}','KEY'));});
test('API/CLI errors cannot be mistaken for absent config or leak response',()=>{for(const raw of ['SECRET_FIXTURE unauthorized','null','[]']){assert.throws(()=>parseEnvValue(raw,'KEY',true),e=>!e.message.includes('SECRET_FIXTURE'));}});
test('resolved JSON values preserve actual secret internally without logging',()=>assert.equal(parseEnvValue('{"KEY":"synthetic"}','KEY'),'synthetic'));

test('publication uses verified Netlify site identity and site-scoped API, never unsupported flags',()=>{
 const fs=require('node:fs'),source=fs.readFileSync(require.resolve('./controlled-mobile.cjs'),'utf8');
 const env=fs.readFileSync(require.resolve('./netlify-env.cjs'),'utf8');
 assert.ok(source.includes("NETLIFY_SITE_ID:site.id"),'deploy CLI must target verified site');
 assert.ok(source.includes("'deploy'"),'deployment operation must be preserved');
 assert.ok(source.includes('configurePersonalEnv(site,token,desired)'),'site-specific env configuration must be enforced');
 assert.ok(!source.includes("'--site',siteId"),'unsupported site flag must not be sent');
 assert.ok(!source.includes("'env:set'"),'legacy env:set cannot be used to bypass API verification');
 assert.ok(env.includes("accountPath='accounts/'"),'scoped account API must create missing site variables');
 assert.ok(env.includes("+'/env?site_id='"),'API POST must include the verified site ID');
 assert.ok(source.includes("published_deploy?.id!==POLICY.rollback"),'rollback must stay enforced');
});
