const assert=require('node:assert/strict');
const {chromium}=require('playwright');

(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
 const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 await page.route('**/*',route=>route.request().url().startsWith('http://127.0.0.1:4173/')?route.fallback():route.fulfill({status:200,body:'',contentType:route.request().resourceType()==='stylesheet'?'text/css':'application/javascript'}));
 await page.addInitScript(()=>{
  function query(){const q={select(){return q},eq(){return q},is(){return q},in(){return q},not(){return q},lt(){return q},ilike(){return q},or(){return q},order(){return q},limit(){return q},single(){return Promise.resolve({data:null,error:null})},maybeSingle(){return Promise.resolve({data:null,error:null})},insert(){return q},update(){return q},delete(){return q},upsert(){return q},then(resolve){resolve({data:[],error:null,count:0})}};return q}
  const user={id:'10000000-0000-0000-0000-000000000001',email:'dono@norteia.local',user_metadata:{full_name:'Marina Teste'}};
  window.supabase={createClient(){return{auth:{getSession:async()=>({data:{session:{user}},error:null}),signOut:async()=>({error:null}),signInWithOAuth:async()=>({error:null}),signInWithPassword:async()=>({error:null}),signUp:async()=>({error:null}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})},rpc:async name=>({data:name==='app_is_owner',error:null}),from:query,storage:{from(){return{upload:async()=>({data:{},error:null}),remove:async()=>({data:{},error:null}),getPublicUrl:path=>({data:{publicUrl:'https://example.test/'+path}}),createSignedUrl:async()=>({data:{signedUrl:'https://example.test/signed'},error:null})}}},channel(){return{on(){return this},subscribe(){return this}}},removeChannel(){}}}};
 });
 await page.goto('http://127.0.0.1:4173/index.html',{waitUntil:'domcontentloaded'});
 await page.locator('body.app-mode').waitFor();
 await page.evaluate(()=>document.getElementById('tutorial').classList.add('hidden'));
 const views=['dashboard','more','register','analysis','projection','plan','decisions','wallet','debts','dividends','simulator','weekly','settings','categories','profile','help'];
 const failures=[];
 for(const theme of ['light','dark']){
  await page.evaluate(t=>document.documentElement.dataset.theme=t,theme);
  for(const view of views){
   await page.evaluate(v=>window.setView(v),view);await page.waitForTimeout(30);
   const found=await page.evaluate(()=>{
    function rgb(v){const n=(v.match(/[\d.]+/g)||[]).map(Number);return n.length>=3?n.slice(0,3):null}
    function lum(c){return c.map(v=>{v/=255;return v<=.04045?v/12.92:Math.pow((v+.055)/1.055,2.4)}).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0)}
    function ratio(a,b){const x=lum(a),y=lum(b);return(Math.max(x,y)+.05)/(Math.min(x,y)+.05)}
    function background(el){for(let n=el;n&&n!==document.documentElement;n=n.parentElement){const s=getComputedStyle(n);if(s.backgroundImage!=='none')return null;const c=rgb(s.backgroundColor);if(c&&s.backgroundColor&&!/rgba\([^)]*,\s*0(?:\.0+)?\)/.test(s.backgroundColor))return c}return rgb(getComputedStyle(document.body).backgroundColor)||[255,255,255]}
    return Array.from(document.querySelectorAll('.section.active h1,.section.active h2,.section.active h3,.section.active p,.section.active small,.section.active b,.section.active strong,.section.active button,.section.active label span,.section.active input,.section.active select,.section.active textarea')).filter(el=>{const s=getComputedStyle(el),r=el.getBoundingClientRect();return r.width>0&&r.height>0&&s.visibility!=='hidden'&&Number(s.opacity)>=.8&&(el.textContent.trim()||el.placeholder)&&!el.closest('svg')}).map(el=>{const s=getComputedStyle(el),fg=rgb(s.color),bg=background(el);if(!fg||!bg)return null;const size=parseFloat(s.fontSize),bold=parseInt(s.fontWeight)>=700,required=(size>=24||(size>=18.66&&bold))?3:4.5,value=ratio(fg,bg);return value+0.05<required?{text:(el.textContent.trim()||el.placeholder).slice(0,70),ratio:Number(value.toFixed(2)),required,tag:el.tagName,className:el.className,parent:el.parentElement&&el.parentElement.className,chain:Array.from({length:4},(_,i)=>{let n=el;for(let j=0;j<i;j++)n=n&&n.parentElement;return n&&(n.id||n.className||n.tagName)}),fg:s.color,ownBg:s.backgroundColor,ownImage:s.backgroundImage,bg:bg.join(',')}:null}).filter(Boolean).slice(0,30)
   });
   found.forEach(x=>failures.push({theme,view,...x}));
  }
 }
 await page.setViewportSize({width:390,height:844});
 for(const theme of ['light','dark']){await page.evaluate(t=>{document.documentElement.dataset.theme=t;window.setView('dashboard')},theme);assert.equal(await page.locator('#mobileSpendToday').isVisible(),true)}
 assert.deepEqual(errors,[],'erros no navegador: '+errors.join(' | '));
 assert.deepEqual(failures,[],'contrastes insuficientes:\n'+JSON.stringify(failures,null,2));
 await browser.close();console.log('Contraste integral: 16 telas, claro/escuro e mobile: OK');
})().catch(e=>{console.error(e);process.exit(1)});
