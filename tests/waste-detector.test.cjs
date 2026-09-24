const assert=require('node:assert/strict');
const {analyze}=require('../waste-detector.js');

let seq=0;
const tx=(date,description,amount,category,extra)=>Object.assign({id:'t'+(++seq),date,description,amount,type:'expense',category},extra||{});
const months=['2026-06','2026-07','2026-08','2026-09'];
const base=[];
const cinema={'2026-06':60,'2026-07':45,'2026-08':72,'2026-09':60};
for(const m of months){
  base.push(tx(m+'-05','Aluguel',1800,'Moradia'));                       // essencial recorrente: não é assinatura
  base.push(tx(m+'-08','Netflix',55.9,'Cartão de crédito'));              // assinatura mesmo na categoria do cartão
  base.push(tx(m+'-09','Spotify',21.9,'Lazer'));
  base.push(tx(m+'-10','Notebook 3/10',420,'Outros',{installment:true})); // parcela: não é assinatura
  base.push(tx(m+'-12','Mercado Extra',900,'Mercado'));
  base.push(tx(m+'-15','Cinema',cinema[m],'Lazer'));                     // hábito com valor variável: não é assinatura
  if(m!=='2026-09')base.push(tx(m+'-18','Academia Fit',99.9,'Saúde'));    // assinatura que já foi cancelada: não conta
  base.push({id:'r'+m,date:m+'-01',description:'Salário',amount:8000,type:'income',category:'Salário'});
}
const sep=[
  tx('2026-09-03','Tarifa pacote de serviços',39.9,'Outros'),
  tx('2026-09-04','Juros rotativo cartão',180,'Cartão de crédito'),
  tx('2026-09-06','Posto Shell',250,'Transporte'),
  tx('2026-09-07','Posto Shell',250,'Transporte'),                         // duplicada (mesmo valor, 1 dia)
  ...Array.from({length:14},(_,i)=>tx('2026-09-'+String(i+10).padStart(2,'0'),'iFood',48,'Alimentação')),
  ...Array.from({length:8},(_,i)=>tx('2026-09-'+String(i+2).padStart(2,'0'),'Café da esquina',14,'Padaria')),
  tx('2026-09-20','Show',400,'Lazer'),tx('2026-09-21','Bar',150,'Lazer')   // Lazer muito acima da média
];
const r=analyze({month:'2026-09',transactions:base.concat(sep)});
const byType=t=>r.achados.filter(f=>f.tipo===t);
const names=f=>f.itens.map(i=>i.descricao);

// Assinaturas: Netflix e Spotify sim; aluguel, mercado e parcela não.
const subs=byType('subscriptions');
assert.equal(subs.length,1,'assinaturas não detectadas');
assert.deepEqual(names(subs[0]).sort(),['Netflix','Spotify']);
assert.equal(subs[0].gastoMensal,77.8);
assert.equal(subs[0].economiaMensal,38.9,'economia de assinaturas deve considerar 50%');

// Tarifas e juros.
const fees=byType('fees');
assert.equal(fees.length,1);assert.deepEqual(names(fees[0]).sort(),['Juros rotativo cartão','Tarifa pacote de serviços']);
assert.equal(fees[0].severidade,'alta');

// Cobrança duplicada: só a segunda entra como excedente.
const dup=byType('duplicate');
assert.equal(dup.length,1);assert.equal(dup[0].gastoMensal,250);

// Comer fora: iFood 14 x 48 = 672 + cafés 8 x 14 = 112 + bar 150 = 934.
const eat=byType('eating_out');
assert.equal(eat.length,1);assert.equal(eat[0].gastoMensal,934);

// Cafés já contados em "comer fora" não reaparecem como gastos formiga.
assert.equal(byType('small_purchases').length,0,'pequenos gastos contados duas vezes');

// Lazer: 631,90 contra média de 80,90; bar e Spotify já foram contados, sobra 460 de excedente real.
const spike=byType('category_spike').find(f=>/^Lazer/.test(f.titulo));
assert.ok(spike,'Lazer acima da média não detectado');
assert.equal(spike.gastoMensal,460);

// Nenhum lançamento é contado em dois achados.
const counted=r.achados.flatMap(f=>f.itens.map(i=>i.id));
assert.equal(new Set(counted).size,counted.length,'lançamento contado duas vezes');

