// Read-only Netlify environment metadata check. Never logs variable values.
const fs=require('node:fs'),path=require('node:path');
const policy=JSON.parse(fs.readFileSync(path.join(__dirname,'policy.json'),'utf8'));
const names=['PMS_DATA_MODE','PMS_GOOGLE_CLIENT_ID','PMS_ALLOWED_EMAILS','PMS_PERSONAL_SPREADSHEET_ID','PMS_GOOGLE_SERVICE_ACCOUNT'];
function classification(vars,key){
 if(!Array.isArray(vars))throw Error('Invalid environment API response');
 const matches=vars.filter(v=>v&&v.key===key);
 if(matches.length!==1)return matches.length?'duplicate':'absent';
 const v=matches[0];
 if(!Array.isArray(v.scopes)||!v.scopes.includes('functions'))return 'wrong_scope';
 if(!Array.isArray(v.values)||!v.values.some(x=>x&&['all','production'].includes(x.context)))return 'wrong_context';
 return v.is_secret?'present_secret':'present';
}
async function main(){
 const token=process.env.NETLIFY_AUTH_TOKEN;
 if(!token)throw Error('Missing Netlify token for read-only audit');
 const headers={Authorization:'Bearer '+token};
 async function get(url){const r=await fetch(url,{headers,redirect:'error',signal:AbortSignal.timeout(20000)});if(!r.ok)throw Error('Read-only Netlify metadata HTTP '+r.status);return r.json();}
 const site=await get('https://api.netlify.com/api/v1/sites/'+encodeURIComponent(policy.site+'.netlify.app'));
 if(site.name!==policy.site||!site.id)throw Error('Wrong site');
 const vars=await get('https://api.netlify.com/api/v1/sites/'+encodeURIComponent(site.id)+'/env');
 const states=Object.fromEntries(names.map(k=>[k,classification(vars,k)]));
 console.log('MAX_ENV_METADATA '+JSON.stringify({site:site.name,states}));
}
if(require.main===module)main().catch(e=>{console.error('MAX_ENV_AUDIT_BLOCKED '+e.message);process.exitCode=1});
module.exports={classification};
