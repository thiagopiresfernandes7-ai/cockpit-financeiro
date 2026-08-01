create extension if not exists pg_trgm;
create schema if not exists private;

create table if not exists public.community_admin_roles(user_id uuid primary key references auth.users(id) on delete cascade,role text not null check(role in('moderator','admin')),created_at timestamptz not null default now());
create table if not exists public.community_profiles(user_id uuid primary key references auth.users(id) on delete cascade,username text not null unique check(username~'^[a-z0-9_.]{3,24}$'),display_name text not null check(length(display_name) between 1 and 80),bio text not null default '' check(length(bio)<=240),avatar_url text,privacy text not null default 'public' check(privacy in('public','private')),specialist_verified boolean not null default false,is_admin boolean not null default false,status text not null default 'active' check(status in('active','limited','suspended','banned')),created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table if not exists public.community_categories(slug text primary key,label text not null unique,active boolean not null default true,sort_order int not null default 0);
create table if not exists public.community_interests(slug text primary key,label text not null unique,active boolean not null default true,sort_order int not null default 0);
create table if not exists public.community_user_interests(user_id uuid references auth.users(id) on delete cascade,interest_slug text references public.community_interests(slug) on delete cascade,created_at timestamptz not null default now(),primary key(user_id,interest_slug));
create table if not exists public.community_follows(follower_id uuid references auth.users(id) on delete cascade,following_id uuid references auth.users(id) on delete cascade,status text not null default 'accepted' check(status in('pending','accepted')),created_at timestamptz not null default now(),updated_at timestamptz not null default now(),primary key(follower_id,following_id),check(follower_id<>following_id));
create table if not exists public.community_blocks(blocker_id uuid references auth.users(id) on delete cascade,blocked_id uuid references auth.users(id) on delete cascade,created_at timestamptz not null default now(),primary key(blocker_id,blocked_id),check(blocker_id<>blocked_id));
create table if not exists public.community_posts(id uuid primary key default gen_random_uuid(),author_id uuid not null references public.community_profiles(user_id) on delete cascade,category_slug text references public.community_categories(label),text text not null check(length(text) between 1 and 1000),visibility text not null default 'public' check(visibility in('public','followers','private')),image_url text,achievement_snapshot jsonb,like_count int not null default 0 check(like_count>=0),comment_count int not null default 0 check(comment_count>=0),save_count int not null default 0 check(save_count>=0),repost_count int not null default 0 check(repost_count>=0),created_at timestamptz not null default now(),updated_at timestamptz not null default now(),archived_at timestamptz,deleted_at timestamptz);
create table if not exists public.community_post_media(id uuid primary key default gen_random_uuid(),post_id uuid not null references public.community_posts(id) on delete cascade,owner_id uuid not null references auth.users(id) on delete cascade,storage_path text not null unique,alt_text text not null check(length(alt_text) between 1 and 300),width int check(width>0),height int check(height>0),sort_order int not null default 0,created_at timestamptz not null default now());
create table if not exists public.community_comments(id uuid primary key default gen_random_uuid(),post_id uuid not null references public.community_posts(id) on delete cascade,author_id uuid not null references public.community_profiles(user_id) on delete cascade,parent_id uuid references public.community_comments(id) on delete cascade,body text not null check(length(body) between 1 and 500),like_count int not null default 0 check(like_count>=0),created_at timestamptz not null default now(),updated_at timestamptz not null default now(),deleted_at timestamptz);
create table if not exists public.community_post_likes(post_id uuid references public.community_posts(id) on delete cascade,user_id uuid references auth.users(id) on delete cascade,created_at timestamptz not null default now(),primary key(post_id,user_id));
create table if not exists public.community_comment_likes(comment_id uuid references public.community_comments(id) on delete cascade,user_id uuid references auth.users(id) on delete cascade,created_at timestamptz not null default now(),primary key(comment_id,user_id));
create table if not exists public.community_saved_posts(post_id uuid references public.community_posts(id) on delete cascade,user_id uuid references auth.users(id) on delete cascade,created_at timestamptz not null default now(),primary key(post_id,user_id));
create table if not exists public.community_reposts(id uuid primary key default gen_random_uuid(),post_id uuid not null references public.community_posts(id) on delete cascade,user_id uuid not null references public.community_profiles(user_id) on delete cascade,comment text check(length(comment)<=1000),created_at timestamptz not null default now(),unique(post_id,user_id));
create table if not exists public.community_notifications(id uuid primary key default gen_random_uuid(),recipient_id uuid not null references auth.users(id) on delete cascade,actor_id uuid references auth.users(id) on delete cascade,type text not null,dedupe_key text,post_id uuid references public.community_posts(id) on delete cascade,comment_id uuid references public.community_comments(id) on delete cascade,read_at timestamptz,created_at timestamptz not null default now(),unique(recipient_id,dedupe_key));
create table if not exists public.community_mutes(user_id uuid references auth.users(id) on delete cascade,muted_user_id uuid references auth.users(id) on delete cascade,post_id uuid references public.community_posts(id) on delete cascade,comment_id uuid references public.community_comments(id) on delete cascade,created_at timestamptz not null default now(),check((muted_user_id is not null)::int+(post_id is not null)::int+(comment_id is not null)::int=1),unique nulls not distinct(user_id,muted_user_id,post_id,comment_id));
create table if not exists public.community_hidden_posts(user_id uuid references auth.users(id) on delete cascade,post_id uuid references public.community_posts(id) on delete cascade,created_at timestamptz not null default now(),primary key(user_id,post_id));
create table if not exists public.community_reports(id uuid primary key default gen_random_uuid(),reporter_id uuid not null references auth.users(id) on delete cascade,target_type text not null check(target_type in('post','comment','user')),post_id uuid references public.community_posts(id),comment_id uuid references public.community_comments(id),user_id uuid references auth.users(id),reason text not null check(length(reason) between 2 and 80),details text check(length(details)<=1000),status text not null default 'pending' check(status in('pending','reviewing','resolved','dismissed')),moderator_id uuid references auth.users(id),decision text,decided_at timestamptz,created_at timestamptz not null default now(),check((post_id is not null)::int+(comment_id is not null)::int+(user_id is not null)::int=1));
create table if not exists public.community_moderation_actions(id uuid primary key default gen_random_uuid(),admin_id uuid not null references auth.users(id),report_id uuid references public.community_reports(id),action text not null check(action in('hide','restore','warn','limit','suspend','ban','dismiss')),details text,created_at timestamptz not null default now());
create table if not exists public.community_audit_logs(id bigint generated always as identity primary key,actor_id uuid references auth.users(id),action text not null,target_type text,target_id text,metadata jsonb not null default '{}',created_at timestamptz not null default now());
create table if not exists public.community_topics(slug text primary key,label text not null unique,active boolean not null default true,sort_order int not null default 0);
create table if not exists public.community_post_topics(post_id uuid references public.community_posts(id) on delete cascade,topic_slug text references public.community_topics(slug) on delete cascade,primary key(post_id,topic_slug));
create table if not exists public.community_challenges(id uuid primary key default gen_random_uuid(),slug text not null unique,title text not null,description text not null,metric text not null,target int not null check(target>0),active boolean not null default true,created_at timestamptz not null default now());
create table if not exists public.community_challenge_progress(challenge_id uuid references public.community_challenges(id) on delete cascade,user_id uuid references auth.users(id) on delete cascade,progress int not null default 0 check(progress>=0),completed_at timestamptz,updated_at timestamptz not null default now(),primary key(challenge_id,user_id));
create table if not exists public.community_user_settings(user_id uuid primary key references auth.users(id) on delete cascade,notify_follow boolean not null default true,notify_reaction boolean not null default true,notify_comment boolean not null default true,notify_mention boolean not null default true,updated_at timestamptz not null default now());
create table if not exists public.community_specialist_requests(id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,professional_type text not null,justification text not null check(length(justification)<=1000),status text not null default 'pending' check(status in('pending','approved','refused')),review_note text,created_at timestamptz not null default now(),reviewed_at timestamptz);
create table if not exists public.community_hashtags(id bigint generated always as identity primary key,tag text not null unique check(tag~'^[[:alnum:]_]{1,60}$'),created_at timestamptz not null default now());
create table if not exists public.community_post_hashtags(post_id uuid references public.community_posts(id) on delete cascade,hashtag_id bigint references public.community_hashtags(id) on delete cascade,primary key(post_id,hashtag_id));
create table if not exists public.community_mentions(id uuid primary key default gen_random_uuid(),post_id uuid references public.community_posts(id) on delete cascade,comment_id uuid references public.community_comments(id) on delete cascade,mentioned_user_id uuid not null references auth.users(id) on delete cascade,created_at timestamptz not null default now(),check((post_id is not null)::int+(comment_id is not null)::int=1));
create table if not exists public.community_report_reasons(slug text primary key,label text not null unique,active boolean not null default true,sort_order int not null default 0);
create table if not exists public.community_rules(slug text primary key,title text not null,description text not null,active boolean not null default true,sort_order int not null default 0);
alter table public.community_posts add column if not exists archived_at timestamptz;

insert into public.community_categories(slug,label,sort_order) values ('aprendi','Aprendi',1),('duvida','Dúvida',2),('organizacao','Organização financeira',3),('dividas','Dívidas',4),('meta','Meta',5),('conquista','Conquista',6),('opiniao','Opinião',7) on conflict do nothing;
insert into public.community_interests(slug,label,sort_order) values ('organizar-minhas-financas','Organizar minhas finanças',1),('sair-das-dividas','Sair das dívidas',2),('criar-uma-reserva','Criar uma reserva',3),('comecar-a-investir','Começar a investir',4),('compartilhar-conhecimento','Compartilhar conhecimento',5) on conflict do nothing;
insert into public.community_report_reasons(slug,label,sort_order) values ('spam','Spam',1),('golpe','Golpe',2),('fraude','Fraude',3),('pix','Pedido de Pix',4),('rendimento_garantido','Promessa de rendimento',5),('assedio','Assédio',6),('odio','Ódio',7),('sexual','Conteúdo sexual',8),('dados_pessoais','Dados pessoais',9),('perigoso','Informação perigosa',10),('falsidade','Falsidade',11),('outro','Outro',12) on conflict do nothing;
insert into public.community_rules(slug,title,description,sort_order) values ('no-money','Não envie dinheiro','Não envie Pix nem dados bancários a pessoas da comunidade.',1),('no-passwords','Proteja sua conta','Nunca compartilhe senha ou código de acesso.',2),('no-guarantees','Desconfie de promessas','Lucro garantido não existe. Denuncie promessas de rendimento.',3),('education','Conteúdo educativo','Publicações não representam recomendação oficial do Norteia.',4) on conflict do nothing;
insert into public.community_challenges(slug,title,description,metric,target) values ('sete-dias-registro','7 dias registrando gastos','Registre ou revise seus gastos por sete dias.','controlled_days',7),('revisar-assinaturas','Revisar assinaturas','Revise suas cobranças recorrentes.','subscriptions_reviewed',1),('mes-sem-atraso','Mês sem atraso','Conclua o mês sem conta atrasada.','months_without_delay',1),('fechamento-mensal','Fazer o fechamento','Conclua o fechamento do mês.','monthly_closings',1) on conflict do nothing;

create index if not exists community_posts_feed_idx on public.community_posts(created_at desc) where deleted_at is null;
create index if not exists community_posts_author_idx on public.community_posts(author_id,created_at desc);
create index if not exists community_posts_search_idx on public.community_posts using gin(text gin_trgm_ops);
create index if not exists community_comments_post_idx on public.community_comments(post_id,created_at,id);
create index if not exists community_follows_following_idx on public.community_follows(following_id,status,created_at desc);
create index if not exists community_notifications_unread_idx on public.community_notifications(recipient_id,created_at desc) where read_at is null;
create index if not exists community_reports_queue_idx on public.community_reports(status,created_at);

create or replace function public.community_is_admin() returns boolean language sql stable security definer set search_path='' as $$select exists(select 1 from public.community_admin_roles where user_id=(select auth.uid()) and role in('moderator','admin'))$$;
revoke all on function public.community_is_admin() from public,anon;grant execute on function public.community_is_admin() to authenticated;
create or replace function public.community_is_blocked(other_user uuid) returns boolean language sql stable security definer set search_path='' as $$select exists(select 1 from public.community_blocks where (blocker_id=(select auth.uid()) and blocked_id=other_user) or (blocker_id=other_user and blocked_id=(select auth.uid())))$$;
revoke all on function public.community_is_blocked(uuid) from public,anon;grant execute on function public.community_is_blocked(uuid) to authenticated;
create or replace function public.community_can_view_post(target public.community_posts) returns boolean language sql stable security definer set search_path='' as $$select target.deleted_at is null and (target.archived_at is null or target.author_id=(select auth.uid())) and not public.community_is_blocked(target.author_id) and not exists(select 1 from public.community_hidden_posts where user_id=(select auth.uid()) and post_id=target.id) and not exists(select 1 from public.community_mutes where user_id=(select auth.uid()) and muted_user_id=target.author_id) and (target.author_id=(select auth.uid()) or target.visibility='public' or (target.visibility='followers' and exists(select 1 from public.community_follows where follower_id=(select auth.uid()) and following_id=target.author_id and status='accepted')))$$;
revoke all on function public.community_can_view_post(public.community_posts) from public,anon;grant execute on function public.community_can_view_post(public.community_posts) to authenticated;

do $$declare t text;begin foreach t in array array['community_admin_roles','community_profiles','community_categories','community_interests','community_user_interests','community_follows','community_blocks','community_posts','community_post_media','community_comments','community_post_likes','community_comment_likes','community_saved_posts','community_reposts','community_notifications','community_mutes','community_hidden_posts','community_reports','community_moderation_actions','community_audit_logs','community_topics','community_post_topics','community_challenges','community_challenge_progress','community_user_settings','community_specialist_requests','community_hashtags','community_post_hashtags','community_mentions','community_report_reasons','community_rules'] loop execute format('alter table public.%I enable row level security',t);end loop;end$$;

create policy "catalog read" on public.community_categories for select using(active or public.community_is_admin());
create policy "interests read" on public.community_interests for select using(active or public.community_is_admin());
create policy "topics read" on public.community_topics for select using(active or public.community_is_admin());
create policy "challenges read" on public.community_challenges for select using(active or public.community_is_admin());
create policy "report reasons read" on public.community_report_reasons for select using(active or public.community_is_admin());
create policy "rules read" on public.community_rules for select using(active or public.community_is_admin());
create policy "profiles view" on public.community_profiles for select using(status='active' and (privacy='public' or user_id=(select auth.uid()) or exists(select 1 from public.community_follows where follower_id=(select auth.uid()) and following_id=user_id and status='accepted')) and not public.community_is_blocked(user_id) or public.community_is_admin());
create policy "profiles create own" on public.community_profiles for insert to authenticated with check(user_id=(select auth.uid()) and is_admin=false and specialist_verified=false and status='active');
create policy "profiles update own or admin" on public.community_profiles for update to authenticated using(user_id=(select auth.uid()) or public.community_is_admin()) with check((user_id=(select auth.uid()) and is_admin=false) or public.community_is_admin());
create policy "posts view permitted" on public.community_posts for select to authenticated using(public.community_can_view_post(community_posts));
create policy "posts own insert" on public.community_posts for insert to authenticated with check(author_id=(select auth.uid()) and not public.community_is_blocked(author_id));
create policy "posts own update" on public.community_posts for update to authenticated using(author_id=(select auth.uid()) or public.community_is_admin()) with check(author_id=(select auth.uid()) or public.community_is_admin());
create policy "posts own delete" on public.community_posts for delete to authenticated using(author_id=(select auth.uid()) or public.community_is_admin());
create policy "comments view with post" on public.community_comments for select to authenticated using(deleted_at is null and exists(select 1 from public.community_posts p where p.id=post_id and public.community_can_view_post(p)));
create policy "comments create permitted" on public.community_comments for insert to authenticated with check(author_id=(select auth.uid()) and exists(select 1 from public.community_posts p where p.id=post_id and public.community_can_view_post(p)) and (parent_id is null or exists(select 1 from public.community_comments parent where parent.id=parent_id and parent.post_id=post_id and parent.parent_id is null)));
create policy "comments own update" on public.community_comments for update to authenticated using(author_id=(select auth.uid()) or public.community_is_admin()) with check(author_id=(select auth.uid()) or public.community_is_admin());
create policy "follows view involved" on public.community_follows for select to authenticated using(follower_id=(select auth.uid()) or following_id=(select auth.uid()) or status='accepted');
create policy "follows create own" on public.community_follows for insert to authenticated with check(follower_id=(select auth.uid()) and not public.community_is_blocked(following_id));
create policy "follows recipient update" on public.community_follows for update to authenticated using(following_id=(select auth.uid())) with check(following_id=(select auth.uid()));
create policy "follows delete involved" on public.community_follows for delete to authenticated using(follower_id=(select auth.uid()) or following_id=(select auth.uid()));
create policy "blocks own" on public.community_blocks for all to authenticated using(blocker_id=(select auth.uid())) with check(blocker_id=(select auth.uid()));
create policy "user interests own" on public.community_user_interests for all to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create policy "settings own" on public.community_user_settings for all to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create policy "challenge progress own" on public.community_challenge_progress for all to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create policy "saved own" on public.community_saved_posts for all to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create policy "mutes own" on public.community_mutes for all to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create policy "hidden own" on public.community_hidden_posts for all to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create policy "notifications recipient" on public.community_notifications for select to authenticated using(recipient_id=(select auth.uid()));
create policy "notifications update own" on public.community_notifications for update to authenticated using(recipient_id=(select auth.uid())) with check(recipient_id=(select auth.uid()));
create policy "reports create own" on public.community_reports for insert to authenticated with check(reporter_id=(select auth.uid()));
create policy "reports own or admin read" on public.community_reports for select to authenticated using(reporter_id=(select auth.uid()) or public.community_is_admin());
create policy "reports admin update" on public.community_reports for update to authenticated using(public.community_is_admin()) with check(public.community_is_admin());
create policy "moderation admin" on public.community_moderation_actions for all to authenticated using(public.community_is_admin()) with check(public.community_is_admin());
create policy "admin roles admin" on public.community_admin_roles for all to authenticated using(public.community_is_admin()) with check(public.community_is_admin());
create policy "audit admin read" on public.community_audit_logs for select to authenticated using(public.community_is_admin());
create policy "media view with post" on public.community_post_media for select to authenticated using(exists(select 1 from public.community_posts p where p.id=post_id and public.community_can_view_post(p)));
create policy "media owner write" on public.community_post_media for all to authenticated using(owner_id=(select auth.uid())) with check(owner_id=(select auth.uid()) and exists(select 1 from public.community_posts p where p.id=post_id and p.author_id=(select auth.uid())));
create policy "post likes view" on public.community_post_likes for select to authenticated using(exists(select 1 from public.community_posts p where p.id=post_id and public.community_can_view_post(p)));
create policy "post likes own write" on public.community_post_likes for insert to authenticated with check(user_id=(select auth.uid()) and exists(select 1 from public.community_posts p where p.id=post_id and public.community_can_view_post(p)));
create policy "post likes own delete" on public.community_post_likes for delete to authenticated using(user_id=(select auth.uid()));
create policy "comment likes view" on public.community_comment_likes for select to authenticated using(true);
create policy "comment likes own write" on public.community_comment_likes for insert to authenticated with check(user_id=(select auth.uid()));
create policy "comment likes own delete" on public.community_comment_likes for delete to authenticated using(user_id=(select auth.uid()));
create policy "reposts view" on public.community_reposts for select to authenticated using(exists(select 1 from public.community_posts p where p.id=post_id and public.community_can_view_post(p)));
create policy "reposts own" on public.community_reposts for all to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create policy "hashtags read" on public.community_hashtags for select to authenticated using(true);
create policy "hashtags insert" on public.community_hashtags for insert to authenticated with check(true);
create policy "post hashtags read" on public.community_post_hashtags for select to authenticated using(true);
create policy "post hashtags own" on public.community_post_hashtags for insert to authenticated with check(exists(select 1 from public.community_posts p where p.id=post_id and p.author_id=(select auth.uid())));
create policy "mentions involved" on public.community_mentions for select to authenticated using(mentioned_user_id=(select auth.uid()) or exists(select 1 from public.community_posts p where p.id=post_id and p.author_id=(select auth.uid())));
create policy "mentions author" on public.community_mentions for insert to authenticated with check(exists(select 1 from public.community_posts p where p.id=post_id and p.author_id=(select auth.uid())) or exists(select 1 from public.community_comments c where c.id=comment_id and c.author_id=(select auth.uid())));
create policy "specialist own or admin read" on public.community_specialist_requests for select to authenticated using(user_id=(select auth.uid()) or public.community_is_admin());
create policy "specialist create own" on public.community_specialist_requests for insert to authenticated with check(user_id=(select auth.uid()));
create policy "specialist admin update" on public.community_specialist_requests for update to authenticated using(public.community_is_admin()) with check(public.community_is_admin());

create or replace function private.community_sync_counter() returns trigger language plpgsql security definer set search_path='' as $$begin if tg_table_name='community_post_likes' then update public.community_posts set like_count=(select count(*) from public.community_post_likes where post_id=coalesce(new.post_id,old.post_id)) where id=coalesce(new.post_id,old.post_id);elsif tg_table_name='community_saved_posts' then update public.community_posts set save_count=(select count(*) from public.community_saved_posts where post_id=coalesce(new.post_id,old.post_id)) where id=coalesce(new.post_id,old.post_id);elsif tg_table_name='community_reposts' then update public.community_posts set repost_count=(select count(*) from public.community_reposts where post_id=coalesce(new.post_id,old.post_id)) where id=coalesce(new.post_id,old.post_id);elsif tg_table_name='community_comments' then update public.community_posts set comment_count=(select count(*) from public.community_comments where post_id=coalesce(new.post_id,old.post_id) and deleted_at is null) where id=coalesce(new.post_id,old.post_id);end if;return coalesce(new,old);end$$;
revoke all on function private.community_sync_counter() from public,anon,authenticated;
create trigger community_post_likes_counter after insert or delete on public.community_post_likes for each row execute function private.community_sync_counter();
create trigger community_saved_counter after insert or delete on public.community_saved_posts for each row execute function private.community_sync_counter();
create trigger community_reposts_counter after insert or delete on public.community_reposts for each row execute function private.community_sync_counter();
create trigger community_comments_counter after insert or update of deleted_at or delete on public.community_comments for each row execute function private.community_sync_counter();
create or replace function public.community_rate_limit() returns trigger language plpgsql security invoker set search_path='' as $$
declare
  amount int;
  action_limit int;
  window_start timestamptz;
begin
  if tg_table_name='community_reports' then
    action_limit=5;
    window_start=now()-interval '10 minutes';
  else
    action_limit=8;
    window_start=now()-interval '1 minute';
  end if;
  if tg_table_name='community_posts' then
    select count(*) into amount from public.community_posts where author_id=(select auth.uid()) and created_at>window_start;
  elsif tg_table_name='community_comments' then
    select count(*) into amount from public.community_comments where author_id=(select auth.uid()) and created_at>window_start;
  elsif tg_table_name='community_reports' then
    select count(*) into amount from public.community_reports where reporter_id=(select auth.uid()) and created_at>window_start;
  else
    return new;
  end if;
  if amount>=action_limit then
    raise exception 'Muitas ações em pouco tempo. Aguarde e tente novamente.' using errcode='P0001';
  end if;
  return new;
end$$;
revoke all on function public.community_rate_limit() from public,anon;grant execute on function public.community_rate_limit() to authenticated;
create trigger community_posts_rate before insert on public.community_posts for each row execute function public.community_rate_limit();
create trigger community_comments_rate before insert on public.community_comments for each row execute function public.community_rate_limit();
create trigger community_reports_rate before insert on public.community_reports for each row execute function public.community_rate_limit();

create or replace function public.community_social_rate_limit() returns trigger language plpgsql security invoker set search_path='' as $$
declare amount int;action_limit int;
begin
  if tg_table_name='community_post_likes' then action_limit=30;select count(*) into amount from public.community_post_likes where user_id=(select auth.uid()) and created_at>now()-interval '1 minute';
  elsif tg_table_name='community_follows' then action_limit=20;select count(*) into amount from public.community_follows where follower_id=(select auth.uid()) and created_at>now()-interval '10 minutes';
  elsif tg_table_name='community_reposts' then action_limit=20;select count(*) into amount from public.community_reposts where user_id=(select auth.uid()) and created_at>now()-interval '10 minutes';
  else return new;end if;
  if amount>=action_limit then raise exception 'Limite temporário atingido. Aguarde antes de tentar novamente.' using errcode='P0001';end if;
  return new;
end$$;
revoke all on function public.community_social_rate_limit() from public,anon;grant execute on function public.community_social_rate_limit() to authenticated;
create trigger community_support_rate before insert on public.community_post_likes for each row execute function public.community_social_rate_limit();
create trigger community_follow_rate before insert on public.community_follows for each row execute function public.community_social_rate_limit();
create trigger community_repost_rate before insert on public.community_reposts for each row execute function public.community_social_rate_limit();

create or replace function private.community_create_notification() returns trigger language plpgsql security definer set search_path='' as $$
declare
  recipient uuid;
  actor uuid;
  event_type text;
  target_post uuid;
  target_comment uuid;
begin
  if tg_table_name='community_follows' then
    if tg_op='UPDATE' then recipient=new.follower_id;actor=new.following_id;event_type='follow_accepted';else recipient=new.following_id;actor=new.follower_id;event_type=case when new.status='pending' then 'follow_request' else 'new_follower' end;end if;
  elsif tg_table_name='community_post_likes' then
    select author_id into recipient from public.community_posts where id=new.post_id;
    actor=new.user_id;event_type='support';target_post=new.post_id;
  elsif tg_table_name='community_comments' then
    if new.parent_id is not null then select author_id into recipient from public.community_comments where id=new.parent_id;event_type='reply';else select author_id into recipient from public.community_posts where id=new.post_id;event_type='comment';end if;
    actor=new.author_id;target_post=new.post_id;target_comment=new.id;
  elsif tg_table_name='community_reposts' then
    select author_id into recipient from public.community_posts where id=new.post_id;
    actor=new.user_id;event_type=case when new.comment is null then 'repost' else 'quote' end;target_post=new.post_id;
  elsif tg_table_name='community_mentions' then
    recipient=new.mentioned_user_id;actor=(select coalesce((select author_id from public.community_posts where id=new.post_id),(select author_id from public.community_comments where id=new.comment_id)));event_type='mention';target_post=new.post_id;target_comment=new.comment_id;
  end if;
  if recipient is null or actor is null or recipient=actor or exists(select 1 from public.community_blocks where (blocker_id=recipient and blocked_id=actor) or (blocker_id=actor and blocked_id=recipient)) then return new;end if;
  insert into public.community_notifications(recipient_id,actor_id,type,dedupe_key,post_id,comment_id)
  values(recipient,actor,event_type,tg_table_name||':'||coalesce(target_post::text,target_comment::text,actor::text)||':'||actor::text,target_post,target_comment)
  on conflict(recipient_id,dedupe_key) do nothing;
  return new;
end$$;
revoke all on function private.community_create_notification() from public,anon,authenticated;
create trigger community_follow_notify after insert on public.community_follows for each row execute function private.community_create_notification();
create trigger community_follow_accept_notify after update of status on public.community_follows for each row when (old.status is distinct from new.status and new.status='accepted') execute function private.community_create_notification();
create trigger community_support_notify after insert on public.community_post_likes for each row execute function private.community_create_notification();
create trigger community_comment_notify after insert on public.community_comments for each row execute function private.community_create_notification();
create trigger community_repost_notify after insert on public.community_reposts for each row execute function private.community_create_notification();
create trigger community_mention_notify after insert on public.community_mentions for each row execute function private.community_create_notification();

create or replace function private.community_follow_privacy() returns trigger language plpgsql security definer set search_path='' as $$
begin
  if new.follower_id<>(select auth.uid()) then raise exception 'Acompanhamento inválido' using errcode='42501';end if;
  if exists(select 1 from public.community_profiles where user_id=new.following_id and privacy='private') then new.status='pending';else new.status='accepted';end if;
  return new;
end$$;
revoke all on function private.community_follow_privacy() from public,anon,authenticated;
create trigger community_follow_privacy before insert on public.community_follows for each row execute function private.community_follow_privacy();

create or replace function private.community_normalize_moderation() returns trigger language plpgsql security invoker set search_path='' as $$
begin
  new.action=case upper(new.action) when 'REMOVER' then 'hide' when 'RESTAURAR' then 'restore' when 'ADVERTIR' then 'warn' when 'LIMITAR' then 'limit' when 'SUSPENDER' then 'suspend' when 'BANIR' then 'ban' when 'DESCARTAR' then 'dismiss' else lower(new.action) end;
  return new;
end$$;
revoke all on function private.community_normalize_moderation() from public,anon,authenticated;
create trigger community_moderation_normalize before insert or update of action on public.community_moderation_actions for each row execute function private.community_normalize_moderation();

create or replace function private.community_specialist_review() returns trigger language plpgsql security definer set search_path='' as $$
begin
  if new.status<>old.status and new.status in('approved','refused') then new.reviewed_at=now();end if;
  if new.status='approved' then update public.community_profiles set specialist_verified=true,updated_at=now() where user_id=new.user_id;
  elsif old.status='approved' and new.status<>'approved' then update public.community_profiles set specialist_verified=false,updated_at=now() where user_id=new.user_id;end if;
  return new;
end$$;
revoke all on function private.community_specialist_review() from public,anon,authenticated;
create trigger community_specialist_review before update of status on public.community_specialist_requests for each row execute function private.community_specialist_review();

create or replace function private.community_block_cleanup() returns trigger language plpgsql security definer set search_path='' as $$begin delete from public.community_follows where (follower_id=new.blocker_id and following_id=new.blocked_id) or (follower_id=new.blocked_id and following_id=new.blocker_id);return new;end$$;
revoke all on function private.community_block_cleanup() from public,anon,authenticated;
create trigger community_block_cleanup after insert on public.community_blocks for each row execute function private.community_block_cleanup();

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('community-media','community-media',false,5242880,array['image/jpeg','image/png','image/webp']) on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
create policy "community media permitted read" on storage.objects for select to authenticated using(
  bucket_id='community-media' and (
    owner_id=(select auth.uid())::text or
    (array_length(storage.foldername(name),1)>=3 and (storage.foldername(name))[2]~'^[0-9a-f-]{36}$' and exists(
      select 1 from public.community_posts p
      where p.id=((storage.foldername(name))[2])::uuid and public.community_can_view_post(p)
    ))
  )
);
create policy "community media own upload" on storage.objects for insert to authenticated with check(bucket_id='community-media' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy "community media own update" on storage.objects for update to authenticated using(bucket_id='community-media' and owner_id=(select auth.uid())::text) with check(bucket_id='community-media' and owner_id=(select auth.uid())::text);
create policy "community media own delete" on storage.objects for delete to authenticated using(bucket_id='community-media' and owner_id=(select auth.uid())::text);

grant select on public.community_categories,public.community_interests,public.community_topics,public.community_challenges,public.community_report_reasons,public.community_rules to authenticated;
grant select,insert,update,delete on public.community_profiles,public.community_user_interests,public.community_follows,public.community_blocks,public.community_posts,public.community_post_media,public.community_comments,public.community_post_likes,public.community_comment_likes,public.community_saved_posts,public.community_reposts,public.community_notifications,public.community_mutes,public.community_hidden_posts,public.community_reports,public.community_challenge_progress,public.community_user_settings,public.community_specialist_requests,public.community_hashtags,public.community_post_hashtags,public.community_mentions to authenticated;
grant select,insert,update on public.community_moderation_actions,public.community_admin_roles to authenticated;
