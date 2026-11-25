const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync('index.html','utf8');
test('inline JavaScript compiles',()=>{for(const m of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g))if(m[1].trim())new vm.Script(m[1]);});
test('literal DOM references resolve and IDs are unique',()=>{const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(new Set(ids).size,ids.length);for(const m of html.matchAll(/getElementById\(['"]([^'"]+)['"]\)/g))assert.ok(ids.includes(m[1]),m[1]);});
test('composition, recent history and weekly controls exist',()=>{assert.match(html,/currentTypeBars/);assert.match(html,/scrollLeft=/);assert.match(html,/Semanal|Cierres semanales/);assert.match(html,/#b9c2cc/);});
