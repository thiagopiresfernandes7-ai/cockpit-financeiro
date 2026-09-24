const assert=require('node:assert/strict');
const fs=require('node:fs');
const crypto=require('node:crypto');
const path=require('node:path');
const {pathToFileURL}=require('node:url');

(async()=>{
  const lib=await import(pathToFileURL(path.resolve('supabase/functions/_shared/stripe.mjs')).href);

  // Assinatura Stripe-Signature: HMAC-SHA256(segredo, "t.corpo").
  const secret='whsec_teste123',body=JSON.stringify({id:'evt_1',type:'checkout.session.completed'}),now=1790000000;
  const sign=(t,b)=>crypto.createHmac('sha256',secret).update(t+'.'+b).digest('hex');
  const header='t='+now+',v1='+sign(now,body);
  assert.equal(await lib.verifyStripeSignature(body,header,secret,{nowSeconds:now}),true,'assinatura válida recusada');
  assert.equal(await lib.verifyStripeSignature(body+' ',header,secret,{nowSeconds:now}),false,'corpo alterado aceito');
  assert.equal(await lib.verifyStripeSignature(body,header,'whsec_outro',{nowSeconds:now}),false,'segredo errado aceito');
  assert.equal(await lib.verifyStripeSignature(body,header,secret,{nowSeconds:now+301}),false,'aviso antigo aceito (replay)');
  assert.equal(await lib.verifyStripeSignature(body,'t='+now+',v1=abc,v1='+sign(now,body),secret,{nowSeconds:now}),true,'rotação de segredo (múltiplos v1)');
  assert.equal(await lib.verifyStripeSignature(body,'',secret,{nowSeconds:now}),false);
  assert.equal(await lib.verifyStripeSignature(body,header,'',{nowSeconds:now}),false,'sem segredo configurado não pode aceitar');

  // Mapeamento da assinatura para user_subscriptions.
  const end=1792000000,iso=s=>new Date(s*1000).toISOString(),nowIso='2026-09-24T12:00:00.000Z';
  const active=lib.mapStripeSubscription({id:'sub_1',status:'active',start_date:1789000000,items:{data:[{current_period_end:end}]}},nowIso);
  assert.deepEqual([active.status,active.expires_at,active.provider,active.provider_subscription_id],['active',iso(end),'stripe','sub_1']);
  const legacy=lib.mapStripeSubscription({id:'sub_2',status:'active',current_period_end:end},nowIso);
  assert.equal(legacy.expires_at,iso(end),'versão antiga da API (current_period_end na assinatura)');
  const cancelAtEnd=lib.mapStripeSubscription({id:'sub_3',status:'active',cancel_at_period_end:true,canceled_at:1789500000,items:{data:[{current_period_end:end}]}},nowIso);
  assert.deepEqual([cancelAtEnd.status,cancelAtEnd.expires_at],['cancelled',iso(end)],'cancelamento deve manter acesso até o fim do período pago');
  const ended=lib.mapStripeSubscription({id:'sub_4',status:'canceled',ended_at:1789900000,items:{data:[{current_period_end:end}]}},nowIso);
  assert.deepEqual([ended.status,ended.expires_at],['cancelled',iso(1789900000)],'assinatura encerrada deve perder acesso');
  assert.equal(lib.mapStripeSubscription({id:'s',status:'past_due'},nowIso).status,'past_due');
  const incomplete=lib.mapStripeSubscription({id:'s',status:'incomplete'},nowIso);
  assert.deepEqual([incomplete.status,incomplete.expires_at],['inactive',nowIso],'pagamento incompleto não libera acesso');
  assert.equal(lib.isUuid('4f1c2a9e-8b3d-4c5e-9f00-1234567890ab'),true);
  assert.equal(lib.isUuid("x' or 1=1"),false);

  // Webhook: assinatura antes de tudo, estado lido da Stripe, grava só em user_subscriptions.
  const hook=fs.readFileSync('supabase/functions/stripe-webhook/index.ts','utf8');
  assert.ok(hook.indexOf('verifyStripeSignature(')<hook.indexOf('JSON.parse(raw)'),'webhook processa antes de validar a assinatura');
  assert.ok(hook.includes('client_reference_id')&&hook.includes('isUuid(userId)'),'vínculo com o usuário não validado');
  assert.ok(hook.includes('stripeGet("subscriptions/'),'estado da assinatura não é confirmado na API da Stripe');
  assert.ok(hook.includes('from("user_subscriptions").upsert')&&!hook.includes('from("finance_states")'),'webhook grava fora da tabela protegida');
  assert.ok(hook.indexOf('from("payment_events").insert')>hook.indexOf('from("user_subscriptions").upsert'),'evento registrado antes de ser aplicado');
  const sql=fs.readFileSync('supabase/migrations/202609240001_stripe_provider.sql','utf8');
  assert.ok(/check \(provider in \([^)]*'stripe'/.test(sql),'payment_events não aceita a Stripe');

  // App: link só da Stripe, com o id do usuário; portal só do domínio da Stripe.
  const premium=fs.readFileSync('freemium.js','utf8'),html=fs.readFileSync('index.html','utf8');
  assert.ok(premium.includes('^https:\\/\\/(buy|checkout)\\.stripe\\.com\\/')&&premium.includes('client_reference_id'),'checkout aceita link fora da Stripe');
  assert.ok(premium.includes('^https:\\/\\/billing\\.stripe\\.com\\/'),'portal aceita link fora da Stripe');
  assert.ok(premium.includes('paymentProvider:"free"'),'cobrança não pode ser ligada sem decisão explícita');
  for(const getter of ['getNorteiaAppConfig','verifyNorteiaAccess'])assert.ok(html.includes('window.'+getter+'='),getter+' não exposto');
  assert.ok(html.includes("payment_provider:'stripe'")&&html.includes('window.NorteiaCheckout.start()'),'tela de bloqueio sem checkout Stripe');
  console.log('Pagamento Stripe (assinatura, mapeamento e contratos): OK');
})().catch(e=>{console.error(e);process.exit(1)});
