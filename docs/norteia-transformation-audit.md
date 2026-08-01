# Norteia — auditoria e estratégia de transformação

Data da auditoria: 31/07/2026  
Branch: `feat/norteia-transformacao`

## Diagnóstico inicial

O produto já possui uma base funcional ampla em HTML, CSS e JavaScript, com estado financeiro versionado, persistência local e sincronização na tabela `finance_states`. Autenticação usa Supabase Auth. O acesso Premium usa entitlement consultado no Supabase e confirmação de pagamento via webhook Hotmart. O PWA possui manifest e Service Worker. A comunidade está separada em módulos próprios e possui migrations, RLS, Storage, paginação e controles sociais.

O principal risco arquitetural é o `index.html` concentrar grande parte da interface e das regras. Também havia quatro fontes de orientação concorrentes: objetivo calculado, alertas do painel, plano semanal e análise de compra. A tela inicial exibia seis indicadores com o mesmo peso antes de apresentar uma decisão. A navegação mobile destacava conceitos técnicos em vez da hierarquia oficial.

## Mapa de preservação

- Preservar: `finance_states`, formato do backup JSON, autenticação, sessão, entitlement Premium, checkout, PWA, importações, exportações, cálculos de parcelas/dívidas/investimentos e comunidade.
- Corrigir: marca residual, caracteres corrompidos, manifest, hierarquia da tela inicial, navegação mobile e recomendações conflitantes.
- Reorganizar: painel em “Hoje”; Extrato em “Movimentos”; Orçamento e recursos avançados sob “Planos”.
- Extrair: motor central de decisão para módulo puro e testável.
- Não remover nesta fase: telas avançadas existentes. Elas continuam acessíveis para evitar regressão e serão agrupadas progressivamente.
- Não migrar nesta fase: dados financeiros e tabelas sociais. Nenhuma migration é necessária para o motor.

## Dependências e custos

O motor usa JavaScript puro, de forma determinística e local. Não adiciona pacote, API, serviço ou custo. Supabase, Hotmart e bibliotecas já existentes permanecem inalterados.

## Segurança e privacidade

O motor recebe apenas o estado financeiro do próprio usuário já carregado na sessão. Não envia dados a terceiros, não usa IA externa e não altera RLS. O resultado explicável é armazenado somente dentro do estado do próprio usuário (`state.ui.lastDecision`).

## Estratégia incremental

1. Criar fonte única de orientação e testes de cenários financeiros.
2. Fazer “Hoje”, plano semanal, alertas e simuladores consumirem o resultado central, começando por Hoje.
3. Consolidar tokens e componentes sem reescrever a aplicação.
4. Agrupar telas avançadas sob Movimentos e Planos.
5. Só então evoluir a comunidade, reutilizando o mesmo sistema visual.

## Fórmulas iniciais

- Fluxo do mês: receitas − despesas − aportes + rendimentos.
- Peso das dívidas: parcelas mensais ÷ renda mensal.
- Meses de reserva: reserva disponível ÷ despesas mensais.
- Valor seguro diário: caixa livre após compromissos e reserva ÷ dias restantes, limitado pelo orçamento restante.
- Prioridade: primeiro risco válido na hierarquia determinística (dados insuficientes, conta essencial, caixa atual, caixa futuro, dívidas, reserva e estabilidade).

## Riscos remanescentes

- O arquivo principal continua grande; a transformação foi incremental para preservar dados e reduzir risco de regressão.
- O nome técnico do repositório e algumas chaves internas `cockpit_*` foram preservados por compatibilidade, sem exposição da marca antiga na interface.
- Cobrança real Hotmart e credenciais de produção Supabase exigem smoke test no ambiente autorizado após a implantação.
- Excel `.xlsx` depende do carregamento inicial da biblioteca gratuita; CSV permanece processado localmente sem essa dependência.

## Rollback

Reverter os commits restaura a experiência anterior. A migration social deve ser mantida durante rollback para preservar dados; remova tabelas ou buckets somente após backup e confirmação explícita.
