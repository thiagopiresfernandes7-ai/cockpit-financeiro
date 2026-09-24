/* Norteia — detector de desperdício.
   Módulo puro e determinístico: recebe lançamentos já normalizados e devolve achados
   explicáveis, ordenados pela economia anual estimada. Não envia dados a lugar nenhum. */
(function(root,factory){
  var api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  root.NorteiaWasteDetector=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';

  // Palavras inteiras: "mora" (juros de mora) não pode casar com "moradia".
  var FEE=/\b(tarifas?|anuidade|juros|multas?|iof|encargos?|mora|rotativo|cheque especial)\b|pacote de servi|taxa de manuten/;
  var SUBSCRIPTION=/\b(netflix|spotify|amazon prime|prime video|disney|hbo|max\b|globoplay|youtube|apple|icloud|google one|deezer|paramount|crunchyroll|academia|gympass|wellhub|smart ?fit|chatgpt|openai|canva|adobe|microsoft 365|office 365|dropbox|ifood club|uber one|clube|assinatura|mensalidade)/;
  // Recorrentes, mas não são "assinaturas para cancelar": contas essenciais e dívidas.
  var ESSENTIAL=/\b(moradia|aluguel|condominio|saude|educacao|escola|faculdade|financiamento|emprestimo|divida|dividas|cartao de credito|seguro|energia|luz|agua|gas|internet|telefone|plano de saude|consorcio|mercado|supermercado)/;
  var EATING_OUT=/\b(ifood|rappi|uber eats|delivery|restaurante|lanchonete|lanche|burger|hamburg|pizza|mcdonald|bk\b|starbucks|cafe|padaria|bar\b|boteco|sushi|acai)/;
  // Parcela da economia considerada realista em cada tipo de achado.
  var SAVING_RATE={duplicate:1,fees:1,subscriptions:0.5,eating_out:0.3,small_purchases:0.4,category_spike:1};
  // Pontuais não se repetem todo mês: não podem ser multiplicados por 12.
  var ONE_OFF={duplicate:true,category_spike:true};

  function n(v){v=Number(v);return Number.isFinite(v)?v:0}
  function round(v){return Math.round(v*100)/100}
  function normalize(text){
    return String(text||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'')
      .replace(/[0-9]+\/[0-9]+/g,' ').replace(/[^a-z ]+/g,' ').replace(/\s+/g,' ').trim();
  }
  function merchantKey(text){return normalize(text).split(' ').filter(function(w){return w.length>1}).slice(0,3).join(' ')}
  function monthOf(date){return String(date||'').slice(0,7)}
  function median(values){var s=values.slice().sort(function(a,b){return a-b}),m=Math.floor(s.length/2);return s.length?(s.length%2?s[m]:(s[m-1]+s[m])/2):0}
  function dayDiff(a,b){return Math.abs((Date.parse(a)-Date.parse(b))/86400000)}
  function item(tx){return {id:tx.id,descricao:tx.description,valor:round(tx.amount),data:tx.date,categoria:tx.category}}

  function analyze(raw){
    var input=raw||{},month=String(input.month||'').slice(0,7);
    var all=(input.transactions||[]).map(function(tx){
      return {id:String(tx.id||''),date:String(tx.date||'').slice(0,10),description:String(tx.description||''),
        amount:Math.abs(n(tx.amount)),type:String(tx.type||'expense'),category:String(tx.category||'Sem categoria'),
        installment:Boolean(tx.installment),text:normalize((tx.description||'')+' '+(tx.category||''))};
    }).filter(function(tx){return tx.date&&tx.amount>0});
    var expenses=all.filter(function(tx){return tx.type==='expense'||tx.type==='debt'});
    var current=expenses.filter(function(tx){return monthOf(tx.date)===month});
    // Parcelas (compras parceladas, financiamentos) são compromissos já assumidos: ficam fora das regras de
    // duplicidade, delivery, pequenos gastos e pico de categoria. Só entram em "Tarifas e juros" se forem juros.
    var flexible=current.filter(function(tx){return !tx.installment});
    var income=n(input.income)||all.filter(function(tx){return tx.type==='income'&&monthOf(tx.date)===month}).reduce(function(s,tx){return s+tx.amount},0);
    var totalExpense=current.reduce(function(s,tx){return s+tx.amount},0);
    var previousMonths=Array.from(new Set(expenses.map(function(tx){return monthOf(tx.date)}).filter(function(m){return m<month}))).sort().slice(-3);
    var claimed=new Set(),findings=[];

    function add(kind,f,txs){
      var monthly=round(f.gastoMensal*SAVING_RATE[kind]);
      if(monthly<=0)return;
      txs.forEach(function(tx){claimed.add(tx.id)});
      var recurring=!ONE_OFF[kind];
      findings.push(Object.assign({tipo:kind,recorrente:recurring,economiaMensal:monthly,economiaAnual:round(recurring?monthly*12:monthly)},f,{gastoMensal:round(f.gastoMensal)}));
    }
    function free(list){return list.filter(function(tx){return !claimed.has(tx.id)})}

    if(!current.length){
      return {mes:month,achados:[],economiaMensal:0,economiaAnual:0,totalDespesas:0,mesesComparados:previousMonths.length,
        resumo:'Sem despesas registradas neste mês.'};
    }

    // 1) Possível cobrança duplicada: exatamente dois lançamentos iguais (estabelecimento e valor)
    //    no mesmo dia ou no seguinte. Três ou mais iguais no mês são hábito (café, delivery), não erro.
    var pairs={},dupes=[];
    flexible.forEach(function(tx){var k=merchantKey(tx.description)+'|'+tx.amount;(pairs[k]=pairs[k]||[]).push(tx)});
    Object.keys(pairs).forEach(function(k){
      var list=pairs[k];
      if(list.length===2&&dayDiff(list[0].date,list[1].date)<=1)dupes.push(list[1]);
    });
    if(dupes.length)add('duplicate',{titulo:'Possível cobrança duplicada',severidade:'alta',
      descricao:dupes.length+(dupes.length>1?' lançamentos repetem':' lançamento repete')+' estabelecimento e valor no mesmo dia ou no dia seguinte.',
      acao:'Confira no extrato do banco e peça o estorno do que foi cobrado duas vezes.',
      gastoMensal:dupes.reduce(function(s,tx){return s+tx.amount},0),itens:dupes.map(item)},dupes);

    // 2) Tarifas, juros e multas: dinheiro que não compra nada.
    var fees=free(current).filter(function(tx){return FEE.test(tx.text)});
    if(fees.length)add('fees',{titulo:'Tarifas, juros e multas',severidade:'alta',
      descricao:fees.length+(fees.length>1?' cobranças':' cobrança')+' de tarifa, juros, IOF ou multa neste mês.',
      acao:'Negocie isenção de anuidade e tarifas, prefira conta sem tarifa e evite o rotativo do cartão.',
      gastoMensal:fees.reduce(function(s,tx){return s+tx.amount},0),itens:fees.map(item)},fees);

    // 3) Assinaturas e cobranças recorrentes ativas neste mês.
    var groups={};
    expenses.forEach(function(tx){
      if(tx.type!=='expense'||tx.installment)return;
      // Serviço de assinatura conhecido conta sempre; senão, contas essenciais ficam de fora.
      if(!SUBSCRIPTION.test(normalize(tx.description))&&ESSENTIAL.test(tx.text))return;
      var k=merchantKey(tx.description);if(!k)return;(groups[k]=groups[k]||[]).push(tx);
    });
    var subs=[];
    Object.keys(groups).forEach(function(k){
      var list=groups[k],inMonth=list.filter(function(tx){return monthOf(tx.date)===month&&!claimed.has(tx.id)});
      if(!inMonth.length)return;
      var months=new Set(list.map(function(tx){return monthOf(tx.date)})),amounts=list.map(function(tx){return tx.amount}),med=median(amounts);
      // Cobrança recorrente: uma por mês, valor praticamente igual, presente na maior parte do período.
      var oncePerMonth=months.size===list.length;
      var stable=amounts.every(function(a){return Math.abs(a-med)<=med*0.05});
      var enoughMonths=months.size>=Math.min(3,previousMonths.length+1)&&months.size>=2;
      var named=inMonth.some(function(tx){return SUBSCRIPTION.test(normalize(tx.description))||/assinatura/.test(normalize(tx.category))});
      if((oncePerMonth&&stable&&enoughMonths&&med<=500)||named)subs.push(inMonth[inMonth.length-1]);
    });
    if(subs.length)add('subscriptions',{titulo:'Assinaturas e cobranças recorrentes',severidade:'media',
      descricao:subs.length+(subs.length>1?' cobranças se repetem':' cobrança se repete')+' todo mês.',
      acao:'Cancele o que você não usou nos últimos 30 dias; renegocie planos anuais.',
      gastoMensal:subs.reduce(function(s,tx){return s+tx.amount},0),itens:subs.map(item)},subs);

    // 4) Comer fora e delivery com peso alto nos gastos.
    var eating=free(flexible).filter(function(tx){return EATING_OUT.test(tx.text)});
    var eatingTotal=eating.reduce(function(s,tx){return s+tx.amount},0);
    if(eatingTotal>=300&&totalExpense>0&&eatingTotal/totalExpense>=0.12)add('eating_out',{titulo:'Delivery e comer fora',severidade:'media',
      descricao:Math.round(eatingTotal/totalExpense*100)+'% dos seus gastos do mês ('+eating.length+' compras).',
      acao:'Defina um limite semanal e troque parte dos pedidos por refeições em casa; cortar 30% já faz diferença.',
      gastoMensal:eatingTotal,itens:eating.map(item)},eating);

    // 5) Gastos formiga: muitas compras pequenas na mesma categoria.
    var small=free(flexible).filter(function(tx){return tx.amount<60}),byCat={};
    small.forEach(function(tx){(byCat[tx.category]=byCat[tx.category]||[]).push(tx)});
    var threshold=income>0?income*0.03:150;
    Object.keys(byCat).map(function(c){return {cat:c,list:byCat[c],sum:byCat[c].reduce(function(s,tx){return s+tx.amount},0)}})
      .filter(function(g){return g.list.length>=6&&g.sum>=threshold}).sort(function(a,b){return b.sum-a.sum}).slice(0,2)
      .forEach(function(g){add('small_purchases',{titulo:'Pequenos gastos em '+g.cat,severidade:'baixa',
        descricao:g.list.length+' compras abaixo de R$ 60 somam um valor que passa despercebido.',
        acao:'Junte essas compras em uma ida planejada ou defina um teto semanal para '+g.cat+'.',
        gastoMensal:g.sum,itens:g.list.map(item)},g.list)});

    // 6) Categorias bem acima da sua média dos meses anteriores.
    if(previousMonths.length){
      var cats=Array.from(new Set(flexible.map(function(tx){return tx.category})));
      cats.forEach(function(c){
        var txs=flexible.filter(function(tx){return tx.category===c});
        var now=txs.reduce(function(s,tx){return s+tx.amount},0);
        var avg=previousMonths.map(function(m){return expenses.filter(function(tx){return !tx.installment&&tx.category===c&&monthOf(tx.date)===m}).reduce(function(s,tx){return s+tx.amount},0)})
          .reduce(function(s,v){return s+v},0)/previousMonths.length;
        // Só o excedente que ainda não entrou em outro achado, para não contar o mesmo real duas vezes.
        var unclaimed=free(txs),excess=Math.min(now-avg,unclaimed.reduce(function(s,tx){return s+tx.amount},0));
        if(avg>0&&now>avg*1.3&&excess>=100){
          add('category_spike',{titulo:c+' acima da sua média',severidade:'media',
            descricao:'Você gastou '+Math.round((now/avg-1)*100)+'% a mais que a média dos últimos '+previousMonths.length+(previousMonths.length>1?' meses.':' mês.'),
            acao:'Veja quais compras de '+c+' fugiram do normal e ajuste o orçamento da categoria.',
            gastoMensal:excess,itens:unclaimed.map(item)},unclaimed);
        }
      });
    }

    findings.sort(function(a,b){return b.economiaAnual-a.economiaAnual});
    // economiaMensal: só o que se repete todo mês. economiaAnual: recorrentes × 12 + pontuais uma vez.
    var monthly=round(findings.filter(function(f){return f.recorrente}).reduce(function(s,f){return s+f.economiaMensal},0));
    var annual=round(findings.reduce(function(s,f){return s+f.economiaAnual},0));
    return {mes:month,achados:findings,economiaMensal:monthly,economiaAnual:annual,totalDespesas:round(totalExpense),
      mesesComparados:previousMonths.length,
      resumo:findings.length?'Encontramos '+findings.length+(findings.length>1?' pontos':' ponto')+' onde seu dinheiro está escapando.':'Nenhum desperdício claro neste mês.'};
  }

  return {analyze:analyze,normalize:normalize,version:'1.0.0'};
});
