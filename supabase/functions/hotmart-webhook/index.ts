import { createClient } from "npm:@supabase/supabase-js@2.57.4";

type SubscriptionStatus="inactive"|"active"|"past_due"|"cancelled"|"expired"|"trialing";
const eventMap:Record<string,SubscriptionStatus>={
  PURCHASE_APPROVED:"active",SUBSCRIPTION_ACTIVATED:"active",PURCHASE_COMPLETE:"active",
  PURCHASE_BILLET_PRINTED:"past_due",PURCHASE_DELAYED:"past_due",SUBSCRIPTION_OVERDUE:"past_due",
  SUBSCRIPTION_CANCELLATION:"cancelled",PURCHASE_CANCELED:"cancelled",
  PURCHASE_REFUNDED:"cancelled",PURCHASE_CHARGEBACK:"cancelled",
  SUBSCRIPTION_EXPIRED:"expired",PURCHASE_EXPIRED:"expired"
};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json"}});
const normalizeEmail=(value:unknown)=>String(value||"").trim().toLowerCase();
const readPath=(value:any,paths:string[])=>{for(const path of paths){let current=value;for(const key of path.split("."))current=current?.[key];if(current!==undefined&&current!==null&&current!=="")return current}return""};
async function sha256(value:string){const bytes=new TextEncoder().encode(value);const digest=await crypto.subtle.digest("SHA-256",bytes);return Array.from(new Uint8Array(digest)).map(x=>x.toString(16).padStart(2,"0")).join("")}
function safeEqual(a:string,b:string){if(a.length!==b.length)return false;let diff=0;for(let i=0;i<a.length;i++)diff|=a.charCodeAt(i)^b.charCodeAt(i);return diff===0}

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
  const eventRecord={provider:"hotmart",event_type:eventType,provider_event_id:providerEventId,buyer_email:buyerEmail,subscription_id:subscriptionId,status,received_at:new Date().toISOString(),raw_payload_hash:await sha256(raw)};
  const eventInsert=await admin.from("payment_events").insert(eventRecord);
  if(eventInsert.error)return json({error:"event_log_failed"},500);
  let matchedUser:any=null;
  for(let page=1;page<=10&&!matchedUser;page++){const listed=await admin.auth.admin.listUsers({page,perPage:1000});if(listed.error)return json({error:"user_lookup_failed"},500);matchedUser=listed.data.users.find(user=>normalizeEmail(user.email)===buyerEmail);if(listed.data.users.length<1000)break}
  const now=new Date().toISOString();
  if(!matchedUser){
    const pending=await admin.from("pending_entitlements").upsert({provider:"hotmart",buyer_email:buyerEmail,provider_subscription_id:subscriptionId,status,event_type:eventType,updated_at:now},{onConflict:"provider,buyer_email"});
    if(pending.error)return json({error:"pending_entitlement_failed"},500);
    return json({ok:true,pending:true});
  }
  const row=await admin.from("finance_states").select("data").eq("user_id",matchedUser.id).maybeSingle();
  if(row.error)return json({error:"state_lookup_failed"},500);
  const data=row.data?.data&&typeof row.data.data==="object"?row.data.data:{};
  const previous=data.subscription&&typeof data.subscription==="object"?data.subscription:{};
  data.subscription={...previous,plan:status==="expired"?"premium":"premium",status,provider:"hotmart",providerUserId:buyerEmail,providerSubscriptionId:subscriptionId||previous.providerSubscriptionId||"",startedAt:previous.startedAt||(status==="active"?now:""),expiresAt:readPath(payload,["data.subscription.date_next_charge","data.purchase.approved_date"])||previous.expiresAt||"",renewedAt:status==="active"?now:(previous.renewedAt||""),cancelledAt:status==="cancelled"?now:(previous.cancelledAt||""),lastWebhookAt:now};
  const updated=await admin.from("finance_states").upsert({user_id:matchedUser.id,data,updated_at:now});
  if(updated.error)return json({error:"entitlement_update_failed"},500);
  return json({ok:true,activated:status==="active",status});
});
