/*
  Cockpit Financeiro — HOTFIX LIMPO v10
  Objetivo: destravar navegação e estabilizar mobile sem empilhar patches antigos.

  IMPORTANTE:
  - Substitua TODO o conteúdo atual de hotfix.js por este arquivo.
  - Não cole por cima. Apague tudo antes.
  - No index.html use: <script src="./hotfix.js?v=10" defer></script>
*/

(function () {
  "use strict";

  const FLAG = "cockpit-clean-router-v10";
  if (window[FLAG]) return;
  window[FLAG] = true;

  const CUSTOM_VIEWS = new Set(["debts", "dividends", "simulator"]);

  function q(selector, root = document) {
    return root.querySelector(selector);
  }

  function qa(selector, root = document) {
    return Array.from(root.querySelectorAll(selector));
  }

  function id(name) {
    return document.getElementById(name);
  }

  function safe(fn, fallback) {
    try {
      return fn();
    } catch (error) {
      console.warn("[Cockpit v10]", error);
      return fallback;
    }
  }

  function getState() {
    return safe(function () { return state; }, window.state || {});
  }

  function getMonth() {
    return safe(function () { return selectedMonth(); }, null) ||
      (id("monthPicker") && id("monthPicker").value) ||
      new Date().toISOString().slice(0, 7);
  }

  function today() {
    return new Date().toISOString().slice(0, 10);
  }

  function uid() {
    return "id_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2);
  }

  function brl(value) {
    return Number(value || 0).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL"
    });
  }

  function esc(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (char) {
      return {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
      }[char];
    });
  }

  function num(value) {
    return Math.max(0, Number(String(value || "0").replace(",", ".")) || 0);
  }

  function isMobile() {
    return window.innerWidth <= 900 || window.matchMedia("(max-width: 900px)").matches;
  }

  function monthNameSafe(month) {
    return safe(function () { return monthName(month); }, month || "");
  }

  function setTopTitle(title, hint) {
    const titleNode = id("pageTitle");
    const hintNode = id("monthHint");
    if (titleNode) titleNode.textContent = title || "Cockpit";
    if (hintNode && hint) hintNode.textContent = hint;
  }

  function showOnly(sectionId) {
    qa(".section").forEach(function (section) {
      const active = section.id === sectionId;
      section.classList.toggle("active", active);
      section.style.display = active ? "block" : "none";
    });

    const content = q(".content");
    if (content) content.scrollTo({ top: 0, behavior: "instant" });
    window.scrollTo({ top: 0, behavior: "instant" });
  }

  function normalizeViewName(view, buttonText) {
    const text = String(buttonText || "").toLowerCase();

    if (view === "debts" || text.includes("dívida") || text.includes("divida")) return "debts";
    if (view === "dividends" || text.includes("dividendo")) return "dividends";
    if (view === "simulator" || text.includes("simulador")) return "simulator";
    if (text.includes("investimento")) return "wallet";
    if (text.includes("patrimônio") || text.includes("patrimonio")) return "wallet";
    if (text.includes("extrato")) return "register";
    if (text.includes("início") || text.includes("inicio")) return "dashboard";
    if (text.includes("análise") || text.includes("analise")) return "analysis";
    if (text.includes("fluxo")) return "projection";
    if (text.includes("orçamento") || text.includes("orcamento")) return "budget";
    if (text.includes("perfil")) return "profile";
    if (text.includes("configura")) return "settings";
    if (text.includes("categoria")) return "categories";
    if (text.includes("ajuda")) return "help";

    return view || "";
  }

  function markNavActive(view) {
    qa("#nav button, .nav-hub button, .desktop-nav button, .grouped-nav button, .mobile-nav button").forEach(function (button) {
      const normalized = normalizeViewName(button.dataset.view, button.textContent);
      button.dataset.view = normalized || button.dataset.view || "";
      button.classList.toggle("active", normalized === view);
    });
  }

  function cleanupCustomSectionsUnless(view) {
    CUSTOM_VIEWS.forEach(function (customView) {
      if (customView === view) return;
      const section = id(customView);
      if (section) {
        section.classList.remove("active");
        section.style.display = "none";
      }
    });
  }

  function callOriginalSetView(view) {
    if (typeof window.__cockpitOriginalSetViewV10 !== "function") return false;
    return safe(function () {
      window.__cockpitOriginalSetViewV10(view);
      return true;
    }, false);
  }

  function openOriginalView(view) {
    cleanupCustomSectionsUnless(view);

    const usedOriginal = callOriginalSetView(view);

    setTimeout(function () {
      cleanupCustomSectionsUnless(view);

      const section = id(view);
      if (section) {
        showOnly(view);
      }

      markNavActive(view);
      syncTitle(view);
      fixMobileChrome();
    }, usedOriginal ? 80 : 0);
  }

  function syncTitle(view) {
    const map = {
      dashboard: ["Início", "Resumo do mês"],
      analysis: ["Análise", "Diagnóstico financeiro"],
      register: ["Extrato", "Movimentações do mês"],
      wallet: ["Investimentos", "Carteira e patrimônio"],
      debts: ["Dívidas", "Parcelas e financiamentos"],
      dividends: ["Dividendos", "Rendimentos e renda passiva"],
      simulator: ["Simulador", "Projeções financeiras"],
      projection: ["Fluxo de caixa", "Projeção dos próximos meses"],
      budget: ["Orçamento", "Limites e categorias"],
      profile: ["Perfil", "Dados da conta"],
      settings: ["Configurações", "Preferências do app"],
      categories: ["Categorias", "Organização dos lançamentos"],
      help: ["Ajuda", "Tutoriais e suporte"]
    };

    const pair = map[view];
    if (pair) setTopTitle(pair[0], pair[1]);
  }

  function injectCss() {
    if (id("cockpit-clean-router-v10-css")) return;

    const css = `
/* ===== Cockpit Hotfix Limpo v10 ===== */

#debts.cockpit-custom-section,
#dividends.cockpit-custom-section,
#simulator.cockpit-custom-section {
  display: none;
}

#debts.cockpit-custom-section.active,
#dividends.cockpit-custom-section.active,
#simulator.cockpit-custom-section.active {
  display: block !important;
}

.cockpit-grid-2 {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 14px;
  align-items: start;
}

.cockpit-kpis-4 {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 14px;
}

.cockpit-kpi {
  border: 1px solid rgba(142,213,255,.18);
  background: radial-gradient(circle at 90% 0%,rgba(54,228,198,.10),transparent 38%),linear-gradient(180deg,rgba(26,45,71,.84),rgba(13,26,45,.90));
  border-radius: 18px;
  padding: 14px;
}

.cockpit-kpi span {
  display: block;
  font-size: 9px;
  letter-spacing: .13em;
  text-transform: uppercase;
  color: var(--muted,#7f94ae);
  font-weight: 1000;
}

.cockpit-kpi b {
  display: block;
  margin-top: 8px;
  font-family: "JetBrains Mono", ui-monospace, Menlo, monospace;
  font-size: 22px;
  color: var(--text,#e7f1ff);
  letter-spacing: -.04em;
}

.cockpit-kpi small {
  display: block;
  margin-top: 4px;
  color: var(--soft,#bfd0e5);
  font-size: 10px;
}

.cockpit-empty {
  border: 1px dashed rgba(142,213,255,.20);
  background: rgba(255,255,255,.025);
  border-radius: 16px;
  padding: 18px;
  color: var(--soft,#bfd0e5);
  line-height: 1.45;
}

.cockpit-direct-form .form-grid {
  align-items: end;
}

@media (min-width: 781px) {
  .sidebar {
    overflow-y: auto !important;
    overflow-x: hidden !important;
    scrollbar-width: thin !important;
  }

  .side-footer,
  #desktopGlobalAddBtn {
    display: none !important;
  }

  #appView.app,
  .app {
    grid-template-columns: 198px minmax(0,1fr) !important;
  }

  .top {
    min-height: 52px !important;
    height: 52px !important;
  }

  .content {
    height: calc(100vh - 52px) !important;
    overflow: auto !important;
  }

  #userMenuButton {
    width: 38px !important;
    height: 38px !important;
    border-radius: 50% !important;
    overflow: hidden !important;
  }

  #userMenuButton img {
    width: 38px !important;
    height: 38px !important;
    object-fit: cover !important;
    border-radius: 50% !important;
  }
}

@media (max-width: 900px) {
  html.cockpit-mobile-stable,
  html.cockpit-mobile-stable body {
    overflow-x: hidden !important;
  }

  html.cockpit-mobile-stable .top {
    position: relative !important;
    top: auto !important;
    min-height: 54px !important;
    height: 54px !important;
    padding: 7px 12px !important;
    overflow: visible !important;
  }

  html.cockpit-mobile-stable .top .title,
  html.cockpit-mobile-stable #pageTitle,
  html.cockpit-mobile-stable #monthHint {
    display: none !important;
  }

  html.cockpit-mobile-stable .actions {
    width: 100% !important;
    justify-content: flex-end !important;
    gap: 8px !important;
  }

  html.cockpit-mobile-stable .monthbar #prevMonth,
  html.cockpit-mobile-stable .monthbar #nextMonth,
  html.cockpit-mobile-stable .monthbar #todayBtn,
  html.cockpit-mobile-stable #exportBtn,
  html.cockpit-mobile-stable #topGlobalAddBtn {
    display: none !important;
  }

  html.cockpit-mobile-stable .monthbar input {
    width: 158px !important;
    min-width: 158px !important;
    max-width: 158px !important;
    height: 34px !important;
    text-align: center !important;
    font-size: 13px !important;
  }

  html.cockpit-mobile-stable #userMenuButton,
  html.cockpit-mobile-stable .user-avatar {
    width: 40px !important;
    height: 40px !important;
    min-width: 40px !important;
    max-width: 40px !important;
    border-radius: 50% !important;
    overflow: hidden !important;
    padding: 0 !important;
  }

  html.cockpit-mobile-stable #userMenuButton img,
  html.cockpit-mobile-stable .user-avatar img {
    width: 40px !important;
    height: 40px !important;
    object-fit: cover !important;
    border-radius: 50% !important;
  }

  html.cockpit-mobile-stable .content {
    padding: 10px 12px calc(108px + env(safe-area-inset-bottom)) !important;
    max-width: none !important;
  }

  html.cockpit-mobile-stable #dashboard > .page-head,
  html.cockpit-mobile-stable #dashboard .dashboard-head {
    display: none !important;
  }

  html.cockpit-mobile-stable #dashboard .dashboard-kpis {
    display: grid !important;
    grid-template-columns: repeat(2,minmax(0,1fr)) !important;
    gap: 10px !important;
    margin: 0 !important;
  }

  html.cockpit-mobile-stable #dashboard .dashboard-kpis > *:nth-child(n+5),
  html.cockpit-mobile-stable #dashboard .dashboard-grid-12,
  html.cockpit-mobile-stable #dashboard .dashboard-grid-12 > * {
    display: none !important;
  }

  html.cockpit-mobile-stable .mobile-nav {
    left: 10px !important;
    right: 10px !important;
    bottom: calc(8px + env(safe-area-inset-bottom)) !important;
    min-height: 64px !important;
    padding: 6px !important;
    border-radius: 24px !important;
  }

  html.cockpit-mobile-stable .global-add-btn {
    width: 52px !important;
    height: 52px !important;
    right: 18px !important;
    left: auto !important;
    bottom: calc(84px + env(safe-area-inset-bottom)) !important;
    transform: none !important;
    border-radius: 18px !important;
  }

  .cockpit-grid-2,
  .cockpit-kpis-4 {
    grid-template-columns: 1fr !important;
    gap: 10px;
  }
}
`;

    const style = document.createElement("style");
    style.id = "cockpit-clean-router-v10-css";
    style.textContent = css;
    document.head.appendChild(style);
  }

  function ensureDebtSection() {
    const content = q(".content");
    if (!content) return null;

    let section = id("debts");
    if (!section) {
      section = document.createElement("section");
      section.id = "debts";
      section.className = "section cockpit-custom-section";
      section.innerHTML =
        '<div class="page-head"><div class="page-title"><div class="overline">Debt control</div><h1>Dívidas <span>& Parcelas</span></h1><p>Financiamentos, empréstimos e compromissos futuros.</p></div></div>' +
        '<div class="cockpit-grid-2" id="cockpitDebtGrid"></div>';
      content.appendChild(section);
    }

    section.classList.add("cockpit-custom-section");

    const grid = id("cockpitDebtGrid") || q(".cockpit-grid-2", section);
    if (!grid) return section;

    const form = ensureDebtDirectForm();
    const list = ensureDebtList();

    if (form.parentNode !== grid) grid.appendChild(form);
    if (list.parentNode !== grid) grid.appendChild(list);

    renderDebtList();

    return section;
  }

  function ensureDebtDirectForm() {
    let panel = id("cockpitDebtDirectPanel");
    if (panel) return panel;

    panel = document.createElement("div");
    panel.id = "cockpitDebtDirectPanel";
    panel.className = "panel cockpit-direct-form";
    panel.innerHTML =
      '<div class="panel-head"><div><h2>Cadastrar dívida</h2><p>Cadastro direto. As parcelas entram no fluxo e no extrato.</p></div></div>' +
      '<div class="form-grid">' +
        '<label class="field"><span>Nome da dívida</span><input id="v10DebtName" placeholder="Ex.: financiamento do apartamento"></label>' +
        '<label class="field"><span>Credor</span><input id="v10DebtCreditor" placeholder="Banco, loja ou pessoa"></label>' +
        '<label class="field"><span>Valor financiado</span><input id="v10DebtValue" type="number" min="0" step="0.01" placeholder="0,00"></label>' +
        '<label class="field"><span>Total de parcelas</span><input id="v10DebtTotal" type="number" min="1" step="1" value="12"></label>' +
        '<label class="field"><span>Parcelas pagas</span><input id="v10DebtPaid" type="number" min="0" step="1" value="0"></label>' +
        '<label class="field"><span>Valor da parcela</span><input id="v10DebtPayment" type="number" min="0" step="0.01" placeholder="Opcional"></label>' +
        '<label class="field"><span>Primeira parcela</span><input id="v10DebtDate" type="date"></label>' +
        '<label class="field"><span>Vencimento</span><input id="v10DebtDue" type="number" min="1" max="31"></label>' +
        '<label class="field"><span>Observações</span><textarea id="v10DebtNotes" placeholder="Opcional"></textarea></label>' +
      '</div>' +
      '<div class="split" style="margin-top:14px">' +
        '<button class="btn primary" id="v10SaveDebt" type="button">Salvar dívida</button>' +
        '<button class="btn ghost" id="v10ClearDebt" type="button">Limpar</button>' +
      '</div>';

    setTimeout(function () {
      const date = id("v10DebtDate");
      const due = id("v10DebtDue");
      if (date && !date.value) date.value = today();
      if (due && !due.value) due.value = String(new Date().getDate());

      const save = id("v10SaveDebt");
      const clear = id("v10ClearDebt");

      if (save && save.dataset.bound !== "1") {
        save.dataset.bound = "1";
        save.addEventListener("click", saveDebtFromV10Form);
      }

      if (clear && clear.dataset.bound !== "1") {
        clear.dataset.bound = "1";
        clear.addEventListener("click", clearDebtV10Form);
      }
    }, 0);

    return panel;
  }

  function ensureDebtList() {
    let panel = id("cockpitDebtListPanel");
    if (panel) return panel;

    panel = document.createElement("div");
    panel.id = "cockpitDebtListPanel";
    panel.className = "panel";
    panel.innerHTML =
      '<div class="panel-head"><div><h2>Dívidas ativas</h2><p>Parcelas e saldo devedor.</p></div></div>' +
      '<div id="cockpitDebtList" class="list"></div>';

    return panel;
  }

  function saveDebtFromV10Form() {
    const state = getState();
    state.debts = Array.isArray(state.debts) ? state.debts : [];

    const name = (id("v10DebtName") && id("v10DebtName").value.trim()) || "";
    const value = num(id("v10DebtValue") && id("v10DebtValue").value);
    const total = Math.max(1, Math.floor(num(id("v10DebtTotal") && id("v10DebtTotal").value) || 1));
    const paid = Math.max(0, Math.floor(num(id("v10DebtPaid") && id("v10DebtPaid").value) || 0));
    const manualPayment = num(id("v10DebtPayment") && id("v10DebtPayment").value);
    const firstDate = (id("v10DebtDate") && id("v10DebtDate").value) || today();
    const dueDay = Math.max(1, Math.min(31, Math.floor(num(id("v10DebtDue") && id("v10DebtDue").value) || 1)));

    if (!name) {
      alert("Informe o nome da dívida.");
      return;
    }

    if (!value) {
      alert("Informe o valor financiado.");
      return;
    }

    state.debts.push({
      id: uid(),
      name: name,
      creditor: (id("v10DebtCreditor") && id("v10DebtCreditor").value.trim()) || "",
      debtType: "other",
      original: value,
      financed: value,
      currentBalance: value,
      totalInstallments: total,
      paidInstallments: paid,
      manualPayment: manualPayment || value / Math.max(1, total - paid),
      startDate: firstDate,
      firstPaymentDate: firstDate,
      dueDay: dueDay,
      amortizationSystem: "manual",
      status: "active",
      notes: (id("v10DebtNotes") && id("v10DebtNotes").value) || "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    safe(function () { if (typeof saveNow === "function") saveNow(); });
    safe(function () { if (typeof render === "function") render(); });
    clearDebtV10Form();
    renderDebtList();
    alert("Dívida cadastrada.");
  }

  function clearDebtV10Form() {
    ["v10DebtName", "v10DebtCreditor", "v10DebtValue", "v10DebtPayment", "v10DebtNotes"].forEach(function (field) {
      if (id(field)) id(field).value = "";
    });
    if (id("v10DebtTotal")) id("v10DebtTotal").value = "12";
    if (id("v10DebtPaid")) id("v10DebtPaid").value = "0";
    if (id("v10DebtDate")) id("v10DebtDate").value = today();
    if (id("v10DebtDue")) id("v10DebtDue").value = String(new Date().getDate());
  }

  function renderDebtList() {
    const list = id("cockpitDebtList");
    if (!list) return;

    const debts = (getState().debts || []).filter(function (debt) {
      return debt.status !== "settled";
    });

    if (!debts.length) {
      list.innerHTML = '<div class="cockpit-empty"><b>Nenhuma dívida cadastrada.</b><br>Cadastre financiamentos, empréstimos ou parcelas recorrentes.</div>';
      return;
    }

    list.innerHTML = debts.map(function (debt) {
      const total = Number(debt.totalInstallments || 0);
      const paid = Number(debt.paidInstallments || 0);
      const remaining = Math.max(0, total - paid);
      const payment = Number(debt.manualPayment || 0) || (Number(debt.financed || debt.original || 0) / Math.max(1, remaining || total || 1));

      return '<div class="item">' +
        '<div><b>' + esc(debt.name || "Dívida") + '</b><small>' + esc((debt.creditor || "credor não informado") + " • " + remaining + " parcela(s) restantes") + '</small></div>' +
        '<div class="amount negative">' + brl(payment) + '</div>' +
      '</div>';
    }).join("");
  }

  function ensureDividendsSection() {
    const content = q(".content");
    if (!content) return null;

    let section = id("dividends");
    if (!section) {
      section = document.createElement("section");
      section.id = "dividends";
      section.className = "section cockpit-custom-section";
      section.innerHTML =
        '<div class="page-head"><div class="page-title"><div class="overline">Renda passiva</div><h1>Dividendos <span>& Rendimentos</span></h1><p>Dividendos, JCP e rendimentos recebidos.</p></div></div>' +
        '<div id="cockpitDividendKpis" class="cockpit-kpis-4"></div>' +
        '<div class="cockpit-grid-2">' +
          '<div class="panel"><div class="panel-head"><div><h2>Rendimentos do mês</h2><p>Recebidos no mês selecionado.</p></div><button class="btn primary" id="v10AddDividend" type="button">+ Registrar rendimento</button></div><div id="cockpitDividendMonthList" class="list"></div></div>' +
          '<div class="panel"><div class="panel-head"><div><h2>Histórico recente</h2><p>Últimos rendimentos cadastrados.</p></div></div><div id="cockpitDividendHistory" class="list"></div></div>' +
        '</div>';
      content.appendChild(section);
    }

    section.classList.add("cockpit-custom-section");
    bindDividendButton();
    renderDividends();

    return section;
  }

  function isDividend(tx) {
    const type = String(tx && tx.type || "").toLowerCase();
    const cat = String(tx && tx.category || "").toLowerCase();
    const desc = String(tx && tx.description || "").toLowerCase();

    return type === "dividend" ||
      cat.includes("dividendo") ||
      cat.includes("rendimento") ||
      cat.includes("provento") ||
      desc.includes("dividendo") ||
      desc.includes("rendimento") ||
      desc.includes("jcp");
  }

  function dividendRows() {
    return (getState().transactions || [])
      .filter(isDividend)
      .sort(function (a, b) {
        return String(b.date || "").localeCompare(String(a.date || ""));
      });
  }

  function renderDividends() {
    const rows = dividendRows();
    const month = getMonth();
    const year = month.slice(0, 4);

    const monthRows = rows.filter(function (tx) {
      return String(tx.date || "").slice(0, 7) === month;
    });

    const yearRows = rows.filter(function (tx) {
      return String(tx.date || "").slice(0, 4) === year;
    });

    const monthTotal = monthRows.reduce(function (sum, tx) { return sum + Number(tx.value || 0); }, 0);
    const yearTotal = yearRows.reduce(function (sum, tx) { return sum + Number(tx.value || 0); }, 0);
    const avg = yearTotal / 12;
    const last = rows[0];

    const kpis = id("cockpitDividendKpis");
    if (kpis) {
      kpis.innerHTML =
        '<div class="cockpit-kpi"><span>No mês</span><b>' + brl(monthTotal) + '</b><small>' + monthRows.length + ' recebimento(s)</small></div>' +
        '<div class="cockpit-kpi"><span>No ano</span><b>' + brl(yearTotal) + '</b><small>' + esc(year) + '</small></div>' +
        '<div class="cockpit-kpi"><span>Média mensal</span><b>' + brl(avg) + '</b><small>base anual</small></div>' +
        '<div class="cockpit-kpi"><span>Último</span><b>' + brl(last ? last.value : 0) + '</b><small>' + esc(last ? (last.description || last.date) : "sem registros") + '</small></div>';
    }

    const monthList = id("cockpitDividendMonthList");
    if (monthList) {
      monthList.innerHTML = monthRows.length ? monthRows.map(function (tx) {
        return '<div class="item"><div><b>' + esc(tx.description || "Rendimento") + '</b><small>' + esc((tx.category || "Dividendos") + " • " + (tx.date || "")) + '</small></div><div class="amount positive">' + brl(tx.value) + '</div></div>';
      }).join("") : '<div class="cockpit-empty"><b>Nenhum rendimento neste mês.</b><br>Registre dividendos, JCP ou rendimentos.</div>';
    }

    const history = id("cockpitDividendHistory");
    if (history) {
      history.innerHTML = rows.length ? rows.slice(0, 8).map(function (tx) {
        return '<div class="item"><div><b>' + esc(tx.description || "Rendimento") + '</b><small>' + esc(monthNameSafe(String(tx.date || "").slice(0, 7))) + '</small></div><div class="amount positive">' + brl(tx.value) + '</div></div>';
      }).join("") : '<div class="cockpit-empty"><b>Sem histórico.</b><br>Os rendimentos registrados aparecerão aqui.</div>';
    }
  }

  function bindDividendButton() {
    const button = id("v10AddDividend");
    if (!button || button.dataset.bound === "1") return;
    button.dataset.bound = "1";
    button.addEventListener("click", openDividendRegister);
  }

  function ensureDividendOption() {
    const select = id("txType");
    if (!select) return;

    if (!q('option[value="dividend"]', select)) {
      const option = document.createElement("option");
      option.value = "dividend";
      option.textContent = "Dividendo / rendimento";
      select.appendChild(option);
    }
  }

  function openDividendRegister() {
    openOriginalView("register");

    setTimeout(function () {
      ensureDividendOption();

      const type = id("txType");
      if (type) {
        type.value = "dividend";
        type.dispatchEvent(new Event("change", { bubbles: true }));
      }

      const desc = id("txDesc");
      if (desc && !desc.value) desc.value = "Dividendos / rendimentos";

      const form = id("txFormPanel");
      if (form) {
        form.style.display = "block";
        form.scrollIntoView({ behavior: "smooth", block: "start" });
      }

      setTopTitle("Registrar rendimento", "Novo dividendo ou rendimento");
    }, 150);
  }

  function ensureSimulatorSection() {
    const content = q(".content");
    if (!content) return null;

    let section = id("simulator");
    if (!section) {
      section = document.createElement("section");
      section.id = "simulator";
      section.className = "section cockpit-custom-section";
      section.innerHTML =
        '<div class="page-head"><div class="page-title"><div class="overline">Planejamento financeiro</div><h1>Simulador</h1><p>Projeção de patrimônio, aportes e renda passiva.</p></div></div>' +
        '<div class="cockpit-grid-2">' +
          '<div class="panel"><h2>Parâmetros</h2><div class="form-grid">' +
            '<label class="field"><span>Valor inicial</span><input id="v10SimInitial" type="number" min="0" step="0.01" value="0"></label>' +
            '<label class="field"><span>Aporte mensal</span><input id="v10SimMonthly" type="number" min="0" step="0.01" value="1000"></label>' +
            '<label class="field"><span>Rentabilidade anual (%)</span><input id="v10SimRate" type="number" min="0" step="0.01" value="8"></label>' +
            '<label class="field"><span>Prazo em anos</span><input id="v10SimYears" type="number" min="1" step="1" value="10"></label>' +
          '</div><div class="split" style="margin-top:14px"><button class="btn primary" id="v10RunSim" type="button">Simular</button></div></div>' +
          '<div class="panel"><h2>Resultado</h2><div id="v10SimResult" class="list"></div></div>' +
        '</div>';
      content.appendChild(section);
    }

    section.classList.add("cockpit-custom-section");
    bindSimulator();
    runSimulator();

    return section;
  }

  function simNum(field) {
    return num(id(field) && id(field).value);
  }

  function runSimulator() {
    const initial = simNum("v10SimInitial");
    const monthly = simNum("v10SimMonthly");
    const rate = simNum("v10SimRate") / 100;
    const years = Math.max(1, Math.floor(simNum("v10SimYears") || 1));
    const monthlyRate = Math.pow(1 + rate, 1 / 12) - 1;

    let balance = initial;
    let invested = initial;

    for (let i = 1; i <= years * 12; i++) {
      balance = balance * (1 + monthlyRate) + monthly;
      invested += monthly;
    }

    const gains = balance - invested;
    const passive = balance * 0.04 / 12;

    const result = id("v10SimResult");
    if (result) {
      result.innerHTML =
        '<div class="item"><div><b>Patrimônio futuro</b><small>Resultado nominal</small></div><div class="amount positive">' + brl(balance) + '</div></div>' +
        '<div class="item"><div><b>Total aportado</b><small>Capital próprio</small></div><div class="amount neutral">' + brl(invested) + '</div></div>' +
        '<div class="item"><div><b>Juros acumulados</b><small>Resultado dos juros compostos</small></div><div class="amount positive">' + brl(gains) + '</div></div>' +
        '<div class="item"><div><b>Renda passiva estimada</b><small>Regra de 4% ao ano</small></div><div class="amount positive">' + brl(passive) + '/mês</div></div>';
    }
  }

  function bindSimulator() {
    const run = id("v10RunSim");
    if (run && run.dataset.bound !== "1") {
      run.dataset.bound = "1";
      run.addEventListener("click", runSimulator);
    }

    ["v10SimInitial", "v10SimMonthly", "v10SimRate", "v10SimYears"].forEach(function (field) {
      const input = id(field);
      if (input && input.dataset.bound !== "1") {
        input.dataset.bound = "1";
        input.addEventListener("input", runSimulator);
      }
    });
  }

  function openCustomView(view) {
    injectCss();

    let section = null;

    if (view === "debts") section = ensureDebtSection();
    if (view === "dividends") section = ensureDividendsSection();
    if (view === "simulator") section = ensureSimulatorSection();

    if (!section) return;

    showOnly(view);
    markNavActive(view);
    syncTitle(view);
    fixMobileChrome();
  }

  function normalizeNavigationButtons() {
    qa("#nav button, .nav-hub button, .desktop-nav button, .grouped-nav button, .mobile-nav button").forEach(function (button) {
      const view = normalizeViewName(button.dataset.view, button.textContent);
      if (view) button.dataset.view = view;
    });
  }

  function interceptNavigation() {
    if (window.__cockpitV10NavigationBound) return;
    window.__cockpitV10NavigationBound = true;

    document.addEventListener("click", function (event) {
      const button = event.target.closest("button[data-view]");
      if (!button) return;

      const view = normalizeViewName(button.dataset.view, button.textContent);
      if (!view) return;

      if (CUSTOM_VIEWS.has(view)) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        openCustomView(view);
        return;
      }

      setTimeout(function () {
        cleanupCustomSectionsUnless(view);
        markNavActive(view);
        syncTitle(view);
        fixMobileChrome();
      }, 100);
    }, true);
  }

  function patchSetView() {
    if (window.__cockpitOriginalSetViewV10 || typeof window.setView !== "function") return;

    window.__cockpitOriginalSetViewV10 = window.setView;

    window.setView = function (view) {
      view = normalizeViewName(view, "");

      if (CUSTOM_VIEWS.has(view)) {
        openCustomView(view);
        return;
      }

      const result = window.__cockpitOriginalSetViewV10.apply(this, arguments);

      setTimeout(function () {
        cleanupCustomSectionsUnless(view);
        markNavActive(view);
        syncTitle(view);
        fixMobileChrome();
      }, 80);

      return result;
    };

    safe(function () {
      setView = window.setView;
    });
  }

  function addDebtOptionToSheet() {
    const grid = q("#registerActionSheet .sheet-grid");
    if (!grid || q('[data-register-action="debt"]', grid)) return;

    const button = document.createElement("button");
    button.type = "button";
    button.dataset.registerAction = "debt";
    button.innerHTML = '<span>⚠</span><b>Dívida / financiamento</b><small>Parcelas, empréstimos e financiamentos</small>';
    grid.appendChild(button);
  }

  function interceptRegisterActions() {
    if (window.__cockpitV10RegisterActionsBound) return;
    window.__cockpitV10RegisterActionsBound = true;

    document.addEventListener("click", function (event) {
      const button = event.target.closest("button[data-register-action]");
      if (!button) return;

      if (button.dataset.registerAction === "debt") {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();

        const sheet = id("registerActionSheet");
        if (sheet) {
          sheet.classList.add("hidden");
          sheet.setAttribute("aria-hidden", "true");
        }

        openCustomView("debts");
      }
    }, true);
  }

  function fixMobileChrome() {
    if (!isMobile()) return;

    document.documentElement.classList.add("cockpit-mobile-stable");

    const avatar = q("#userMenuButton img, .user-avatar img");
    if (avatar) {
      avatar.setAttribute("referrerpolicy", "no-referrer");
      avatar.style.width = "40px";
      avatar.style.height = "40px";
      avatar.style.objectFit = "cover";
      avatar.style.borderRadius = "50%";
    }

    const content = q(".content");
    if (content && q(".section.active")) {
      content.scrollTop = content.scrollTop < 0 ? 0 : content.scrollTop;
    }
  }

  function setupMobileHomeCards() {
    if (!isMobile()) return;

    const cards = qa("#dashboard .dashboard-kpis > *");
    const actions = ["wallet", "register", "register-income", "register-expense"];

    cards.forEach(function (card, index) {
      if (index >= 4) {
        card.style.display = "none";
        return;
      }

      card.style.cursor = "pointer";
      card.dataset.mobileHomeAction = actions[index] || "register";
    });

    if (window.__cockpitV10HomeCardsBound) return;
    window.__cockpitV10HomeCardsBound = true;

    document.addEventListener("click", function (event) {
      const card = event.target.closest("#dashboard .dashboard-kpis > *[data-mobile-home-action]");
      if (!card || !isMobile()) return;

      const action = card.dataset.mobileHomeAction;

      if (action === "wallet") {
        openOriginalView("wallet");
        return;
      }

      openOriginalView("register");

      setTimeout(function () {
        const filter =
          action === "register-income" ? "income" :
          action === "register-expense" ? "expense" :
          "all";

        safe(function () { txFilter = filter; });
        qa("[data-tx-filter]").forEach(function (button) {
          button.classList.toggle("active", button.dataset.txFilter === filter);
        });
        safe(function () { if (typeof renderTxList === "function") renderTxList(getMonth()); });
      }, 120);
    }, true);
  }

  function boot() {
    injectCss();
    patchSetView();
    normalizeNavigationButtons();
    interceptNavigation();
    interceptRegisterActions();
    addDebtOptionToSheet();
    ensureDividendOption();
    setupMobileHomeCards();
    fixMobileChrome();

    if (id("dividends")) renderDividends();
    if (id("debts")) renderDebtList();
  }

  boot();
  setTimeout(boot, 300);
  setTimeout(boot, 900);
  setTimeout(boot, 1800);
  setTimeout(boot, 3000);

  document.addEventListener("click", function () {
    setTimeout(boot, 120);
  }, true);

  window.addEventListener("resize", function () {
    setTimeout(boot, 150);
  });

  window.addEventListener("orientationchange", function () {
    setTimeout(boot, 300);
  });
})();


