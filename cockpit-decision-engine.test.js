const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

const html=fs.readFileSync('index.html','utf8');
const engine=fs.readFileSync('financial-decision-engine.js','utf8');
new vm.Script(engine,{filename:'financial-decision-engine.js'});

for(const contract of [
  'function cockpitFinancialEngine(',
  'function calculateDailySpendAllowance(',
  'function renderTodayGuidance(',
  'function renderWeeklyPlan(',
  'function renderActions('
])assert.ok(html.includes(contract),contract+' ausente');

for(const field of [
  'resumoDoMomento','statusFinanceiro','comandoPrincipal','explicacao','impactoPositivo',
  'riscoDeIgnorar','nivelDeUrgencia','nivelDeConfianca','formulaSimplificada','destinoDaAcao'
])assert.ok((html+engine).includes(field),field+' ausente no motor central');

assert.ok(html.includes('window.NorteiaDecisionEngine.evaluate({'),'tela Hoje não consome o motor central');
assert.ok(html.includes('d=state.ui&&state.ui.lastDecision'),'Plano da Semana não reutiliza a decisão central');
assert.ok(html.includes("window.NorteiaDecisionEngine.evaluatePurchase"),'decisões de compra não consomem o motor especializado');
assert.ok(!/OpenAI API|api\.openai\.com|chatbot/i.test(html),'o motor local não deve depender de IA paga');

console.log('Motor financeiro central e consumidores: OK');
