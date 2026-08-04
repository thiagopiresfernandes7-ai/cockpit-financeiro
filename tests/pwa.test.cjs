const assert=require('node:assert/strict');
const fs=require('node:fs');
const manifest=JSON.parse(fs.readFileSync('manifest.json','utf8'));
const sw=fs.readFileSync('service-worker.js','utf8');
assert.equal(manifest.name,'Norteia');
assert.equal(manifest.display,'standalone');
for(const file of ['index.html','financial-decision-engine.js','norteia-v2.css','norteia-completion.js','community.css','community.js','community-mobile.js','gamification.js','maskable-icon-512.png']){
  assert.ok(fs.existsSync(file),file+' não existe');
  assert.ok(sw.includes('./'+file),file+' não está no shell offline');
}
assert.ok(sw.includes('self.skipWaiting()')&&sw.includes('self.clients.claim()'));
assert.ok(sw.includes('cache:"no-store"'),'navegação ainda pode reutilizar resposta HTTP antiga');
const freemium=fs.readFileSync('freemium.js','utf8');
assert.ok(freemium.includes('updateViaCache:"none"')&&freemium.includes('registration.update()'),'atualização imediata do service worker ausente');
console.log('Manifesto e shell offline do PWA: OK');
