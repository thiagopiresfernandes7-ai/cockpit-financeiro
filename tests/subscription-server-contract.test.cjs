const assert=require('node:assert/strict');
const fs=require('node:fs');
const html=fs.readFileSync('index.html','utf8');
const premium=fs.readFileSync('freemium.js','utf8');
const sw=fs.readFileSync('service-worker.js','utf8');
const webhook=fs.readFileSync('supabase/functions/hotmart-webhook/index.ts','utf8');
const sql=fs.readFileSync('supabase/migrations/202609230001_server_subscriptions.sql','utf8');

// Assinatura gravada só pelo servidor.
assert.ok(sql.includes('create table if not exists public.user_subscriptions'),'tabela de assinaturas do servidor ausente');
assert.ok(sql.includes('alter table public.user_subscriptions enable row level security')&&sql.includes('revoke all on table public.user_subscriptions from public, anon, authenticated'),'assinaturas graváveis pelo cliente');
assert.ok(sql.includes('grant execute on function public.app_current_subscription() to authenticated'),'leitura da assinatura indisponível ao usuário');
assert.ok(/revoke all on function public\.app_user_id_by_email\(text\) from public, anon, authenticated;\s*grant execute on function public\.app_user_id_by_email\(text\) to service_role;/.test(sql),'busca de usuário por e-mail exposta ao cliente');
assert.ok(sql.includes('email_confirmed_at is not null'),'compra pendente vinculada sem e-mail confirmado');
assert.ok(!/from public\.finance_states/.test(sql),'migração confia em finance_states, que o cliente edita');

// Webhook.
assert.ok(!webhook.includes('from("finance_states")'),'webhook ainda grava no estado editável pelo cliente');
assert.ok(webhook.includes('from("user_subscriptions").upsert'),'webhook não grava em user_subscriptions');
assert.ok(webhook.includes('app_user_id_by_email'),'webhook ainda varre todos os usuários');
assert.ok(!/expiresAt:readPath\(payload,\[[^\]]*approved_date/.test(webhook),'validade ainda usa a data da compra');
assert.ok(webhook.indexOf('from("payment_events").insert')>webhook.indexOf('from("user_subscriptions").upsert'),'evento registrado antes de ser aplicado');

// Cliente.
assert.ok(html.includes("sb.rpc('app_current_subscription')"),'cliente não consulta a assinatura do servidor');
assert.ok(html.includes('verified:true'),'licença verificada não é sinalizada');
assert.ok(premium.includes('access.verified===true'),'Premium ainda confia apenas em state.subscription');

// Dependências externas.
assert.ok(!html.includes('xlsx@0.18.5'),'SheetJS vulnerável (0.18.5) ainda carregado');
assert.ok(!html.includes('supabase-js@2"'),'supabase-js sem versão fixa');
for(const tag of html.match(/<script[^>]+src="https?:[^"]+"[^>]*>/g)||[])assert.ok(/integrity="sha384-/.test(tag)&&tag.includes('crossorigin="anonymous"'),'script externo sem SRI: '+tag);
assert.ok(/s\.integrity='sha384-/.test(html),'carregamento do SheetJS sem SRI');

// PWA offline e links.
assert.ok(sw.includes('ignoreSearch:true'),'shell offline não atende arquivos com ?v=');
assert.ok(sw.includes('request.mode==="navigate"'),'index.html pode ser servido no lugar de scripts');
for(const [,file] of html.matchAll(/href="([\w-]+\.html)"/g))assert.ok(fs.existsSync(file),'link quebrado: '+file);
assert.ok(!fs.existsSync('hotfix.js'),'hotfix.js voltou sem ser carregado');
console.log('Assinatura no servidor, dependências e shell offline: OK');
