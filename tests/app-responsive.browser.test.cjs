const assert=require('node:assert/strict');
const {chromium}=require('playwright');

(async()=>{
  const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
  const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];
  page.setDefaultTimeout(8000);
  page.on('console',message=>{if(message.type()==='error')errors.push(message.text())});
  page.on('pageerror',error=>errors.push(error.message));
  await page.route('**/*',route=>{const url=route.request().url();if(url.startsWith('http://127.0.0.1:4173/'))return route.fallback();const type=route.request().resourceType(),contentType=type==='script'?'application/javascript':type==='stylesheet'?'text/css':'application/octet-stream';return route.fulfill({status:200,contentType,body:''})});
  await page.addInitScript(()=>{
    function query(){const q={data:null,error:null,count:0,select(){return q},eq(){return q},is(){return q},in(){return q},not(){return q},lt(){return q},ilike(){return q},or(){return q},order(){return q},limit(){return q},single(){return Promise.resolve({data:null,error:null})},maybeSingle(){return Promise.resolve({data:null,error:null})},insert(){return q},update(){return q},delete(){return q},upsert(){return q},then(resolve){resolve({data:[],error:null,count:0})}};return q}
    const user={id:'10000000-0000-0000-0000-000000000001',email:'teste@norteia.local',user_metadata:{full_name:'Marina Teste'}};
    window.supabase={createClient(){return{auth:{getSession:async()=>({data:{session:{user}},error:null}),signOut:async()=>({error:null}),signInWithOAuth:async()=>({error:null}),signInWithPassword:async()=>({error:null}),signUp:async()=>({error:null}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})},rpc:async name=>({data:name==='claim_my_entitlement'?{}:false,error:null}),from:query,storage:{from(){return{upload:async()=>({data:{},error:null}),remove:async()=>({data:{},error:null}),getPublicUrl:path=>({data:{publicUrl:'https://example.test/'+path}}),createSignedUrl:async()=>({data:{signedUrl:'https://example.test/signed'},error:null})}}},channel(){return{on(){return this},subscribe(){return this}}},removeChannel(){}}}};
  });
  await page.goto('http://127.0.0.1:4173/index.html',{waitUntil:'domcontentloaded'});
  await page.locator('body.app-mode').waitFor({timeout:10000});
  await page.locator('#todayCommand').waitFor({state:'visible'});
  assert.equal(await page.locator('#tutorial').isVisible(),true);
  await page.locator('#startNorteiaDemo').click();
  assert.equal(await page.locator('#norteiaDemoBanner').isVisible(),true,'demonstração não abriu: '+errors.join(' | '));
  assert.match(await page.locator('#todayGreeting').textContent(),/Marina/);
  await page.locator('#exitNorteiaDemo').click();
  assert.equal(await page.locator('#norteiaDemoBanner').isVisible(),false);
  await page.evaluate(()=>{var s=window.norteiaApp.getState();s.transactions.push({id:'reset-proof',type:'expense',date:'2026-08-01',description:'Teste',category:'Outros',value:10});s.goals.push({id:'goal-proof',title:'Teste',target:100,current:0})});
  await page.evaluate(()=>window.setView('profile'));
  page.once('dialog',dialog=>dialog.accept('REINICIAR'));
  await page.evaluate(()=>document.getElementById('resetDataBtn').click());
  await page.waitForFunction(()=>window.norteiaApp.getState().meta&&window.norteiaApp.getState().meta.resetAt);
  const resetState=await page.evaluate(()=>window.norteiaApp.getState());
  assert.equal(resetState.transactions.length,0,'reinício não apagou movimentações');
  assert.equal(resetState.goals.length,0,'reinício não apagou metas');
  assert.ok(resetState.meta.resetAt,'reinício não registrou marcador de sincronização');
  await page.reload({waitUntil:'domcontentloaded'});
  await page.locator('body.app-mode').waitFor({timeout:10000});
  await page.waitForFunction(()=>window.norteiaApp.getState().meta&&window.norteiaApp.getState().meta.resetAt);
  assert.equal(await page.evaluate(()=>window.norteiaApp.getState().transactions.length),0,'dados apagados voltaram após novo login/carregamento');
  await page.evaluate(()=>document.getElementById('tutorial').classList.add('hidden'));

  const results=[];
  for(const width of [320,375,430,1024,1440]){
    await page.setViewportSize({width,height:width<600?844:900});
    await page.waitForTimeout(100);
    const metrics=await page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,touchMin:Math.min(...Array.from(document.querySelectorAll('.mobile-nav button')).filter(x=>getComputedStyle(x).display!=='none').map(x=>x.getBoundingClientRect().height))}));
    assert.ok(metrics.scrollWidth<=width+1,`estouro horizontal em ${width}px: ${metrics.scrollWidth}px`);
    if(width<600)assert.ok(metrics.touchMin>=44,`alvo de toque menor que 44px em ${width}px`);
    results.push(metrics);
  }
  const desktopLabels=await page.locator('.desktop-nav button[data-view]:visible').allTextContents();
  assert.deepEqual(desktopLabels.map(x=>x.trim()),['Hoje','Movimentos','Planos','Comunidade']);
  await page.locator('.desktop-nav [data-view="plan"]').click();
  assert.equal(await page.locator('#norteiaPlanWorkspace').isVisible(),true);
  await page.locator('[data-plan-tab="reserve"]').click();
  assert.equal(await page.locator('[data-plan-panel="reserve"]').isVisible(),true);
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({ok:true,results},null,2));
  await browser.close();
})().catch(error=>{console.error(error);process.exit(1)});
