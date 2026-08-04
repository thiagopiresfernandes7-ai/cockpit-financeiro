(function(){
'use strict';

var state={open:false,imageUrl:'',profile:null};
var RESERVED=['admin','administrador','norteia','suporte','support','oficial','moderador','moderacao','sistema','root','null','undefined'];
function byId(id){return document.getElementById(id)}
function esc(value){return String(value==null?'':value).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function cleanLabel(value){
 var text=String(value==null?'':value),replacements={
  'DÃºvida':'Dúvida','OrganizaÃ§Ã£o financeira':'Organização financeira','DÃ­vidas':'Dívidas',
  'AÃ§Ãµes':'Ações','OpiniÃ£o':'Opinião','NotÃ­cia':'Notícia',
  'Fundos imobiliÃ¡rios':'Fundos imobiliários'
 };
 for(var bad in replacements)text=text.split(bad).join(replacements[bad]);
 return text;
}
function icon(name){var paths={
 search:'<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
 bell:'<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/>',
 heart:'<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5a5.5 5.5 0 0 0 1-8.9Z"/>',
 comment:'<path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z"/>',
 repost:'<path d="m17 1 4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="m7 23-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>',
 share:'<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 10.5 6.8-4M8.6 13.5l6.8 4"/>',
 bookmark:'<path d="M6 3h12v18l-6-4-6 4Z"/>',
 trash:'<path d="M4 7h16"/><path d="M9 7V4h6v3"/><path d="m7 7 1 14h8l1-14"/><path d="M10 11v6M14 11v6"/>',
 photo:'<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/>',
 close:'<path d="m6 6 12 12M18 6 6 18"/>',
 chevron:'<path d="m9 18 6-6-6-6"/>',
 more:'<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>'
 };return'<svg class="community-icon" viewBox="0 0 24 24" aria-hidden="true">'+(paths[name]||'')+'</svg>'}
function friendlyUsername(profile){
 var username=String(profile&&profile.username||'');
 if(!username||/^u_[a-f0-9]{8,}$/i.test(username)){
  return String(profile&&profile.display_name||'pessoa').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9._]/g,'').slice(0,18)||'pessoa';
 }
 return username;
}
function relativeTime(value){
 var date=new Date(value),seconds=Math.max(0,Math.round((Date.now()-date.getTime())/1000));
 if(seconds<45)return'agora';
 if(seconds<3600)return Math.floor(seconds/60)+' min';
 if(seconds<86400)return Math.floor(seconds/3600)+' h';
 if(seconds<604800)return Math.floor(seconds/86400)+' d';
 return new Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:'short'}).format(date).replace('.','');
}
function toast(message,type){
 var element=byId('communityMobileToast');if(!element)return;
 element.textContent=message;element.dataset.type=type||'success';element.classList.add('show');
 clearTimeout(element._timer);element._timer=setTimeout(function(){element.classList.remove('show')},2600);
}
function currentProfile(){
 var user=window.cockpitUser||{},metadata=user.user_metadata||{};
 return state.profile||{display_name:metadata.full_name||String(user.email||'Pessoa').split('@')[0],username:''};
}
function avatarMarkup(profile){
 var initial=String(profile.display_name||'N').charAt(0).toUpperCase();
 return profile.avatar_url?'<img src="'+esc(profile.avatar_url)+'" alt="">':esc(initial);
}
function buildLayer(){
 var section=byId('community');if(!section||byId('communityMobileLayer'))return;
 var legacyShell=section.querySelector('.community-shell'),feed=byId('communityFeed');
 legacyShell.classList.add('community-legacy-shell');
 var layer=document.createElement('div');layer.id='communityMobileLayer';layer.className='community-mobile-layer';
 layer.innerHTML='<header class="community-mobile-header"><h1>Comunidade</h1><div><button data-community-mobile="search" aria-label="Pesquisar">'+icon('search')+'</button><button data-community-mobile="notifications" aria-label="Notificações">'+icon('bell')+'</button><button data-community-mobile="profile" class="community-mini-avatar" aria-label="Abrir meu perfil">N</button></div></header>'+
 '<nav class="community-primary-tabs" aria-label="Feed da Comunidade"><button class="active" data-community-tab="for_you">Para você</button><button data-community-tab="following">Seguindo</button><button data-community-mobile="achievements">Conquistas</button></nav>'+
 '<button class="community-compact-composer" data-community-mobile="compose"><span class="community-avatar">N</span><span>Compartilhe algo sobre sua jornada financeira…</span><b>Publicar</b></button>'+
 '<div id="communityMobileFeed"></div><p class="community-mobile-disclaimer">Conteúdo educativo. Não constitui recomendação de investimento.</p>';
 section.insertBefore(layer,legacyShell);
 byId('communityMobileFeed').appendChild(feed);
 section.insertAdjacentHTML('beforeend',
 '<div id="communityMobileToast" class="community-mobile-toast" role="status" aria-live="polite"></div>'+
 '<div id="communityComposerScreen" class="community-full-screen hidden" role="dialog" aria-modal="true" aria-labelledby="communityComposerTitle">'+
  '<header><button data-community-mobile="cancel-compose">Cancelar</button><h2 id="communityComposerTitle">Nova publicação</h2><button id="communityMobilePublish" disabled>Publicar</button></header>'+
  '<main><div class="community-compose-author"><span class="community-avatar">N</span><div><b id="communityComposeName">Você</b><small id="communityComposeUsername">@pessoa</small></div></div>'+
  '<textarea id="communityMobileText" maxlength="1000" placeholder="Compartilhe algo sobre sua jornada financeira…" aria-label="Texto da publicação"></textarea>'+
  '<div class="community-character-count"><span id="communityMobileCount">0</span>/1000</div><div id="communityMobileImagePreview" class="community-compose-preview hidden"></div>'+
  '<div class="community-compose-tools"><button id="communityMobilePhoto">'+icon('photo')+'<span>Adicionar foto</span></button><button id="communityMobileCategory"><span id="communityMobileCategoryLabel">Categoria</span>'+icon('chevron')+'</button></div><label class="community-compose-field"><span>Quem pode ver</span><select id="communityMobileVisibility"><option value="public">Todos</option><option value="followers">Seguidores</option><option value="private">Somente eu</option></select></label><label id="communityMobileAltField" class="community-compose-field hidden"><span>Descrição da imagem</span><input id="communityMobileImageAlt" maxlength="300" placeholder="Ex.: gráfico mostrando progresso da meta"></label>'+
  '<p class="community-financial-warning">Não publique documentos, saldos, dados bancários ou informações pessoais.</p><button class="community-rules-link" data-community-mobile="rules">Ver regras da Comunidade</button></main>'+
 '</div>'+
 '<div id="communityCategorySheet" class="community-bottom-sheet hidden" role="dialog" aria-modal="true" aria-labelledby="communityCategoryTitle"><button class="community-sheet-backdrop" data-community-mobile="close-category" aria-label="Fechar"></button><div class="community-sheet-panel"><div class="community-sheet-handle"></div><header><h2 id="communityCategoryTitle">Escolha uma categoria</h2><button data-community-mobile="close-category" aria-label="Fechar">'+icon('close')+'</button></header><div id="communityMobileCategoryOptions"></div></div></div>'+
 '<div id="communitySearchScreen" class="community-full-screen hidden" role="dialog" aria-modal="true" aria-labelledby="communitySearchTitle"><header><button data-community-mobile="close-search">Cancelar</button><h2 id="communitySearchTitle">Pesquisar</h2><span></span></header><main><label class="community-search-field">'+icon('search')+'<input id="communityMobileSearch" autocomplete="off" placeholder="Posts, pessoas, #hashtags ou categorias"></label><div class="community-search-kinds"><button class="active">Tudo</button><button>Pessoas</button><button>Hashtags</button><button>Categorias</button></div><div id="communityMobileSearchState"><p>Encontre conversas, pessoas e assuntos da Comunidade.</p></div></main></div>'+
 '<div id="communityImageViewer" class="community-image-viewer hidden" role="dialog" aria-modal="true"><button data-community-mobile="close-image" aria-label="Fechar">'+icon('close')+'</button><img alt="Imagem ampliada"></div>');
 bindLayer();
 updateProfile();
 renderCategoryOptions();
 watchFeed();
}
function bindLayer(){
 var section=byId('community');
 section.addEventListener('click',function(event){
  var control=event.target.closest('[data-community-mobile]');if(!control)return;
  var action=control.dataset.communityMobile;
  if(action==='compose')openComposer();
  if(action==='cancel-compose')closeComposer();
  if(action==='search')openSearch();
  if(action==='close-search')closeSearch();
  if(action==='notifications')clickLegacyTab('notifications');
  if(action==='achievements'&&typeof window.setView==='function')window.setView('achievements');
  if(action==='profile')clickLegacyAction('my-profile');
  if(action==='rules')clickLegacyAction('rules');
  if(action==='close-category')closeCategory();
  if(action==='close-image')closeImage();
 });
 section.querySelectorAll('[data-community-tab]').forEach(function(button){button.onclick=function(){section.querySelectorAll('[data-community-tab]').forEach(function(x){x.classList.toggle('active',x===button)});clickLegacyTab(button.dataset.communityTab)}});
 byId('communityMobileText').addEventListener('input',updatePublishState);
 byId('communityMobilePhoto').onclick=function(){byId('communityImage').click()};
 byId('communityImage').addEventListener('change',previewImage);
 byId('communityMobileVisibility').addEventListener('change',function(){byId('communityVisibility').value=this.value});
 byId('communityMobileImageAlt').addEventListener('input',updatePublishState);
 byId('communityMobileCategory').onclick=openCategory;
 byId('communityMobilePublish').onclick=publish;
 var searchTimer;byId('communityMobileSearch').addEventListener('input',function(){clearTimeout(searchTimer);var query=this.value.trim();byId('communityMobileSearchState').innerHTML=query?'<div class="community-skeleton small"></div>':'<p>Encontre conversas, pessoas e assuntos da Comunidade.</p>';searchTimer=setTimeout(function(){if(!query)return;var legacy=byId('communitySearch');legacy.value=query;byId('communitySearchBtn').click();closeSearch()},350)});
 section.addEventListener('click',function(event){
  var image=event.target.closest('.community-post .community-image');if(image){event.preventDefault();openImage(image.src)}
  var share=event.target.closest('[data-community-share]');if(share){event.preventDefault();sharePost(share.closest('[data-post]'))}
  var remove=event.target.closest('[data-community-delete]');if(remove){event.preventDefault();deletePost(remove.closest('[data-post]'))}
 },true);
 var global=byId('globalAddBtn');if(global)global.addEventListener('click',function(event){if(document.body.classList.contains('community-mode')){event.preventDefault();event.stopImmediatePropagation();openComposer()}},true);
}
function updateProfile(){
 var profile=currentProfile(),initial=String(profile.display_name||'N').charAt(0).toUpperCase();
 document.querySelectorAll('#communityMobileLayer .community-avatar,.community-mini-avatar,#communityComposerScreen .community-avatar').forEach(function(element){element.innerHTML=avatarMarkup(profile)});
 byId('communityComposeName').textContent=profile.display_name||'Você';
 byId('communityComposeUsername').textContent='@'+friendlyUsername(profile);
}
async function loadProfile(){
 var user=window.cockpitUser;if(!user||!window.cockpitSupabase)return;
 var result=await window.cockpitSupabase.from('community_profiles').select('*').eq('user_id',user.id).maybeSingle();
 if(result&&result.data){state.profile=result.data;updateProfile()}
}
function clickLegacyTab(name){var button=document.querySelector('.community-legacy-shell [data-ctab="'+name+'"]');if(button)button.click()}
function clickLegacyAction(name){var button=document.querySelector('.community-legacy-shell [data-action="'+name+'"]');if(button)button.click()}
function openComposer(){
 var screen=byId('communityComposerScreen');screen.classList.remove('hidden');document.body.classList.add('community-overlay-open');state.open=true;
 byId('communityMobileText').value=byId('communityText').value||'';updatePublishState();setTimeout(function(){byId('communityMobileText').focus()},80);
}
function closeComposer(){byId('communityComposerScreen').classList.add('hidden');document.body.classList.remove('community-overlay-open');state.open=false}
function resetComposer(){
 byId('communityMobileText').value='';byId('communityText').value='';byId('communityImage').value='';byId('communityImageAlt').value='';byId('communityMobileImageAlt').value='';byId('communityCategory').value='';byId('communityVisibility').value='public';byId('communityMobileVisibility').value='public';byId('communityMobileCategoryLabel').textContent='Categoria';byId('communityMobileAltField').classList.add('hidden');
 var preview=byId('communityMobileImagePreview');preview.innerHTML='';preview.classList.add('hidden');if(state.imageUrl)URL.revokeObjectURL(state.imageUrl);state.imageUrl='';updatePublishState();
}
function updatePublishState(){
 var text=byId('communityMobileText').value,count=text.length,category=byId('communityCategory').value,file=byId('communityImage').files[0],alt=byId('communityMobileImageAlt').value.trim();
 byId('communityMobileCount').textContent=count;byId('communityText').value=text;byId('communityImageAlt').value=alt;byId('communityMobilePublish').disabled=!text.trim()||!category||(file&&!alt);
}
function previewImage(){
 var file=byId('communityImage').files[0],preview=byId('communityMobileImagePreview');byId('communityMobileAltField').classList.toggle('hidden',!file);if(!file){preview.classList.add('hidden');updatePublishState();return}
 if(state.imageUrl)URL.revokeObjectURL(state.imageUrl);state.imageUrl=URL.createObjectURL(file);
 preview.innerHTML='<img src="'+state.imageUrl+'" alt="Prévia da imagem"><div><button type="button" id="communityChangeImage">Trocar</button><button type="button" id="communityRemoveImage">Remover</button></div>';preview.classList.remove('hidden');
 byId('communityChangeImage').onclick=function(){byId('communityImage').click()};
 byId('communityRemoveImage').onclick=function(){byId('communityImage').value='';byId('communityMobileImageAlt').value='';preview.innerHTML='';preview.classList.add('hidden');byId('communityMobileAltField').classList.add('hidden');URL.revokeObjectURL(state.imageUrl);state.imageUrl='';updatePublishState()};updatePublishState();
}
function renderCategoryOptions(){
 var select=byId('communityCategory'),wrap=byId('communityMobileCategoryOptions');if(!select||!wrap)return;
 wrap.innerHTML=Array.from(select.options).filter(function(option){return option.value}).map(function(option){return'<button data-category="'+esc(option.value)+'"><span></span><b>'+esc(cleanLabel(option.textContent))+'</b></button>'}).join('');
 wrap.querySelectorAll('[data-category]').forEach(function(button){button.onclick=function(){select.value=button.dataset.category;byId('communityMobileCategoryLabel').textContent=cleanLabel(button.textContent);closeCategory();updatePublishState()}});
}
function openCategory(){renderCategoryOptions();byId('communityCategorySheet').classList.remove('hidden');document.body.classList.add('community-overlay-open')}
function closeCategory(){byId('communityCategorySheet').classList.add('hidden');if(!state.open)document.body.classList.remove('community-overlay-open')}
function publish(){
 var button=byId('communityMobilePublish');if(button.disabled)return;
 if(state.profile&&(!state.profile.username||/^u_[a-f0-9]{8,}$/i.test(state.profile.username))){
  closeComposer();clickLegacyAction('my-profile');toast('Escolha um nome público antes de publicar.','error');return;
 }
 var submittedText=byId('communityMobileText').value.trim();
 button.disabled=true;button.textContent='Publicando…';byId('communityText').value=submittedText;byId('communityPublish').click();
 var started=Date.now(),timer=setInterval(function(){
  if(!byId('communityText').value.trim()&&Date.now()-started>250){clearInterval(timer);button.textContent='Publicar';resetComposer();closeComposer();toast('Publicação concluída.')}
  if(Date.now()-started>12000){clearInterval(timer);button.textContent='Publicar';button.disabled=false;toast('Não foi possível publicar. Tente novamente.','error')}
 },150);
}
function openSearch(){byId('communitySearchScreen').classList.remove('hidden');document.body.classList.add('community-overlay-open');setTimeout(function(){byId('communityMobileSearch').focus()},60)}
function closeSearch(){byId('communitySearchScreen').classList.add('hidden');document.body.classList.remove('community-overlay-open')}
function openImage(src){byId('communityImageViewer').querySelector('img').src=src;byId('communityImageViewer').classList.remove('hidden');document.body.classList.add('community-overlay-open')}
function closeImage(){byId('communityImageViewer').classList.add('hidden');document.body.classList.remove('community-overlay-open')}
function wrapPostText(ctx,text,x,y,maxWidth,lineHeight,maxLines){var words=text.split(/\s+/),line='',rows=[];words.forEach(function(word){var next=line?line+' '+word:word;if(ctx.measureText(next).width>maxWidth&&line){rows.push(line);line=word}else line=next});if(line)rows.push(line);rows.slice(0,maxLines).forEach(function(row,index){ctx.fillText(row+(index===maxLines-1&&rows.length>maxLines?'…':''),x,y+index*lineHeight)})}
if(window.CanvasRenderingContext2D&&!CanvasRenderingContext2D.prototype.roundRect){CanvasRenderingContext2D.prototype.roundRect=function(x,y,width,height){this.rect(x,y,width,height);return this}}
async function postShareFile(article){var canvas=document.createElement('canvas');canvas.width=1080;canvas.height=1350;var ctx=canvas.getContext('2d'),dark=document.documentElement.dataset.theme==='dark',author=article.querySelector('.community-name')&&article.querySelector('.community-name').innerText||'Comunidade Norteia',body=article.querySelector('.community-body')&&article.querySelector('.community-body').innerText||'Publicação no Norteia',category=article.querySelector('.community-badge')&&article.querySelector('.community-badge').innerText||'Comunidade';var gradient=ctx.createLinearGradient(0,0,1080,1350);gradient.addColorStop(0,dark?'#08120f':'#f7faf8');gradient.addColorStop(1,dark?'#15382e':'#dff4ec');ctx.fillStyle=gradient;ctx.fillRect(0,0,1080,1350);ctx.fillStyle=dark?'#10201a':'#fff';ctx.beginPath();ctx.roundRect(80,120,920,1050,42);ctx.fill();ctx.fillStyle=dark?'#65dfc1':'#08725f';ctx.font='700 34px system-ui';ctx.fillText('NORTEIA · '+category.toUpperCase(),140,205);ctx.fillStyle=dark?'#f0f7f4':'#14231d';ctx.font='700 48px system-ui';ctx.fillText(author,140,305);ctx.font='500 52px system-ui';wrapPostText(ctx,body,140,415,800,72,8);ctx.fillStyle=dark?'#a7bbb1':'#52645c';ctx.font='400 30px system-ui';ctx.fillText('Uma jornada financeira compartilhada na Comunidade Norteia',140,1080);ctx.fillStyle=dark?'#65dfc1':'#08725f';ctx.font='700 34px system-ui';ctx.fillText('Seu dinheiro com direção.',140,1240);return new Promise(function(resolve){canvas.toBlob(function(blob){resolve(new File([blob],'publicacao-norteia-'+article.dataset.post+'.png',{type:'image/png'}))},'image/png')})}
async function sharePost(article){
 var text=article&&article.querySelector('.community-body')&&article.querySelector('.community-body').innerText||'Publicação no Norteia';
 try{var file=await postShareFile(article);if(navigator.share&&navigator.canShare&&navigator.canShare({files:[file]})){await navigator.share({title:'Norteia Comunidade',text:text.slice(0,180),files:[file]})}else{var link=document.createElement('a');link.href=URL.createObjectURL(file);link.download=file.name;link.click();setTimeout(function(){URL.revokeObjectURL(link.href)},1000);toast('Cartão da publicação baixado para compartilhar.')}
 }catch(e){if(e&&e.name!=='AbortError')toast('Não foi possível compartilhar. Tente novamente.','error')}
}
async function deletePost(article){
 if(!article||!window.cockpitSupabase||!window.cockpitUser)return;
 if(!confirm('Excluir esta publicação? Esta ação não poderá ser desfeita.'))return;
 var button=article.querySelector('[data-community-delete]'),id=article.dataset.post;
 if(button){button.disabled=true;button.setAttribute('aria-busy','true')}
 try{
  var media=await window.cockpitSupabase.from('community_post_media').select('storage_path').eq('post_id',id),paths=(media.data||[]).map(function(x){return x.storage_path});
  if(media.error)throw media.error;
  var result=await window.cockpitSupabase.from('community_posts').update({deleted_at:new Date().toISOString()}).eq('id',id).eq('author_id',window.cockpitUser.id);if(result.error)throw result.error;
  if(paths.length){var removed=await window.cockpitSupabase.storage.from('community-media').remove(paths);if(removed.error)console.warn('A publicação foi excluída, mas a limpeza da imagem será repetida depois.',removed.error)}
  article.remove();toast('Publicação excluída.');
 }catch(e){
  if(button){button.disabled=false;button.removeAttribute('aria-busy')}
  toast('Não foi possível excluir a publicação.','error');
 }
}
function transformPost(article){
 if(article.dataset.mobileReady)return;article.dataset.mobileReady='true';
 article.id='post-'+article.dataset.post;
 var profileButton=article.querySelector('.community-name'),meta=article.querySelector('.community-meta small'),profileText=profileButton&&profileButton.innerText||'Pessoa';
 if(meta){
  var raw=meta.textContent,username=(raw.match(/@([^\s·]+)/)||[])[1]||'',dateText=(raw.split('·')[1]||'').trim();
  if(/^u_[a-f0-9]{8,}$/i.test(username))username=profileText.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9._]/g,'').slice(0,18)||'pessoa';
  var date=Date.parse(dateText.split('/').reverse().join('-'));meta.textContent='@'+username+' · '+(date?relativeTime(date):dateText);
 }
 article.querySelectorAll('.community-badge').forEach(function(badge){badge.textContent=cleanLabel(badge.textContent)});
 var menu=article.querySelector('.community-author>.btn');if(menu)menu.innerHTML=icon('more');
 var actions=article.querySelector('.community-actions');if(actions){
  var buttons=actions.querySelectorAll('button');
  if(buttons[0])buttons[0].innerHTML=icon('heart')+'<span>'+((buttons[0].textContent.match(/\d+/)||['0'])[0])+'</span>';
  if(buttons[1])buttons[1].innerHTML=icon('comment')+'<span>'+((buttons[1].textContent.match(/\d+/)||['0'])[0])+'</span>';
  if(buttons[2]){buttons[2].innerHTML=icon('bookmark')+'<span>'+((buttons[2].textContent.match(/\d+/)||['0'])[0])+'</span>';buttons[2].classList.add('community-save-action')}
  if(buttons[3])buttons[3].innerHTML=icon('repost')+'<span>'+((buttons[3].textContent.match(/\d+/)||['0'])[0])+'</span>';
  if(menu&&menu.dataset.action==='post-menu'&&!actions.querySelector('[data-community-delete]'))actions.insertAdjacentHTML('beforeend','<button class="community-delete-action" data-community-delete aria-label="Excluir publicação">'+icon('trash')+'<span class="community-action-label">Excluir</span></button>');
  if(!actions.querySelector('[data-community-share]'))actions.insertAdjacentHTML('beforeend','<button class="community-share-action" data-community-share aria-label="Compartilhar publicação">'+icon('share')+'<span class="community-action-label">Compartilhar</span></button>');
  buttons.forEach(function(button){if(!button.getAttribute('aria-label'))button.setAttribute('aria-label',button.dataset.action==='like'?'Curtir':button.dataset.action==='comment'?'Comentar':button.dataset.action==='save'?'Salvar':'Republicar')});
 }
 if(location.hash==='#'+article.id)setTimeout(function(){article.scrollIntoView({block:'center'});article.classList.add('community-shared-post')},80);
}
function watchFeed(){
 var feed=byId('communityFeed');if(!feed)return;
 var apply=function(){feed.querySelectorAll('.community-post').forEach(transformPost)};
 new MutationObserver(apply).observe(feed,{childList:true,subtree:true});apply();
}
function enhanceProfileDialog(){
 var dialog=byId('communityDialogBody');if(!dialog)return;
 var username=byId('cpUser');if(!username||byId('communityUsernameStatus'))return;
 username.maxLength=30;username.setAttribute('pattern','[a-z0-9._]{3,30}');username.insertAdjacentHTML('afterend','<small id="communityUsernameStatus" class="community-username-status" aria-live="polite"></small>');
 var saveProfile=byId('saveCommunityProfile'),profile=currentProfile();
 if(saveProfile&&!byId('communityProfilePrivacy')){
  saveProfile.insertAdjacentHTML('beforebegin','<label class="field"><span>Foto do perfil</span><input id="communityProfileAvatar" type="file" accept="image/jpeg,image/png,image/webp"><small>JPG, PNG ou WebP de até 2 MB.</small></label><label class="field"><span>Privacidade do perfil</span><select id="communityProfilePrivacy"><option value="public">Público — qualquer pessoa pode acompanhar</option><option value="private">Privado — você aprova solicitações</option></select></label>');
  byId('communityProfilePrivacy').value=profile.privacy||'public';
  byId('communityProfileAvatar').addEventListener('change',async function(){var input=this,file=input.files[0];if(!file)return;if(file.size>2097152||!/^image\/(jpeg|png|webp)$/.test(file.type)){input.value='';toast('Use uma imagem JPG, PNG ou WebP de até 2 MB.','error');return}input.disabled=true;var ext=file.type.split('/')[1].replace('jpeg','jpg'),newPath=window.cockpitUser.id+'/'+crypto.randomUUID()+'.'+ext;try{var uploaded=await window.cockpitSupabase.storage.from('community-avatars').upload(newPath,file,{contentType:file.type,upsert:false});if(uploaded.error)throw uploaded.error;var avatarUrl=window.cockpitSupabase.storage.from('community-avatars').getPublicUrl(newPath).data.publicUrl+'?v='+Date.now(),saved=await window.cockpitSupabase.from('community_profiles').update({avatar_url:avatarUrl}).eq('user_id',window.cockpitUser.id);if(saved.error)throw saved.error;var oldUrl=profile.avatar_url;profile.avatar_url=avatarUrl;if(state.profile)state.profile.avatar_url=avatarUrl;updateProfile();var dialogAvatar=byId('communityDialogBody').querySelector('.community-avatar');if(dialogAvatar)dialogAvatar.innerHTML='<img src="'+esc(avatarUrl)+'" alt="Foto de '+esc(profile.display_name||'perfil')+'">';if(oldUrl){var marker='/object/public/community-avatars/',pos=oldUrl.indexOf(marker);if(pos>=0)await window.cockpitSupabase.storage.from('community-avatars').remove([decodeURIComponent(oldUrl.slice(pos+marker.length).split('?')[0])])}input.value='';toast('Foto de perfil atualizada.')}catch(error){await window.cockpitSupabase.storage.from('community-avatars').remove([newPath]);toast('Não foi possível atualizar a foto.','error')}finally{input.disabled=false}});
  var originalSave=saveProfile.onclick;saveProfile.onclick=async function(event){var privacy=byId('communityProfilePrivacy').value,file=byId('communityProfileAvatar').files[0],payload={privacy:privacy},newPath=null;if(file){if(file.size>2097152||!/^image\/(jpeg|png|webp)$/.test(file.type)){event.preventDefault();toast('Use uma imagem JPG, PNG ou WebP de até 2 MB.','error');return}var ext=file.type.split('/')[1].replace('jpeg','jpg');newPath=window.cockpitUser.id+'/'+crypto.randomUUID()+'.'+ext;var uploaded=await window.cockpitSupabase.storage.from('community-avatars').upload(newPath,file,{contentType:file.type,upsert:false});if(uploaded.error){toast('Não foi possível enviar a foto.','error');return}payload.avatar_url=window.cockpitSupabase.storage.from('community-avatars').getPublicUrl(newPath).data.publicUrl}var result=await window.cockpitSupabase.from('community_profiles').update(payload).eq('user_id',window.cockpitUser.id);if(result.error){if(newPath)await window.cockpitSupabase.storage.from('community-avatars').remove([newPath]);event.preventDefault();toast('Não foi possível salvar o perfil.','error');return}if(newPath&&profile.avatar_url){var marker='/object/public/community-avatars/',pos=profile.avatar_url.indexOf(marker);if(pos>=0)await window.cockpitSupabase.storage.from('community-avatars').remove([decodeURIComponent(profile.avatar_url.slice(pos+marker.length))])}if(state.profile)Object.assign(state.profile,payload);updateProfile();return originalSave&&originalSave.call(this,event)};
 }
 if(!username.value||/^u_[a-f0-9]{8,}$/i.test(username.value)){
  var displayName=byId('cpName')&&byId('cpName').value||currentProfile().display_name||'pessoa';
  username.value=displayName.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,'.').replace(/[^a-z0-9._]/g,'').replace(/^[._]+|[._]+$/g,'').slice(0,30);
 }
 var timer;username.addEventListener('input',function(){clearTimeout(timer);var value=username.value.toLowerCase().replace(/[^a-z0-9._]/g,'');username.value=value;var status=byId('communityUsernameStatus'),save=byId('saveCommunityProfile');
  if(value.length<3){status.textContent='Use pelo menos 3 caracteres.';status.dataset.state='error';save.disabled=true;return}
  if(RESERVED.indexOf(value)>=0){status.textContent='Este nome é reservado.';status.dataset.state='error';save.disabled=true;return}
  status.textContent='Verificando disponibilidade…';status.dataset.state='loading';save.disabled=true;
  timer=setTimeout(async function(){var query=window.cockpitSupabase.from('community_profiles').select('user_id').eq('username',value);if(window.cockpitUser)query=query.not('user_id','eq',window.cockpitUser.id);var result=await query.limit(1);var available=!result.error&&!(result.data||[]).length;status.textContent=available?'Nome disponível.':'Este nome já está em uso.';status.dataset.state=available?'success':'error';save.disabled=!available},300);
 });
 username.dispatchEvent(new Event('input',{bubbles:true}));
}
function init(){
 var attempts=0,timer=setInterval(function(){attempts++;if(byId('community')){clearInterval(timer);buildLayer();loadProfile();var dialog=byId('communityDialogBody');if(dialog)new MutationObserver(enhanceProfileDialog).observe(dialog,{childList:true,subtree:true})}else if(attempts>80)clearInterval(timer)},50);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
