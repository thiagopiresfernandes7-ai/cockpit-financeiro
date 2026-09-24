const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const html=fs.readFileSync('index.html','utf8');
const sw=fs.readFileSync('service-worker.js','utf8');
const css=fs.readFileSync('norteia-design.css','utf8');
const js=fs.readFileSync('norteia-design.js','utf8');
new vm.Script(js,{filename:'norteia-design.js'});

// A camada de design precisa ser a última folha: ela resolve os conflitos das anteriores.
const sheets=[...html.matchAll(/<link rel="stylesheet" href="([\w.-]+)\?v=\d+"/g)].map(m=>m[1]);
assert.equal(sheets[sheets.length-1],'norteia-design.css','norteia-design.css não é a última folha de estilo');
assert.ok(html.indexOf('norteia-design.css')>html.indexOf('contrast.css'),'camada de design carregada antes de contrast.css');
assert.ok(/<script src="norteia-design\.js\?v=\d+"><\/script>/.test(html),'ícones da navegação não carregados');
for(const file of ['norteia-design.css','norteia-design.js'])assert.ok(sw.includes('./'+file),file+' fora do shell offline');

// Tokens com tema claro e escuro.
for(const token of ['--n-bg','--n-surface','--n-text','--n-text-3','--n-brand','--n-border'])assert.ok(css.includes(token+':'),token+' ausente');
assert.ok(/html\[data-theme="dark"\]\{[^}]*--n-surface:/.test(css),'tema escuro sem tokens próprios');

// Regras de display com !important não podem reexibir elementos ocultos (ex.: faixa de demonstração).
const guard=css.lastIndexOf(':is(.hidden,[hidden]):not(#');
assert.ok(guard>0,'garantia de .hidden/[hidden] ausente');
assert.ok(!/display:[a-z-]+!important/.test(css.slice(guard+60)),'há regra de display depois da garantia de .hidden');

// Valores grandes nos KPIs não quebram linha.
assert.ok(/\.kpi b\{[^}]*white-space:nowrap!important/.test(css),'valores dos KPIs podem quebrar linha');

// Datas legíveis no resumo, não AAAA-MM-DD.
assert.ok(!html.includes("'</b><small>'+esc(t.date||'')+' • '"),'últimas transações ainda mostram data ISO');
assert.ok(html.includes("esc(t.date?dayLabel(t.date):'')"),'últimas transações sem data amigável');

// Todos os destinos da navegação têm ícone.
for(const view of ['dashboard','analysis','register','wallet','debts','dividends','simulator','plan','projection','decisions','weekly','community','profile','categories','settings','help','more'])assert.ok(new RegExp('\\b'+view+":'<").test(js),'ícone ausente: '+view);
console.log('Sistema visual e navegação com ícones: OK');
