const CACHE_NAME="norteia-v53";
const APP_SHELL=["./","./index.html","./financial-decision-engine.js","./freemium.js","./norteia-v2.css","./norteia-v2.js","./norteia-completion.css","./norteia-completion.js","./contrast.css","./norteia-design.css","./norteia-design.js","./waste-detector.js","./norteia-waste.js","./gamification.css","./gamification.js","./manifest.json","./privacy-policy.html","./terms.html","./support.html","./delete-account.html","./premium.html","./hotmart-access.html","./legal.css","./icon-192.png","./icon-512.png","./maskable-icon-512.png","./apple-touch-icon.png","./assets/brand/norteia-icon.svg","./assets/brand/norteia-symbol.svg"];
self.addEventListener("install",event=>event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(APP_SHELL)).then(()=>self.skipWaiting())));
self.addEventListener("activate",event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE_NAME).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
// Offline: a página pede "freemium.js?v=46", mas o shell guarda "./freemium.js"; ignoreSearch liga os dois.
// index.html só substitui navegações, nunca scripts ou estilos.
function offlineMatch(request){
  return caches.match(request)
    .then(hit=>hit||caches.match(request,{ignoreSearch:true}))
    .then(hit=>hit||(request.mode==="navigate"?caches.match("./index.html"):undefined))
    .then(hit=>hit||Response.error());
}
self.addEventListener("fetch",event=>{
  if(event.request.method!=="GET"||new URL(event.request.url).origin!==self.location.origin)return;
  event.respondWith(fetch(event.request,{cache:"no-store"}).then(response=>{
    if(response&&response.ok){const copy=response.clone();caches.open(CACHE_NAME).then(cache=>cache.put(event.request,copy))}
    return response;
  }).catch(()=>offlineMatch(event.request)));
});
