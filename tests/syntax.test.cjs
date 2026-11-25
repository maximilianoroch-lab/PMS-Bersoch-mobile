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

test('historical type period selectors are monthly by default and offer five intervals without duplicate home chart',()=>{
 assert.match(html,/let typePeriod='M'/);
 assert.ok(!html.includes('id="homeTypePeriods"'));
 assert.match(html,/period='S'/);
 for(const name of ['Semanal','Mensual','Trimestral','Semestral','Anual'])assert.ok(html.includes("'"+name+"'"),name);
 for(const id of ['typePeriods','sharePeriods'])assert.equal((html.match(new RegExp('id="'+id+'"','g'))||[]).length,1);
});
test('historical type groups retain the last available month, not synthetic interpolation',()=>{
 const code=html.slice(html.indexOf("let typePeriod='M'"),html.indexOf('async function getCSV(',html.indexOf("let typePeriod='M'")));
 const helpers=vm.runInNewContext(code+';({monthlySeries,typeBuckets})',{num:Number,MONTH_NAMES:['Cripto','ETF','CEDEAR','Bonos','Acciones'],document:{getElementById:()=>null}});
 const data=helpers.monthlySeries([
  {Mes:'2026-01',Cripto:'10',ETF:'20',CEDEAR:'30',Bonos:'40',Acciones:'50',Estado:'ESTIMADO'},
  {Mes:'2026-03',Cripto:'12',ETF:'22',CEDEAR:'32',Bonos:'42',Acciones:'52',Estado:'ESTIMADO'},
  {Mes:'2026-08',Cripto:'14',ETF:'24',CEDEAR:'34',Bonos:'44',Acciones:'54',Estado:'OBSERVADO'},
  {Mes:'2026-14',Cripto:'12',ETF:'22',CEDEAR:'32',Bonos:'42',Acciones:'52'}
 ]);
 assert.deepEqual(Array.from(data,p=>p.mes),['2026-01','2026-03','2026-08']);
 assert.deepEqual(Array.from(helpers.typeBuckets(data,'Q'),p=>p.mes),['2026-03','2026-08']);
 assert.deepEqual(Array.from(helpers.typeBuckets(data,'H'),p=>p.mes),['2026-03','2026-08']);
 assert.deepEqual(Array.from(helpers.typeBuckets(data,'A'),p=>p.mes),['2026-08']);
});
test('type chart prevents misleading attribution of missing historical cash',()=>{
 assert.match(html,/Denominador: cinco tipos combinados, sin efectivo/);
 assert.match(html,/no es porcentaje del patrimonio total/);
 assert.match(html,/Patrimonio total · USD, incluye efectivo/);
 assert.ok(!html.includes('id="typeBars"'),'old stacked chart must be removed');
});
