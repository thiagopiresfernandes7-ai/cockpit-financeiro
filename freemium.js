(function(){
"use strict";

var HOTMART_CHECKOUT_URL="https://pay.hotmart.com/D106828019V";
var FREE_LIMITS={investments:Infinity,debts:Infinity,budgets:Infinity,futureProjectionMonths:Infinity,recurringRules:Infinity,smartAlerts:Infinity,quickTemplates:Infinity};
var FEATURES={
  smartGoal:{label:"Objetivo Financeiro Inteligente",plan:"free"},
  weeklyPlan:{label:"Plano da Semana",plan:"free"},
  advancedAnalysis:{label:"Analise avancada",plan:"free"},
  futureCashflowExtended:{label:"Fluxo de caixa futuro avancado",plan:"free"},
  debtsAdvanced:{label:"Dividas e financiamentos",plan:"free"},
  investmentsAdvanced:{label:"Investimentos avancados",plan:"free"},
  dividends:{label:"Dividendos e rendimentos",plan:"free"},
  decisionLab:{label:"Decisoes de compra",plan:"free"},
  monthlyClosing:{label:"Fechamento mensal",plan:"free"},
  jsonBackup:{label:"Backup JSON",plan:"free"}
};

function detectPlatform(){
  var ua=navigator.userAgent||"";
  var standalone=!!((window.matchMedia&&window.matchMedia("(display-mode: standalone)").matches)||window.navigator.standalone);
  return {isWeb:true,isPwa:standalone,isAndroid:/Android/i.test(ua),isIOS:/iPhone|iPad|iPod/i.test(ua),isNative:false};
}

var platform=detectPlatform();
var APP_ENV={platform:platform.isPwa?"pwa":"web",paymentProvider:"free"};
var PaymentProviders={
  hotmart:{startCheckout:function(){window.open(HOTMART_CHECKOUT_URL,"_blank","noopener,noreferrer")}},
  googlePlay:{startCheckout:function(){return false}},
  appStore:{startCheckout:function(){return false}},
  free:{startCheckout:function(){return true}}
};

function blankSubscription(){return{plan:"premium",status:"active",provider:"free",providerUserId:"",providerSubscriptionId:"free-access",startedAt:"",expiresAt:"",renewedAt:"",cancelledAt:"",lastWebhookAt:""}}
function normalizeSubscription(input){return Object.assign(blankSubscription(),input||{}, {plan:"premium",status:"active",provider:"free"})}
function hasPremiumAccess(){return true}
function canUseFeature(){return true}
function requirePremium(featureId,callback){if(typeof callback==="function")callback();return true}
function openPremiumModal(){return true}
function closePremiumModal(){}
function limitReached(){return false}
function syncEntitlement(){if(typeof state!=="undefined"&&state)state.subscription=normalizeSubscription(state.subscription)}
function planMessage(){return"Todas as funcoes estao liberadas gratuitamente no desktop, mobile e PWA."}

function renderPlanPanel(){
  if(typeof state==="undefined"||!state)return;
  syncEntitlement();
  var settings=document.getElementById("settings");if(!settings)return;
  var panel=document.getElementById("subscriptionPlanPanel");
  if(!panel){
    panel=document.createElement("div");
    panel.id="subscriptionPlanPanel";
    panel.className="panel";
    panel.style.marginTop="14px";
    var head=settings.querySelector(".page-head");
    if(head)head.insertAdjacentElement("afterend",panel);else settings.prepend(panel);
  }
  panel.innerHTML='<div class="plan-panel-grid"><div><span class="premium-badge">ACESSO GRATUITO</span><h2 style="margin:8px 0 4px">Plano</h2><p>'+planMessage()+'</p><div class="label">Sem bloqueio de telas, sem limite de investimentos, dividas, orcamentos, analises, exportacoes ou recursos avancados.</div></div><div class="split"><button class="btn" id="planRefreshBtn" type="button">Atualizar status</button></div></div>';
  var refresh=document.getElementById("planRefreshBtn");
  if(refresh)refresh.onclick=async function(){
    this.disabled=true;
    try{
      syncEntitlement();
      renderPlanPanel();
      if(typeof scheduleSave==="function")scheduleSave();
      if(typeof toast==="function")toast("Acesso gratuito confirmado.");
    }finally{this.disabled=false}
  };
}

function ensureFreeAccessStyles(){
  if(document.getElementById("freeAccessStyles"))return;
  var style=document.createElement("style");
  style.id="freeAccessStyles";
  style.textContent=".premium-feature-modal{display:none!important}.premium-lock-note{display:none!important}.premium-badge{display:inline-flex;padding:6px 10px;border-radius:999px;background:rgba(54,228,198,.12);color:var(--teal);font-size:11px;font-weight:900}.plan-panel-grid{display:grid;grid-template-columns:1fr auto;gap:14px;align-items:center}@media(max-width:780px){.plan-panel-grid{grid-template-columns:1fr}}";
  document.head.appendChild(style);
}
function installGates(){document.documentElement.setAttribute("data-free-access","all")}
function markPremiumPreviews(){document.querySelectorAll(".premium-lock-note").forEach(function(x){x.remove()})}
function registerServiceWorker(){if("serviceWorker"in navigator&&location.protocol==="https:")navigator.serviceWorker.register("./service-worker.js").catch(function(err){console.warn("Service worker indisponivel:",err)})}

ensureFreeAccessStyles();
installGates();
markPremiumPreviews();
registerServiceWorker();

var originalRender=typeof render==="function"?render:null;
if(originalRender){render=function(){var out=originalRender.apply(this,arguments);renderPlanPanel();markPremiumPreviews();return out}}

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
window.closePremiumModal=closePremiumModal;
})();
