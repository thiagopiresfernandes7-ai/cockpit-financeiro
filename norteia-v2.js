(function(){
'use strict';
function cleanCopy(){
  var replacements={
    'Início / Dashboard':'Visão geral',
    'Análise':'Análises',
    'Extrato':'Movimentações',
    'Investimentos':'Carteira',
    'Plano da Semana':'Plano semanal',
    'Decisões de compra':'Comprar ou esperar',
    'Income stream':'Renda recorrente',
    'Investment lab':'Planejamento de longo prazo',
    'App menu':'Sua conta',
    'Visualizando julho de 2026':'Julho de 2026'
  };
  document.querySelectorAll('.nav-hub button,.overline,#monthHint').forEach(function(el){
    var text=el.textContent.trim();
    if(replacements[text])el.textContent=replacements[text];
  });
  var walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
  var textNodes=[],current;
  while((current=walker.nextNode()))if(!/^(SCRIPT|STYLE|TEXTAREA)$/.test(current.parentElement&&current.parentElement.tagName||''))textNodes.push(current);
  textNodes.forEach(function(node){
    var value=node.nodeValue;
    var fixed=value
      .replace(/Cockpit Financeiro/g,'Norteia')
      .replace(/Cockpit/g,'Norteia')
      .replace(/Plano da Semana/g,'Plano semanal')
      .replace(/Income stream/g,'Renda recorrente')
      .replace(/Investment lab/g,'Planejamento de longo prazo')
      .replace(/Identity & security/g,'Identidade e segurança')
      .replace(/Support deck/g,'Central de ajuda')
      .replace(/App menu/g,'Sua conta')
      .replace(/Adicionar Ã /g,'Adicionar à')
      .replace(/Ã—/g,'×');
    if(fixed!==value)node.nodeValue=fixed;
  });
  document.querySelectorAll('.nav-hub button').forEach(function(button){
    Array.from(button.childNodes).forEach(function(node){
      if(node.nodeType===3&&/Premium/i.test(node.nodeValue||''))node.nodeValue=(node.nodeValue||'').replace(/Premium/ig,'');
    });
    var premium=Array.from(button.querySelectorAll('*')).find(function(el){return el.textContent.trim()==='Premium'});
    if(premium){premium.textContent='Pro';premium.classList.add('premium-label')}
  });
  document.documentElement.dataset.norteiaDesign='2';
}
function setTheme(theme){
  theme=theme==='dark'?'dark':'light';
  document.documentElement.dataset.theme=theme;
  try{localStorage.setItem('norteia_theme',theme)}catch(e){}
  document.querySelectorAll('[data-theme-choice]').forEach(function(button){
    var selected=button.dataset.themeChoice===theme;
    button.classList.toggle('active',selected);
    button.setAttribute('aria-pressed',String(selected));
  });
}
function addThemePreference(){
  var settings=document.getElementById('settings');
  if(!settings||document.getElementById('norteiaAppearance'))return;
  var panel=document.createElement('div');
  panel.id='norteiaAppearance';
  panel.className='panel norteia-appearance';
  panel.innerHTML='<div><div class="overline">Aparência</div><h2>Escolha como o Norteia aparece</h2><p>Use o tema que fica mais confortável para você. A escolha será lembrada neste aparelho.</p></div><div class="theme-picker" role="group" aria-label="Tema do aplicativo"><button type="button" data-theme-choice="light"><span class="theme-preview theme-preview-light"></span><b>Claro</b><small>Leve e luminoso</small></button><button type="button" data-theme-choice="dark"><span class="theme-preview theme-preview-dark"></span><b>Escuro</b><small>Confortável à noite</small></button></div>';
  var head=settings.querySelector('.page-head');
  if(head)head.insertAdjacentElement('afterend',panel);else settings.prepend(panel);
  panel.addEventListener('click',function(event){
    var choice=event.target.closest('[data-theme-choice]');
    if(choice)setTheme(choice.dataset.themeChoice);
  });
  setTheme(document.documentElement.dataset.theme);
}
function normalizePrimaryNavigation(){
  document.querySelectorAll('[data-view="dashboard"]').forEach(function(button){var label=button.querySelector('.ico');button.textContent='';if(label)button.appendChild(label);button.appendChild(document.createTextNode('Hoje'))});
  document.querySelectorAll('[data-view="register"]').forEach(function(button){var label=button.querySelector('.ico');button.textContent='';if(label)button.appendChild(label);button.appendChild(document.createTextNode('Movimentos'))});
  var desktop=document.querySelector('.desktop-nav'),official=new Set(['dashboard','register','plan','community']);if(desktop){desktop.querySelectorAll('button[data-view]').forEach(function(button){button.hidden=!official.has(button.dataset.view);if(button.dataset.view==='plan'){var icon=button.querySelector('.ico');button.textContent='';if(icon)button.appendChild(icon);button.appendChild(document.createTextNode('Planos'))}});desktop.querySelectorAll('.nav-section').forEach(function(section){section.hidden=!section.querySelector('button[data-view]:not([hidden])')})}
  var mobile=document.querySelector('.mobile-nav');
  if(!mobile)return;
  var analysis=mobile.querySelector('[data-view="analysis"]'),more=mobile.querySelector('[data-view="more"]'),plans=mobile.querySelector('[data-view="wallet"]');
  if(analysis)analysis.hidden=true;if(more)more.hidden=true;
  if(plans){plans.dataset.view='plan';plans.innerHTML='<span class="ico" aria-hidden="true"></span>Planos'}
  if(!document.getElementById('mobilePrimaryAdd')){var add=document.createElement('button');add.id='mobilePrimaryAdd';add.type='button';add.className='mobile-primary-add';add.innerHTML='<span aria-hidden="true">+</span><small>Adicionar</small>';add.addEventListener('click',function(){if(window.openRegisterSheet)window.openRegisterSheet()});var community=mobile.querySelector('[data-view="community"]');mobile.insertBefore(add,community||plans&&plans.nextSibling||null)}
}
function addAccessibilityGuards(){
  if(document.documentElement.dataset.norteiaA11y)return;document.documentElement.dataset.norteiaA11y='true';var returnFocus=null;
  document.addEventListener('click',function(event){var opener=event.target.closest('#globalAddBtn,#desktopGlobalAddBtn,#topGlobalAddBtn,[data-community-mobile="compose"],[data-community-mobile="search"],[data-action="my-profile"]');if(opener)returnFocus=opener},true);
  document.addEventListener('keydown',function(event){
    var overlays=Array.from(document.querySelectorAll('dialog[open],.community-full-screen:not(.hidden),.community-bottom-sheet:not(.hidden),.community-image-viewer:not(.hidden),#launchWorkspace:not(.hidden),#registerActionSheet:not(.hidden)')),overlay=overlays[overlays.length-1];if(!overlay)return;
    if(event.key==='Escape'){var close=overlay.querySelector('[data-action="close-dialog"],[data-community-mobile^="close-"],[data-community-mobile="cancel-compose"],#closeLaunchWorkspace,#closeRegisterSheet');if(close){event.preventDefault();close.click();setTimeout(function(){if(returnFocus&&returnFocus.isConnected)returnFocus.focus()},0)}return}
    if(event.key!=='Tab')return;var focusable=Array.from(overlay.querySelectorAll('button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])')).filter(function(element){return element.getClientRects().length});if(!focusable.length)return;var first=focusable[0],last=focusable[focusable.length-1];if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus()}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus()}
  });
}
function watch(){
  cleanCopy();
  addThemePreference();
  normalizePrimaryNavigation();
  addAccessibilityGuards();
  var observer=new MutationObserver(function(records){
    if(records.some(function(record){return record.type==='childList'||record.type==='characterData'}))cleanCopy();
  });
  var nav=document.getElementById('nav');
  if(nav)observer.observe(nav,{subtree:true,childList:true,characterData:true});
  var content=document.querySelector('.content');
  if(content)observer.observe(content,{subtree:true,childList:true,characterData:true});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',watch);else watch();
})();
