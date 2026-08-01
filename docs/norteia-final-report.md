# Norteia — relatório final da transformação

Data: 31/07/2026  
Branch: `feat/norteia-transformacao`

## Resultado

O produto existente foi transformado incrementalmente em Norteia, preservando o estado financeiro, autenticação, assinatura, importações, exportações e PWA. A hierarquia pública agora parte de Hoje e de uma única orientação explicável. Mobile e desktop usam os mesmos quatro destinos: Hoje, Movimentos, Planos e Comunidade, com uma ação separada para adicionar movimentação.

## Diagnóstico inicial

- A orientação estava dividida entre dashboard, objetivo calculado, alertas, plano semanal e decisão de compra.
- O dashboard começava por indicadores equivalentes, sem destacar o próximo passo.
- A marca antiga ainda aparecia em telas, mensagens e nomes de arquivos exportados.
- O desktop expunha mais de uma dezena de destinos principais.
- A comunidade tinha interface, mas não possuía uma migration de fundação instalável no repositório.
- Mídias sociais usavam URL pública permanente; follows privados, notificações e autorização administrativa estavam incompletos.
- Importar a mesma planilha novamente duplicava registros.
- O PWA não armazenava todos os módulos no shell offline e perdia a identidade local se a biblioteca de autenticação não carregasse.

## Arquitetura final

1. Dados financeiros: o estado existente e versionado continua sendo a fonte de receitas, despesas, parcelas, dívidas, investimentos, metas e fluxo.
2. Motor de decisão: `financial-decision-engine.js` produz a decisão central e avalia compras usando a mesma prioridade.
3. Experiência: Hoje, Movimentos e Planos consomem o estado existente. `norteia-completion.js` acrescenta Reset, reserva, metas, fechamento e cartões sem criar cadastros paralelos.
4. Comunidade: tabelas sociais próprias recebem apenas conteúdo social e snapshots sanitizados. Nenhuma policy ou função consulta `finance_states`.

## Motor de decisão

O retorno mantém o contrato de situação, prioridade, comando, explicação, valor, prazo, impacto, risco, urgência, confiança, dados utilizados, fórmula e ações secundárias.

Ordem implementada:

1. dados essenciais insuficientes;
2. conta essencial urgente;
3. fluxo atual negativo;
4. risco futuro negativo;
5. peso excessivo de dívidas;
6. reserva inferior a três meses;
7. manutenção de margem segura.

Fórmulas principais:

- fluxo mensal = receitas − despesas − aportes + rendimentos;
- peso das dívidas = parcelas mensais ÷ renda;
- meses de reserva = valor líquido de reserva ÷ despesas médias;
- valor seguro diário = caixa livre após compromissos, orçamento e reserva ÷ dias restantes;
- saldo após compra = saldo projetado − valor da compra;
- custo anual recorrente = valor mensal × 12.

Hoje, Plano semanal, Reset, fechamento e “Comprar ou esperar” usam `state.ui.lastDecision` ou o método de compra do mesmo motor.

## Funcionalidades concluídas

- Hoje com situação, próxima ação, valor seguro, fórmula, impacto e risco de ignorar.
- Registro rápido, extrato, busca, filtros, revisão, parcelas e mês da fatura preservados.
- Cartões vinculados às movimentações, fatura mensal projetada e limite saudável, sem número completo ou CVV.
- Importação CSV/Excel processada localmente, com deduplicação de movimentações e investimentos.
- Backup JSON compatível e nomes públicos Norteia.
- Reset de quatro semanas, metas, reserva integrada ao fluxo e fechamento mensal exportável.
- Demonstração transitória: usa uma cópia em memória, bloqueia persistência e restaura os dados reais ao sair.
- Sessão local offline, shell PWA completo e indicação correta de “Salvo neste aparelho”.
- Design claro padrão, tema escuro salvo, foco visível, alvos de toque e contenção de foco em overlays.
- Comunidade com perfil, username, avatar, interesses, feeds, busca, posts, mídia, texto alternativo, visibilidade, apoio, comentários, respostas, salvos, republicação/citação, notificações, follows privados, bloqueio, silenciamento, ocultação, denúncia, moderação e desafios de consistência.

## Modelo social, RLS e Storage

A migration `202607280001_community_foundation.sql` cria as entidades sociais, índices, constraints, seeds, triggers e RLS. Helpers protegidos controlam administração, bloqueio e acesso a posts. Testes funcionais cobrem usuário A/B, perfil privado, solicitação pendente, impossibilidade de autoaceite, aceite pelo destinatário, remoção de follow ao bloquear e invisibilidade do post ao bloqueado.

Storage:

- `community-media`: privado, 5 MB, JPG/PNG/WebP, caminho `usuario/post/uuid`, leitura condicionada ao acesso ao post e URL assinada por 10 minutos;
- `community-avatars`: público, 2 MB, JPG/PNG/WebP, caminho por proprietário;
- substituição/exclusão remove o arquivo anterior; exclusão de post remove mídia antes do registro.

