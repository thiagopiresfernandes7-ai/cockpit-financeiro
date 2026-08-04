(function(){
'use strict';

var DEFINITIONS=[
 {id:'first_step',icon:'flag',title:'Primeiro passo',description:'Registrou a primeira movimentação.',points:50,test:function(s){return(s.transactions||[]).length>=1},progress:function(s){return[Math.min((s.transactions||[]).length,1),1]}},
 {id:'organized_week',icon:'calendar',title:'Semana organizada',description:'Manteve 7 dias seguidos de controle financeiro.',points:120,test:function(){return streak()>=7},progress:function(){return[Math.min(streak(),7),7]}},
 {id:'consistent_month',icon:'spark',title:'Consistência de ouro',description:'Manteve 30 dias seguidos de controle financeiro.',points:300,test:function(){return streak()>=30},progress:function(){return[Math.min(streak(),30),30]}},
 {id:'budget_builder',icon:'target',title:'Orçamento com direção',description:'Criou o primeiro orçamento mensal.',points:80,test:function(s){return(s.budgets||[]).length>=1},progress:function(s){return[Math.min((s.budgets||[]).length,1),1]}},
 {id:'reviewer',icon:'check',title:'Olhar atento',description:'Revisou 10 movimentações.',points:140,test:function(s){return reviewed(s)>=10},progress:function(s){return[Math.min(reviewed(s),10),10]}},
 {id:'investor',icon:'trend',title:'Dinheiro em movimento',description:'Cadastrou o primeiro investimento.',points:100,test:function(s){return(s.investments||[]).length>=1},progress:function(s){return[Math.min((s.investments||[]).length,1),1]}},
 {id:'diversified',icon:'grid',title:'Carteira diversificada',description:'Organizou investimentos em três tipos diferentes.',points:220,test:function(s){return investmentTypes(s)>=3},progress:function(s){return[Math.min(investmentTypes(s),3),3]}},
 {id:'debt_progress',icon:'down',title:'Virada financeira',description:'Registrou uma amortização ou quitou uma dívida.',points:180,test:function(s){return debtProgress(s)>=1},progress:function(s){return[Math.min(debtProgress(s),1),1]}},
 {id:'three_months',icon:'mountain',title:'Jornada consistente',description:'Registrou movimentações em três meses diferentes.',points:250,test:function(s){return activeMonths(s)>=3},progress:function(s){return[Math.min(activeMonths(s),3),3]}}
];
var LEVELS=[{name:'Explorador',min:0},{name:'Organizador',min:150},{name:'Estrategista',min:400},{name:'Construtor',min:800},{name:'Norteador',min:1400}];
var shareState={achievement:null,file:null,url:''};
function $id(id){return document.getElementById(id)}
function escapeHtml(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function reviewed(s){return(s.transactions||[]).filter(function(x){return!!x.reviewedAt}).length}
function investmentTypes(s){return new Set((s.investments||[]).map(function(x){return x.type||x.category||'geral'})).size}
function debtProgress(s){return(s.debtAmortizations||[]).length+(s.debts||[]).filter(function(x){return/paid|settled|quitad/i.test(String(x.status||''))}).length}
function activeMonths(s){return new Set((s.transactions||[]).map(function(x){return String(x.date||'').slice(0,7)}).filter(Boolean)).size}
function streak(){return typeof window.calculateControlStreak==='function'?Number(window.calculateControlStreak()||0):0}
function icon(name){var paths={flag:'<path d="M5 21V4m0 1h11l-2 4 2 4H5"/>',calendar:'<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M8 3v4m8-4v4M3 10h18"/>',spark:'<path d="m12 3 1.6 5.4L19 10l-5.4 1.6L12 17l-1.6-5.4L5 10l5.4-1.6Z"/>',target:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',check:'<path d="m5 12 4 4L19 6"/>',trend:'<path d="m4 17 6-6 4 4 6-8"/><path d="M15 7h5v5"/>',grid:'<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/>',down:'<path d="M12 3v15m-6-6 6 6 6-6"/>',mountain:'<path d="m3 20 7-12 4 6 2-3 5 9Z"/>'};return'<svg viewBox="0 0 24 24" aria-hidden="true">'+(paths[name]||paths.spark)+'</svg>'}
function ensureData(){
 if(!window.state)return null;
 state.gamification=state.gamification||{unlocked:{},shared:{},lastCelebrated:''};
 state.gamification.unlocked=state.gamification.unlocked||{};state.gamification.shared=state.gamification.shared||{};
 return state.gamification;
}
function evaluate(){
 var data=ensureData();if(!data)return[];
 var justUnlocked=[];
 DEFINITIONS.forEach(function(def){if(def.test(state)&&!data.unlocked[def.id]){data.unlocked[def.id]=new Date().toISOString();justUnlocked.push(def)}});
 if(justUnlocked.length){if(typeof window.norteiaScheduleSave==='function')window.norteiaScheduleSave();setTimeout(function(){celebrate(justUnlocked[0])},200)}
 return DEFINITIONS.map(function(def){var p=def.progress(state);return Object.assign({},def,{unlockedAt:data.unlocked[def.id]||'',current:p[0],goal:p[1]})});
}
function score(items){return items.reduce(function(total,item){return total+(item.unlockedAt?item.points:0)},0)}
function levelFor(points){var level=LEVELS[0];LEVELS.forEach(function(candidate){if(points>=candidate.min)level=candidate});return level}
function nextLevel(points){return LEVELS.find(function(level){return level.min>points})||null}
function build(){
 if($id('achievements'))return;
 var section=document.createElement('section');section.className='section';section.id='achievements';
 section.innerHTML='<div class="page-head gamification-head"><div class="page-title"><div class="overline">Sua evolução</div><h1>Conquistas</h1><p>Pequenos hábitos constroem uma vida financeira mais tranquila.</p></div><button class="btn gamification-how" type="button" data-gamification="how">Como funciona</button></div><div id="gamificationSummary"></div><div class="gamification-section-head"><div><h2>Suas conquistas</h2><p>Compartilhe o hábito, nunca os seus valores.</p></div><div class="gamification-filter" role="group" aria-label="Filtrar conquistas"><button class="active" data-game-filter="all">Todas</button><button data-game-filter="unlocked">Desbloqueadas</button><button data-game-filter="locked">Em progresso</button></div></div><div id="gamificationGrid" class="gamification-grid"></div>';
 var content=document.querySelector('.content');if(content)content.appendChild(section);
 var more=document.querySelector('.clean-more-grid');if(more&&!more.querySelector('[data-more-target="achievements"]'))more.insertAdjacentHTML('afterbegin','<button class="panel more-card" data-more-target="achievements" type="button"><b>Conquistas</b><small>Níveis, missões e cartões para compartilhar.</small></button>');
 var communityTools=document.querySelector('.community-tools');if(communityTools&&!communityTools.querySelector('[data-more-target="achievements"]'))communityTools.insertAdjacentHTML('afterbegin','<button class="btn" data-more-target="achievements" type="button">Conquistas</button>');
 document.body.insertAdjacentHTML('beforeend','<div id="achievementShareSheet" class="achievement-share-backdrop hidden" aria-hidden="true"><section class="achievement-share-sheet" role="dialog" aria-modal="true" aria-labelledby="achievementShareTitle"><header><div><small>Compartilhar conquista</small><h2 id="achievementShareTitle">Sua evolução merece ser celebrada</h2></div><button data-gamification="close-share" aria-label="Fechar">×</button></header><div id="achievementSharePreview"></div><label class="achievement-message"><span>Mensagem</span><textarea id="achievementShareMessage" maxlength="280"></textarea></label><div class="achievement-social-grid"><button data-share-channel="community"><b>Comunidade</b><small>Publicar no Norteia</small></button><button data-share-channel="native"><b>Compartilhar</b><small>Apps do celular</small></button><button data-share-channel="whatsapp"><b>WhatsApp</b><small>Enviar para contatos</small></button><button data-share-channel="instagram"><b>Instagram</b><small>Baixar para Stories</small></button><button data-share-channel="linkedin"><b>LinkedIn</b><small>Compartilhar link</small></button><button data-share-channel="x"><b>X</b><small>Publicar conquista</small></button><button data-share-channel="copy"><b>Copiar</b><small>Texto e link</small></button></div><p class="achievement-privacy">O cartão não inclui saldo, renda, patrimônio ou valores de transações.</p></section></div><div id="achievementCelebration" class="achievement-celebration hidden" role="status" aria-live="polite"></div>');
 bind();
}
function render(filter){
 if(!$id('gamificationGrid')||!window.state)return;
 var items=evaluate(),points=score(items),level=levelFor(points),next=nextLevel(points),percent=next?Math.max(0,Math.min(100,Math.round((points-level.min)/(next.min-level.min)*100))):100;
 $id('gamificationSummary').innerHTML='<article class="gamification-summary"><div class="gamification-level-mark">'+icon('spark')+'</div><div><small>Nível atual</small><h2>'+level.name+'</h2><p>'+points+' pontos · '+items.filter(function(x){return x.unlockedAt}).length+' de '+items.length+' conquistas</p></div><div class="gamification-level-progress"><span><b style="width:'+percent+'%"></b></span><small>'+(next?(next.min-points)+' pontos para '+next.name:'Nível máximo alcançado')+'</small></div></article>';
 var shown=items.filter(function(x){return filter==='unlocked'?x.unlockedAt:filter==='locked'?!x.unlockedAt:true});
 $id('gamificationGrid').innerHTML=shown.map(function(item){var pct=Math.round(item.current/item.goal*100);return'<article class="achievement-card '+(item.unlockedAt?'unlocked':'locked')+'" data-achievement="'+item.id+'"><div class="achievement-icon">'+icon(item.icon)+'</div><div class="achievement-copy"><span>'+(item.unlockedAt?'Conquista desbloqueada':'Em progresso')+'</span><h3>'+escapeHtml(item.title)+'</h3><p>'+escapeHtml(item.description)+'</p>'+(item.unlockedAt?'<small>'+new Date(item.unlockedAt).toLocaleDateString('pt-BR')+' · +'+item.points+' pontos</small>':'<div class="achievement-progress"><i><b style="width:'+pct+'%"></b></i><small>'+item.current+' de '+item.goal+'</small></div>')+'</div>'+(item.unlockedAt?'<button data-achievement-share="'+item.id+'" aria-label="Compartilhar '+escapeHtml(item.title)+'">Compartilhar</button>':'')+'</article>'}).join('');
}
function celebrate(def){
 var data=ensureData();if(!data||data.lastCelebrated===def.id)return;data.lastCelebrated=def.id;
 var box=$id('achievementCelebration');if(!box)return;box.innerHTML='<div class="achievement-icon">'+icon(def.icon)+'</div><div><small>Nova conquista</small><b>'+escapeHtml(def.title)+'</b><span>+'+def.points+' pontos</span></div><button data-achievement-share="'+def.id+'">Compartilhar</button>';box.classList.remove('hidden');setTimeout(function(){box.classList.add('hidden')},7000);
}
function achievement(id){return DEFINITIONS.find(function(x){return x.id===id})}
function messageFor(def){return'Conquistei “'+def.title+'” no Norteia. '+def.description+' Um passo de cada vez, com mais direção. #Norteia #EducaçãoFinanceira'}
function drawCard(def){
 var canvas=document.createElement('canvas');canvas.width=1080;canvas.height=1080;var c=canvas.getContext('2d'),dark=document.documentElement.dataset.theme==='dark';
 var gradient=c.createLinearGradient(0,0,1080,1080);gradient.addColorStop(0,dark?'#08120f':'#f7faf8');gradient.addColorStop(1,dark?'#15382e':'#dff4ec');c.fillStyle=gradient;c.fillRect(0,0,1080,1080);
 c.fillStyle=dark?'#2fc6a3':'#087a64';c.beginPath();c.arc(540,330,126,0,Math.PI*2);c.fill();
 c.strokeStyle=dark?'#06110d':'#fff';c.lineWidth=18;c.lineCap='round';c.beginPath();c.moveTo(478,333);c.lineTo(526,381);c.lineTo(618,276);c.stroke();
 c.textAlign='center';c.fillStyle=dark?'#f0f7f4':'#14231d';c.font='700 42px system-ui';c.fillText('CONQUISTA DESBLOQUEADA',540,545);
 c.font='800 72px system-ui';wrapCanvas(c,def.title,540,650,850,82);
 c.fillStyle=dark?'#b4c5bd':'#51665c';c.font='400 36px system-ui';wrapCanvas(c,def.description,540,805,810,48);
 c.fillStyle=dark?'#2fc6a3':'#087a64';c.font='700 38px system-ui';c.fillText('Norteia · Seu dinheiro com direção',540,995);
 return new Promise(function(resolve){canvas.toBlob(function(blob){resolve(new File([blob],'conquista-norteia-'+def.id+'.png',{type:'image/png'}))},'image/png')});
}
function wrapCanvas(c,text,x,y,max,line){var words=text.split(' '),row='',rows=[];words.forEach(function(word){var test=row?row+' '+word:word;if(c.measureText(test).width>max&&row){rows.push(row);row=word}else row=test});if(row)rows.push(row);rows.slice(0,3).forEach(function(value,i){c.fillText(value,x,y+i*line)})}
async function openShare(id){
 var def=achievement(id);if(!def)return;shareState.achievement=def;shareState.file=await drawCard(def);if(shareState.url)URL.revokeObjectURL(shareState.url);shareState.url=URL.createObjectURL(shareState.file);
 $id('achievementShareMessage').value=messageFor(def);$id('achievementSharePreview').innerHTML='<img src="'+shareState.url+'" alt="Cartão da conquista '+escapeHtml(def.title)+'">';
 $id('achievementShareSheet').classList.remove('hidden');$id('achievementShareSheet').setAttribute('aria-hidden','false');document.body.classList.add('community-overlay-open');
}
function closeShare(){$id('achievementShareSheet').classList.add('hidden');$id('achievementShareSheet').setAttribute('aria-hidden','true');document.body.classList.remove('community-overlay-open')}
function shareUrl(){return location.href.split('#')[0]+'#view=achievements'}
function shareText(){return $id('achievementShareMessage').value.trim()}
function popup(url){window.open(url,'_blank','noopener,noreferrer')}
async function share(channel){
 var text=shareText(),url=shareUrl(),def=shareState.achievement;if(!def)return;
 try{
  if(channel==='community'){closeShare();if(typeof window.setView==='function')window.setView('community');setTimeout(function(){var compact=document.querySelector('.community-compact-composer');if(compact)compact.click();var textNode=$id('communityMobileText'),category=$id('communityCategory'),input=$id('communityImage'),alt=$id('communityMobileImageAlt');if(category){category.value='Conquista';category.dispatchEvent(new Event('change',{bubbles:true}));var label=$id('communityMobileCategoryLabel');if(label)label.textContent='Conquista'}if(textNode){textNode.value=text;textNode.dispatchEvent(new Event('input',{bubbles:true}))}if(input&&shareState.file){var transfer=new DataTransfer();transfer.items.add(shareState.file);input.files=transfer.files;input.dispatchEvent(new Event('change',{bubbles:true}));if(alt){alt.value='Cartão de conquista '+def.title+' do Norteia.';alt.dispatchEvent(new Event('input',{bubbles:true}))}}},180)}
  if(channel==='native'){if(navigator.share){var payload={title:'Conquista no Norteia',text:text,url:url};if(shareState.file&&navigator.canShare&&navigator.canShare({files:[shareState.file]}))payload.files=[shareState.file];await navigator.share(payload)}else await share('copy')}
  if(channel==='whatsapp')popup('https://wa.me/?text='+encodeURIComponent(text+' '+url));
  if(channel==='linkedin')popup('https://www.linkedin.com/sharing/share-offsite/?url='+encodeURIComponent(url));
  if(channel==='x')popup('https://twitter.com/intent/tweet?text='+encodeURIComponent(text)+'&url='+encodeURIComponent(url));
  if(channel==='instagram'){downloadCard();notify('Cartão baixado. Abra o Instagram e adicione a imagem ao Story.')}
  if(channel==='copy'){await navigator.clipboard.writeText(text+' '+url);notify('Texto e link copiados.')}
  var data=ensureData();if(data){data.shared[def.id]=new Date().toISOString();if(typeof window.norteiaScheduleSave==='function')window.norteiaScheduleSave()}
 }catch(e){if(e&&e.name!=='AbortError')notify('Não foi possível compartilhar. Tente novamente.')}
}
function downloadCard(){var a=document.createElement('a');a.href=shareState.url;a.download=shareState.file.name;a.click()}
function notify(text){if(typeof window.toast==='function')window.toast(text);else alert(text)}
function bind(){
 document.addEventListener('click',function(event){
  var target=event.target.closest('[data-achievement-share],[data-gamification],[data-game-filter],[data-share-channel],[data-more-target="achievements"]');if(!target)return;
  if(target.dataset.achievementShare){event.preventDefault();openShare(target.dataset.achievementShare)}
  if(target.dataset.gamification==='close-share'){event.preventDefault();closeShare()}
  if(target.dataset.gamification==='how')alert('Conquistas são liberadas por hábitos reais registrados no app. Pontos não têm valor financeiro e não alteram recomendações.');
  if(target.dataset.gameFilter){document.querySelectorAll('[data-game-filter]').forEach(function(x){x.classList.toggle('active',x===target)});render(target.dataset.gameFilter)}
  if(target.dataset.shareChannel)share(target.dataset.shareChannel);
  if(target.dataset.moreTarget==='achievements'){if(typeof window.setView==='function')window.setView('achievements');setTimeout(render,0)}
 });
 $id('achievementShareSheet').addEventListener('click',function(e){if(e.target===this)closeShare()});
}
function init(){
 build();var tries=0,timer=setInterval(function(){tries++;if(window.state){
  clearInterval(timer);
  if(!window.__norteiaGamificationWrapped&&typeof window.render==='function'){
   window.__norteiaGamificationWrapped=true;var appRender=window.render;
   window.render=function(){var result=appRender.apply(this,arguments);setTimeout(function(){if(window.state){evaluate();if($id('achievements')&&$id('achievements').classList.contains('active'))render()}},0);return result};
  }
  if(!window.__norteiaGamificationViewWrapped&&typeof window.setView==='function'){
   window.__norteiaGamificationViewWrapped=true;var appSetView=window.setView;
   window.setView=function(view){var result=appSetView.apply(this,arguments);if(view==='achievements'){var title=$id('pageTitle');if(title)title.textContent='Conquistas';render()}return result};
  }
  evaluate();render();
  if(new URLSearchParams(String(location.hash||'').replace(/^#/,'')).get('view')==='achievements')window.setView('achievements');
 }else if(tries>100)clearInterval(timer)},80)
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
