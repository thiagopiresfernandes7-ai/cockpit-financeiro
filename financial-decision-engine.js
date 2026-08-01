(function(root,factory){
  var api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  root.NorteiaDecisionEngine=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  function n(value){value=Number(value);return Number.isFinite(value)?value:0}
  function clamp(value,min,max){return Math.min(max,Math.max(min,value))}
  function result(input,overrides){
    var now=input.now||new Date().toISOString();
    return Object.assign({
      statusFinanceiro:'estável',resumoDoMomento:'Seu mês está sob controle.',prioridadeAtual:'manter_o_plano',
      comandoPrincipal:'Continue registrando suas movimentações.',explicacao:'Os dados atuais não indicam um risco mais urgente.',
      valorRelacionado:null,prazo:null,destinoDaAcao:'register',impactoPositivo:'Você mantém clareza sobre o mês.',
      riscoDeIgnorar:'Pequenas mudanças podem passar despercebidas.',nivelDeUrgencia:'baixa',nivelDeConfianca:'média',
      dadosUtilizados:[],formulaSimplificada:'prioridade = maior risco financeiro identificado',atualizadoEm:now,
      proximasAcoesSecundarias:[]
    },overrides||{});
  }
  function evaluate(raw){
    var input=raw||{},income=n(input.income),expense=n(input.expense),cash=n(input.cash),debtBalance=n(input.debtBalance),
      debtPayments=n(input.debtPayments),safe=n(input.safeToSpend),reserveMonths=n(input.reserveMonths),
      transactionCount=n(input.transactionCount),hasBase=Boolean(input.hasBalance||income>0),futureBalance=n(input.futureBalance),
      debtRatio=income>0?debtPayments/income:0,confidence=transactionCount<4||!hasBase?'baixa':(transactionCount>=12?'alta':'média'),
      common={nivelDeConfianca:confidence,dadosUtilizados:['receitas','despesas','saldo do mês','dívidas e parcelas','compromissos futuros','orçamento e reserva'],
        proximasAcoesSecundarias:[{rotulo:'Ver movimentos',destino:'register'},{rotulo:'Revisar planos',destino:'plan'}]};
    if(!hasBase||transactionCount<2)return result(input,Object.assign({},common,{statusFinanceiro:'dados insuficientes',resumoDoMomento:'Faltam dados para orientar seu mês com segurança.',prioridadeAtual:'completar_dados',comandoPrincipal:'Registre sua renda e as principais contas do mês.',explicacao:'Sem renda ou saldo e ao menos duas movimentações, qualquer recomendação teria baixa precisão.',destinoDaAcao:'register',impactoPositivo:'O Norteia passa a calcular um próximo passo confiável.',riscoDeIgnorar:'Você continuará sem uma visão segura do que pode gastar.',nivelDeUrgencia:'alta',formulaSimplificada:'confiança = renda ou saldo + pelo menos 2 movimentações'}));
    if(input.hasOverdueEssential)return result(input,Object.assign({},common,{statusFinanceiro:'crítico',resumoDoMomento:'Há uma conta essencial vencida ou próxima do vencimento.',prioridadeAtual:'proteger_conta_essencial',comandoPrincipal:'Separe agora o valor da conta essencial mais urgente.',explicacao:'Contas essenciais têm prioridade sobre aportes e gastos flexíveis.',valorRelacionado:n(input.overdueEssentialAmount)||null,prazo:input.overdueEssentialDue||'hoje',destinoDaAcao:'debts',impactoPositivo:'Você evita atraso e protege serviços essenciais.',riscoDeIgnorar:'A conta pode gerar multa, juros ou interrupção.',nivelDeUrgencia:'crítica',formulaSimplificada:'prioridade = conta essencial vencida antes de qualquer gasto flexível'}));
    if(cash<0)return result(input,Object.assign({},common,{statusFinanceiro:'atenção',resumoDoMomento:'Mantendo o ritmo atual, vai faltar dinheiro neste mês.',prioridadeAtual:'corrigir_fluxo_atual',comandoPrincipal:'Reduza ou adie gastos flexíveis em '+Math.abs(cash).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})+'.',explicacao:'As saídas e aportes registrados já superam as entradas do mês.',valorRelacionado:Math.abs(cash),prazo:'até o fim do mês',destinoDaAcao:'register',impactoPositivo:'Seu saldo mensal volta a zero ou fica positivo.',riscoDeIgnorar:'O mês termina com saldo negativo ou dependência de crédito.',nivelDeUrgencia:'alta',formulaSimplificada:'ajuste necessário = despesas + aportes - receitas - rendimentos'}));
    if(futureBalance<0)return result(input,Object.assign({},common,{statusFinanceiro:'atenção',resumoDoMomento:'Seu mês está positivo, mas os próximos compromissos podem deixar o saldo negativo.',prioridadeAtual:'proteger_fluxo_futuro',comandoPrincipal:'Reserve '+Math.abs(futureBalance).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})+' para os próximos compromissos.',explicacao:'A projeção futura considera parcelas, dívidas e lançamentos planejados.',valorRelacionado:Math.abs(futureBalance),destinoDaAcao:'projection',impactoPositivo:'Você atravessa os próximos vencimentos sem entrar no vermelho.',riscoDeIgnorar:'Compromissos futuros podem consumir o saldo disponível.',nivelDeUrgencia:'alta',formulaSimplificada:'saldo futuro = saldo atual + entradas previstas - compromissos previstos'}));
    if(debtRatio>.35)return result(input,Object.assign({},common,{statusFinanceiro:'atenção',resumoDoMomento:'As parcelas estão consumindo uma parte alta da sua renda.',prioridadeAtual:'reduzir_pressao_das_dividas',comandoPrincipal:'Revise a dívida que mais pesa no mês antes de assumir novas parcelas.',explicacao:'O total mensal de dívidas passou de 35% da renda registrada.',valorRelacionado:debtPayments,destinoDaAcao:'debts',impactoPositivo:'Você recupera margem mensal e capacidade de escolha.',riscoDeIgnorar:'Novas parcelas podem comprometer contas essenciais.',nivelDeUrgencia:'alta',formulaSimplificada:'peso das dívidas = parcelas mensais ÷ renda mensal'}));
    if(reserveMonths<3&&cash>0)return result(input,Object.assign({},common,{statusFinanceiro:'em construção',resumoDoMomento:'Seu mês tem margem, mas sua proteção contra imprevistos ainda é curta.',prioridadeAtual:'formar_reserva',comandoPrincipal:'Direcione parte da sobra para sua reserva de emergência.',explicacao:'A reserva estimada ainda não cobre três meses de despesas.',valorRelacionado:cash,destinoDaAcao:'plan',impactoPositivo:'Você reduz a chance de usar crédito em um imprevisto.',riscoDeIgnorar:'Uma despesa inesperada pode consumir o saldo do mês.',nivelDeUrgencia:'média',formulaSimplificada:'meses de reserva = valor disponível em reserva ÷ despesas mensais'}));
    return result(input,Object.assign({},common,{statusFinanceiro:'estável',resumoDoMomento:'Seu mês está equilibrado e há margem para seguir o plano.',prioridadeAtual:'manter_margem_segura',comandoPrincipal:safe>0?'Mantenha os gastos flexíveis em até '+safe.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})+' por dia.':'Continue registrando e preserve a margem do mês.',explicacao:'Receitas cobrem as saídas e os compromissos conhecidos não indicam saldo negativo.',valorRelacionado:safe||null,destinoDaAcao:'register',impactoPositivo:'Você mantém as contas protegidas até o fim do mês.',riscoDeIgnorar:'Gastos fora do plano podem reduzir a margem disponível.',nivelDeUrgencia:'baixa',formulaSimplificada:'valor seguro diário = caixa livre após compromissos e reserva ÷ dias restantes'}));
  }
  return {evaluate:evaluate,version:'1.0.0',clamp:clamp};
});
