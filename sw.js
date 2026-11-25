const CACHE='pms-bersoch-mobile-improvements-v1';
const ASSETS=['./','./index.html','./privacy-client.js','./manifest.webmanifest','./icon-192.png','./icon-512.png'];
self.addEventListener('install',e=>{
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)));
});
self.addEventListener('activate',e=>{
  e.waitUntil((async()=>{
    for(const k of await caches.keys()) if(k!==CACHE) await caches.delete(k);
    await self.clients.claim();
  })());
});
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET'||e.request.url.includes('/.netlify/functions/')||e.request.url.includes('docs.google.com')||e.request.url.includes('accounts.google.com')) return;
  e.respondWith(fetch(e.request).catch(()=>caches.match(e.request)));
});
