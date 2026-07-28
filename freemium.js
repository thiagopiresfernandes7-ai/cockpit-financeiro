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
var APP_ENV={platform:platform.isPwa?"pwa":"web",paymentProvider:"hotmart"};
var PaymentProviders={
  hotmart:{startCheckout:function(){window.open(HOTMART_CHECKOUT_URL,"_blank","noopener,noreferrer")}},
  googlePlay:{startCheckout:function(){return false}},
  appStore:{startCheckout:function(){return false}}
};
function blankSubscription(){return{plan:"free",status:"inactive",provider:"none",providerUserId:"",providerSubscriptionId:"",startedAt:"",expiresAt:"",renewedAt:"",cancelledAt:"",lastWebhookAt:""}}
function normalizeSubscription(input){
  var result=Object.assign(blankSubscription(),input||{});
  if(!["free","premium"].includes(result.plan))result.plan="free";
  if(!["inactive","active","past_due","cancelled","expired","trialing"].includes(result.status))result.status="inactive";
  return result;
}
function hasPremiumAccess(financialState){
  var sub=normalizeSubscription(financialState&&financialState.subscription);
  if(sub.plan!=="premium")return false;
  if(!["active","trialing"].includes(sub.status))return false;
  if(sub.expiresAt&&!isNaN(new Date(sub.expiresAt).getTime())&&new Date(sub.expiresAt)<new Date())return false;
  return true;
}
function canUseFeature(featureId){
  var feature=FEATURES[featureId];
  if(!feature||feature.plan==="free")return true;
  return hasPremiumAccess(window.state||state);
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
  modal.innerHTML='<div class="premium-card" role="dialog" aria-modal="true" aria-labelledby="premiumModalTitle"><span class="premium-badge">NORTEIA PREMIUM</span><h2 id="premiumModalTitle">Desbloqueie o Norteia Premium</h2><p id="premiumModalText">Planeje dívidas, investimentos e seu futuro financeiro com mais clareza.</p><ul><li>Fluxo de caixa futuro</li><li>Dívidas e financiamentos</li><li>Investimentos e dividendos</li><li>Análise anual e objetivo inteligente</li><li>Plano da Semana e fechamento mensal</li></ul><div class="premium-price">7 dias grátis, depois R$ 19,90 por ano</div><div class="premium-actions"><button class="btn primary" id="premiumCheckoutBtn" type="button">Assinar pela Hotmart</button><button class="btn" id="premiumCloseBtn" type="button">Continuar no gratuito</button></div><p class="notice tiny">O plano gratuito continua disponível. A liberação Premium depende da confirmação segura do pagamento.</p></div>';
  document.body.appendChild(modal);
  document.getElementById("premiumCloseBtn").onclick=closePremiumModal;
  document.getElementById("premiumCheckoutBtn").onclick=function(){PaymentProviders[APP_ENV.paymentProvider].startCheckout()};
  modal.onclick=function(e){if(e.target===modal)closePremiumModal()};
}
function openPremiumModal(featureId,message){
  ensureModal();
  var modal=document.getElementById("premiumFeatureModal");
  document.getElementById("premiumModalText").textContent=message||("“"+featureCopy(featureId)+"” está disponível no Norteia Premium. O plano gratuito continua funcionando normalmente.");
  document.getElementById("premiumCheckoutBtn").style.display=APP_ENV.paymentProvider==="hotmart"&&!platform.isNative?"":"none";
  modal.classList.remove("hidden");modal.setAttribute("aria-hidden","false");
}
function closePremiumModal(){var modal=document.getElementById("premiumFeatureModal");if(modal){modal.classList.add("hidden");modal.setAttribute("aria-hidden","true")}}
function requirePremium(featureId,callback){if(canUseFeature(featureId)){if(typeof callback==="function")callback();return true}openPremiumModal(featureId);return false}
function syncEntitlement(){
  if(typeof state==="undefined"||!state)return;
  state.subscription=normalizeSubscription(state.subscription);
  var ent=typeof appAccess!=="undefined"&&appAccess&&appAccess.entitlement?appAccess.entitlement:{};
  if(ent&&ent.has_access){
    state.subscription=normalizeSubscription(Object.assign({},state.subscription,{plan:"premium",status:ent.status==="trialing"?"trialing":"active",provider:ent.provider||"hotmart",providerSubscriptionId:ent.provider_subscription_id||state.subscription.providerSubscriptionId,startedAt:ent.started_at||state.subscription.startedAt,expiresAt:ent.expires_at||state.subscription.expiresAt,renewedAt:ent.renewed_at||state.subscription.renewedAt,lastWebhookAt:ent.last_webhook_at||state.subscription.lastWebhookAt}));
  }
  if(state.subscription.expiresAt&&new Date(state.subscription.expiresAt)<new Date()&&state.subscription.status==="active")state.subscription.status="expired";
}
function planMessage(){
  var sub=normalizeSubscription(state&&state.subscription);
  if(hasPremiumAccess(state))return"Norteia Premium ativo"+(sub.expiresAt?" até "+formatDate(sub.expiresAt):".");
  if(sub.status==="cancelled")return"Seu Premium foi cancelado"+(sub.expiresAt?" e ficará disponível até "+formatDate(sub.expiresAt):".");
  if(sub.status==="expired")return"Seu Premium expirou. Seus dados permanecem preservados.";
  return"Você está no plano gratuito.";
}
function renderPlanPanel(){
  if(typeof state==="undefined"||!state)return;
  syncEntitlement();
  var settings=document.getElementById("settings");if(!settings)return;
  var panel=document.getElementById("subscriptionPlanPanel");
  if(!panel){panel=document.createElement("div");panel.id="subscriptionPlanPanel";panel.className="panel";panel.style.marginTop="14px";var head=settings.querySelector(".page-head");if(head)head.insertAdjacentElement("afterend",panel);else settings.prepend(panel)}
  var sub=normalizeSubscription(state.subscription),premium=hasPremiumAccess(state);
  panel.innerHTML='<div class="plan-panel-grid"><div><span class="premium-badge">'+(premium?"PREMIUM":"PLANO GRATUITO")+'</span><h2 style="margin:8px 0 4px">Plano</h2><p>'+planMessage()+'</p><div class="label">Status: '+sub.status+' • Provedor: '+sub.provider+' • Início: '+formatDate(sub.startedAt)+' • Validade: '+formatDate(sub.expiresAt)+'</div></div><div class="split"><button class="btn primary" id="planSubscribeBtn" type="button">'+(premium?"Ver benefícios":"Assinar Premium")+'</button><button class="btn" id="planRefreshBtn" type="button">Atualizar status</button></div></div>';
  document.getElementById("planSubscribeBtn").onclick=function(){openPremiumModal("advancedAnalysis")};
  document.getElementById("planRefreshBtn").onclick=async function(){this.disabled=true;try{if(typeof verifyCockpitAccess==="function")await verifyCockpitAccess();syncEntitlement();renderPlanPanel();if(typeof scheduleSave==="function")scheduleSave();if(typeof toast==="function")toast("Status da assinatura atualizado.")}finally{this.disabled=false}};
}
function limitReached(kind,count){
  if(hasPremiumAccess(state))return false;
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
    if(target.id==="saveInv"&&!editingInvestmentId&&limitReached("investments",(state.investments||[]).length)){e.preventDefault();e.stopImmediatePropagation();openPremiumModal("investmentsAdvanced","Você já cadastrou 3 investimentos no plano gratuito. Seus dados continuam visíveis; o Premium libera novos ativos e análises avançadas.");return}
    if(target.id==="saveDebt"&&!editingDebtId&&limitReached("debts",(state.debts||[]).length)){e.preventDefault();e.stopImmediatePropagation();openPremiumModal("debtsAdvanced","O plano gratuito permite acompanhar 1 dívida. Seus registros não serão apagados; o Premium libera novos financiamentos e projeções.");return}
    if(target.id==="saveBudget"&&limitReached("budgets",(state.budgets||[]).length)){e.preventDefault();e.stopImmediatePropagation();openPremiumModal("advancedAnalysis","O plano gratuito permite 5 orçamentos simples. O Premium libera planejamento ampliado.");return}
  },true);
}
function markPremiumPreviews(){
  var map={weekly:"weeklyPlan",analysis:"advancedAnalysis",projection:"futureCashflowExtended",decisions:"decisionLab",dividends:"dividends",simulator:"investmentsAdvanced"};
  Object.keys(map).forEach(function(view){document.querySelectorAll('[data-view="'+view+'"],[data-more-target="'+view+'"],[data-menu-view="'+view+'"]').forEach(function(btn){if(!btn.querySelector(".premium-lock-note"))btn.insertAdjacentHTML("beforeend",' <span class="premium-lock-note">Premium</span>')})});
}
function registerServiceWorker(){if("serviceWorker"in navigator&&location.protocol==="https:")navigator.serviceWorker.register("./service-worker.js").catch(function(err){console.warn("Service worker indisponível:",err)})}
ensureModal();installGates();markPremiumPreviews();registerServiceWorker();
var originalRender=typeof render==="function"?render:null;
if(originalRender){render=function(){var out=originalRender.apply(this,arguments);renderPlanPanel();return out}}
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
})();
