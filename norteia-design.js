/* Norteia — ícones da navegação.
   Os botões de navegação são recriados por outros módulos; um MutationObserver
   recoloca os ícones sempre que um botão aparece sem eles. Só usa SVG estático. */
(function(){
  "use strict";
  var P={
    dashboard:'<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M10 21v-6h4v6"/>',
    analysis:'<path d="M3 3v18h18"/><path d="M8 17v-5M13 17V8M18 17v-8"/>',
    register:'<path d="M7 20V4M3 8l4-4 4 4"/><path d="M17 4v16M13 16l4 4 4-4"/>',
    wallet:'<path d="M3 17l6-6 4 4 8-8"/><path d="M14 7h7v7"/>',
    debts:'<rect x="2.5" y="5" width="19" height="14" rx="2"/><path d="M2.5 10h19M6.5 15h4"/>',
    dividends:'<circle cx="8.5" cy="8.5" r="5.5"/><path d="M17.6 10.4a5.5 5.5 0 1 1-7.2 7.2"/>',
    simulator:'<rect x="4" y="2.5" width="16" height="19" rx="2"/><path d="M8 7h8M8 12h.01M12 12h.01M16 12h.01M8 16h.01M12 16h.01M16 16h.01"/>',
    plan:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
    projection:'<path d="M3 3v18h18"/><path d="M7 15l4-4 3 3 6-7"/>',
    decisions:'<path d="M12 3v18M7 21h10M5 7h14"/><path d="M5 7l-3 7a3.2 3.2 0 0 0 6 0zM19 7l-3 7a3.2 3.2 0 0 0 6 0z"/>',
    weekly:'<rect x="3" y="4.5" width="18" height="17" rx="2"/><path d="M16 2.5v4M8 2.5v4M3 10h18"/>',
    community:'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/>',
    profile:'<circle cx="12" cy="8" r="4"/><path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1"/>',
    categories:'<path d="M20.6 13.4l-7.2 7.2a2 2 0 0 1-2.8 0L2 12V2h10l8.6 8.6a2 2 0 0 1 0 2.8z"/><circle cx="7" cy="7" r="1.5"/>',
    settings:'<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>',
    help:'<circle cx="12" cy="12" r="9.5"/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3M12 17h.01"/>',
    more:'<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    add:'<path d="M12 5v14M5 12h14"/>',
    quick_expense:'<path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/>',
    income:'<path d="M17 17 7 7M7 16V7h9"/>',
    expense:'<path d="M7 7l10 10M17 8v9H8"/>',
    investment:'<path d="M3 17l6-6 4 4 8-8"/><path d="M14 7h7v7"/>',
    dividend:'<circle cx="8.5" cy="8.5" r="5.5"/><path d="M17.6 10.4a5.5 5.5 0 1 1-7.2 7.2"/>',
    installment:'<path d="M12 2 2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5M2 12l10 5 10-5"/>',
    debt:'<rect x="2.5" y="5" width="19" height="14" rx="2"/><path d="M2.5 10h19M6.5 15h4"/>',
    transfer:'<path d="M17 3l4 4-4 4M3 7h18M7 21l-4-4 4-4M21 17H3"/>',
    import:'<path d="M12 3v12M7 8l5-5 5 5"/><path d="M5 15v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4"/>'
  };
  function icon(name){
    var span=document.createElement("span");
    span.className="n-ico";span.setAttribute("aria-hidden","true");
    span.innerHTML='<svg viewBox="0 0 24 24">'+(P[name]||P.more)+"</svg>";
    return span;
  }
  function decorate(){
    document.querySelectorAll(".nav-hub button[data-view],.mobile-nav button[data-view]").forEach(function(btn){
      if(btn.querySelector(".n-ico"))return;
      if(!btn.title)btn.title=btn.textContent.trim();
      btn.insertBefore(icon(btn.dataset.view),btn.firstChild);
    });
    var add=document.getElementById("mobilePrimaryAdd");
    if(add&&!add.querySelector(".n-ico")){add.insertBefore(icon("add"),add.firstChild);add.setAttribute("aria-label","Adicionar lançamento")}
    document.querySelectorAll(".sheet-grid button[data-register-action]").forEach(function(btn){
      if(btn.querySelector(".n-ico"))return;
      btn.insertBefore(icon(btn.dataset.registerAction),btn.firstChild);
    });
    document.querySelectorAll("#more .more-card[data-more-target]").forEach(function(card){
      if(card.querySelector(".n-ico"))return;
      var text=document.createElement("span");text.className="n-more-text";
      Array.prototype.slice.call(card.children).forEach(function(child){if(child.tagName==="B"||child.tagName==="SMALL")text.appendChild(child)});
      card.insertBefore(text,card.firstChild);
      card.insertBefore(icon(card.dataset.moreTarget),text);
    });
  }
  var pending=false;
  function schedule(){if(pending)return;pending=true;requestAnimationFrame(function(){pending=false;decorate()})}
  function start(){
    decorate();
    new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true});
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start);else start();
})();
