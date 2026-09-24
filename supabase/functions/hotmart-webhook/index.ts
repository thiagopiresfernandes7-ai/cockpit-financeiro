import { createClient } from "npm:@supabase/supabase-js@2.57.4";

type SubscriptionStatus="inactive"|"active"|"past_due"|"cancelled"|"expired"|"trialing"|"refunded"|"chargeback";
const eventMap:Record<string,SubscriptionStatus>={
  PURCHASE_APPROVED:"active",SUBSCRIPTION_ACTIVATED:"active",PURCHASE_COMPLETE:"active",
  PURCHASE_BILLET_PRINTED:"past_due",PURCHASE_DELAYED:"past_due",SUBSCRIPTION_OVERDUE:"past_due",
  SUBSCRIPTION_CANCELLATION:"cancelled",PURCHASE_CANCELED:"cancelled",
  PURCHASE_REFUNDED:"refunded",PURCHASE_CHARGEBACK:"chargeback",
  SUBSCRIPTION_EXPIRED:"expired",PURCHASE_EXPIRED:"expired"
};
// Encerram o acesso na hora. Os demais cancelamentos preservam o período já pago.
const revokeNow=new Set(["PURCHASE_CANCELED","PURCHASE_REFUNDED","PURCHASE_CHARGEBACK","SUBSCRIPTION_EXPIRED","PURCHASE_EXPIRED"]);
const YEAR_MS=365*24*60*60*1000;
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json"}});
const normalizeEmail=(value:unknown)=>String(value||"").trim().toLowerCase();
const readPath=(value:any,paths:string[])=>{for(const path of paths){let current=value;for(const key of path.split("."))current=current?.[key];if(current!==undefined&&current!==null&&current!=="")return current}return""};
// A Hotmart envia datas como milissegundos (número ou texto); aceita também ISO.
function toIso(value:unknown){if(value===""||value===null||value===undefined)return null;const n=typeof value==="number"?value:(/^\d+$/.test(String(value))?Number(value):NaN);const d=Number.isFinite(n)?new Date(n):new Date(String(value));return isNaN(d.getTime())?null:d.toISOString()}
async function sha256(value:string){const bytes=new TextEncoder().encode(value);const digest=await crypto.subtle.digest("SHA-256",bytes);return Array.from(new Uint8Array(digest)).map(x=>x.toString(16).padStart(2,"0")).join("")}
function safeEqual(a:string,b:string){if(a.length!==b.length)return false;let diff=0;for(let i=0;i<a.length;i++)diff|=a.charCodeAt(i)^b.charCodeAt(i);return diff===0}

function computeExpiresAt(eventType:string,status:SubscriptionStatus,payload:any,previous:string|null,now:string){
  if(revokeNow.has(eventType))return now;
  if(status==="active"||status==="trialing"){
    const nextCharge=toIso(readPath(payload,["data.subscription.date_next_charge","data.purchase.date_next_charge"]));
    if(nextCharge)return nextCharge;
    // Compra anual sem data de próxima cobrança: 1 ano a partir da aprovação (antes usava a própria data da compra e expirava na hora).
    const approved=toIso(readPath(payload,["data.purchase.approved_date"]))||now;
    return new Date(new Date(approved).getTime()+YEAR_MS).toISOString();
  }
  return previous;
}

async function findUserId(admin:any,email:string){
  const direct=await admin.rpc("app_user_id_by_email",{p_email:email});
  if(!direct.error)return{id:direct.data as string|null};
  // Migration 202609230001 ainda não aplicada: mantém a varredura antiga.
  for(let page=1;page<=10;page++){const listed=await admin.auth.admin.listUsers({page,perPage:1000});if(listed.error)return{error:listed.error};const found=listed.data.users.find((user:any)=>normalizeEmail(user.email)===email);if(found)return{id:found.id};if(listed.data.users.length<1000)break}
  return{id:null};
}

