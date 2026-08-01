const assert=require('node:assert/strict');
const fs=require('node:fs');
const html=fs.readFileSync('index.html','utf8');
assert.ok(html.includes('function transactionImportKey('),'identidade de movimentação importada ausente');
assert.ok(html.includes('txKeys.has(key)'),'CSV/Excel não evita duplicidade');
assert.ok(html.includes('invKeys.has(invKey)'),'investimentos importados não evitam duplicidade');
assert.ok(html.includes("duplicado(s) ignorado(s)"),'resultado da deduplicação não é informado');
console.log('Importações locais e deduplicação: OK');
