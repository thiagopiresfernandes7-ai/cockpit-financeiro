create or replace function public.community_delete_own_post(target_post_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  affected integer;
begin
  if (select auth.uid()) is null then return false; end if;
  update public.community_posts
     set deleted_at = now(), updated_at = now()
   where id = target_post_id
     and author_id = (select auth.uid())
     and deleted_at is null;
  get diagnostics affected = row_count;
  return affected = 1;
end;
$$;

revoke all on function public.community_delete_own_post(uuid) from public, anon;
grant execute on function public.community_delete_own_post(uuid) to authenticated;
