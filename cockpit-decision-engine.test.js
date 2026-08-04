const assert = require('assert');
const fs = require('fs');

const html = fs.readFileSync('index.html', 'utf8');

function assertInOrder(source, labels) {
  let last = -1;
  labels.forEach((label) => {
    const idx = source.indexOf(label);
    assert(idx >= 0, `Trecho não encontrado: ${label}`);
    assert(idx > last, `Ordem incorreta para: ${label}`);
    last = idx;
  });
}

function priorityScenario(s) {
  if (s.missing) return 'Dados insuficientes';
  if (s.expense > s.income && s.income > 0) return 'Fluxo negativo';
  if (s.futureNegative) return 'Risco futuro';
  if (s.overdueDebt) return 'Dívida atrasada';
  if (s.debtRatio > 0.35) return 'Parcelas pesadas';
  if (s.reserveGoal > 0 && s.reserveCurrent <= 0) return 'Sem proteção';
  if (s.overBudget) return 'Orçamento estourado';
  if (s.installmentPressure) return 'Parcelas pressionando';
  if (s.reserveGoal > 0 && s.reserveCurrent < s.reserveGoal) return 'Reserva incompleta';
  if (s.surplus > 0 && !s.contribution) return 'Sobra sem destino';
  if (!s.investments && s.reserveMonths >= 3) return 'Pronto para investir com cuidado';
  return 'Mês sob controle';
}

assert(html.includes('function calculateFinancialDecisionEngine'), 'Motor central não encontrado.');
assert(html.includes('function calculateSafeSpend'), 'Cálculo de valor seguro não encontrado.');
assert(html.includes('renderFinancialDecisionEngine'), 'Render do motor no Dashboard não encontrado.');
const dashboardStart = html.indexOf('<section class="section active dashboard-clean" id="dashboard">');
const dashboardEnd = html.indexOf('</section>', dashboardStart);
const dashboardHtml = html.slice(dashboardStart, dashboardEnd);
assert(dashboardHtml.indexOf('financialDecisionCard') < dashboardHtml.indexOf('dashboard-kpis'), 'Próxima ação precisa aparecer antes dos indicadores do Painel.');
assert(html.includes('renderActions(s,ym){var d=calculateFinancialDecisionEngine'), 'Alertas do Painel precisam consumir o mesmo motor.');
assert(html.includes('generateWeeklyFinancialPlan(){var ym=selectedMonth(),s=summary(ym),d=calculateFinancialDecisionEngine'), 'Plano da Semana precisa consumir o mesmo motor.');

[
  'statusFinanceiro',
  'prioridadeAtual',
  'comandoPrincipal',
  'explicacao',
  'valorRelacionado',
  'prazo',
  'impactoPositivo',
  'riscoDeIgnorar',
  'nivelDeUrgencia',
  'nivelDeConfianca',
  'dadosUtilizados',
  'proximasAcoesSecundarias',
].forEach((key) => assert(html.includes(key), `Campo obrigatório ausente: ${key}`));

const engineStart = html.indexOf('function calculateFinancialDecisionEngine');
const engineEnd = html.indexOf('function renderFinancialDecisionEngine', engineStart);
const engineSource = html.slice(engineStart, engineEnd);

assertInOrder(engineSource, [
  'Dados insuficientes',
  'Fluxo negativo',
  'Risco futuro',
  'Dívida atrasada',
  'Parcelas pesadas',
  'Sem proteção',
  'Orçamento estourado',
  'Parcelas pressionando',
  'Reserva incompleta',
  'Sobra sem destino',
  'Pronto para investir com cuidado',
]);

assert(html.includes('saldo atual + receitas confirmadas - contas pendentes - parcelas/dívidas - reserva protegida - margem de segurança'), 'Fórmula explicável do valor seguro ausente.');
assert(!/OpenAI API|api\.openai\.com|chatbot/i.test(html), 'O escopo não permite IA paga ou chatbot.');

assert.strictEqual(priorityScenario({ missing: true }), 'Dados insuficientes');
assert.strictEqual(priorityScenario({ income: 3000, expense: 3800 }), 'Fluxo negativo');
assert.strictEqual(priorityScenario({ income: 5000, expense: 3000, futureNegative: true, overdueDebt: true }), 'Risco futuro');
assert.strictEqual(priorityScenario({ income: 5000, expense: 3000, overdueDebt: true }), 'Dívida atrasada');
assert.strictEqual(priorityScenario({ income: 5000, expense: 3000, reserveGoal: 3000, reserveCurrent: 0, surplus: 400 }), 'Sem proteção');
assert.strictEqual(priorityScenario({ income: 5000, expense: 3000, reserveGoal: 3000, reserveCurrent: 4000, surplus: 500, investments: false }), 'Sobra sem destino');
assert.strictEqual(priorityScenario({ income: 5000, expense: 3000, reserveGoal: 3000, reserveCurrent: 4000, surplus: 0, investments: false, reserveMonths: 3 }), 'Pronto para investir com cuidado');

console.log('cockpit-decision-engine: ok');
