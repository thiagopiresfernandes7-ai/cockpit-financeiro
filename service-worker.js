const CACHE_NAME="norteia-v16";
const APP_SHELL=["./","./index.html","./financial-decision-engine.js","./freemium.js","./norteia-v2.css","./norteia-v2.js","./norteia-completion.css","./norteia-completion.js","./community.css","./community.js","./community-mobile.js","./gamification.css","./gamification.js","./manifest.json","./privacy-policy.html","./terms.html","./support.html","./delete-account.html","./premium.html","./hotmart-access.html","./icon-192.png","./icon-512.png","./maskable-icon-512.png","./assets/brand/norteia-symbol.svg"];
self.addEventListener("install",event=>event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(APP_SHELL)).then(()=>self.skipWaiting())));
self.addEventListener("activate",event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE_NAME).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener("fetch",event=>{
  if(event.request.method!=="GET"||new URL(event.request.url).origin!==self.location.origin)return;
  event.respondWith(fetch(event.request).then(response=>{
    if(response&&response.ok){const copy=response.clone();caches.open(CACHE_NAME).then(cache=>cache.put(event.request,copy))}
    return response;
  }).catch(()=>caches.match(event.request).then(hit=>hit||caches.match("./index.html"))));
});
