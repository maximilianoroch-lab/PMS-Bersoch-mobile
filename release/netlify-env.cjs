// Exact site-scoped Netlify API env preparation. No secrets are logged or exported.
const API='https://api.netlify.com/api/v1/';
function productionValue(item,key){
 if(!item||item.key!==key)throw Error('Variable incorrecta: '+key);
 if(!Array.isArray(item.scopes)||!item.scopes.includes('functions'))throw Error('Variable sin alcance functions: '+key);
 const values=(item.values||[]).filter(v=>v&&['production','all'].includes(v.context));
 if(values.length!==1)throw Error('Contexto de variable ambiguo: '+key);
 return values[0].value;
}
function checkVariables(vars,desired,strictExisting=true){
 if(!Array.isArray(vars))throw Error('Respuesta de variables no válida');
 const missing=[];
 for(const [key,value] of Object.entries(desired)){
  const found=vars.filter(x=>x&&x.key===key);
  if(found.length>1)throw Error('Variable duplicada: '+key);
  if(!found.length){missing.push(key);continue;}
  const item=found[0],actual=productionValue(item,key);
  if(key==='PMS_GOOGLE_SERVICE_ACCOUNT'){
   if(item.is_secret!==true)throw Error('Credencial de lector no marcada secreta');
   // A secret that predated this execution cannot be verified through the API.
   if(strictExisting)throw Error('Credencial secreta preexistente: verificar manualmente antes de publicar');
  }else if(actual!==value)throw Error('Variable existente diferente: '+key);
 }
 return missing;
}
async function configurePersonalEnv(site,token,desired,fetcher=fetch,options={}){
 if(!site?.id||!site?.account_slug||!token)throw Error('Faltan sitio/propietario/token para configurar');
 const headers={Authorization:'Bearer '+token};
 async function request(url,method='GET',body){
  const r=await fetcher(API+url,{method,headers:body?{...headers,'Content-Type':'application/json'}:headers,body:body?JSON.stringify(body):undefined,redirect:'error',signal:AbortSignal.timeout(20000)});
  if(!r.ok)throw Error('Netlify env API HTTP '+r.status+' ('+method+')');
  return r.json();
 }
 const sitePath='sites/'+encodeURIComponent(site.id)+'/env';
 const initial=await request(sitePath);
 const preserve=options.preserveExisting===true;
 const missing=checkVariables(initial,desired,!preserve);
 if(preserve&&missing.length)throw Error('Actualización: faltan variables de producción; revisar sin modificar');
 if(!missing.length)return;
 const body=missing.map(key=>({key,...(key==='PMS_GOOGLE_SERVICE_ACCOUNT'?{scopes:['builds','functions','runtime']}:{}),is_secret:key==='PMS_GOOGLE_SERVICE_ACCOUNT',values:[{context:'production',value:desired[key]}]}));
 const accountPath='accounts/'+encodeURIComponent(site.account_slug)+'/env?site_id='+encodeURIComponent(site.id);
 const created=await request(accountPath,'POST',body);
 if(!Array.isArray(created)||missing.some(key=>!created.some(x=>x&&x.key===key)))throw Error('Netlify no confirmó todas las variables creadas');
 const after=await request(sitePath);
 // Newly created secret is deliberately unreadable via API. Verify scope and production metadata.
 for(const key of missing){
  const matched=after.filter(x=>x&&x.key===key);
  if(matched.length!==1)throw Error('No persiste variable: '+key);
  const value=productionValue(matched[0],key);
  if(key==='PMS_GOOGLE_SERVICE_ACCOUNT'){
   if(matched[0].is_secret!==true)throw Error('Se perdió protección de credencial');
  }else if(value!==desired[key])throw Error('La variable no coincide después de guardarse: '+key);
 }
 // Confirm any existing nonsecret values still match; secret created in THIS request is trusted from 201 + readback metadata.
 const existing=Object.fromEntries(Object.entries(desired).filter(([key])=>!missing.includes(key)));
 if(Object.keys(existing).length)checkVariables(after,existing,true);
}
module.exports={productionValue,checkVariables,configurePersonalEnv};
