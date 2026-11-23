// Read-only administrative audit. Never deploys, changes configuration or prints secrets.
const fs=require('node:fs'),path=require('node:path');
const policy=JSON.parse(fs.readFileSync(path.join(__dirname,'policy.json'),'utf8'));
async function main(){
 const token=process.env.NETLIFY_AUTH_TOKEN;if(!token)throw Error('Falta Actions secret NETLIFY_AUTH_TOKEN');
 async function get(route){const r=await fetch('https://api.netlify.com/api/v1/'+route,{headers:{Authorization:'Bearer '+token},redirect:'error',signal:AbortSignal.timeout(20000)});if(!r.ok)throw Error('Lectura Netlify no autorizada/disponible: HTTP '+r.status);return r.json()}
 const site=await get('sites/'+encodeURIComponent(policy.site+'.netlify.app'));
 if(site.name!==policy.site||!site.id)throw Error('El token no resolvió el sitio esperado');
 const old=await get('deploys/'+encodeURIComponent(policy.rollback));
 if(old.site_id!==site.id||old.state!=='ready')throw Error('El respaldo no corresponde a un deploy disponible del sitio');
 const current=site.published_deploy;
 const result={audit:'READ_ONLY',site:site.name,site_id:site.id,builds_stopped:site.build_settings?.stop_builds===true,manual_deploy_forbidden:site.prevent_non_git_prod_deploys===true,published_deploy:current?.id,published_commit:current?.commit_ref||null,rollback_deploy:old.id,rollback_commit:old.commit_ref||null,rollback_ready:true,baseline_unchanged:current?.id===policy.rollback,functions_declared:Array.isArray(old.functions)?old.functions.map(f=>typeof f==='string'?f:f.name).filter(Boolean):null,google_reader:'not_required_for_demo'};
 if(policy.personal){
  let info;try{info=JSON.parse(process.env.PMS_GOOGLE_SERVICE_ACCOUNT||'')}catch{throw Error('Falta JSON válido en Actions secret PMS_GOOGLE_SERVICE_ACCOUNT')}
  if(info.type!=='service_account'||info.client_email!==policy.reader||info.token_uri!=='https://oauth2.googleapis.com/token'||!info.private_key)throw Error('JSON no corresponde al lector Google autorizado');
  const match=fs.readFileSync('index.html','utf8').match(/const SHEET_ID='([^']+)'/);if(!match)throw Error('Base personal no identificada');
  const {GoogleAuth}=require('google-auth-library');
  const auth=new GoogleAuth({credentials:{type:'service_account',client_email:info.client_email,private_key:info.private_key,token_uri:'https://oauth2.googleapis.com/token'},scopes:['https://www.googleapis.com/auth/spreadsheets.readonly']});
  try{
   const client=await auth.getClient();const response=await client.request({url:'https://sheets.googleapis.com/v4/spreadsheets/'+encodeURIComponent(match[1]),params:{fields:'spreadsheetId,sheets.properties.title'},method:'GET',timeout:18000,maxRedirects:0});
   if(response.data.spreadsheetId!==match[1]||!Array.isArray(response.data.sheets))throw Error('Invalid metadata');
   result.google_reader='authenticated_readonly_success';result.google_sheet_count=response.data.sheets.length;
  }catch{throw Error('No se confirmó lectura autenticada Google; revisar API, clave y permiso reader')}
 }else if(process.env.PMS_GOOGLE_SERVICE_ACCOUNT)throw Error('JSON personal cargado en DEMO: revisar separación');
 console.log('MAX_AUDIT_RESULT '+JSON.stringify(result));
 fs.mkdirSync('release-audit',{recursive:true});fs.writeFileSync('release-audit/result.json',JSON.stringify(result,null,2));
 if(!result.builds_stopped||result.manual_deploy_forbidden||!result.baseline_unchanged)throw Error('Auditoría identifica condición que bloquea publicación; no se modificó configuración');
}
main().catch(e=>{console.error('MAX_AUDIT_BLOCKED '+e.message);process.exitCode=1});
