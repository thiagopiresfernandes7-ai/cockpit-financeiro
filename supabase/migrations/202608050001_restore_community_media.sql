create table if not exists public.community_post_media(
 id uuid primary key default gen_random_uuid(),
 post_id uuid not null references public.community_posts(id) on delete cascade,
 owner_id uuid not null references auth.users(id) on delete cascade,
 storage_path text not null unique,
 alt_text text not null check(length(alt_text) between 1 and 300),
 width int check(width>0), height int check(height>0),
 sort_order int not null default 0, created_at timestamptz not null default now()
);
alter table public.community_post_media enable row level security;
grant select,insert,update,delete on public.community_post_media to authenticated;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('community-media','community-media',false,5242880,array['image/jpeg','image/png','image/webp'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

do $$ begin
 create policy community_media_read on public.community_post_media for select to authenticated
 using(exists(select 1 from public.community_posts p where p.id=post_id and p.deleted_at is null)
   and not exists(select 1 from public.community_blocks b where (b.blocker_id=auth.uid() and b.blocked_id=owner_id) or (b.blocker_id=owner_id and b.blocked_id=auth.uid())));
exception when duplicate_object then null; end $$;
do $$ begin
 create policy community_media_insert on public.community_post_media for insert to authenticated
 with check(owner_id=auth.uid() and exists(select 1 from public.community_posts p where p.id=post_id and p.owner_id=auth.uid() and p.deleted_at is null));
exception when duplicate_object then null; end $$;
do $$ begin
 create policy community_media_update on public.community_post_media for update to authenticated
 using(owner_id=auth.uid()) with check(owner_id=auth.uid());
exception when duplicate_object then null; end $$;
do $$ begin
 create policy community_media_delete on public.community_post_media for delete to authenticated using(owner_id=auth.uid());
exception when duplicate_object then null; end $$;

do $$ begin
 create policy community_storage_insert on storage.objects for insert to authenticated
 with check(bucket_id='community-media' and (storage.foldername(name))[1]=auth.uid()::text);
exception when duplicate_object then null; end $$;
do $$ begin
 create policy community_storage_read on storage.objects for select to authenticated
 using(bucket_id='community-media' and exists(select 1 from public.community_post_media m where m.storage_path=name));
exception when duplicate_object then null; end $$;
do $$ begin
 create policy community_storage_update on storage.objects for update to authenticated
 using(bucket_id='community-media' and owner_id=auth.uid()::text)
 with check(bucket_id='community-media' and owner_id=auth.uid()::text);
exception when duplicate_object then null; end $$;
do $$ begin
 create policy community_storage_delete on storage.objects for delete to authenticated
 using(bucket_id='community-media' and owner_id=auth.uid()::text);
exception when duplicate_object then null; end $$;
