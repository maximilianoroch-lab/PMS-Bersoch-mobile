// Prepared release tooling. No network or publication in prepare mode.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {execFileSync}=require('node:child_process');
const POLICY=JSON.parse(fs.readFileSync(path.join(__dirname,'policy.json'),'utf8'));
const FILES=['index.html','privacy-client.js','sw.js','manifest.webmanifest','icon-192.png','icon-512.png','ai-advisor.png','audio-summary.png'];
function guard(input,site,now=Date.now()){
 if(!/^[a-f0-9]{40}$/.test(input.sha)||input.sha!==input.actualSha)throw Error('El commit no coincide');
 if(input.approval!==`PUBLICAR ${POLICY.site} ${input.sha}`)throw Error('Falta aprobación exacta');
 const credits=Number(input.credits),at=Date.parse(input.checkedAt);
 if(!Number.isFinite(credits)||credits<130||!Number.isFinite(at)||now-at<0||now-at>30*60*1000)throw Error('Saldo/reserva o fecha no válidos; revalidar');
 if(site.name!==POLICY.site||(site.id!==input.siteId&&input.siteId!==POLICY.site+'.netlify.app'))throw Error('Sitio equivocado');
 if(site.build_settings?.stop_builds!==true)throw Error('Los builds deben seguir detenidos');
 if(site.prevent_non_git_prod_deploys===true)throw Error('La política del sitio bloquea publicación manual');
 if(site.published_deploy?.id!==POLICY.rollback)throw Error('Producción cambió; revisar respaldo y reversión');
}
function parseEnvValue(raw,name,optional=false){
 let obj;try{obj=JSON.parse(raw)}catch{throw Error('Respuesta de variable inválida: '+name)}
 if(!obj||Array.isArray(obj)||typeof obj!=='object')throw Error('Respuesta de variable inválida: '+name);
 if(!Object.hasOwn(obj,name)){if(optional)return '';throw Error('Falta variable: '+name)}
 if(typeof obj[name]!=='string'||!obj[name].trim())throw Error('Valor de variable inválido: '+name);
 return obj[name].trim();
}
function prepare(){
 const expected=process.env.EXPECTED_SHA||'';
 const actual=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
 if(!/^[a-f0-9]{40}$/.test(expected)||expected!==actual)throw Error('El commit no coincide');
 const out=path.resolve('release-static');fs.rmSync(out,{recursive:true,force:true});fs.mkdirSync(out);
 for(const name of FILES){if(name==='privacy-client.js'&&!POLICY.personal)continue;fs.copyFileSync(name,path.join(out,name));}
 const entries=fs.readdirSync(out).sort().map(name=>({name,sha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(out,name))).digest('hex')}));
 fs.writeFileSync('release-manifest.json',JSON.stringify({site:POLICY.site,source_sha:actual,files:entries},null,2));
 console.log('Artefacto estático preparado; fuente '+actual+'; archivos '+entries.length);
}
async function publish(){
 const cli=process.env.NETLIFY_CLI,token=process.env.NETLIFY_AUTH_TOKEN,siteId=POLICY.site+'.netlify.app';
 if(!cli||!token||!siteId)throw Error('Falta configuración privada de GitHub');
 const response=await fetch('https://api.netlify.com/api/v1/sites/'+encodeURIComponent(siteId),{headers:{Authorization:'Bearer '+token},redirect:'error',signal:AbortSignal.timeout(20000)});
 if(!response.ok)throw Error('No se pudo verificar sitio; HTTP '+response.status);
 const site=await response.json();
 const sha=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
 guard({sha:process.env.EXPECTED_SHA,actualSha:sha,approval:process.env.RELEASE_APPROVAL,credits:process.env.CREDITS_AVAILABLE,checkedAt:process.env.CREDITS_CHECKED_AT,siteId},site);
 function envValue(name,optional=false){
  let raw;try{raw=execFileSync(cli,['env:get',name,'--site',siteId,'--context','production','--scope','functions','--json'],{encoding:'utf8',stdio:['ignore','pipe','pipe'],timeout:30000})}catch{throw Error('No se pudo verificar variable: '+name)}
  return parseEnvValue(raw,name,optional);
 }
 if(POLICY.personal&&process.env.PMS_GOOGLE_SERVICE_ACCOUNT){
  let info;try{info=JSON.parse(process.env.PMS_GOOGLE_SERVICE_ACCOUNT)}catch{throw Error('JSON lector inválido')}
  const sid=fs.readFileSync('index.html','utf8').match(/const SHEET_ID='([^']+)'/);
  if(!sid||info.client_email!==POLICY.reader||info.token_uri!=='https://oauth2.googleapis.com/token'||info.type!=='service_account'||!info.private_key)throw Error('JSON no corresponde al lector autorizado');
  const desired={PMS_DATA_MODE:'private',PMS_GOOGLE_CLIENT_ID:POLICY.clientId,PMS_ALLOWED_EMAILS:'maximilianoroch@gmail.com',PMS_PERSONAL_SPREADSHEET_ID:sid[1],PMS_GOOGLE_SERVICE_ACCOUNT:JSON.stringify(info)};
  for(const [key,value] of Object.entries(desired)){
   const current=envValue(key,true);
   if(current){
    let same=current===value;
    if(key==='PMS_GOOGLE_SERVICE_ACCOUNT'){try{const c=JSON.parse(current);same=c.client_email===info.client_email&&c.private_key===info.private_key&&c.token_uri===info.token_uri&&c.type===info.type}catch{same=false}}
    if(!same)throw Error('Variable existente diferente: '+key+'; revisar sin sobrescribir');
   }else{try{execFileSync(cli,['env:set',key,value,'--site',siteId,'--context','production','--scope','functions'],{stdio:['ignore','pipe','pipe'],timeout:30000})}catch{throw Error('No se confirmó variable: '+key+'; revisar sin publicar')}}
  }
 }
 if(POLICY.personal){
  if(envValue('PMS_DATA_MODE')!=='private'||envValue('PMS_GOOGLE_CLIENT_ID')!==POLICY.clientId)throw Error('Modo privado/cliente OAuth no verificado');
  if(!envValue('PMS_ALLOWED_EMAILS').split(',').map(x=>x.trim().toLowerCase()).includes('maximilianoroch@gmail.com'))throw Error('Cuenta Max no autorizada');
  const expectedSheet=fs.readFileSync('index.html','utf8').match(/const SHEET_ID='([^']+)'/);
  if(!expectedSheet||envValue('PMS_PERSONAL_SPREADSHEET_ID')!==expectedSheet[1])throw Error('Base personal incorrecta');
  let account;try{account=JSON.parse(envValue('PMS_GOOGLE_SERVICE_ACCOUNT'))}catch{throw Error('Credencial lectora inválida')}
  if(account.client_email!==POLICY.reader||account.token_uri!=='https://oauth2.googleapis.com/token'||account.type!=='service_account'||!account.private_key)throw Error('Credencial lectora incorrecta');
 }else if(envValue('PMS_DATA_MODE',true)==='private')throw Error('DEMO no debe utilizar modo privado personal');
 // Exactly one publication attempt; no retries, no activation of automatic builds.
 let result;try{result=JSON.parse(execFileSync(cli,['deploy','--prod','--no-build','--dir','release-static','--functions','netlify/functions','--site',siteId,'--message','Maestro Max '+sha,'--json'],{encoding:'utf8',stdio:['ignore','pipe','pipe'],timeout:240000}))}catch{throw Error('Publicación no confirmada. NO reintentar: revisar Netlify y saldo.')}
 fs.writeFileSync('release-result.json',JSON.stringify({source_sha:sha,deploy_id:result.deploy_id,url:result.deploy_url||result.url,rollback_deploy:POLICY.rollback},null,2));
 console.log('Publicación respondió; registrar ID y verificar contenido real antes de declarar instalación completa.');
}
if(require.main===module){(async()=>{if(process.argv[2]==='prepare')prepare();else if(process.argv[2]==='publish')await publish();else throw Error('Modo requerido: prepare o publish')})().catch(e=>{console.error(e.message);process.exitCode=1})}
module.exports={guard,POLICY,parseEnvValue};
