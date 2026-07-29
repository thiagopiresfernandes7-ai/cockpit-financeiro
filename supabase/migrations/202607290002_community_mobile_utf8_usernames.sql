begin;

-- Corrige apenas valores conhecidos como contaminados; registros já corretos não são alterados.
update public.community_categories
set label = case label
  when 'DÃºvida' then 'Dúvida'
  when 'DÃƒÂºvida' then 'Dúvida'
  when 'OrganizaÃ§Ã£o financeira' then 'Organização financeira'
  when 'OrganizaÃƒÂ§ÃƒÂ£o financeira' then 'Organização financeira'
  when 'DÃ­vidas' then 'Dívidas'
  when 'DÃƒÂ­vidas' then 'Dívidas'
  when 'AÃ§Ãµes' then 'Ações'
  when 'AÃƒÂ§ÃƒÂµes' then 'Ações'
  when 'Fundos imobiliÃ¡rios' then 'Fundos imobiliários'
  when 'Fundos imobiliÃƒÂ¡rios' then 'Fundos imobiliários'
  when 'OpiniÃ£o' then 'Opinião'
  when 'NotÃ­cia' then 'Notícia'
  else label
end
where label in (
  'DÃºvida','DÃƒÂºvida','OrganizaÃ§Ã£o financeira','OrganizaÃƒÂ§ÃƒÂ£o financeira',
  'DÃ­vidas','DÃƒÂ­vidas','AÃ§Ãµes','AÃƒÂ§ÃƒÂµes',
  'Fundos imobiliÃ¡rios','Fundos imobiliÃƒÂ¡rios','OpiniÃ£o','NotÃ­cia'
);

update public.community_interests
set label = case label
  when 'Organizar minhas finanÃ§as' then 'Organizar minhas finanças'
  when 'Sair das dÃ­vidas' then 'Sair das dívidas'
  when 'ComeÃ§ar a investir' then 'Começar a investir'
  when 'Aprender sobre aÃ§Ãµes' then 'Aprender sobre ações'
  when 'Aprender sobre fundos imobiliÃ¡rios' then 'Aprender sobre fundos imobiliários'
  when 'Conquistar independÃªncia financeira' then 'Conquistar independência financeira'
  else label
end
where label like '%Ã%';

alter table public.community_profiles
  drop constraint if exists community_profiles_username_check;

alter table public.community_profiles
  add constraint community_profiles_username_check
  check (
    username ~ '^[a-z0-9._]{3,30}$'
    and username not in (
      'admin','administrador','norteia','suporte','support','oficial',
      'moderador','moderacao','sistema','root','null','undefined'
    )
  ) not valid;

alter table public.community_profiles
  validate constraint community_profiles_username_check;

comment on column public.community_profiles.username is
  'Identificador público único. user_id permanece a chave interna.';

commit;
