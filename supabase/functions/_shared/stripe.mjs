// Regras puras da integração Stripe, sem APIs do Deno: rodam na Edge Function e nos testes em Node.

const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function isUuid(value){return UUID.test(String(value||""))}

// Cabeçalho Stripe-Signature: "t=1700000000,v1=hex[,v1=hex...]".
export function parseStripeSignature(header){
  const out={t:null,v1:[]};
  for(const part of String(header||"").split(",")){
    const i=part.indexOf("=");if(i<0)continue;
    const k=part.slice(0,i).trim(),v=part.slice(i+1).trim();
    if(k==="t")out.t=Number(v);else if(k==="v1")out.v1.push(v);
  }
  return out;
}

async function hmacHex(secret,message){
  const enc=new TextEncoder();
  const key=await crypto.subtle.importKey("raw",enc.encode(secret),{name:"HMAC",hash:"SHA-256"},false,["sign"]);
  const sig=await crypto.subtle.sign("HMAC",key,enc.encode(message));
  return Array.from(new Uint8Array(sig)).map(b=>b.toString(16).padStart(2,"0")).join("");
}
function safeEqual(a,b){if(a.length!==b.length)return false;let d=0;for(let i=0;i<a.length;i++)d|=a.charCodeAt(i)^b.charCodeAt(i);return d===0}

// Assinatura = HMAC-SHA256(segredo do endpoint, "<t>.<corpo bruto>"); rejeita avisos com mais de 5 minutos.
export async function verifyStripeSignature(rawBody,header,secret,{toleranceSeconds=300,nowSeconds=Math.floor(Date.now()/1000)}={}){
  if(!secret||!header)return false;
  const {t,v1}=parseStripeSignature(header);
  if(!Number.isFinite(t)||!v1.length)return false;
  if(Math.abs(nowSeconds-t)>toleranceSeconds)return false;
  const expected=await hmacHex(secret,t+"."+rawBody);
  return v1.some(sig=>safeEqual(sig,expected));
}

// Fim do período pago: nas versões novas da API fica nos itens da assinatura.
export function periodEnd(sub){
  const direct=sub&&sub.current_period_end;
  const item=sub&&sub.items&&sub.items.data&&sub.items.data[0]&&sub.items.data[0].current_period_end;
  const seconds=Number(direct||item||0);
  return seconds?new Date(seconds*1000).toISOString():null;
}

// Converte a assinatura da Stripe no registro de public.user_subscriptions.
export function mapStripeSubscription(sub,nowIso=new Date().toISOString()){
  const end=periodEnd(sub);
  const map={active:"active",trialing:"trialing",past_due:"past_due",unpaid:"past_due",paused:"past_due",
    canceled:"cancelled",incomplete:"inactive",incomplete_expired:"expired"};
  let status=map[sub&&sub.status]||"inactive",expires=end;
  // Cancelou mas o período já pago continua valendo até o fim.
  if((status==="active"||status==="trialing")&&sub.cancel_at_period_end)status="cancelled";
  // Assinatura encerrada de fato: acesso termina agora.
  if(sub&&sub.status==="canceled")expires=sub.ended_at?new Date(sub.ended_at*1000).toISOString():nowIso;
  if(status==="inactive"||status==="expired")expires=nowIso;
  return {
    plan:"premium",status,provider:"stripe",provider_subscription_id:String(sub&&sub.id||""),
    started_at:sub&&sub.start_date?new Date(sub.start_date*1000).toISOString():null,
    expires_at:expires,
    cancelled_at:sub&&sub.canceled_at?new Date(sub.canceled_at*1000).toISOString():null
  };
}
