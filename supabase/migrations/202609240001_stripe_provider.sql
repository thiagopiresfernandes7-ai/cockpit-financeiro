-- Permite registrar avisos da Stripe no log idempotente de pagamentos.
-- Depende de hotmart_entitlements.sql (payment_events) e de 202609230001 (user_subscriptions).
alter table public.payment_events drop constraint if exists payment_events_provider_check;
alter table public.payment_events
  add constraint payment_events_provider_check
  check (provider in ('hotmart','stripe','google_play','app_store','manual'));

-- Busca rápida da assinatura pelo id da Stripe (avisos customer.subscription.*).
create index if not exists user_subscriptions_provider_subscription_idx
  on public.user_subscriptions (provider, provider_subscription_id);
