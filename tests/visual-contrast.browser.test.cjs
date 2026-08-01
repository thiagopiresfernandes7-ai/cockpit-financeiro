const assert=require('node:assert/strict');
const path=require('node:path');
const {chromium}=require('playwright');

function rgb(value){return(value.match(/\d+(?:\.\d+)?/g)||[]).slice(0,3).map(Number)}
function luminance(color){return color.map(v=>{v/=255;return v<=.04045?v/12.92:Math.pow((v+.055)/1.055,2.4)}).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0)}
function ratio(a,b){const x=luminance(a),y=luminance(b);return(Math.max(x,y)+.05)/(Math.min(x,y)+.05)}

(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
 const page=await browser.newPage({viewport:{width:1366,height:768}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',route=>route.request().url().startsWith('http://127.0.0.1:4173/')?route.fallback():route.fulfill({status:200,body:'',contentType:'application/javascript'}));
 await page.goto('http://127.0.0.1:4173/index.html',{waitUntil:'domcontentloaded'});
 await page.evaluate(()=>{const app=document.getElementById('appView');if(app)app.classList.add('hidden');document.getElementById('authView').classList.remove('hidden');document.body.classList.add('auth-mode')});
 await page.locator('#authView:not(.hidden)').waitFor();
 for(const theme of ['light','dark'])for(const width of [390,1366]){
   await page.setViewportSize({width,height:width<600?844:768});
   await page.evaluate(t=>document.documentElement.dataset.theme=t,theme);
   const styles=await page.evaluate(()=>Array.from(document.querySelectorAll('.auth-hero h1,.auth-hero p,.auth-badges span')).map(el=>({text:el.textContent.trim(),color:getComputedStyle(el).color})));
   for(const item of styles){
     const foreground=rgb(item.color);
     assert.ok(Math.min(ratio(foreground,[11,113,92]),ratio(foreground,[18,72,59]))>=4.5,`${theme}/${width}: contraste insuficiente em ${item.text}: ${item.color}`);
   }
   const formStyles=await page.evaluate(()=>Array.from(document.querySelectorAll('.auth-form h2,.auth-form>p,.auth-form .field span,.auth-form input')).map(el=>({text:el.textContent.trim()||el.placeholder,color:getComputedStyle(el).color,background:getComputedStyle(el).backgroundColor})));
   for(const item of formStyles)assert.ok(ratio(rgb(item.color),[255,255,255])>=4.5,`${theme}/${width}: contraste insuficiente no formulário em ${item.text}: ${item.color}`);
   const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
   assert.ok(overflow<=1,`${theme}/${width}: estouro horizontal de ${overflow}px`);
   await page.screenshot({path:path.join(process.env.TEMP,`norteia-auth-${theme}-${width}.png`),fullPage:true});
 }
 assert.deepEqual(errors,[]);
 await browser.close();
 console.log('Contraste do acesso, temas e larguras: OK');
})().catch(error=>{console.error(error);process.exit(1)});
