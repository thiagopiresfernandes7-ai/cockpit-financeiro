create table if not exists public.payment_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null check (provider in ('hotmart','google_play','app_store','manual')),
  event_type text not null,
  provider_event_id text not null,
  buyer_email text not null,
  subscription_id text not null default '',
  status text not null,
  received_at timestamptz not null default now(),
  raw_payload_hash text not null,
  unique(provider,provider_event_id)
);
alter table public.payment_events enable row level security;
revoke all on public.payment_events from anon, authenticated;

create table if not exists public.pending_entitlements (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  buyer_email text not null,
  provider_subscription_id text not null default '',
  status text not null,
  event_type text not null,
  updated_at timestamptz not null default now(),
  unique(provider,buyer_email)
);
alter table public.pending_entitlements enable row level security;
revoke all on public.pending_entitlements from anon, authenticated;

comment on table public.payment_events is 'Minimal idempotency log for payment webhooks; raw payloads are not stored.';
comment on table public.pending_entitlements is 'Purchases waiting for an account with the same normalized email.';
