# Financial Decision Engine - Fases 1 e 2

## Mapa do sistema atual

O Norteia continua usando o mesmo arquivo principal (`index.html`) e o mesmo estado financeiro salvo por usuário. A auditoria identificou funções já reutilizáveis para a nova camada:

- `cockpitFinancialEngine(ym)`: consolida receitas, despesas, aportes, dividendos, dívidas, carteira, saldo e patrimônio líquido.
- `calculateFinancialPosition(state, ym)`: permite calcular a posição de outro estado sem duplicar a lógica.
- `futureProjectedMonths(ym)`: projeta fluxo futuro incluindo dívidas e compras parceladas.
- `debtPaymentsIn(ym)`: calcula parcelas de dívidas no mês.
- `installmentFutureOccurrences(ym, horizon)`: localiza parcelas futuras de compras registradas.
- `calculateDailySpendAllowance(state, ym)`: base anterior para valor diário seguro.
- `calculateComputedFinancialGoal(state)`: objetivo inteligente já existente.
- `generateWeeklyFinancialPlan()`: agora passa a consumir o novo motor central.

## O que foi criado

Foi criada a camada central `calculateFinancialDecisionEngine(state, ym)`.

Ela sempre retorna:

- `statusFinanceiro`
- `prioridadeAtual`
- `comandoPrincipal`
- `explicacao`
- `valorRelacionado`
- `prazo`
- `impactoPositivo`
- `riscoDeIgnorar`
- `nivelDeUrgencia`
- `nivelDeConfianca`
- `dadosUtilizados`
- `proximasAcoesSecundarias`

O Dashboard agora exibe antes dos indicadores:

1. `Sua próxima ação`
2. `Valor seguro para gastar`
3. indicadores do mês
4. blocos secundários

## Valor seguro para gastar

Fórmula simplificada usada:

`saldo atual + receitas confirmadas - contas pendentes - parcelas/dívidas - reserva protegida - margem de segurança`

Depois disso, o sistema calcula:

- valor seguro diário;
- valor seguro semanal;
- total livre no período;
- dados usados no cálculo;
- nível de confiança.

Receita apenas projetada não entra como dinheiro garantido. Só entram receitas futuras marcadas como confirmadas ou recebidas.

## Prioridade financeira

A ordem implementada nesta fase é:

1. dados insuficientes;
2. contas próximas sem saldo suficiente;
3. fluxo negativo;
4. risco futuro de saldo negativo;
5. dívida atrasada;
6. parcelas/dívidas acima de 35% da renda;
7. ausência de reserva;
8. orçamento estourado;
9. compras parceladas pressionando o futuro;
10. reserva incompleta;
11. sobra sem destino;
12. iniciar investimentos quando houver proteção mínima;
13. revisar concentração da carteira;
14. manter consistência.

## Compatibilidade de dados

A migração preserva campos antigos e adiciona estruturas vazias para fases futuras:

- `cards`
- `financialGoals`
- `monthlyClosings`
- `financialReset`
- `decisionEngineOutput`
- `importProfiles`
- `educationDismissals`
- `weeklyActions`
- `demoMode`

Nenhuma tabela nova foi criada e nenhuma dependência paga foi adicionada.

## Como testar manualmente

1. Abrir o app e entrar com uma conta.
2. Verificar se o Painel começa por `Sua próxima ação`.
3. Clicar em `Entenda o cálculo`.
4. Verificar se aparecem fórmula, dados usados, impacto de seguir e risco de ignorar.
5. Cadastrar renda menor que despesas e confirmar que a prioridade vira fluxo negativo.
6. Cadastrar dívida atrasada e confirmar que ela prevalece quando não houver risco futuro maior.
7. Cadastrar saldo e reserva mínima para validar o valor seguro por dia.
8. Ir ao Plano da Semana e conferir se ele mostra a mesma prioridade do Painel.

## Riscos restantes

- A detecção de contas essenciais depende dos lançamentos futuros estarem cadastrados com data e status.
- A reserva ainda usa a configuração de reserva mínima existente; a tela completa de reserva entra em fase posterior.
- Cartões com limite saudável completo ainda fazem parte da próxima fase.
- Importação CSV/OFX e modo demonstração continuam fora desta entrega inicial.
