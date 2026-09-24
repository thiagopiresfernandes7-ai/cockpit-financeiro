-- Assinaturas gravadas somente pelo servidor (webhook Hotmart).
-- Antes, o webhook escrevia em finance_states.data.subscription, um registro que o próprio
-- navegador sobrescreve a cada salvamento: o usuário podia se conceder Premium e o
-- salvamento automático podia apagar uma compra real confirmada pelo webhook.

create table if not exists public.user_subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  plan text not null default 'premium' check (plan in ('free','premium')),
  status text not null check (status in ('inactive','active','trialing','past_due','cancelled','expired','refunded','chargeback')),
  provider text not null default 'hotmart',
  provider_subscription_id text not null default '',
  started_at timestamptz,
  expires_at timestamptz,
  renewed_at timestamptz,
  cancelled_at timestamptz,
  last_event_type text not null default '',
  last_webhook_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.user_subscriptions enable row level security;
revoke all on table public.user_subscriptions from public, anon, authenticated;

comment on table public.user_subscriptions is
  'Server-managed subscription state. Written only by the payment webhook; read by clients through app_current_subscription().';

-- Compras feitas antes de a conta existir guardam também a validade.
alter table public.pending_entitlements add column if not exists expires_at timestamptz;

-- Busca direta por e-mail para o webhook (substitui a varredura de auth.admin.listUsers).
create or replace function public.app_user_id_by_email(p_email text)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select u.id
  from auth.users u
  where lower(u.email) = lower(trim(p_email))
    and u.deleted_at is null
  order by u.created_at
  limit 1;
$$;

revoke all on function public.app_user_id_by_email(text) from public, anon, authenticated;
grant execute on function public.app_user_id_by_email(text) to service_role;

-- Leitura da assinatura do próprio usuário. Na primeira chamada, vincula uma compra
-- pendente feita com o mesmo e-mail, desde que o e-mail da conta esteja confirmado.
create or replace function public.app_current_subscription()
returns table (
  has_access boolean,
  status text,
  provider text,
  provider_subscription_id text,
  started_at timestamptz,
  expires_at timestamptz,
  renewed_at timestamptz,
  last_webhook_at timestamptz
)
language plpgsql
volatile
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  uid uuid := auth.uid();
  user_email text;
  pending record;
begin
  if uid is null then
    return;
  end if;

  if not exists (select 1 from public.user_subscriptions s where s.user_id = uid) then
    select lower(u.email) into user_email
    from auth.users u
    where u.id = uid and u.email_confirmed_at is not null and u.deleted_at is null;

    if user_email is not null then
      select p.* into pending
      from public.pending_entitlements p
      where p.provider = 'hotmart' and p.buyer_email = user_email
      order by p.updated_at desc
      limit 1;

      if found then
        insert into public.user_subscriptions as s
          (user_id, status, provider, provider_subscription_id, started_at, expires_at, last_event_type, last_webhook_at, updated_at)
        values
          (uid, pending.status, pending.provider, pending.provider_subscription_id,
           case when pending.status in ('active','trialing') then pending.updated_at end,
           pending.expires_at, pending.event_type, pending.updated_at, now())
        on conflict (user_id) do nothing;

        delete from public.pending_entitlements p where p.id = pending.id;
      end if;
    end if;
  end if;

  return query
  select
    s.plan = 'premium' and (
      (s.status in ('active','trialing') and (s.expires_at is null or s.expires_at > now()))
      or (s.status = 'cancelled' and s.expires_at is not null and s.expires_at > now())
    ),
    s.status,
    s.provider,
    s.provider_subscription_id,
    s.started_at,
    s.expires_at,
    s.renewed_at,
    s.last_webhook_at
  from public.user_subscriptions s
  where s.user_id = uid;
end;
$$;

revoke all on function public.app_current_subscription() from public, anon;
grant execute on function public.app_current_subscription() to authenticated;

-- Migra compras já registradas a partir do log autêntico do webhook (payment_events),
-- nunca a partir de finance_states, que o cliente pode editar. O log não guarda a validade:
-- compras ativas recebem 1 ano (plano anual) a partir do último evento; as demais ficam sem acesso.
insert into public.user_subscriptions
  (user_id, status, provider, provider_subscription_id, started_at, expires_at, last_event_type, last_webhook_at, updated_at)
select
  u.id,
  e.status,
  'hotmart',
  e.subscription_id,
  case when e.status in ('active','trialing') then e.received_at end,
  case when e.status in ('active','trialing') then e.received_at + interval '1 year' else e.received_at end,
  e.event_type,
  e.received_at,
  now()
from (
  select distinct on (pe.buyer_email) pe.*
  from public.payment_events pe
  where pe.provider = 'hotmart'
    and pe.status in ('inactive','active','trialing','past_due','cancelled','expired','refunded','chargeback')
  order by pe.buyer_email, pe.received_at desc
) e
join auth.users u on lower(u.email) = e.buyer_email and u.deleted_at is null
on conflict (user_id) do nothing;
