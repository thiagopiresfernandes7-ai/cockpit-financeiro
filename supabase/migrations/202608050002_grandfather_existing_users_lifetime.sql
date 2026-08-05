-- Preserva permanentemente o Premium das contas existentes nesta data.
-- Novos cadastros continuam sujeitos ao entitlement comercial normal.
create table if not exists public.lifetime_premium_entitlements (
  user_id uuid primary key references auth.users(id) on delete cascade,
  reason text not null check (reason in ('grandfathered','owner','manual')),
  granted_at timestamptz not null default now()
);

alter table public.lifetime_premium_entitlements enable row level security;
revoke all on table public.lifetime_premium_entitlements from public, anon, authenticated;

comment on table public.lifetime_premium_entitlements is
  'Server-managed, non-expiring Premium access. Never writable from the public client.';

insert into public.lifetime_premium_entitlements(user_id, reason)
select id,
       case when lower(email) = 'thiagopiresfernandes7@gmail.com' then 'owner' else 'grandfathered' end
from auth.users
where deleted_at is null
on conflict (user_id) do nothing;

create or replace function public.app_has_lifetime_premium()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null and exists (
    select 1 from public.lifetime_premium_entitlements
    where user_id = (select auth.uid())
  );
$$;

revoke all on function public.app_has_lifetime_premium() from public, anon;
grant execute on function public.app_has_lifetime_premium() to authenticated;

create or replace function public.app_is_owner()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null and (
    exists (
      select 1 from public.app_owner_roles
      where user_id = (select auth.uid()) and role in ('owner','developer')
    )
    or exists (
      select 1 from auth.users
      where id = (select auth.uid())
        and lower(email) = 'thiagopiresfernandes7@gmail.com'
        and deleted_at is null
    )
  );
$$;

revoke all on function public.app_is_owner() from public, anon;
grant execute on function public.app_is_owner() to authenticated;
