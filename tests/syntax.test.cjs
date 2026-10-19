const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const html=fs.readFileSync('index.html','utf8');
test('the entire inline mobile script compiles',()=>{
 const scripts=[...html.matchAll(/<script(?:\\s[^>]*)?>([\\s\\S]*?)<\\/script>/g)];
 assert.ok(scripts.length>0,'inline script exists');
 for(const [,source] of scripts)assert.doesNotThrow(()=>new vm.Script(source));
});
test('cash panel has a properly terminated closing tag',()=>{
 assert.ok(!html.includes("registrado.</div>'</div>'}"));
});
