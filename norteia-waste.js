/* Norteia — painel "Onde seu dinheiro está escapando" na tela Hoje.
   Lê os lançamentos do mês selecionado e dos 3 anteriores, roda o detector local
   (waste-detector.js) e mostra os achados. Texto do usuário entra só via textContent. */
(function(){
  "use strict";
  var LIMIT=4,expanded=false,openKinds={};

  function money(v){return typeof window.norteiaMoney==="function"?window.norteiaMoney(v):"R$ "+Number(v||0).toFixed(2)}
  function node(tag,cls,text){var e=document.createElement(tag);if(cls)e.className=cls;if(text!=null)e.textContent=text;return e}
  function shiftMonth(ym,delta){var p=String(ym).split("-"),d=new Date(Number(p[0]),Number(p[1])-1+delta,1);return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")}
  function monthLabel(ym){var p=String(ym).split("-");return new Date(Number(p[0]),Number(p[1])-1,1).toLocaleDateString("pt-BR",{month:"long",year:"numeric"})}
  function dayLabel(date){var p=String(date||"").split("-");return p.length===3?p[2]+"/"+p[1]:""}

  function collect(){
    if(typeof window.getNorteiaMonthTransactions!=="function"||typeof window.getNorteiaSelectedMonth!=="function")return null;
    var ym=window.getNorteiaSelectedMonth(),out=[];
    [-3,-2,-1,0].forEach(function(delta){
      var m=shiftMonth(ym,delta),list=[];
      try{list=window.getNorteiaMonthTransactions(m)||[]}catch(e){list=[]}
      list.forEach(function(t){
        var date=String(t.date||"");
        // Parcelas geradas podem carregar a data da compra original; o mês de referência é o da fatura.
        if(date.slice(0,7)!==m)date=m+"-"+(date.slice(8,10)||"01");
        out.push({
          id:String(t.id||"")+"@"+m,date:date,description:t.description||t.desc||"Movimentação",
          amount:t.monthAmount!=null?t.monthAmount:t.value,type:t.type,
          category:typeof window.getNorteiaCategoryName==="function"?window.getNorteiaCategoryName(t.categoryId,t.category):(t.category||""),
          installment:Boolean(t.parcelLabel||t.debtId||(t.installments&&Number(t.installments.count)>1)||Number(t.installmentCount)>1)
        });
      });
    });
    return {month:ym,transactions:out};
  }

  function renderFinding(f){
    var li=node("li","n-waste-item sev-"+f.severidade),details=node("details"),summary=node("summary");
    details.dataset.kind=f.tipo+"|"+f.titulo;
    if(openKinds[details.dataset.kind])details.open=true;
    details.addEventListener("toggle",function(){openKinds[details.dataset.kind]=details.open});
    var main=node("span","n-waste-main");main.appendChild(node("b",null,f.titulo));main.appendChild(node("small",null,f.descricao));
    var value=node("span","n-waste-value");
    if(f.recorrente){value.appendChild(node("b",null,money(f.economiaAnual)+"/ano"));value.appendChild(node("small",null,money(f.economiaMensal)+" por mês"))}
    else{value.appendChild(node("b",null,money(f.economiaMensal)));value.appendChild(node("small",null,"neste mês"))}
    summary.appendChild(node("span","n-waste-dot"));summary.appendChild(main);summary.appendChild(value);
    details.appendChild(summary);
    var body=node("div","n-waste-body"),action=node("p","n-waste-action");
    action.appendChild(node("b",null,"O que fazer: "));action.appendChild(document.createTextNode(f.acao));
    body.appendChild(action);
    var items=node("ul","n-waste-txs");
    f.itens.slice(0,8).forEach(function(i){
      var row=node("li");row.appendChild(node("span","n-waste-tx-desc",i.descricao));row.appendChild(node("span","n-waste-tx-date",dayLabel(i.data)));row.appendChild(node("span","n-waste-tx-value",money(i.valor)));
      items.appendChild(row);
    });
    if(f.itens.length>8)items.appendChild(node("li","n-waste-tx-more","+ "+(f.itens.length-8)+" lançamento(s)"));
    body.appendChild(items);details.appendChild(body);li.appendChild(details);
    return li;
  }

  function render(){
    var dash=document.getElementById("dashboard");
    if(!dash||!window.NorteiaWasteDetector)return;
    var input=collect();if(!input)return;
    var result=window.NorteiaWasteDetector.analyze(input);
    var panel=document.getElementById("wastePanel");
    if(!panel){
      panel=node("section","panel n-waste");panel.id="wastePanel";panel.setAttribute("aria-labelledby","wasteTitle");
      var anchor=dash.querySelector(".dashboard-kpis");
      if(anchor)anchor.insertAdjacentElement("afterend",panel);else dash.appendChild(panel);
    }
    panel.textContent="";
    var head=node("div","n-waste-head"),titles=node("div");
    var h=node("h2",null,"Onde seu dinheiro está escapando");h.id="wasteTitle";titles.appendChild(h);
    titles.appendChild(node("p",null,"Análise de "+monthLabel(result.mes)+(result.mesesComparados?" comparada aos "+result.mesesComparados+" meses anteriores.":".")));
    head.appendChild(titles);
    if(result.achados.length){
      var total=node("div","n-waste-total");total.appendChild(node("small",null,"Economia possível"));
      total.appendChild(node("b",null,money(result.economiaAnual)+" em 12 meses"));
      if(result.economiaMensal)total.appendChild(node("span",null,money(result.economiaMensal)+" por mês em gastos que se repetem"));
      head.appendChild(total);
    }
    panel.appendChild(head);
    if(!result.achados.length){
      var empty=node("div","n-waste-empty");
      empty.appendChild(node("b",null,result.totalDespesas?"Nenhum desperdício claro neste mês.":"Sem despesas registradas neste mês."));
      empty.appendChild(node("span",null,result.totalDespesas?"Seus gastos estão dentro do seu padrão. Continue registrando para o Norteia comparar os próximos meses.":"Registre suas despesas para o Norteia encontrar onde dá para economizar."));
      panel.appendChild(empty);return;
    }
    var list=node("ol","n-waste-list");
    result.achados.slice(0,expanded?result.achados.length:LIMIT).forEach(function(f){list.appendChild(renderFinding(f))});
    panel.appendChild(list);
    if(result.achados.length>LIMIT){
      var more=node("button","btn ghost n-waste-more",expanded?"Mostrar menos":"Ver todos os "+result.achados.length+" pontos");more.type="button";
      more.addEventListener("click",function(){expanded=!expanded;render()});
      panel.appendChild(more);
    }
    panel.appendChild(node("p","n-waste-note","Estimativa feita no seu aparelho com os seus lançamentos. Nenhum dado é enviado."));
  }

  var pending=false;
  function schedule(){if(pending)return;pending=true;setTimeout(function(){pending=false;try{render()}catch(e){console.warn("[Norteia desperdício]",e)}},0)}
  window.addEventListener("norteia:rendered",schedule);
  window.NorteiaWastePanel={render:render};
  if(document.readyState!=="loading")schedule();else document.addEventListener("DOMContentLoaded",schedule);
})();
