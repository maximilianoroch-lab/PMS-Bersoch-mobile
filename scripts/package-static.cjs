// Local preparation only. Never deploys, calls services or reads credentials.
const fs=require('node:fs');const path=require('node:path');
const root=path.resolve(__dirname,'..');const out=path.join(root,'dist');
const files=['index.html','privacy-client.js','sw.js','manifest.webmanifest','icon-192.png','icon-512.png','ai-advisor.png','audio-summary.png'];
fs.rmSync(out,{recursive:true,force:true});fs.mkdirSync(out);
for(const name of files)fs.copyFileSync(path.join(root,name),path.join(out,name));
console.log('Prepared static files: '+files.join(', '));