// Pontuais (duplicada, pico de categoria) não são multiplicados por 12; recorrentes sim.
assert.equal(dup[0].recorrente,false);assert.equal(dup[0].economiaAnual,250);
assert.equal(spike.recorrente,false);assert.equal(spike.economiaAnual,460);
assert.equal(subs[0].recorrente,true);assert.equal(subs[0].economiaAnual,Math.round(38.9*12*100)/100);

// Ordenado pela economia anual e totais coerentes.
for(let i=1;i<r.achados.length;i++)assert.ok(r.achados[i-1].economiaAnual>=r.achados[i].economiaAnual);
const cents=v=>Math.round(v*100);
assert.equal(cents(r.economiaAnual),cents(r.achados.reduce((s,f)=>s+f.economiaAnual,0)));
assert.equal(cents(r.economiaMensal),cents(r.achados.filter(f=>f.recorrente).reduce((s,f)=>s+f.economiaMensal,0)));

// Gastos formiga aparecem quando passam do limite.
const ant=analyze({month:'2026-09',income:2000,transactions:Array.from({length:10},(_,i)=>tx('2026-09-'+String(i+1).padStart(2,'0'),'Café '+i,12,'Padaria'))});
assert.equal(ant.achados.filter(f=>f.tipo==='small_purchases').length,1,'gastos formiga não detectados');

// Compras parceladas: nunca viram "duplicada", "acima da média", "delivery" ou "pequenos gastos".
const parcel=(date,desc,amount,cat)=>tx(date,desc,amount,cat,{installment:true});
const inst=analyze({month:'2026-09',income:5000,transactions:[
  parcel('2026-09-10','Magazine Luiza 2/10',100,'Casa'),parcel('2026-09-10','Magazine Luiza 5/10',100,'Casa'), // mesma loja e valor
  parcel('2026-09-12','Geladeira 1/12',350,'Casa'),                                                        // parcela nova
  tx('2026-06-05','Luminária',80,'Casa'),tx('2026-07-05','Tapete',90,'Casa'),tx('2026-08-05','Vaso',70,'Casa'),
  ...Array.from({length:8},(_,i)=>parcel('2026-09-'+String(i+1).padStart(2,'0'),'iFood parcelado '+i,20,'Alimentação')),
  parcel('2026-09-15','Empréstimo 4/24 juros',300,'Dívidas')                                               // juros continuam aparecendo
]});
assert.equal(inst.achados.filter(f=>f.tipo==='duplicate').length,0,'parcelas marcadas como duplicadas');
assert.equal(inst.achados.filter(f=>f.tipo==='category_spike').length,0,'parcela nova tratada como gasto acima da média');
assert.equal(inst.achados.filter(f=>f.tipo==='eating_out'||f.tipo==='small_purchases').length,0,'parcelas em delivery/pequenos gastos');
assert.equal(inst.achados.filter(f=>f.tipo==='fees').length,1,'juros de parcela devem continuar visíveis');

// O detector só lê: a lista recebida sai intacta.
const input=base.concat(sep).map(t=>Object.assign({},t)),snapshot=JSON.stringify(input);
analyze({month:'2026-09',transactions:input});
assert.equal(JSON.stringify(input),snapshot,'detector alterou os lançamentos');

// Mês sem despesas e entrada vazia não quebram.
assert.equal(analyze({month:'2026-10',transactions:base}).achados.length,0);
assert.equal(analyze({}).achados.length,0);
// Integração no app: scripts carregados, guardados offline e funções do núcleo expostas só para leitura.
const fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync('index.html','utf8'),sw=fs.readFileSync('service-worker.js','utf8'),panel=fs.readFileSync('norteia-waste.js','utf8');
new vm.Script(panel,{filename:'norteia-waste.js'});
for(const file of ['waste-detector.js','norteia-waste.js']){assert.ok(new RegExp('<script src="'+file.replace('.','\\.')+'\\?v=\\d+"></script>').test(html),file+' não carregado');assert.ok(sw.includes('./'+file),file+' fora do shell offline')}
for(const getter of ['getNorteiaMonthTransactions','getNorteiaSelectedMonth','norteiaMoney','getNorteiaCategoryName'])assert.ok(html.includes('window.'+getter+'='),getter+' não exposto');
assert.ok(panel.includes('parcelLabel')&&panel.includes('installment:'),'painel não marca parcelas');
assert.ok(!/innerHTML/.test(panel),'painel não pode montar HTML com texto do usuário');
assert.ok(!/(scheduleSave|saveNow|\.push\(|\.splice\()/.test(panel.replace(/out\.push/g,'')),'painel não pode alterar o estado');
console.log('Detector de desperdício: OK');
