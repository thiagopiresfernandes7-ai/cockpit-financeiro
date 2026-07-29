begin;

-- No preferences could be saved while the old identifiers were active.
delete from public.community_user_interests;
delete from public.community_interests;

insert into public.community_interests(slug,label,sort_order) values
('organizar-minhas-financas','Organizar minhas finanças',1),
('sair-das-dividas','Sair das dívidas',2),
('criar-uma-reserva','Criar uma reserva',3),
('comecar-a-investir','Começar a investir',4),
('aprender-sobre-renda-fixa','Aprender sobre renda fixa',5),
('aprender-sobre-acoes','Aprender sobre ações',6),
('aprender-sobre-fundos-imobiliarios','Aprender sobre fundos imobiliários',7),
('aprender-sobre-etfs','Aprender sobre ETFs',8),
('viver-de-dividendos','Viver de dividendos',9),
('conquistar-independencia-financeira','Conquistar independência financeira',10),
('compartilhar-conhecimento','Compartilhar conhecimento',11),
('trabalhar-como-especialista-ou-professor','Trabalhar como especialista ou professor',12);

commit;
