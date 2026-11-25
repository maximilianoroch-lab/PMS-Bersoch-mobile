const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync('index.html','utf8');
test('inline JavaScript compiles',()=>{for(const m of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g))if(m[1].trim())new vm.Script(m[1]);});
test('literal DOM references resolve and IDs are unique',()=>{const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(new Set(ids).size,ids.length);for(const m of html.matchAll(/getElementById\(['"]([^'"]+)['"]\)/g))assert.ok(ids.includes(m[1]),m[1]);});
test('composition, recent history and weekly controls exist',()=>{assert.match(html,/currentTypeBars/);assert.match(html,/scrollLeft=/);assert.match(html,/Semanal|Cierres semanales/);assert.match(html,/#79a9d2/);});

// Every chart palette entry must remain readable on both mobile backgrounds.
require('node:test')('chart palette maintains at least 4:1 contrast',()=>{
 const assert=require('node:assert/strict');const html=require('node:fs').readFileSync('index.html','utf8');
 const luminance=hex=>hex.slice(1).match(/../g).map(x=>parseInt(x,16)/255).map(x=>x<=0.04045?x/12.92:((x+0.055)/1.055)**2.4).reduce((a,v,i)=>a+v*[0.2126,0.7152,0.0722][i],0);
 for(const c of ['#79a9d2','#ff626a','#ffc000','#80c342','#6095ed','#a0b4c8']){assert.ok(html.includes(c),c+' missing');for(const bg of ['#041424','#19354c','#07111f','#12263b'])assert.ok((luminance(c)+.05)/(luminance(bg)+.05)>=4,c+' on '+bg);}
 for(const c of ['#42698e','#d71920','#4472c4'])assert.ok(!html.includes(c),'Obsolete low contrast color '+c);
});
