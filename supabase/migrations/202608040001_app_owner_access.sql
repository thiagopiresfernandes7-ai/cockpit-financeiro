create table if not exists public.app_owner_roles(
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check(role in ('owner','developer')),
  created_at timestamptz not null default now()
);

alter table public.app_owner_roles enable row level security;
revoke all on table public.app_owner_roles from public, anon, authenticated;

create or replace function public.app_is_owner()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null and exists(
    select 1 from public.app_owner_roles
    where user_id = (select auth.uid()) and role in ('owner','developer')
  );
$$;

revoke all on function public.app_is_owner() from public, anon;
grant execute on function public.app_is_owner() to authenticated;

insert into public.app_owner_roles(user_id,role)
select id,'owner' from auth.users where lower(email)='thiagopiresfernandes7@gmail.com'
on conflict(user_id) do update set role=excluded.role;
