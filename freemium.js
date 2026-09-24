(function(){
"use strict";
var HOTMART_CHECKOUT_URL="https://pay.hotmart.com/D106828019V";
var FREE_LIMITS={investments:3,debts:1,budgets:5,futureProjectionMonths:3,recurringRules:0,smartAlerts:3,quickTemplates:3};
var FEATURES={
  smartGoal:{label:"Objetivo Financeiro Inteligente",plan:"premium"},
  weeklyPlan:{label:"Plano da Semana",plan:"premium"},
  advancedAnalysis:{label:"Análise avançada",plan:"premium"},
  futureCashflowExtended:{label:"Fluxo de caixa futuro avançado",plan:"premium"},
  debtsAdvanced:{label:"Dívidas e financiamentos",plan:"premium"},
  investmentsAdvanced:{label:"Investimentos avançados",plan:"premium"},
  dividends:{label:"Dividendos e rendimentos",plan:"premium"},
  decisionLab:{label:"Decisões de compra",plan:"premium"},
  monthlyClosing:{label:"Fechamento mensal",plan:"premium"},
  jsonBackup:{label:"Backup JSON",plan:"premium"}
};
function detectPlatform(){
  var ua=navigator.userAgent||"";
  var standalone=!!((window.matchMedia&&window.matchMedia("(display-mode: standalone)").matches)||window.navigator.standalone);
  return {isWeb:true,isPwa:standalone,isAndroid:/Android/i.test(ua),isIOS:/iPhone|iPad|iPod/i.test(ua),isNative:false};
}
var platform=detectPlatform();
var APP_ENV={platform:platform.isPwa?"pwa":"web",paymentProvider:"free"};
function appConfig(){return typeof window.getNorteiaAppConfig==="function"?(window.getNorteiaAppConfig()||{}):{}}
// Mesmo aviso visual do app (#toast). window.toast aponta para o elemento, não para uma função.
var notifyTimer=null;
function notify(msg){
  var t=document.getElementById("toast");
  if(!t){window.alert(msg);return}
  t.textContent=msg;t.classList.remove("hidden");clearTimeout(notifyTimer);
  notifyTimer=setTimeout(function(){t.classList.add("hidden")},3200);
}
// Link de pagamento da Stripe (criado no painel da Stripe e salvo em app_config.stripe_payment_link).
// client_reference_id leva o id do usuário: o webhook libera o Premium para a conta certa sem depender do e-mail.
function startStripeCheckout(){
  var link=String(appConfig().stripe_payment_link||""),user=currentUser();
  if(!/^https:\/\/(buy|checkout)\.stripe\.com\//.test(link)){notify("O pagamento ainda não foi configurado.");return false}
  if(!user||!user.id){notify("Entre na sua conta para assinar.");return false}
  var url=new URL(link);url.searchParams.set("client_reference_id",user.id);if(user.email)url.searchParams.set("prefilled_email",user.email);
  window.location.href=url.toString();return true;
}
function checkoutProvider(){return ["stripe","hotmart"].includes(APP_ENV.paymentProvider)?APP_ENV.paymentProvider:(appConfig().payment_provider==="hotmart"?"hotmart":"stripe")}
var PaymentProviders={
  stripe:{startCheckout:startStripeCheckout},
  hotmart:{startCheckout:function(){window.open(HOTMART_CHECKOUT_URL,"_blank","noopener,noreferrer")}},
  googlePlay:{startCheckout:function(){return false}},
  appStore:{startCheckout:function(){return false}},
  free:{startCheckout:function(){return true}}
};
function blankSubscription(){return{plan:"free",status:"inactive",provider:"none",providerUserId:"",providerSubscriptionId:"",startedAt:"",expiresAt:"",renewedAt:"",cancelledAt:"",lastWebhookAt:""}}
function currentAccess(){return typeof window.getNorteiaAccess==="function"?(window.getNorteiaAccess()||{}):{}}
function currentState(){return typeof window.getNorteiaState==="function"?window.getNorteiaState():null}
function currentUser(){return typeof window.getNorteiaUser==="function"?window.getNorteiaUser():null}
function editing(kind){return typeof window.getNorteiaEditing==="function"?window.getNorteiaEditing(kind):null}
function normalizeSubscription(input){
  var result=Object.assign(blankSubscription(),input||{});
  if(!["free","premium"].includes(result.plan))result.plan="free";
  if(!["inactive","active","past_due","cancelled","expired","trialing"].includes(result.status))result.status="inactive";
  return result;
}
function hasPremiumAccess(financialState){
  var access=currentAccess();if(access.owner===true||access.lifetime===true)return true;
  if(APP_ENV.paymentProvider==="free")return true;
  // Licença confirmada pelo servidor é a fonte de verdade; state.subscription é só cópia para uso offline.
  if(access.verified===true)return !!(access.entitlement&&access.entitlement.has_access);
  var sub=normalizeSubscription(financialState&&financialState.subscription);
  if(sub.plan!=="premium")return false;
  if(!["active","trialing"].includes(sub.status))return false;
  if(sub.expiresAt&&!isNaN(new Date(sub.expiresAt).getTime())&&new Date(sub.expiresAt)<new Date())return false;
  return true;
}
function canUseFeature(featureId){
  var feature=FEATURES[featureId];
  if(!feature||feature.plan==="free")return true;
  return hasPremiumAccess(currentState());
}
function formatDate(value){
  if(!value)return"Não informada";
  var d=new Date(value);return isNaN(d.getTime())?"Não informada":d.toLocaleDateString("pt-BR");
}
function featureCopy(featureId){
  var f=FEATURES[featureId];
  return f?f.label:"recursos avançados";
}
function ensureModal(){
  if(document.getElementById("premiumFeatureModal"))return;
  var style=document.createElement("style");
  style.textContent=".premium-feature-modal{position:fixed;inset:0;z-index:10020;display:grid;place-items:end center;background:rgba(0,6,14,.78);padding:16px}.premium-feature-modal.hidden{display:none}.premium-card{width:min(560px,100%);max-height:90vh;overflow:auto;padding:24px;border-radius:26px;border:1px solid rgba(76,201,255,.25);background:linear-gradient(160deg,#081a2d,#04101e);box-shadow:0 24px 80px rgba(0,0,0,.55)}.premium-card h2{margin:0 0 8px}.premium-card ul{padding-left:20px;color:var(--muted);line-height:1.7}.premium-price{font-size:25px;font-weight:900;color:var(--cyan);margin:14px 0}.premium-actions{display:flex;gap:10px;flex-wrap:wrap}.premium-badge{display:inline-flex;padding:6px 10px;border-radius:999px;background:rgba(54,228,198,.12);color:var(--teal);font-size:11px;font-weight:900}.plan-panel-grid{display:grid;grid-template-columns:1fr auto;gap:14px;align-items:center}.premium-lock-note{font-size:11px;color:var(--cyan);font-weight:800}@media(max-width:780px){.premium-feature-modal{padding:0;align-items:end}.premium-card{border-radius:26px 26px 0 0;padding:20px}.plan-panel-grid{grid-template-columns:1fr}}";
  document.head.appendChild(style);
  var modal=document.createElement("div");
  modal.id="premiumFeatureModal";modal.className="premium-feature-modal hidden";modal.setAttribute("aria-hidden","true");
  modal.innerHTML='<div class="premium-card" role="dialog" aria-modal="true" aria-labelledby="premiumModalTitle"><span class="premium-badge">Norteia Premium</span><h2 id="premiumModalTitle">Desbloqueie o Norteia Premium</h2><p id="premiumModalText">Planeje dívidas, investimentos e seu futuro financeiro com mais clareza.</p><ul><li>Fluxo de caixa futuro</li><li>Dívidas e financiamentos</li><li>Investimentos e dividendos</li><li>Análise anual e objetivo inteligente</li><li>Plano da Semana e fechamento mensal</li></ul><div class="premium-price">7 dias grátis, depois R$ 19,90 por ano</div><div class="premium-actions"><button class="btn primary" id="premiumCheckoutBtn" type="button">Assinar agora</button><button class="btn" id="premiumCloseBtn" type="button">Continuar no gratuito</button></div><p class="notice tiny">O plano gratuito continua disponível. A liberação Premium depende da confirmação segura do pagamento.</p></div>';
  document.body.appendChild(modal);
  document.getElementById("premiumCloseBtn").onclick=closePremiumModal;
  document.getElementById("premiumCheckoutBtn").onclick=function(){PaymentProviders[checkoutProvider()].startCheckout()};
  modal.onclick=function(e){if(e.target===modal)closePremiumModal()};
}
function openPremiumModal(featureId,message){
  ensureModal();
  var modal=document.getElementById("premiumFeatureModal");
  document.getElementById("premiumModalText").textContent=message||("“"+featureCopy(featureId)+"” está disponível no Norteia Premium. O plano gratuito continua funcionando normalmente.");
  document.getElementById("premiumCheckoutBtn").style.display=["stripe","hotmart"].includes(APP_ENV.paymentProvider)&&!platform.isNative?"":"none";
  modal.classList.remove("hidden");modal.setAttribute("aria-hidden","false");
}
function closePremiumModal(){var modal=document.getElementById("premiumFeatureModal");if(modal){modal.classList.add("hidden");modal.setAttribute("aria-hidden","true")}}
function requirePremium(featureId,callback){if(canUseFeature(featureId)){if(typeof callback==="function")callback();return true}openPremiumModal(featureId);return false}
function syncEntitlement(){
  var state=currentState();if(!state)return;
  state.subscription=normalizeSubscription(state.subscription);
  var access=currentAccess(),ent=access.entitlement||{};
  if(access.owner===true||access.lifetime===true){
    var user=currentUser();state.subscription=normalizeSubscription(Object.assign({},state.subscription,{plan:"premium",status:"active",provider:access.owner===true?"owner":"lifetime",providerUserId:(user&&user.id)||state.subscription.providerUserId,startedAt:state.subscription.startedAt||new Date().toISOString(),expiresAt:""}));
  }
  if(ent&&ent.has_access){
    state.subscription=normalizeSubscription(Object.assign({},state.subscription,{plan:"premium",status:ent.status==="trialing"?"trialing":"active",provider:ent.provider||"hotmart",providerSubscriptionId:ent.provider_subscription_id||state.subscription.providerSubscriptionId,startedAt:ent.started_at||state.subscription.startedAt,expiresAt:ent.expires_at||state.subscription.expiresAt,renewedAt:ent.renewed_at||state.subscription.renewedAt,lastWebhookAt:ent.last_webhook_at||state.subscription.lastWebhookAt}));
  }else if(access.verified===true&&access.owner!==true&&access.lifetime!==true&&state.subscription.plan==="premium"){
    // O servidor negou o acesso: a cópia local não pode continuar dizendo que o Premium está ativo.
    state.subscription=normalizeSubscription(Object.assign({},state.subscription,{status:ent.status||"inactive",expiresAt:ent.expires_at||state.subscription.expiresAt}));
    if(["active","trialing"].includes(state.subscription.status))state.subscription.status="expired";
  }
  if(state.subscription.expiresAt&&new Date(state.subscription.expiresAt)<new Date()&&state.subscription.status==="active")state.subscription.status="expired";
}
function planMessage(){
  var state=currentState(),sub=normalizeSubscription(state&&state.subscription);
  var access=currentAccess();
  if(access.owner===true)return"Acesso integral de proprietário e desenvolvedor.";
  if(access.lifetime===true)return"Norteia Premium vitalício.";
  if(APP_ENV.paymentProvider==="free")return"Todas as funções estão liberadas gratuitamente.";
  if(hasPremiumAccess(state))return"Norteia Premium ativo"+(sub.expiresAt?" até "+formatDate(sub.expiresAt):".");
  if(sub.status==="cancelled")return"Seu Premium foi cancelado"+(sub.expiresAt?" e ficará disponível até "+formatDate(sub.expiresAt):".");
  if(sub.status==="expired")return"Seu Premium expirou. Seus dados permanecem preservados.";
  return"Você está no plano gratuito.";
}
function renderPlanPanel(){
  var state=currentState();if(!state)return;
  syncEntitlement();
  var settings=document.getElementById("settings");if(!settings)return;
  var panel=document.getElementById("subscriptionPlanPanel");
  if(!panel){panel=document.createElement("div");panel.id="subscriptionPlanPanel";panel.className="panel";panel.style.marginTop="14px";var head=settings.querySelector(".page-head");if(head)head.insertAdjacentElement("afterend",panel);else settings.prepend(panel)}
  var sub=normalizeSubscription(state.subscription),premium=hasPremiumAccess(state);
  var access=currentAccess(),badge=access.owner||access.lifetime?"Premium vitalício":"Acesso gratuito";
  panel.innerHTML='<div class="plan-panel-grid"><div><span class="premium-badge">'+badge+'</span><h2 style="margin:8px 0 4px">Plano</h2><p>'+planMessage()+'</p><div class="label">Todas as telas, análises, exportações e recursos avançados estão disponíveis.</div></div><div class="split"><button class="btn" id="planRefreshBtn" type="button">Atualizar status</button><button class="btn hidden" id="planManageBtn" type="button">Gerenciar assinatura</button></div></div>';
  // Portal da Stripe: o cliente troca o cartão ou cancela sozinho, sem falar com suporte.
  var portal=String(appConfig().stripe_portal_link||""),ent=access.entitlement||{};
  if((sub.provider==="stripe"||ent.provider==="stripe")&&/^https:\/\/billing\.stripe\.com\//.test(portal)){
    var manage=document.getElementById("planManageBtn");manage.classList.remove("hidden");
    manage.onclick=function(){var url=new URL(portal),user=currentUser();if(user&&user.email)url.searchParams.set("prefilled_email",user.email);window.open(url.toString(),"_blank","noopener,noreferrer")};
  }
  document.getElementById("planRefreshBtn").onclick=async function(){this.disabled=true;try{if(typeof verifyNorteiaAccess==="function")await verifyNorteiaAccess();syncEntitlement();renderPlanPanel();if(typeof scheduleSave==="function")scheduleSave();if(typeof toast==="function")toast("Status da assinatura atualizado.")}finally{this.disabled=false}};
}
function limitReached(kind,count){
  if(hasPremiumAccess(currentState()))return false;
  var limit=FREE_LIMITS[kind];return Number(count||0)>=limit;
}
function installGates(){
  document.addEventListener("click",function(e){
    var viewButton=e.target.closest("[data-view],[data-more-target],[data-menu-view]");
    if(viewButton){
      var view=viewButton.dataset.view||viewButton.dataset.moreTarget||viewButton.dataset.menuView;
      var viewFeatures={analysis:"advancedAnalysis",projection:"futureCashflowExtended",decisions:"decisionLab",dividends:"dividends",simulator:"investmentsAdvanced",weekly:"weeklyPlan"};
      if(viewFeatures[view]&&!canUseFeature(viewFeatures[view])){e.preventDefault();e.stopImmediatePropagation();openPremiumModal(viewFeatures[view]);return}
    }
    var target=e.target.closest("button");if(!target)return;
    if(target.id==="exportJsonBtn"||target.id==="importJsonBtn"){if(!canUseFeature("jsonBackup")){e.preventDefault();e.stopImmediatePropagation();openPremiumModal("jsonBackup");return}}
    if(target.id==="recalculateGoal"||target.id==="useComputedGoal"){if(!canUseFeature("smartGoal")){e.preventDefault();e.stopImmediatePropagation();openPremiumModal("smartGoal");return}}
    if(target.id==="registerAutoYields"||target.id==="saveDividend"){if(!canUseFeature("dividends")){e.preventDefault();e.stopImmediatePropagation();openPremiumModal("dividends");return}}
    var state=currentState()||{};
    if(target.id==="saveInv"&&!editing('investment')&&limitReached("investments",(state.investments||[]).length)){e.preventDefault();e.stopImmediatePropagation();openPremiumModal("investmentsAdvanced","Você já cadastrou 3 investimentos no plano gratuito. Seus dados continuam visíveis; o Premium libera novos ativos e análises avançadas.");return}
    if(target.id==="saveDebt"&&!editing('debt')&&limitReached("debts",(state.debts||[]).length)){e.preventDefault();e.stopImmediatePropagation();openPremiumModal("debtsAdvanced","O plano gratuito permite acompanhar 1 dívida. Seus registros não serão apagados; o Premium libera novos financiamentos e projeções.");return}
    if(target.id==="saveBudget"&&limitReached("budgets",(state.budgets||[]).length)){e.preventDefault();e.stopImmediatePropagation();openPremiumModal("advancedAnalysis","O plano gratuito permite 5 orçamentos simples. O Premium libera planejamento ampliado.");return}
  },true);
}
function markPremiumPreviews(){
  if(APP_ENV.paymentProvider==="free"){document.querySelectorAll('.premium-lock-note').forEach(function(x){x.remove()});return}
  var map={weekly:"weeklyPlan",analysis:"advancedAnalysis",projection:"futureCashflowExtended",decisions:"decisionLab",dividends:"dividends",simulator:"investmentsAdvanced"};
  Object.keys(map).forEach(function(view){document.querySelectorAll('[data-view="'+view+'"],[data-more-target="'+view+'"],[data-menu-view="'+view+'"]').forEach(function(btn){if(!btn.querySelector(".premium-lock-note"))btn.insertAdjacentHTML("beforeend",' <span class="premium-lock-note">Premium</span>')})});
}
function registerServiceWorker(){
 if(!("serviceWorker"in navigator)||location.protocol!=="https:")return;
 navigator.serviceWorker.register("./service-worker.js",{updateViaCache:"none"}).then(function(registration){registration.update().catch(function(){})}).catch(function(err){console.warn("Service worker indisponível:",err)});
}
// Volta do link de pagamento (configure na Stripe: "após o pagamento, redirecionar para ...?assinatura=ok").
// O aviso da Stripe pode levar alguns segundos: confere o acesso algumas vezes e recarrega quando liberar.
function handleCheckoutReturn(){
  var params=new URLSearchParams(location.search);if(params.get("assinatura")!=="ok")return;
  params.delete("assinatura");history.replaceState(null,"",location.pathname+(params.toString()?"?"+params:"")+location.hash);
  notify("Pagamento recebido! Estamos liberando seu Premium.");
  var tries=0;(function check(){
    tries++;if(typeof window.verifyNorteiaAccess!=="function"){if(tries<6)setTimeout(check,3000);return}
    Promise.resolve(window.verifyNorteiaAccess()).then(function(access){
      if(access&&access.entitlement&&access.entitlement.has_access){location.reload();return}
      if(tries<6)setTimeout(check,3000);else notify("Seu pagamento está sendo confirmado. Toque em Atualizar status em Configurações em instantes.");
    }).catch(function(){if(tries<6)setTimeout(check,3000)});
  })();
}
ensureModal();installGates();markPremiumPreviews();registerServiceWorker();handleCheckoutReturn();
window.addEventListener('norteia:rendered',renderPlanPanel);
renderPlanPanel();
window.HOTMART_CHECKOUT_URL=HOTMART_CHECKOUT_URL;
window.FREE_LIMITS=FREE_LIMITS;
window.FEATURES=FEATURES;
window.APP_ENV=APP_ENV;
window.PaymentProviders=PaymentProviders;
window.detectPlatform=detectPlatform;
window.hasPremiumAccess=hasPremiumAccess;
window.canUseFeature=canUseFeature;
window.requirePremium=requirePremium;
window.openPremiumModal=openPremiumModal;
window.NorteiaCheckout={start:function(){return PaymentProviders[checkoutProvider()].startCheckout()},provider:checkoutProvider};
})();