Deno.serve(async(req)=>{
  if(req.method!=="POST")return json({error:"method_not_allowed"},405);
  const expected=Deno.env.get("HOTMART_HOTTOK")||"";
  const received=req.headers.get("x-hotmart-hottok")||"";
  if(!expected||!received||!safeEqual(received,expected))return json({error:"unauthorized"},401);
  const raw=await req.text();
  let payload:any;try{payload=JSON.parse(raw)}catch{return json({error:"invalid_json"},400)}
  const eventType=String(payload.event||payload.event_type||"").toUpperCase();
  const status=eventMap[eventType];if(!status)return json({ok:true,ignored:true,eventType});
  const providerEventId=String(payload.id||payload.event_id||await sha256(raw));
  const buyerEmail=normalizeEmail(readPath(payload,["data.buyer.email","data.subscription.subscriber.email","buyer.email","subscriber.email"]));
  const subscriptionId=String(readPath(payload,["data.subscription.subscriber.code","data.subscription.id","subscription.id","data.purchase.transaction"]));
  if(!buyerEmail)return json({error:"buyer_email_missing"},422);
  const url=Deno.env.get("SUPABASE_URL")!;
  const secretKeys=JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS")||"{}");
  const secretKey=secretKeys.default||Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if(!url||!secretKey)return json({error:"server_not_configured"},500);
  const admin=createClient(url,secretKey,{auth:{persistSession:false,autoRefreshToken:false}});
  const duplicate=await admin.from("payment_events").select("id").eq("provider","hotmart").eq("provider_event_id",providerEventId).maybeSingle();
  if(duplicate.data)return json({ok:true,duplicate:true});
  const now=new Date().toISOString();

  const user=await findUserId(admin,buyerEmail);
  if(user.error)return json({error:"user_lookup_failed"},500);
  let result:Record<string,unknown>;
  if(!user.id){
    const pending=await admin.from("pending_entitlements").upsert({provider:"hotmart",buyer_email:buyerEmail,provider_subscription_id:subscriptionId,status,event_type:eventType,expires_at:computeExpiresAt(eventType,status,payload,null,now),updated_at:now},{onConflict:"provider,buyer_email"});
    if(pending.error)return json({error:"pending_entitlement_failed"},500);
    result={ok:true,pending:true};
  }else{
    // Grava só em user_subscriptions: finance_states é do cliente e seria sobrescrito no próximo salvamento.
    const current=await admin.from("user_subscriptions").select("started_at,expires_at,renewed_at,cancelled_at,provider_subscription_id").eq("user_id",user.id).maybeSingle();
    if(current.error)return json({error:"subscription_lookup_failed"},500);
    const previous=current.data||{};
    const active=status==="active"||status==="trialing";
    const updated=await admin.from("user_subscriptions").upsert({
      user_id:user.id,plan:"premium",status,provider:"hotmart",
      provider_subscription_id:subscriptionId||previous.provider_subscription_id||"",
      started_at:previous.started_at||(active?now:null),
      expires_at:computeExpiresAt(eventType,status,payload,previous.expires_at||null,now),
      renewed_at:active?now:(previous.renewed_at||null),
      cancelled_at:active?(previous.cancelled_at||null):(status==="past_due"?(previous.cancelled_at||null):now),
      last_event_type:eventType,last_webhook_at:now,updated_at:now
    },{onConflict:"user_id"});
    if(updated.error)return json({error:"entitlement_update_failed"},500);
    result={ok:true,activated:active,status};
  }

  // Registra o evento só depois de aplicá-lo: se algo falhar antes, a Hotmart reenvia e o evento não é ignorado como duplicado.
  const eventInsert=await admin.from("payment_events").insert({provider:"hotmart",event_type:eventType,provider_event_id:providerEventId,buyer_email:buyerEmail,subscription_id:subscriptionId,status,received_at:now,raw_payload_hash:await sha256(raw)});
  if(eventInsert.error&&eventInsert.error.code!=="23505")return json({error:"event_log_failed"},500);
  return json(result);
});
