# Webhook Hotmart

## Fonte de verdade

O Premium só deve mudar após um evento autenticado. A Hotmart envia o Hottok no cabeçalho `X-HOTMART-HOTTOK`; o segredo deve existir apenas nos secrets da Edge Function.

## Preparação

1. Aplicar `supabase/migrations/hotmart_entitlements.sql`.
2. Configurar o secret `HOTMART_HOTTOK` no Supabase.
3. Implantar `supabase/functions/hotmart-webhook/index.ts` como endpoint público sem verificação JWT, pois a Hotmart não envia JWT do Supabase. A função realiza sua própria autenticação pelo Hottok.
4. Na Hotmart, abrir Ferramentas > Webhook e informar a URL `https://<project-ref>.supabase.co/functions/v1/hotmart-webhook`.
5. Selecionar compra aprovada, ativação/renovação, atraso, cancelamento, reembolso, chargeback e expiração.
6. Usar o teste do painel Hotmart e conferir os logs.

## Segurança e privacidade

- A chave administrativa e o Hottok ficam somente no ambiente seguro.
- O payload integral não é armazenado; apenas hash e metadados mínimos.
- Eventos são idempotentes por `provider_event_id`.
- O e-mail é normalizado e só libera a conta de mesmo e-mail.
- Compra sem conta entra em `pending_entitlements`.
- E-mail diferente nunca é vinculado automaticamente.

## Tratamento

Eventos ativos liberam Premium; atraso vira `past_due`; cancelamento e reembolso viram `cancelled`; expiração vira `expired`. Antes de produção, validar os nomes exatos dos eventos enviados pelo produto no simulador da Hotmart.
