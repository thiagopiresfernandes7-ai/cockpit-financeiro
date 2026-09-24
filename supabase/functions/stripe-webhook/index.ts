import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import { isUuid, mapStripeSubscription, verifyStripeSignature } from "../_shared/stripe.mjs";

// Recebe avisos da Stripe e mantém public.user_subscriptions (somente servidor).
// Implantar sem verificação de JWT: a autenticação é a assinatura Stripe-Signature.
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json"}});

async function sha256(value:string){const d=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(value));return Array.from(new Uint8Array(d)).map(b=>b.toString(16).padStart(2,"0")).join("")}

async function stripeGet(path:string,key:string){
  const res=await fetch("https://api.stripe.com/v1/"+path,{headers:{Authorization:"Bearer "+key}});
  if(!res.ok)throw new Error("stripe_"+res.status);
  return await res.json();
}

Deno.serve(async(req)=>{
  if(req.method!=="POST")return json({error:"method_not_allowed"},405);
  const secret=Deno.env.get("STRIPE_WEBHOOK_SECRET")||"",stripeKey=Deno.env.get("STRIPE_SECRET_KEY")||"";
  const raw=await req.text();
  if(!await verifyStripeSignature(raw,req.headers.get("stripe-signature")||"",secret))return json({error:"invalid_signature"},400);
  let event:any;try{event=JSON.parse(raw)}catch{return json({error:"invalid_json"},400)}

  const url=Deno.env.get("SUPABASE_URL")!;
  const secretKeys=JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS")||"{}");
  const adminKey=secretKeys.default||Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if(!url||!adminKey||!stripeKey)return json({error:"server_not_configured"},500);
  const admin=createClient(url,adminKey,{auth:{persistSession:false,autoRefreshToken:false}});

  const done=await admin.from("payment_events").select("id").eq("provider","stripe").eq("provider_event_id",String(event.id)).maybeSingle();
  if(done.data)return json({ok:true,duplicate:true});

  const obj=event.data&&event.data.object||{};
  let userId="",subscriptionId="",email="";
  if(event.type==="checkout.session.completed"){
    // O link de pagamento é aberto com client_reference_id = id do usuário no Norteia.
    userId=String(obj.client_reference_id||"");subscriptionId=String(obj.subscription||"");
    email=String(obj.customer_details&&obj.customer_details.email||obj.customer_email||"");
    if(!isUuid(userId)||!subscriptionId)return json({ok:true,ignored:"checkout_sem_usuario_ou_assinatura"});
  }else if(event.type==="customer.subscription.updated"||event.type==="customer.subscription.deleted"){
    subscriptionId=String(obj.id||"");
    const row=await admin.from("user_subscriptions").select("user_id").eq("provider","stripe").eq("provider_subscription_id",subscriptionId).maybeSingle();
    if(row.error)return json({error:"subscription_lookup_failed"},500);
    // Ainda não vinculada: o checkout.session.completed vai buscar o estado atual e vincular.
    if(!row.data)return json({ok:true,ignored:"assinatura_ainda_nao_vinculada"});
    userId=row.data.user_id;
  }else{
    return json({ok:true,ignored:event.type});
  }

  // Fonte de verdade: o estado atual na Stripe, não o conteúdo do aviso (que pode chegar fora de ordem).
  let sub:any;try{sub=await stripeGet("subscriptions/"+encodeURIComponent(subscriptionId),stripeKey)}catch{return json({error:"stripe_lookup_failed"},502)}
  const now=new Date().toISOString(),mapped=mapStripeSubscription(sub,now);
  const saved=await admin.from("user_subscriptions").upsert({
    user_id:userId,...mapped,last_event_type:event.type,last_webhook_at:now,updated_at:now,
    ...(mapped.status==="active"?{renewed_at:now}:{})
  },{onConflict:"user_id"});
  if(saved.error)return json({error:"subscription_update_failed"},500);

  // Registro mínimo e idempotente, só depois de aplicar (se falhar antes, a Stripe reenvia).
  const logged=await admin.from("payment_events").insert({provider:"stripe",event_type:event.type,provider_event_id:String(event.id),
    buyer_email:email,subscription_id:subscriptionId,status:mapped.status,received_at:now,raw_payload_hash:await sha256(raw)});
  if(logged.error&&logged.error.code!=="23505")return json({error:"event_log_failed"},500);
  return json({ok:true,status:mapped.status});
});
