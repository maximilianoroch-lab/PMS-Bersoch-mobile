const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const html=fs.readFileSync('index.html','utf8');
test('the entire inline mobile script compiles',()=>{
 const first=html.indexOf('<script>');
 const last=html.indexOf('</script>',first);
 assert.ok(first>=0 && last>first,'inline script exists');
 assert.doesNotThrow(()=>new vm.Script(html.slice(first+'<script>'.length,last)));
});
test('cash panel does not contain broken markup string',()=>{
 assert.ok(!html.includes("registrado.</div>'</div>'}"));
});
