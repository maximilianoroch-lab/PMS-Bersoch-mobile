/* Google ID token in memory only. Authorization is checked on the server. */
(function(root){
 function createPrivacy(w){
  let state='checking',config=null,token='',timer=null,onReady=()=>{},onLocked=()=>{};
  const key='pms-v2-monthly-black-annual-20261027';
  const doc=w.document;
  function message(text){doc.getElementById('privacyMessage').textContent=text;}
  function clear(){token='';if(timer)w.clearTimeout(timer);timer=null;
   try{w.localStorage.removeItem(key);w.sessionStorage.removeItem('pmsAdvisorCode');}catch{}
  }
  function lock(text){clear();doc.body.dataset.privacyState='locked';onLocked();message(text);}
  async function accept(response){
   clear();
   try{
    const value=String(response.credential||'');
    const segment=value.split('.')[1];
    const p=JSON.parse(w.atob(segment.replace(/-/g,'+').replace(/_/g,'/')));
    const ttl=Number(p.exp)*1000-Date.now();
    if(!Number.isFinite(ttl)||ttl<=0||ttl>8*3600000)throw Error();
    token=value;timer=w.setTimeout(()=>lock('La sesión venció. Volvé a ingresar.'),ttl);
    // Keep the screen locked until the backend validates the token and bundle.
    await onReady();
   }catch{lock('No se pudo verificar la sesión. Volvé a ingresar.');}
  }
  async function init(callbacks={}){
   onReady=callbacks.onReady||onReady;onLocked=callbacks.onLocked||onLocked;
   try{
    const r=await w.fetch('/.netlify/functions/auth-config',{cache:'no-store'});
    if(!r.ok)throw Error();config=await r.json();
    if(config.mode==='public'){state='public';doc.body.dataset.privacyState='public';await onReady();return;}
    if(config.mode!=='private'||!String(config.clientId||'').endsWith('.apps.googleusercontent.com'))throw Error();
    state='private';lock('Ingresá con tu cuenta autorizada para ver la cartera personal.');
    doc.getElementById('privateLogout').hidden=true;
    doc.getElementById('privateLogout').onclick=()=>{lock('Sesión cerrada.');w.location.reload();};
    const script=doc.createElement('script');script.src='https://accounts.google.com/gsi/client';script.async=true;
    script.onload=()=>{w.google.accounts.id.initialize({client_id:config.clientId,callback:accept,auto_select:true});
     w.google.accounts.id.renderButton(doc.getElementById('privateSignIn'),{theme:'outline',size:'large'});w.google.accounts.id.prompt?.();};
    script.onerror=()=>message('No se pudo cargar el ingreso con Google. Revisá la conexión.');doc.head.appendChild(script);
   }catch{state='blocked';lock('No se pudo verificar la configuración de acceso. No se muestran datos guardados.');}
  }
  async function tables(){
   if(state!=='private'||!token)throw Error('Ingresá con Google para cargar la cartera.');
   const current=token;
   const r=await w.fetch('/.netlify/functions/private-bundle',{cache:'no-store',headers:{Authorization:'Bearer '+current}});
   if(current!==token)throw Error('La sesión cambió durante la carga.');
   if(!r.ok){lock(r.status===401||r.status===403?'Sesión vencida o cuenta no autorizada.':'No se pudo leer la base privada.');throw Error('Lectura privada bloqueada');}
   const data=await r.json();
   if(!data.tables||typeof data.tables!=='object')throw Error('Respuesta privada incompleta');
   return data.tables;
  }
  function reveal(){if(state==='private'&&token)doc.body.dataset.privacyState='open';}
  function headers(){return state==='private'&&token?{Authorization:'Bearer '+token}:{};}
  return {init,mode:()=>state,tables,reveal,headers,lock};
 }
 if(typeof module!=='undefined')module.exports={createPrivacy};
 if(root&&root.document)root.PMSPrivacy=createPrivacy(root);
})(typeof window!=='undefined'?window:null);