Administração depende de `community_admin_roles` e de `community_is_admin()`, nunca de variável do navegador. Ações administrativas são normalizadas no banco e registradas em tabela própria.

## Segurança e privacidade

- Nenhuma service role está no cliente.
- Cartões guardam somente nome, quatro últimos dígitos, limite, fechamento e vencimento.
- Conteúdo financeiro privado não é consultado pela comunidade.
- Texto social é escapado antes de entrar em HTML.
- Salvos, ocultações, silenciamentos e progresso são privados por RLS.
- Rate limits cobrem posts, comentários, denúncias, apoios, follows e republicações.
- Posts privados usam mídia privada e URL temporária.
- A demonstração nunca chama a persistência.

## Evidências de teste

Testes automatizados aprovados:

- build estático, scripts inline e IDs duplicados;
- cenários e contrato do Financial Decision Engine;
- compra viável e compra bloqueada pela prioridade central;
- Reset, reserva, metas, fechamento, cartões e demonstração;
- importações locais e deduplicação;
- autenticação, sessão, sincronização e paywall;
- manifest e shell offline;
- fundação social, RLS e Storage;
- execução integral da migration em PostgreSQL/PGlite;
- comunidade mobile em 320, 360, 375, 390, 414 e 430 px, sem erro de console;
- aplicativo completo em 320, 375, 430, 1024 e 1440 px, sem overflow; alvos mobile medidos em 58 px.

Resultados visuais registrados pelos testes: `scrollWidth` igual à largura da viewport em todos os tamanhos, quatro destinos no desktop e zero erro de console no fluxo simulado.

## Dependências, licenças e custo

- JavaScript, HTML, CSS e APIs nativas: sem custo.
- Supabase: infraestrutura gratuita já existente.
- Supabase JS: licença MIT.
- SheetJS CE 0.18.5: licença Apache-2.0; carregada somente para Excel, enquanto CSV funciona sem ela.
- Inter: licença SIL Open Font License.
- Microsoft Edge/Playwright são usados apenas nos testes locais e não fazem parte do produto implantado.

Nenhuma API paga, IA externa, Open Finance, SMS, e-mail pago, OCR ou servidor adicional foi adicionado.

## Implantação

1. Criar backup do banco e confirmar que a branch está atualizada.
2. Aplicar migrations por ordem de nome: fundação social, correção de interesses, correção de usernames e entitlement Hotmart conforme o ambiente.
3. Publicar os arquivos estáticos da branch.
4. Confirmar que o Service Worker ativo usa `norteia-v16`.
5. Entrar com uma conta de teste e validar Hoje, uma movimentação, uma parcela, Planos e Comunidade.
6. Testar um usuário privado A, um solicitante B e um administrador configurado em `community_admin_roles`.

## Rollback

- Código: reverter os commits da branch na ordem inversa e republicar o shell anterior.
- Banco: não remover tabelas com dados. Desativar a entrada da Comunidade e restaurar as policies anteriores a partir do backup.
- Storage: preservar buckets durante rollback para não perder arquivos; excluir somente após exportação e confirmação de que não existem referências.
- Estado financeiro: não exige conversão reversa; campos novos são opcionais e migrations do estado toleram dados antigos.

## Limitações operacionais

- O teste local não realizou cobrança real na Hotmart nem usou credenciais de produção do Supabase; esses dois smoke tests devem ser feitos no ambiente autorizado após a implantação.
- Abrir `.xlsx` pela primeira vez exige carregar a biblioteca gratuita; CSV continua disponível localmente e offline.
- O repositório continua com o nome técnico antigo para evitar quebra de URL, conforme autorizado no escopo.

## Checklist manual pós-implantação

- [ ] Login, Google OAuth, logout e restauração de sessão.
- [ ] Plano gratuito, modal Premium e atualização do entitlement.
- [ ] Criar, editar, duplicar, revisar e excluir movimentação.
- [ ] Compra parcelada aparecendo nos meses futuros e na fatura correta.
- [ ] Importar o mesmo CSV duas vezes e confirmar duplicados ignorados.
- [ ] Exportar e restaurar backup JSON.
- [ ] Iniciar e sair da demonstração, confirmando dados reais intactos.
- [ ] Criar Reset, meta, reserva e fechamento; exportar fechamento.
- [ ] Criar perfil social, avatar, post público/seguidores/privado e imagem com texto alternativo.
- [ ] Solicitar/aceitar follow, apoiar, comentar, salvar, republicar, ocultar, silenciar e bloquear.
- [ ] Moderar denúncia com conta presente em `community_admin_roles`.
- [ ] Instalar PWA, abrir offline e registrar uma alteração local.
- [ ] Conferir console sem erros em mobile e desktop.
