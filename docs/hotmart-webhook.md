# Webhook Hotmart

## Fonte de verdade

O Premium só deve mudar após um evento autenticado. A Hotmart envia o Hottok no cabeçalho `X-HOTMART-HOTTOK`; o segredo deve existir apenas nos secrets da Edge Function.

A assinatura fica em `public.user_subscriptions`, que só o servidor grava. O cliente lê pela RPC `app_current_subscription()` e guarda uma cópia em `state.subscription` apenas para uso offline. O webhook não escreve mais em `finance_states`: esse registro é sobrescrito pelo navegador a cada salvamento, o que permitia ao usuário se conceder Premium e fazia o salvamento automático apagar compras confirmadas.

## Preparação

1. Aplicar `supabase/migrations/hotmart_entitlements.sql`.
2. Aplicar `supabase/migrations/202609230001_server_subscriptions.sql` **antes** de implantar a nova versão da função.
3. Configurar o secret `HOTMART_HOTTOK` no Supabase.
4. Implantar `supabase/functions/hotmart-webhook/index.ts` como endpoint público sem verificação JWT, pois a Hotmart não envia JWT do Supabase. A função realiza sua própria autenticação pelo Hottok.
5. Na Hotmart, abrir Ferramentas > Webhook e informar a URL `https://<project-ref>.supabase.co/functions/v1/hotmart-webhook`.
6. Selecionar compra aprovada, ativação/renovação, atraso, cancelamento, reembolso, chargeback e expiração.
7. Usar o teste do painel Hotmart e conferir os logs.
8. Conferir a definição atual de `claim_my_entitlement` no banco. O cliente só a usa se `app_current_subscription` não existir; depois da migração ela pode ser removida se nada mais depender dela.

## Segurança e privacidade

- A chave administrativa e o Hottok ficam somente no ambiente seguro.
- O payload integral não é armazenado; apenas hash e metadados mínimos.
- Eventos são idempotentes por `provider_event_id` e só são registrados depois de aplicados; se algo falhar, o reenvio da Hotmart é processado.
- O e-mail é normalizado e só libera a conta de mesmo e-mail.
- Compra sem conta entra em `pending_entitlements` e é vinculada na primeira consulta da conta com o mesmo e-mail **confirmado**.
- E-mail diferente nunca é vinculado automaticamente.

## Tratamento

| Evento | Status | Validade (`expires_at`) |
| --- | --- | --- |
| Compra aprovada, ativação, renovação | `active` | `date_next_charge`; sem ela, aprovação + 1 ano |
| Boleto impresso, atraso | `past_due` | mantém a anterior (sem acesso) |
| Cancelamento da assinatura | `cancelled` | mantém a anterior: acesso até o fim do período pago |
| Compra cancelada | `cancelled` | agora |
| Reembolso | `refunded` | agora |
| Chargeback | `chargeback` | agora |
| Expiração | `expired` | agora |

Antes de produção, validar os nomes exatos dos eventos e o formato das datas enviados pelo produto no simulador da Hotmart.
