# Vendas pela Stripe

O cliente toca em **Assinar agora**, paga no link da Stripe (cartão, Google Pay ou Apple Pay) e volta ao Norteia com o Premium liberado automaticamente. Não depende do e-mail: o link leva o id da conta (`client_reference_id`), e o aviso da Stripe libera a conta certa. O cliente cancela ou troca o cartão sozinho pelo portal da Stripe (**Gerenciar assinatura** em Configurações).

Enquanto `APP_ENV.paymentProvider` for `"free"` em `freemium.js`, nada é cobrado.

## 1. Conta e produto na Stripe
1. Crie a conta em stripe.com (aceita CPF). Use o **modo de teste** até terminar todos os passos.
2. **Catálogo de produtos → Adicionar produto**: "Norteia Premium", preço recorrente (ex.: R$ 19,90 por mês).
3. **Links de pagamento → Novo**: escolha o produto. Em **Após o pagamento**, selecione redirecionar para
   `https://thiagopiresfernandes7-ai.github.io/cockpit-financeiro/?assinatura=ok`. Copie o link (`https://buy.stripe.com/...`).
4. **Configurações → Faturamento → Portal do cliente**: ative, permita cancelar e atualizar forma de pagamento. Copie o **link de login** (`https://billing.stripe.com/p/login/...`).

## 2. Banco de dados (Supabase → SQL Editor), nesta ordem
1. `supabase/migrations/202609230001_server_subscriptions.sql`
2. `supabase/migrations/202609240001_stripe_provider.sql`
3. Configuração pública lida pelo app:
```sql
delete from public.app_config
where key in ('payment_provider','stripe_payment_link','stripe_portal_link','price_label','billing_label');
insert into public.app_config(key,value,is_public) values
  ('payment_provider','stripe',true),
  ('stripe_payment_link','https://buy.stripe.com/SEU_LINK',true),
  ('stripe_portal_link','https://billing.stripe.com/p/login/SEU_LINK',true),
  ('price_label','R$ 19,90/mês',true),
  ('billing_label','Assinatura mensal, cancele quando quiser',true);
```

## 3. Função que recebe os avisos
1. Supabase → **Edge Functions → Secrets**:
   - `STRIPE_SECRET_KEY`: na Stripe, **Desenvolvedores → Chaves de API**. Prefira uma chave restrita com leitura de *Subscriptions*.
   - `STRIPE_WEBHOOK_SECRET`: gerado no passo 3 abaixo (`whsec_...`).
2. Implante `supabase/functions/stripe-webhook` **sem verificação de JWT** (a segurança é a assinatura `Stripe-Signature`):
   `supabase functions deploy stripe-webhook --no-verify-jwt`
3. Na Stripe, **Desenvolvedores → Webhooks → Adicionar endpoint**:
   - URL: `https://<project-ref>.supabase.co/functions/v1/stripe-webhook`
   - Eventos: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
   - Copie o **segredo de assinatura** para `STRIPE_WEBHOOK_SECRET`.

## 4. Teste completo (modo de teste)
1. Temporariamente, em `freemium.js`, use `paymentProvider:"stripe"`.
2. Entre com uma conta de teste, toque em **Assinar agora** e pague com o cartão `4242 4242 4242 4242` (qualquer data futura e CVC).
3. Ao voltar, o app mostra "Pagamento recebido" e libera o Premium em segundos.
4. Em **Configurações → Gerenciar assinatura**, cancele: o acesso continua até o fim do período pago.
5. Na Stripe, **Webhooks → endpoint**, confira que todos os avisos retornaram 200.

## 5. Ligar a cobrança
Troque as chaves de teste pelas de produção (segredos e links), mantenha `paymentProvider:"stripe"` e, se quiser bloquear o app inteiro para quem não assina, `paywall_enabled = 'true'` em `app_config`.

## Segurança
- Avisos sem assinatura válida ou com mais de 5 minutos são recusados.
- O estado da assinatura é sempre lido da API da Stripe, nunca só do conteúdo do aviso.
- O Premium é gravado em `user_subscriptions`, que o navegador não consegue alterar.
- O app só abre links de `buy.stripe.com`/`checkout.stripe.com` e `billing.stripe.com`.
- Apps nas lojas: dentro dos apps de Android e iPhone, assinaturas digitais precisam usar o pagamento da Google e da Apple. A Stripe atende as vendas pela web e pelo Instagram.