/* ===== FATURA / COMPETÊNCIA DO CARTÃO v11 =====
   Corrige compras feitas em um mês, mas cobradas na fatura de outro mês.
   Ex.: compra em 25/06 com fatura em julho passa a entrar em 2026-07.
*/
(function () {
  "use strict";

  const FLAG = "cockpit-billing-month-v11";
  if (window[FLAG]) return;
  window[FLAG] = true;

  function q(selector, root = document) { return root.querySelector(selector); }
  function qa(selector, root = document) { return Array.from(root.querySelectorAll(selector)); }
  function byId(id) { return document.getElementById(id); }
  function safe(fn, fallback) { try { return fn(); } catch (error) { console.warn("[Cockpit fatura v11]", error); return fallback; } }

  function currentMonth() {
    return safe(function () { return selectedMonth(); }, null) ||
      (byId("monthPicker") && byId("monthPicker").value) ||
      new Date().toISOString().slice(0, 7);
  }

  function monthFromDate(value) { return String(value || "").slice(0, 7); }

  function addMonthsSafe(ym, delta) {
    return safe(function () { return addMonths(ym, delta); }, (function () {
      const parts = String(ym || currentMonth()).split("-");
      const date = new Date(Number(parts[0]), Number(parts[1]) - 1 + delta, 1);
      return date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0");
    })());
  }

  function normalizeMonth(value) {
    const text = String(value || "").trim();
    if (/^\d{4}-\d{2}$/.test(text)) return text;
    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text.slice(0, 7);
    return "";
  }

  function isExpenseLike(tx) {
    const type = String(tx && tx.type || "").toLowerCase();
    return type === "expense" || type === "debt" || type === "transfer";
  }

  function isInstallment(tx) {
    return tx && tx.installments && Number(tx.installments.count || 0) > 1;
  }

  function billingMonthOf(tx) {
    if (!tx) return "";
    return normalizeMonth(tx.billingMonth) ||
      normalizeMonth(tx.competenceMonth) ||
      normalizeMonth(tx.invoiceMonth) ||
      normalizeMonth(tx.cardBillMonth) ||
      normalizeMonth(tx.firstBillingMonth) ||
      (tx.installments && normalizeMonth(tx.installments.firstMonth)) ||
      monthFromDate(tx.date);
  }

  function injectCss() {
    if (byId("cockpit-billing-month-v11-css")) return;
    const css = `
.cockpit-billing-hint{margin-top:8px;border:1px solid rgba(76,201,255,.14);background:rgba(76,201,255,.055);color:var(--soft,#bfd0e5);border-radius:13px;padding:9px 11px;font-size:11px;line-height:1.4}
.cockpit-billing-badge{display:inline-flex;align-items:center;gap:4px;margin-left:6px;padding:2px 7px;border-radius:999px;background:rgba(245,196,81,.12);border:1px solid rgba(245,196,81,.22);color:#f5c451;font-size:9px;font-weight:900;letter-spacing:.03em}
@media(max-width:900px){.cockpit-billing-hint{font-size:11px;padding:9px 10px}}
`;
    const style = document.createElement("style");
    style.id = "cockpit-billing-month-v11-css";
    style.textContent = css;
    document.head.appendChild(style);
  }

  function ensureBillingField() {
    const txFirstMonth = byId("txFirstMonth");
    if (!txFirstMonth) return;

    const firstMonthLabel = txFirstMonth.closest("label");
    if (firstMonthLabel) {
      const span = firstMonthLabel.querySelector("span");
      if (span) span.textContent = "Mês da fatura / 1ª parcela";
    }

    let field = byId("txBillingMonth");
    if (!field) {
      const label = document.createElement("label");
      label.className = "field";
      label.id = "txBillingMonthField";
      label.innerHTML = '<span>Mês da fatura</span><input id="txBillingMonth" type="month"><div class="cockpit-billing-hint">Use quando a compra foi feita em um mês, mas será cobrada em outro. Ex.: compra em 25/06 com fatura em julho.</div>';
      if (firstMonthLabel && firstMonthLabel.parentNode) firstMonthLabel.parentNode.insertBefore(label, firstMonthLabel.nextSibling);
      field = byId("txBillingMonth");
    }

    if (field && !field.value) field.value = (txFirstMonth && txFirstMonth.value) || currentMonth();
    bindBillingFieldSync();
  }

  function bindBillingFieldSync() {
    const billing = byId("txBillingMonth");
    const first = byId("txFirstMonth");
    const date = byId("txDate");

    if (billing && billing.dataset.boundV11 !== "1") {
      billing.dataset.boundV11 = "1";
      billing.addEventListener("change", function () { if (first) first.value = billing.value || first.value; });
    }

    if (first && first.dataset.billingBoundV11 !== "1") {
      first.dataset.billingBoundV11 = "1";
      first.addEventListener("change", function () { if (billing) billing.value = first.value || billing.value; });
    }

    if (date && date.dataset.billingDateBoundV11 !== "1") {
      date.dataset.billingDateBoundV11 = "1";
      date.addEventListener("change", function () {
        const dm = monthFromDate(date.value);
        if (billing && !billing.value) billing.value = dm || currentMonth();
        if (first && !first.value) first.value = (billing && billing.value) || dm || currentMonth();
      });
    }
  }

  function patchTxForm() {
    if (window.__cockpitBillingTxFromFormV11) return;
    const original = window.txFromForm || (typeof txFromForm === "function" ? txFromForm : null);
    if (typeof original !== "function") return;

    window.__cockpitBillingTxFromFormV11 = true;
    window.txFromForm = function (existing) {
      const tx = original.apply(this, arguments);
      const billing = normalizeMonth((byId("txBillingMonth") && byId("txBillingMonth").value) || "");
      const first = normalizeMonth((byId("txFirstMonth") && byId("txFirstMonth").value) || "");
      const dateMonth = monthFromDate(tx.date);
      const type = String(tx.type || "").toLowerCase();

      if (type === "expense" || type === "debt" || type === "transfer") {
        const chosen = billing || first || dateMonth || currentMonth();
        tx.billingMonth = chosen;
        tx.competenceMonth = chosen;
        if (tx.installments && Number(tx.installments.count || 0) > 1) tx.installments.firstMonth = chosen;
      } else {
        delete tx.billingMonth;
        delete tx.competenceMonth;
      }
      return tx;
    };
    safe(function () { txFromForm = window.txFromForm; });
  }

  function patchClearAndEdit() {
    if (window.__cockpitBillingClearEditV11) return;
    window.__cockpitBillingClearEditV11 = true;

    const originalClear = window.clearTxForm || (typeof clearTxForm === "function" ? clearTxForm : null);
    if (typeof originalClear === "function") {
      window.clearTxForm = function () {
        const result = originalClear.apply(this, arguments);
        setTimeout(function () {
          ensureBillingField();
          const billing = byId("txBillingMonth");
          const first = byId("txFirstMonth");
          const selected = currentMonth();
          if (billing) billing.value = selected;
          if (first) first.value = selected;
        }, 0);
        return result;
      };
      safe(function () { clearTxForm = window.clearTxForm; });
    }

    const originalEdit = window.editTx || (typeof editTx === "function" ? editTx : null);
    if (typeof originalEdit === "function") {
      window.editTx = function (txId) {
        const result = originalEdit.apply(this, arguments);
        setTimeout(function () {
          ensureBillingField();
          const stateObj = safe(function () { return window.state || state; }, window.state || {});
          const tx = (stateObj.transactions || []).find(function (item) { return item.id === txId; });
          const bm = billingMonthOf(tx);
          if (byId("txBillingMonth")) byId("txBillingMonth").value = bm || currentMonth();
          if (byId("txFirstMonth")) byId("txFirstMonth").value = bm || currentMonth();
        }, 80);
        return result;
      };
      safe(function () { editTx = window.editTx; });
    }
  }

  function patchMonthTransactions() {
    if (window.__cockpitBillingMonthTransactionsV11) return;
    const original = window.monthTransactions || (typeof monthTransactions === "function" ? monthTransactions : null);
    if (typeof original !== "function") return;

    window.__cockpitBillingMonthTransactionsV11 = true;
    window.monthTransactions = function (targetMonth) {
      const ym = normalizeMonth(targetMonth) || currentMonth();
      const originalRows = safe(function () { return original.apply(this, arguments) || []; }, []);
      const stateObj = safe(function () { return window.state || state; }, window.state || {});
      const txs = stateObj.transactions || [];
      const blockedIds = new Set();

      txs.forEach(function (tx) {
        if (!isExpenseLike(tx) || isInstallment(tx)) return;
        const bm = billingMonthOf(tx);
        const dm = monthFromDate(tx.date);
        if (bm && dm && bm !== dm && dm === ym) blockedIds.add(tx.id);
      });

      let rows = originalRows.filter(function (row) { return !blockedIds.has(row.id); });

      txs.forEach(function (tx) {
        if (!isExpenseLike(tx)) return;
        const bm = billingMonthOf(tx);
        const dm = monthFromDate(tx.date);

        if (isInstallment(tx)) {
          const first = (tx.installments && normalizeMonth(tx.installments.firstMonth)) || bm || dm;
          const count = Number(tx.installments && tx.installments.count || 0);
          const monthlyAmount = Number(tx.installments && tx.installments.monthlyAmount || 0) || (Number(tx.value || 0) / Math.max(1, count));

          for (let index = 0; index < count; index++) {
            const installmentMonth = addMonthsSafe(first, index);
            if (installmentMonth === ym) {
              const already = rows.some(function (row) {
                return row.id === tx.id && Number(row.installmentNumber || row.parcelNumber || row.installmentIndex || 0) === index + 1;
              });
              if (!already) {
                rows.push(Object.assign({}, tx, {
                  value: monthlyAmount,
                  billingMonth: ym,
                  competenceMonth: ym,
                  installmentNumber: index + 1,
                  installmentTotal: count,
                  installmentLabel: (index + 1) + "/" + count
                }));
              }
            }
          }
          return;
        }

        if (bm && bm === ym && dm !== ym) {
          const already = rows.some(function (row) { return row.id === tx.id; });
          if (!already) rows.push(Object.assign({}, tx, { billingMonth: bm, competenceMonth: bm, originalPurchaseDate: tx.date }));
        }
      });

      return rows.sort(function (a, b) { return String(b.date || "").localeCompare(String(a.date || "")); });
    };
    safe(function () { monthTransactions = window.monthTransactions; });
  }

  function decorateStatementRows() {
    const list = byId("txList");
    if (!list) return;
    const month = currentMonth();
    const stateObj = safe(function () { return window.state || state; }, window.state || {});
    const descriptions = {};
    (stateObj.transactions || []).forEach(function (tx) {
      if (!isExpenseLike(tx)) return;
      const bm = billingMonthOf(tx);
      const dm = monthFromDate(tx.date);
      if (bm && bm === month && dm && dm !== bm) descriptions[String(tx.description || "").toLowerCase()] = true;
    });

    qa(".item, .statement-tx", list).forEach(function (row) {
      const text = String(row.textContent || "").toLowerCase();
      const hit = Object.keys(descriptions).some(function (desc) { return desc && text.includes(desc); });
      if (hit && !q(".cockpit-billing-badge", row)) {
        const target = q("b", row) || row.firstElementChild || row;
        const badge = document.createElement("span");
        badge.className = "cockpit-billing-badge";
        badge.textContent = "fatura";
        target.appendChild(badge);
      }
    });
  }

  function addBillingHintToRegister() {
    const panel = byId("txFormPanel");
    if (!panel || byId("cockpitBillingRegisterHint")) return;
    const head = q(".panel-head", panel);
    if (!head) return;
    const hint = document.createElement("div");
    hint.id = "cockpitBillingRegisterHint";
    hint.className = "cockpit-billing-hint";
    hint.innerHTML = "<b>Compra no cartão:</b> a data da compra pode ser junho, mas o mês da fatura pode ser julho. O app usará o mês da fatura no Painel, Extrato e Fluxo.";
    head.insertAdjacentElement("afterend", hint);
  }

  function rerenderAfterPatch() {
    safe(function () { if (typeof render === "function") render(); });
    setTimeout(decorateStatementRows, 120);
  }

  function boot() {
    injectCss();
    ensureBillingField();
    addBillingHintToRegister();
    bindBillingFieldSync();
    patchTxForm();
    patchClearAndEdit();
    patchMonthTransactions();
    decorateStatementRows();
  }

  boot();
  setTimeout(boot, 300);
  setTimeout(boot, 900);
  setTimeout(boot, 1800);
  setTimeout(boot, 3000);

  document.addEventListener("click", function () {
    setTimeout(boot, 120);
    setTimeout(decorateStatementRows, 240);
  }, true);

  window.addEventListener("change", function (event) {
    if (event.target && (event.target.id === "monthPicker" || event.target.id === "txBillingMonth" || event.target.id === "txFirstMonth")) {
      setTimeout(rerenderAfterPatch, 100);
    }
  }, true);
})();

