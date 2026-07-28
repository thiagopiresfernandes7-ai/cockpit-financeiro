# Freemium do Norteia

## Implementado

- `subscription` compatível com estados antigos, usando plano gratuito como padrão.
- Funções centrais `hasPremiumAccess`, `canUseFeature` e `requirePremium`.
- Plano gratuito não é bloqueado por falha de pagamento ou verificação.
- Limites gratuitos preservam dados existentes e bloqueiam apenas novas inclusões.
- Modal Premium com a oferta web atual: 7 dias grátis e depois R$ 19,90 por ano.
- Plano e status aparecem em Configurações.
- Hotmart é apenas o provedor web; o direito Premium pertence à conta Norteia.

## Limites gratuitos

3 investimentos, 1 dívida, 5 orçamentos e 3 favoritos rápidos. Editar, visualizar ou excluir dados antigos continua permitido depois do vencimento.

## O que falta

Ativar a infraestrutura segura do webhook e testar com eventos reais da Hotmart antes de conceder Premium automaticamente em produção.

## Riscos

Nunca confiar na URL de sucesso do checkout. Nunca editar `subscription` no frontend como prova de pagamento. O servidor é a fonte de verdade.
