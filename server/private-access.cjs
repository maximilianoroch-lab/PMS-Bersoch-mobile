// Personal application only. No credentials or financial fixtures in this file.
const FEEDS=[
 ['positions','app_feed_v2','A1:T67'],['home','app_feed_v2','A69:F77'],
 ['banners','app_feed_v2','A80:D89'],['types','dashboard_tipo_v2','A1:E8'],
 ['exposure','dashboard_exposicion_v2','A1:G20'],['custSummary','app_custodia_resumen_v2','A1:J10'],
 ['custDetail','app_custodia_detalle_v2','A1:L130'],['snapshots','snapshot_series_v2','A1:H1000'],
 ['cashRows','custodia_cash_v2','A1:L100'],['monthlyTypes','evolucion_tipo_mensual_estimado','A1:K60'],
 ['historicalQuotes','historial_precios','A1:J5000']
];
const HEADERS={'Content-Type':'application/json','Cache-Control':'no-store, private','Vary':'Authorization','X-Content-Type-Options':'nosniff'};
const reply=(statusCode,body)=>({statusCode,headers:HEADERS,body:JSON.stringify(body)});
class AccessError extends Error {constructor(status){super('Acceso privado no disponible');this.status=status;}}
function mode(env){const value=env.PMS_DATA_MODE||'public';if(!['public','private'].includes(value))throw new AccessError(503);return value;}
function config(env){
 if(mode(env)!=='private')return {mode:'public'};
 const clientId=env.PMS_GOOGLE_CLIENT_ID||'';
 const emails=(env.PMS_ALLOWED_EMAILS||'').split(',').map(e=>e.trim().toLowerCase()).filter(Boolean);
 const subjects=(env.PMS_ALLOWED_SUBJECTS||'').split(',').map(e=>e.trim()).filter(Boolean);
 if(!clientId.endsWith('.apps.googleusercontent.com')||!emails.length||!env.PMS_PERSONAL_SPREADSHEET_ID)throw new AccessError(503);
 return {mode:'private',clientId,emails,subjects,sheetId:env.PMS_PERSONAL_SPREADSHEET_ID};
}
function authorizeClaims(p,c,now=Date.now()/1000){
 return !!(p&&['accounts.google.com','https://accounts.google.com'].includes(p.iss)&&p.aud===c.clientId&&
  p.email_verified===true&&typeof p.sub==='string'&&p.sub&&
  c.emails.includes(String(p.email||'').toLowerCase())&&
  (String(p.email||'').endsWith('@gmail.com')||p.hd)&&
  (!c.subjects.length||c.subjects.includes(p.sub))&&
  typeof p.exp==='number'&&p.exp>now&&typeof p.iat==='number'&&p.iat<=now+60&&p.iat>=now-8*3600);
}
async function verifyToken(token,clientId){
 const {OAuth2Client}=require('google-auth-library');
 const ticket=await new OAuth2Client().verifyIdToken({idToken:token,audience:clientId});
 return ticket.getPayload();
}
async function authorizeEvent(event,env=process.env,verify=verifyToken){
 const c=config(env);
 if(c.mode!=='private')return c;
 const raw=event.headers?.authorization||event.headers?.Authorization||'';
 if(!/^Bearer [A-Za-z0-9_.-]+$/.test(raw)||raw.length>10000)throw new AccessError(401);
 let p;try{p=await verify(raw.slice(7),c.clientId);}catch{throw new AccessError(401);}
 if(!authorizeClaims(p,c))throw new AccessError(403);
 return c;
}
function credentials(env){
 try{
  const raw=JSON.parse(env.PMS_GOOGLE_SERVICE_ACCOUNT||'{}');
  if(raw.type!=='service_account'||raw.token_uri!=='https://oauth2.googleapis.com/token'||
   (raw.universe_domain&&raw.universe_domain!=='googleapis.com')||!raw.client_email||!raw.private_key)throw Error();
  return {type:'service_account',client_email:raw.client_email,private_key:raw.private_key,token_uri:raw.token_uri};
 }catch{throw new AccessError(503);}
}
async function readValues(c,env){
 const {GoogleAuth}=require('google-auth-library');
 const auth=new GoogleAuth({credentials:credentials(env),scopes:['https://www.googleapis.com/auth/spreadsheets.readonly']});
 const client=await auth.getClient();
 const url=new URL('https://sheets.googleapis.com/v4/spreadsheets/'+encodeURIComponent(c.sheetId)+'/values:batchGet');
 for(const [,name,range] of FEEDS)url.searchParams.append('ranges',"'"+name+"'!"+range);
 url.searchParams.set('valueRenderOption','FORMATTED_VALUE');url.searchParams.set('majorDimension','ROWS');
 const r=await client.request({url:url.toString(),method:'GET',timeout:18000,maxRedirects:0});
 return r.data.valueRanges;
}
function csv(rows){
 if(!Array.isArray(rows)||rows.some(r=>!Array.isArray(r)))throw new AccessError(502);
 const width=Math.max(0,...rows.map(r=>r.length));
 const cell=v=>'"'+String(v??'').replace(/"/g,'""')+'"';
 return rows.map(r=>Array.from({length:width},(_,i)=>cell(r[i])).join(',')).join('\r\n');
}
function handlers(env=process.env,deps={}){
 return {
  authConfig:async event=>{
   if(event.httpMethod!=='GET')return reply(405,{error:'Método no permitido'});
   try{const c=config(env);return reply(200,{mode:c.mode,...(c.mode==='private'?{clientId:c.clientId}:{})});}
   catch{return reply(503,{error:'Acceso no configurado'});}
  },
  bundle:async event=>{
   if(event.httpMethod!=='GET')return reply(405,{error:'Método no permitido'});
   try{
    const c=await authorizeEvent(event,env,deps.verify||verifyToken);
    if(c.mode!=='private')return reply(409,{error:'Lectura privada no habilitada'});
    const ranges=await (deps.read||readValues)(c,env);
    if(!Array.isArray(ranges)||ranges.length!==FEEDS.length)throw new AccessError(502);
    const tables={};FEEDS.forEach(([key],i)=>{tables[key]=csv(ranges[i].values||[]);});
    return reply(200,{tables});
   }catch(e){return reply(e instanceof AccessError?e.status:502,{error:'No se pudo autorizar o leer la cartera privada'});}
  }
 };
}
module.exports={FEEDS,mode,config,authorizeClaims,authorizeEvent,credentials,csv,handlers,AccessError};
