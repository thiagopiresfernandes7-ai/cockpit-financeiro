/*
  Cockpit Financeiro — Hotfix seguro v1
  Mantém o index premium estável e aplica apenas ajustes por fora.
  Não usa document.write, não carrega outro HTML, não altera dados do usuário.
*/

(function () {
  "use strict";

  const HOTFIX_ID = "cockpit-hotfix-safe-v1";
  if (window[HOTFIX_ID]) return;
  window[HOTFIX_ID] = true;

  function $(selector, root = document) {
    return root.querySelector(selector);
  }

  function $all(selector, root = document) {
    return Array.from(root.querySelectorAll(selector));
  }

  function byId(id) {
    return document.getElementById(id);
  }

  function safe(fn) {
    try {
      return fn();
    } catch (error) {
      console.warn("[Cockpit hotfix]", error);
      return null;
    }
  }

  function brl(value) {
    return Number(value || 0).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL"
    });
  }

  function moneyFromInput(id) {
    const node = byId(id);
    return Math.max(0, Number(String((node && node.value) || "0").replace(",", ".")) || 0);
  }

  function selectedMonthSafe() {
    return safe(() => selectedMonth()) ||
      (byId("monthPicker") && byId("monthPicker").value) ||
      new Date().toISOString().slice(0, 7);
  }

  function injectCss() {
    if (byId("cockpit-hotfix-safe-css")) return;

    const css = `
/* === Cockpit Hotfix Seguro v1 === */

/* Avatar Google correto */
#userMenuButton,
.user-avatar,
.profile-avatar {
  overflow: hidden !important;
  flex: 0 0 auto !important;
}

#userMenuButton img,
.user-avatar img,
.profile-avatar img {
  width: 100% !important;
  height: 100% !important;
  display: block !important;
  object-fit: cover !important;
  border-radius: inherit !important;
}

/* Desktop: escala real para notebook comum */
@media (min-width: 781px) {
  body {
    overflow: hidden !important;
  }

  #appView.app {
    height: 100vh !important;
    min-height: 100vh !important;
    grid-template-columns: 180px minmax(0, 1fr) !important;
    overflow: hidden !important;
  }

  .sidebar {
    width: 180px !important;
    min-width: 180px !important;
    height: 100vh !important;
    padding: 10px 9px !important;
    gap: 8px !important;
    overflow: hidden !important;
  }

  #desktopGlobalAddBtn,
  .side-footer {
    display: none !important;
  }

  .logo {
    gap: 7px !important;
    margin-bottom: 4px !important;
  }

  .logo .mark,
  .mark {
    width: 34px !important;
    height: 34px !important;
    min-width: 34px !important;
    border-radius: 12px !important;
  }

  .brand strong {
    font-size: 15px !important;
    line-height: .92 !important;
  }

  .brand span {
    font-size: 9px !important;
  }

  .status-card {
    min-height: 34px !important;
    padding: 7px 8px !important;
    border-radius: 12px !important;
  }

  .nav-label {
    font-size: 8px !important;
    letter-spacing: .12em !important;
    margin: 8px 7px 3px !important;
  }

  .nav-hub button,
  .desktop-nav button,
  .grouped-nav button {
    height: 30px !important;
    min-height: 30px !important;
    padding: 0 7px !important;
    gap: 6px !important;
    border-radius: 10px !important;
    font-size: 10px !important;
    line-height: 1 !important;
  }

  .nav-hub .ico,
  .desktop-nav .ico,
  .grouped-nav .ico {
    width: 18px !important;
    height: 18px !important;
    min-width: 18px !important;
    border-radius: 7px !important;
    font-size: 10px !important;
  }

  .main {
    height: 100vh !important;
    overflow: hidden !important;
  }

  .top {
    min-height: 46px !important;
    height: 46px !important;
    padding: 6px 14px !important;
    gap: 8px !important;
  }

  #pageTitle,
  .top .title h1 {
    font-size: 18px !important;
    line-height: 1 !important;
    margin: 0 !important;
  }

  #monthHint,
  .top .title p {
    font-size: 9px !important;
    margin-top: 2px !important;
  }

  .monthbar input {
    height: 30px !important;
    min-width: 136px !important;
    max-width: 136px !important;
    padding: 0 9px !important;
    font-size: 11px !important;
  }

  .btn,
  .ghost-btn,
  .primary-btn {
    min-height: 30px !important;
    height: 30px !important;
    padding: 0 10px !important;
    border-radius: 10px !important;
    font-size: 10px !important;
  }

  .icon-btn {
    width: 30px !important;
    height: 30px !important;
    min-width: 30px !important;
    border-radius: 10px !important;
    font-size: 11px !important;
  }

  #topGlobalAddBtn {
    height: 30px !important;
    min-height: 30px !important;
    padding: 0 11px !important;
    font-size: 10px !important;
  }

  #userMenuButton {
    width: 32px !important;
    height: 32px !important;
    min-width: 32px !important;
    max-width: 32px !important;
    border-radius: 50% !important;
  }

  .content {
    height: calc(100vh - 46px) !important;
    overflow: auto !important;
    padding: 10px 14px 22px !important;
    max-width: none !important;
  }

  .grid {
    gap: 9px !important;
  }

  .dashboard-kpis,
  .grid.kpis {
    gap: 9px !important;
    margin-bottom: 9px !important;
  }

  .card,
  .panel {
    border-radius: 14px !important;
  }

  .card.kpi,
  .kpi {
    min-height: 68px !important;
    padding: 10px 11px !important;
  }

  .card.kpi span,
  .kpi span {
    font-size: 7px !important;
    letter-spacing: .11em !important;
    line-height: 1.15 !important;
  }

  .card.kpi b,
  .kpi b,
  [data-money] {
    font-size: 21px !important;
    line-height: 1 !important;
    margin-top: 4px !important;
  }

  .delta {
    font-size: 8.5px !important;
    margin-top: 3px !important;
  }

  .dashboard-grid-12 {
    gap: 9px !important;
  }

  .panel {
    padding: 11px !important;
  }

  .panel-head {
    margin-bottom: 8px !important;
    gap: 8px !important;
  }

  .panel-head h2,
  .panel h2 {
    font-size: 13px !important;
    line-height: 1.1 !important;
    margin: 0 0 3px !important;
  }

  .panel-head p,
  .panel p,
  .label,
  .notice {
    font-size: 9.5px !important;
    line-height: 1.35 !important;
  }

  .compact-list,
  .list {
    gap: 6px !important;
  }

  .item {
    min-height: 34px !important;
    padding: 7px 8px !important;
    border-radius: 10px !important;
    gap: 7px !important;
  }

  .item b {
    font-size: 10px !important;
    line-height: 1.15 !important;
  }

  .item small {
    font-size: 8px !important;
    line-height: 1.2 !important;
    margin-top: 2px !important;
  }

  .empty {
    min-height: 38px !important;
    padding: 9px !important;
    border-radius: 10px !important;
    font-size: 10px !important;
  }

  .field span {
    font-size: 9px !important;
  }

  .field input,
  .field select,
  .field textarea {
    min-height: 32px !important;
    padding: 7px 9px !important;
    border-radius: 10px !important;
    font-size: 11px !important;
  }

  .field textarea {
    min-height: 62px !important;
  }

  .cockpit-debt-workspace {
    display: grid !important;
    grid-template-columns: minmax(0, 1.05fr) minmax(0, .95fr) !important;
    gap: 10px !important;
    align-items: start !important;
  }

  .cockpit-debt-workspace #debtFormPanel,
  .cockpit-debt-workspace #debtListPanel {
    margin-top: 0 !important;
  }
}

/* Mobile: início mais limpo sem destruir visual premium */
@media (max-width: 780px) {
  .top {
    position: relative !important;
    top: auto !important;
    min-height: 58px !important;
    height: 58px !important;
    padding: 8px 14px !important;
  }

  .top .title {
    display: none !important;
  }

  .actions {
    width: 100% !important;
    justify-content: flex-end !important;
    gap: 8px !important;
  }

  .monthbar #prevMonth,
  .monthbar #nextMonth,
  .monthbar #todayBtn,
  #exportBtn,
  #topGlobalAddBtn {
    display: none !important;
  }

  .monthbar input {
    width: 174px !important;
    min-width: 174px !important;
    max-width: 174px !important;
    height: 36px !important;
    text-align: center !important;
    font-size: 14px !important;
    white-space: nowrap !important;
  }

  #userMenuButton {
    width: 40px !important;
    height: 40px !important;
    min-width: 40px !important;
    max-width: 40px !important;
    border-radius: 50% !important;
    position: relative !important;
    inset: auto !important;
    transform: none !important;
    z-index: 2 !important;
  }

  #dashboard > .page-head,
  #dashboard .dashboard-head {
    display: none !important;
  }

  .content {
    padding: 12px 12px calc(122px + env(safe-area-inset-bottom)) !important;
    max-width: none !important;
  }

  .dashboard-kpis {
    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
    gap: 10px !important;
    margin: 0 0 12px !important;
  }

  #dashboard .dashboard-kpis .kpi:nth-child(n+5) {
    display: none !important;
  }

  #dashboard .kpi {
    min-height: 104px !important;
    padding: 14px !important;
    border-radius: 20px !important;
  }

  #dashboard .kpi span {
    font-size: 9px !important;
    letter-spacing: .11em !important;
    line-height: 1.25 !important;
  }

  #dashboard .kpi b,
  #dashboard .kpi .value {
    font-size: 24px !important;
    line-height: 1.08 !important;
    margin-top: 8px !important;
  }

  #dashboard .dashboard-grid-12 > .panel {
    display: none !important;
  }

  #dashboard .dashboard-grid-12 > .goal-mini-card {
    display: grid !important;
    min-height: auto !important;
    padding: 13px !important;
    border-radius: 20px !important;
    grid-template-columns: 34px 1fr !important;
    gap: 10px !important;
    margin-bottom: 12px !important;
  }

  #dashboard .goal-mini-card p,
  #dashboard .goal-mini-card .btn {
    display: none !important;
  }

  .global-add-btn {
    width: 52px !important;
    height: 52px !important;
    right: 18px !important;
    left: auto !important;
    bottom: calc(92px + env(safe-area-inset-bottom)) !important;
    transform: none !important;
    border-radius: 18px !important;
    font-size: 30px !important;
    z-index: 34 !important;
  }

  .mobile-nav {
    left: 10px !important;
    right: 10px !important;
    bottom: calc(8px + env(safe-area-inset-bottom)) !important;
    border-radius: 26px !important;
    padding: 7px !important;
    min-height: 66px !important;
  }

  .cockpit-debt-workspace {
    display: grid !important;
    grid-template-columns: 1fr !important;
    gap: 10px !important;
  }
}
`;

    const style = document.createElement("style");
    style.id = "cockpit-hotfix-safe-css";
    style.textContent = css;
    document.head.appendChild(style);
  }

  function patchAvatar() {
    $all("#userMenuButton img, .user-avatar img, .profile-avatar img").forEach(function (img) {
      img.setAttribute("referrerpolicy", "no-referrer");
    });
  }

  function patchNavigation() {
    $all("#nav button, .nav-hub button").forEach(function (button) {
      const text = (button.textContent || "").toLowerCase();

      if (text.includes("dívida") || text.includes("divida")) {
        button.dataset.view = "debts";
      }

      if (text.includes("simulador")) {
        button.dataset.view = "simulator";
      }
    });
  }

  function createDebtSection() {
    const content = $(".content");
    if (!content) return;

    let section = byId("debts");

    if (!section) {
      section = document.createElement("section");
      section.id = "debts";
      section.className = "section cockpit-debts-section";
      section.innerHTML =
        '<div class="page-head">' +
          '<div class="page-title">' +
            '<div class="overline">Debt control</div>' +
            '<h1>Dívidas <span>& Parcelas</span></h1>' +
            '<p>Cadastre financiamentos, empréstimos e parcelamentos diretamente por aqui. As parcelas continuam entrando no Extrato, no Painel e no Fluxo de Caixa.</p>' +
          '</div>' +
        '</div>' +
        '<div class="cockpit-debt-workspace"></div>';

      const register = byId("register");
      if (register && register.nextSibling) {
        content.insertBefore(section, register.nextSibling);
      } else {
        content.appendChild(section);
      }
    }

    const workspace = $(".cockpit-debt-workspace", section);
    if (!workspace) return;

    const debtForm = byId("debtFormPanel");
    const debtList = byId("debtListPanel");

    if (debtForm && debtForm.parentNode !== workspace) {
      workspace.appendChild(debtForm);
      debtForm.style.marginTop = "0";

      const title = byId("debtFormTitle");
      if (title) title.textContent = "Cadastrar dívida";

      const paragraph = $(".panel-head p", debtForm);
      if (paragraph) {
        paragraph.textContent = "Cadastre direto nesta aba. Depois de salvar, as parcelas entram automaticamente no Extrato e nas projeções.";
      }
    }

    if (debtList && debtList.parentNode !== workspace) {
      workspace.appendChild(debtList);
      debtList.style.marginTop = "0";

      const paragraph = $(".panel-head p", debtList);
      if (paragraph) {
        paragraph.textContent = "Obrigações ativas, próximas parcelas e saldo devedor.";
      }
    }
  }

  function patchDebtSaveFlow() {
    const saveDebt = byId("saveDebt");
    if (!saveDebt || saveDebt.dataset.hotfixDebtBound === "1") return;

    saveDebt.dataset.hotfixDebtBound = "1";
    saveDebt.addEventListener("click", function () {
      setTimeout(function () {
        safe(function () { renderDebts(selectedMonthSafe()); });
        safe(function () { renderDashboard(selectedMonthSafe()); });
        safe(function () { renderTxList(selectedMonthSafe()); });
        safe(function () { setView("debts"); });
        safe(function () { toast("Dívida salva. Parcelas atualizadas no Extrato e no Fluxo de Caixa."); });
      }, 250);
    });
  }

  function createSimulatorSection() {
    const content = $(".content");
    if (!content) return;

    let section = byId("simulator");

    if (!section) {
      section = document.createElement("section");
      section.id = "simulator";
      section.className = "section cockpit-simulator-section";
      content.appendChild(section);
    }

    if (section.dataset.hotfixReady === "1") return;
    section.dataset.hotfixReady = "1";

    section.innerHTML =
      '<div class="page-head">' +
        '<div class="page-title">' +
          '<div class="overline">Planejamento financeiro</div>' +
          '<h1>Simulador</h1>' +
          '<p>Projete patrimônio, aportes mensais, juros compostos, inflação, renda passiva e tempo até a meta.</p>' +
        '</div>' +
      '</div>' +
      '<div class="grid cards2">' +
        '<div class="panel">' +
          '<h2>Parâmetros da simulação</h2>' +
          '<p>Use para testar cenários antes de decidir aportes, metas ou quitação de dívidas.</p>' +
          '<div class="form-grid">' +
            '<label class="field"><span>Valor inicial</span><input id="simInitial" type="number" min="0" step="0.01" value="0"></label>' +
            '<label class="field"><span>Aporte mensal</span><input id="simMonthly" type="number" min="0" step="0.01" value="1000"></label>' +
            '<label class="field"><span>Rentabilidade anual (%)</span><input id="simAnnualRate" type="number" min="0" step="0.01" value="8"></label>' +
            '<label class="field"><span>Prazo em anos</span><input id="simYears" type="number" min="1" step="1" value="10"></label>' +
            '<label class="field"><span>Inflação anual estimada (%)</span><input id="simInflation" type="number" min="0" step="0.01" value="4"></label>' +
            '<label class="field"><span>Meta patrimonial</span><input id="simTarget" type="number" min="0" step="0.01" value="1000000"></label>' +
          '</div>' +
          '<div class="split" style="margin-top:14px">' +
            '<button class="btn primary" id="runCockpitSimulation" type="button">Simular cenário</button>' +
            '<button class="btn" id="simConservative" type="button">Conservador</button>' +
            '<button class="btn" id="simAggressive" type="button">Agressivo</button>' +
          '</div>' +
          '<div class="notice" style="margin-top:12px">Simulação educativa. Não é promessa de rentabilidade nem recomendação de investimento.</div>' +
        '</div>' +
        '<div class="panel">' +
          '<h2>Resultado projetado</h2>' +
          '<div id="simResult" class="list"></div>' +
          '<h2 style="margin-top:14px">Evolução anual</h2>' +
          '<div id="simRows" class="list"></div>' +
        '</div>' +
      '</div>';

    bindSimulator();
  }

  function runSimulation() {
    const initial = moneyFromInput("simInitial");
    const monthly = moneyFromInput("simMonthly");
    const annualRate = moneyFromInput("simAnnualRate") / 100;
    const years = Math.max(1, Math.floor(moneyFromInput("simYears") || 1));
    const inflation = moneyFromInput("simInflation") / 100;
    const target = moneyFromInput("simTarget");

    const monthlyRate = Math.pow(1 + annualRate, 1 / 12) - 1;
    const months = years * 12;

    let balance = initial;
    let invested = initial;
    const rows = [];

    for (let monthIndex = 1; monthIndex <= months; monthIndex++) {
      balance = balance * (1 + monthlyRate) + monthly;
      invested += monthly;

      if (monthIndex % 12 === 0) {
        const year = monthIndex / 12;
        rows.push({
          year,
          invested,
          balance,
          real: balance / Math.pow(1 + inflation, year)
        });
      }
    }

    const gains = balance - invested;
    const realValue = balance / Math.pow(1 + inflation, years);
    const passiveMonthly = (balance * 0.04) / 12;

    let targetMonths = null;

    if (target > 0) {
      let targetBalance = initial;
      for (let i = 1; i <= 1200; i++) {
        targetBalance = targetBalance * (1 + monthlyRate) + monthly;
        if (targetBalance >= target) {
          targetMonths = i;
          break;
        }
      }
    }

    const result = byId("simResult");
    if (result) {
      const timeText = targetMonths
        ? Math.floor(targetMonths / 12) + "a " + (targetMonths % 12) + "m"
        : "acima de 100 anos";

      result.innerHTML = [
        ["Patrimônio futuro", brl(balance), "positive"],
        ["Total aportado", brl(invested), "neutral"],
        ["Juros acumulados", brl(gains), "positive"],
        ["Valor real estimado", brl(realValue), "neutral"],
        ["Renda passiva 4% a.a.", brl(passiveMonthly) + "/mês", "cyan"],
        ["Tempo até a meta", timeText, "warn"]
      ].map(function (row) {
        return '<div class="item">' +
          '<div><b>' + row[0] + '</b><small>Simulação educativa</small></div>' +
          '<div class="amount ' + row[2] + '">' + row[1] + '</div>' +
        '</div>';
      }).join("");
    }

    const table = byId("simRows");
    if (table) {
      table.innerHTML = rows.map(function (row) {
        return '<div class="item">' +
          '<div><b>Ano ' + row.year + '</b><small>Aportado: ' + brl(row.invested) + ' • Valor real: ' + brl(row.real) + '</small></div>' +
          '<div class="amount positive">' + brl(row.balance) + '</div>' +
        '</div>';
      }).join("");
    }
  }

  function bindSimulator() {
    const runButton = byId("runCockpitSimulation");
    if (runButton && runButton.dataset.bound !== "1") {
      runButton.dataset.bound = "1";
      runButton.addEventListener("click", runSimulation);
    }

    ["simInitial", "simMonthly", "simAnnualRate", "simYears", "simInflation", "simTarget"].forEach(function (id) {
      const input = byId(id);
      if (input && input.dataset.bound !== "1") {
        input.dataset.bound = "1";
        input.addEventListener("input", runSimulation);
      }
    });

    const conservative = byId("simConservative");
    if (conservative && conservative.dataset.bound !== "1") {
      conservative.dataset.bound = "1";
      conservative.addEventListener("click", function () {
        byId("simAnnualRate").value = 6;
        byId("simInflation").value = 4;
        runSimulation();
      });
    }

    const aggressive = byId("simAggressive");
    if (aggressive && aggressive.dataset.bound !== "1") {
      aggressive.dataset.bound = "1";
      aggressive.addEventListener("click", function () {
        byId("simAnnualRate").value = 10;
        byId("simInflation").value = 4;
        runSimulation();
      });
    }

    runSimulation();
  }

  function boot() {
    injectCss();
    patchAvatar();
    patchNavigation();
    createDebtSection();
    patchDebtSaveFlow();
    createSimulatorSection();
  }

  function scheduleBoots() {
    boot();
    setTimeout(boot, 300);
    setTimeout(boot, 900);
    setTimeout(boot, 1800);
    setTimeout(boot, 3000);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", scheduleBoots);
  } else {
    scheduleBoots();
  }

  document.addEventListener("click", function () {
    setTimeout(boot, 120);
  }, true);
})();


/* ===== MOBILE FORCE PATCH v2 =====
   Corrige especificamente o problema mostrado no iPhone:
   - cabeçalho alto demais;
   - título "Painel" ocupando espaço;
   - foto do Google gigante/retangular;
   - 6 cards na Home;
   - bloco Receita x Despesa aparecendo na Home mobile;
   - botão + sobrepondo conteúdo.
*/
(function () {
  "use strict";

  const FLAG = "cockpit-mobile-force-v2";
  if (window[FLAG]) return;
  window[FLAG] = true;

  function isMobileLike() {
    return window.innerWidth <= 900 || window.matchMedia("(max-width: 900px)").matches;
  }

  function q(selector, root = document) {
    return root.querySelector(selector);
  }

  function qa(selector, root = document) {
    return Array.from(root.querySelectorAll(selector));
  }

  function injectMobileCss() {
    if (document.getElementById("cockpit-mobile-force-v2-css")) return;

    const css = `
html.cockpit-mobile-force,
html.cockpit-mobile-force body {
  overflow-x: hidden !important;
}

/* Header mobile compacto */
html.cockpit-mobile-force .top {
  position: relative !important;
  top: auto !important;
  min-height: 52px !important;
  height: 52px !important;
  padding: 6px 12px !important;
  margin: 0 !important;
  display: flex !important;
  align-items: center !important;
  justify-content: flex-end !important;
  gap: 8px !important;
  overflow: visible !important;
}

html.cockpit-mobile-force .top .title,
html.cockpit-mobile-force #pageTitle,
html.cockpit-mobile-force #monthHint {
  display: none !important;
  width: 0 !important;
  height: 0 !important;
  overflow: hidden !important;
}

/* Ações do topo */
html.cockpit-mobile-force .actions,
html.cockpit-mobile-force .compact-actions {
  width: 100% !important;
  display: flex !important;
  align-items: center !important;
  justify-content: flex-end !important;
  gap: 8px !important;
  margin: 0 !important;
}

html.cockpit-mobile-force .monthbar {
  display: flex !important;
  align-items: center !important;
  gap: 0 !important;
  margin-right: 4px !important;
}

html.cockpit-mobile-force .monthbar #prevMonth,
html.cockpit-mobile-force .monthbar #nextMonth,
html.cockpit-mobile-force .monthbar #todayBtn,
html.cockpit-mobile-force #exportBtn,
html.cockpit-mobile-force #topGlobalAddBtn,
html.cockpit-mobile-force #privacyBtn {
  display: none !important;
}

html.cockpit-mobile-force .monthbar input {
  width: 158px !important;
  min-width: 158px !important;
  max-width: 158px !important;
  height: 34px !important;
  min-height: 34px !important;
  padding: 0 10px !important;
  border-radius: 999px !important;
  text-align: center !important;
  font-size: 13px !important;
  line-height: 1 !important;
  white-space: nowrap !important;
}

/* Avatar Google: sempre circular e pequeno */
html.cockpit-mobile-force .user-menu-wrap {
  width: 40px !important;
  height: 40px !important;
  min-width: 40px !important;
  max-width: 40px !important;
  flex: 0 0 40px !important;
  position: relative !important;
  inset: auto !important;
  overflow: visible !important;
}

html.cockpit-mobile-force #userMenuButton,
html.cockpit-mobile-force .user-avatar {
  width: 40px !important;
  height: 40px !important;
  min-width: 40px !important;
  max-width: 40px !important;
  padding: 0 !important;
  border-radius: 50% !important;
  overflow: hidden !important;
  position: relative !important;
  inset: auto !important;
  transform: none !important;
  display: grid !important;
  place-items: center !important;
}

html.cockpit-mobile-force #userMenuButton img,
html.cockpit-mobile-force .user-avatar img {
  width: 40px !important;
  height: 40px !important;
  min-width: 40px !important;
  max-width: 40px !important;
  display: block !important;
  object-fit: cover !important;
  border-radius: 50% !important;
}

/* Conteúdo mobile */
html.cockpit-mobile-force .content {
  padding: 10px 12px calc(104px + env(safe-area-inset-bottom)) !important;
  max-width: none !important;
}

/* Remove cabeçalho interno da Home */
html.cockpit-mobile-force #dashboard > .page-head,
html.cockpit-mobile-force #dashboard .dashboard-head {
  display: none !important;
}

/* Home mobile: só 4 indicadores */
html.cockpit-mobile-force #dashboard .dashboard-kpis {
  display: grid !important;
  grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
  gap: 10px !important;
  margin: 0 0 12px !important;
}

html.cockpit-mobile-force #dashboard .dashboard-kpis > *:nth-child(n+5) {
  display: none !important;
}

html.cockpit-mobile-force #dashboard .dashboard-kpis .kpi,
html.cockpit-mobile-force #dashboard .dashboard-kpis .card.kpi {
  min-height: 92px !important;
  padding: 12px !important;
  border-radius: 18px !important;
}

html.cockpit-mobile-force #dashboard .dashboard-kpis .kpi span,
html.cockpit-mobile-force #dashboard .dashboard-kpis .card.kpi span {
  font-size: 8px !important;
  line-height: 1.18 !important;
  letter-spacing: .11em !important;
}

html.cockpit-mobile-force #dashboard .dashboard-kpis .kpi b,
html.cockpit-mobile-force #dashboard .dashboard-kpis .card.kpi b {
  font-size: 22px !important;
  line-height: 1.05 !important;
  margin-top: 7px !important;
}

html.cockpit-mobile-force #dashboard .dashboard-kpis .delta {
  font-size: 10px !important;
  margin-top: 5px !important;
}

/* Home mobile: detalhes saem da tela inicial */
html.cockpit-mobile-force #dashboard .dashboard-grid-12 > .panel {
  display: none !important;
}

/* Se houver card de objetivo, pode aparecer compacto */
html.cockpit-mobile-force #dashboard .dashboard-grid-12 > .goal-mini-card {
  display: grid !important;
  min-height: auto !important;
  padding: 12px !important;
  border-radius: 18px !important;
  grid-template-columns: 32px 1fr !important;
  gap: 10px !important;
  margin: 0 0 12px !important;
}

html.cockpit-mobile-force #dashboard .goal-mini-card p,
html.cockpit-mobile-force #dashboard .goal-mini-card .btn {
  display: none !important;
}

html.cockpit-mobile-force #dashboard .goal-mini-card h2 {
  font-size: 13px !important;
  line-height: 1.2 !important;
  margin: 1px 0 !important;
}

/* Botão + sem cobrir o centro da barra */
html.cockpit-mobile-force .global-add-btn {
  width: 52px !important;
  height: 52px !important;
  right: 18px !important;
  left: auto !important;
  bottom: calc(82px + env(safe-area-inset-bottom)) !important;
  transform: none !important;
  border-radius: 18px !important;
  font-size: 30px !important;
  z-index: 34 !important;
}

/* Barra inferior menos invasiva */
html.cockpit-mobile-force .mobile-nav {
  left: 10px !important;
  right: 10px !important;
  bottom: calc(8px + env(safe-area-inset-bottom)) !important;
  min-height: 62px !important;
  padding: 6px !important;
  border-radius: 24px !important;
}

html.cockpit-mobile-force .mobile-nav button {
  min-height: 50px !important;
  font-size: 10px !important;
}

html.cockpit-mobile-force .mobile-nav .ico {
  width: 20px !important;
  height: 20px !important;
  min-width: 20px !important;
}

/* Aba Dívidas no mobile */
html.cockpit-mobile-force .cockpit-debt-workspace {
  display: grid !important;
  grid-template-columns: 1fr !important;
  gap: 10px !important;
}
`;

    const style = document.createElement("style");
    style.id = "cockpit-mobile-force-v2-css";
    style.textContent = css;
    document.head.appendChild(style);
  }

  function forceMobileClass() {
    document.documentElement.classList.toggle("cockpit-mobile-force", isMobileLike());
  }

  function forceAvatarSize() {
    if (!isMobileLike()) return;

    const wrap = q(".user-menu-wrap");
    const btn = q("#userMenuButton");
    const img = q("#userMenuButton img, .user-avatar img");

    if (wrap) {
      Object.assign(wrap.style, {
        width: "40px",
        height: "40px",
        minWidth: "40px",
        maxWidth: "40px",
        flex: "0 0 40px",
        position: "relative",
        overflow: "visible"
      });
    }

    if (btn) {
      Object.assign(btn.style, {
        width: "40px",
        height: "40px",
        minWidth: "40px",
        maxWidth: "40px",
        borderRadius: "50%",
        overflow: "hidden",
        padding: "0",
        position: "relative",
        transform: "none",
        inset: "auto"
      });
    }

    if (img) {
      img.setAttribute("referrerpolicy", "no-referrer");
      Object.assign(img.style, {
        width: "40px",
        height: "40px",
        minWidth: "40px",
        maxWidth: "40px",
        objectFit: "cover",
        borderRadius: "50%",
        display: "block"
      });
    }
  }

  function simplifyHome() {
    if (!isMobileLike()) return;

    const title = q(".top .title");
    if (title) title.style.display = "none";

    qa("#dashboard .dashboard-kpis > *").forEach(function (card, index) {
      card.style.display = index >= 4 ? "none" : "";
    });

    qa("#dashboard .dashboard-grid-12 > .panel").forEach(function (panel) {
      if (panel.classList.contains("goal-mini-card")) {
        panel.style.display = "grid";
      } else {
        panel.style.display = "none";
      }
    });
  }

  function run() {
    injectMobileCss();
    forceMobileClass();
    forceAvatarSize();
    simplifyHome();
  }

  run();
  setTimeout(run, 250);
  setTimeout(run, 750);
  setTimeout(run, 1500);
  setTimeout(run, 3000);

  window.addEventListener("resize", run);
  window.addEventListener("orientationchange", function () {
    setTimeout(run, 300);
  });

  document.addEventListener("click", function () {
    setTimeout(run, 120);
  }, true);
})();


/* ===== DEBT WORKFLOW FORCE PATCH v3 =====
   Corrige:
   - clicar em Dívidas abria Extrato;
   - tentar lançar dívida pelo + abria Extrato;
   - após salvar dívida voltava para Extrato.
*/
(function () {
  "use strict";

  const FLAG = "cockpit-debt-workflow-force-v3";
  if (window[FLAG]) return;
  window[FLAG] = true;

  function q(selector, root = document) { return root.querySelector(selector); }
  function qa(selector, root = document) { return Array.from(root.querySelectorAll(selector)); }
  function byId(id) { return document.getElementById(id); }
  function safe(fn) { try { return fn(); } catch (error) { console.warn("[Cockpit debt v3]", error); return null; } }

  function selectedMonthSafe() {
    return safe(function () { return selectedMonth(); }) ||
      (byId("monthPicker") && byId("monthPicker").value) ||
      new Date().toISOString().slice(0, 7);
  }

  function injectDebtCss() {
    if (byId("cockpit-debt-workflow-force-v3-css")) return;

    const css = `
#debts.cockpit-debts-section{display:none}
#debts.cockpit-debts-section.active{display:block!important}
.cockpit-debt-workspace{display:grid;grid-template-columns:minmax(0,1.05fr) minmax(0,.95fr);gap:14px;align-items:start}
.cockpit-debt-workspace #debtFormPanel,.cockpit-debt-workspace #debtListPanel{margin-top:0!important}
.cockpit-debt-helper{margin-bottom:14px;border:1px solid rgba(142,213,255,.18);background:rgba(76,201,255,.06);border-radius:18px;padding:12px 14px;color:var(--soft,#bfd0e5);font-size:13px;line-height:1.45}
.cockpit-debt-helper b{color:var(--text,#e7f1ff)}
@media(max-width:780px){.cockpit-debt-workspace{grid-template-columns:1fr!important;gap:10px!important}.cockpit-debt-helper{font-size:12px;padding:11px 12px;border-radius:16px}}
`;

    const style = document.createElement("style");
    style.id = "cockpit-debt-workflow-force-v3-css";
    style.textContent = css;
    document.head.appendChild(style);
  }

  function createDebtSection() {
    const content = q(".content");
    if (!content) return null;

    let section = byId("debts");

    if (!section) {
      section = document.createElement("section");
      section.id = "debts";
      section.className = "section cockpit-debts-section";
      section.innerHTML =
        '<div class="page-head">' +
          '<div class="page-title">' +
            '<div class="overline">Debt control</div>' +
            '<h1>Dívidas <span>& Parcelas</span></h1>' +
            '<p>Cadastre financiamentos, empréstimos, parcelamentos e compromissos recorrentes diretamente por aqui.</p>' +
          '</div>' +
        '</div>' +
        '<div class="cockpit-debt-helper"><b>Fluxo correto:</b> cadastre a dívida nesta aba. Depois de salvar, as parcelas entram automaticamente no Painel, no Extrato e no Fluxo de Caixa.</div>' +
        '<div class="cockpit-debt-workspace"></div>';

      const register = byId("register");
      if (register && register.nextSibling) content.insertBefore(section, register.nextSibling);
      else content.appendChild(section);
    }

    const workspace = q(".cockpit-debt-workspace", section);
    if (!workspace) return section;

    const debtForm = byId("debtFormPanel");
    const debtList = byId("debtListPanel");

    if (debtForm && debtForm.parentNode !== workspace) {
      workspace.appendChild(debtForm);
      debtForm.style.marginTop = "0";

      const title = byId("debtFormTitle");
      if (title) title.textContent = "Cadastrar dívida";

      const paragraph = q(".panel-head p", debtForm);
      if (paragraph) paragraph.textContent = "Preencha aqui. Você não precisa passar por Novo Lançamento para cadastrar uma dívida.";
    }

    if (debtList && debtList.parentNode !== workspace) {
      workspace.appendChild(debtList);
      debtList.style.marginTop = "0";

      const paragraph = q(".panel-head p", debtList);
      if (paragraph) paragraph.textContent = "Dívidas ativas, próximas parcelas e compromissos futuros.";
    }

    return section;
  }

  function forceOpenDebts() {
    injectDebtCss();

    const section = createDebtSection();
    if (!section) return;

    qa(".section").forEach(function (node) {
      node.classList.remove("active");
      node.style.display = "none";
    });

    section.classList.add("active");
    section.style.display = "block";

    qa("#nav button,.nav-hub button,.mobile-nav button").forEach(function (button) {
      const text = (button.textContent || "").toLowerCase();
      const isDebt = text.includes("dívida") || text.includes("divida") || button.dataset.view === "debts";
      button.classList.toggle("active", isDebt);
    });

    const pageTitle = byId("pageTitle");
    if (pageTitle) pageTitle.textContent = "Dívidas";

    const monthHint = byId("monthHint");
    if (monthHint) monthHint.textContent = "Cadastro e acompanhamento de parcelas";

    safe(function () { renderDebts(selectedMonthSafe()); });

    const debtForm = byId("debtFormPanel");
    if (debtForm) setTimeout(function () { debtForm.scrollIntoView({ behavior: "smooth", block: "start" }); }, 80);

    window.scrollTo({ top: 0, behavior: "instant" });
  }

  function patchNavAttributes() {
    qa("#nav button,.nav-hub button,.desktop-nav button,.grouped-nav button,.mobile-nav button").forEach(function (button) {
      const text = (button.textContent || "").toLowerCase();

      if (text.includes("dívida") || text.includes("divida")) {
        button.dataset.view = "debts";
        button.setAttribute("data-debt-nav", "1");
      }

      if (text.includes("simulador")) button.dataset.view = "simulator";
    });
  }

  function addDebtOptionToActionSheet() {
    const grid = q("#registerActionSheet .sheet-grid");
    if (!grid || q('[data-register-action="debt"]', grid)) return;

    const button = document.createElement("button");
    button.type = "button";
    button.dataset.registerAction = "debt";
    button.innerHTML = '<span>⚠</span><b>Dívida / financiamento</b><small>Parcelas, empréstimos e financiamentos</small>';

    grid.appendChild(button);
  }

  function closeRegisterSheetSafely() {
    const sheet = byId("registerActionSheet");
    if (sheet) {
      sheet.classList.add("hidden");
      sheet.setAttribute("aria-hidden", "true");
    }

    safe(function () { closeRegisterSheet(); });
  }

  function interceptDebtClicks() {
    if (window.__cockpitDebtV3ClickInterceptor) return;
    window.__cockpitDebtV3ClickInterceptor = true;

    document.addEventListener("click", function (event) {
      const button = event.target.closest("button");
      if (!button) return;

      const text = (button.textContent || "").toLowerCase();
      const action = button.dataset.registerAction;
      const view = button.dataset.view;

      const isDebtNav =
        button.dataset.debtNav === "1" ||
        view === "debts" ||
        ((text.includes("dívida") || text.includes("divida")) && button.closest("#nav,.nav-hub,.desktop-nav,.mobile-nav"));

      const isDebtAction =
        action === "debt" ||
        ((text.includes("dívida") || text.includes("divida") || text.includes("financiamento")) && button.closest("#registerActionSheet"));

      if (!isDebtNav && !isDebtAction) return;

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();

      closeRegisterSheetSafely();
      forceOpenDebts();
    }, true);
  }

  function patchSaveDebtReturn() {
    const saveDebt = byId("saveDebt");
    if (!saveDebt || saveDebt.dataset.debtForceV3 === "1") return;

    saveDebt.dataset.debtForceV3 = "1";

    saveDebt.addEventListener("click", function () {
      setTimeout(function () {
        createDebtSection();
        safe(function () { renderDebts(selectedMonthSafe()); });
        safe(function () { renderDashboard(selectedMonthSafe()); });
        safe(function () { renderTxList(selectedMonthSafe()); });
        forceOpenDebts();
        safe(function () { toast("Dívida salva. Parcelas atualizadas no Extrato, Painel e Fluxo de Caixa."); });
      }, 350);
    });
  }

  function patchEditDebt() {
    if (window.__cockpitDebtV3EditPatch) return;

    const original = window.editDebt;
    if (typeof original !== "function") return;

    window.editDebt = function (id) {
      original(id);
      setTimeout(function () { forceOpenDebts(); }, 120);
    };

    safe(function () { editDebt = window.editDebt; });
    window.__cockpitDebtV3EditPatch = true;
  }

  function patchOpenRegisterSheet() {
    qa("#globalAddBtn,#desktopGlobalAddBtn,#topGlobalAddBtn,#statementAddBtn").forEach(function (button) {
      if (button.dataset.debtV3SheetPatched === "1") return;
      button.dataset.debtV3SheetPatched = "1";
      button.addEventListener("click", function () {
        setTimeout(addDebtOptionToActionSheet, 80);
        setTimeout(addDebtOptionToActionSheet, 250);
      });
    });
  }

  function bootDebtV3() {
    injectDebtCss();
    patchNavAttributes();
    createDebtSection();
    addDebtOptionToActionSheet();
    interceptDebtClicks();
    patchSaveDebtReturn();
    patchEditDebt();
    patchOpenRegisterSheet();
  }

  bootDebtV3();
  setTimeout(bootDebtV3, 300);
  setTimeout(bootDebtV3, 900);
  setTimeout(bootDebtV3, 1800);
  setTimeout(bootDebtV3, 3000);

  document.addEventListener("click", function () { setTimeout(bootDebtV3, 120); }, true);
})();


/* ===== MOBILE HOME ACTION PATCH v4 =====
   Feedback de usuário:
   "Ficou bom! Só estou achando muita informação.
    Seria bom se na tela de início eu conseguisse clicar nas Despesas, por exemplo, e já entrar nelas."

   Resultado:
   - Home mobile vira uma porta de entrada.
   - 4 cards principais clicáveis.
   - Despesas abre Extrato filtrado por saídas.
   - Receitas abre Extrato filtrado por entradas.
   - Saldo abre Extrato geral.
   - Patrimônio abre Carteira.
*/
(function () {
  "use strict";

  const FLAG = "cockpit-mobile-home-action-v4";
  if (window[FLAG]) return;
  window[FLAG] = true;

  function q(selector, root = document) {
    return root.querySelector(selector);
  }

  function qa(selector, root = document) {
    return Array.from(root.querySelectorAll(selector));
  }

  function byId(id) {
    return document.getElementById(id);
  }

  function safe(fn) {
    try {
      return fn();
    } catch (error) {
      console.warn("[Cockpit mobile home v4]", error);
      return null;
    }
  }

  function isMobileLike() {
    return window.innerWidth <= 900 || window.matchMedia("(max-width: 900px)").matches;
  }

  function selectedMonthSafe() {
    return safe(function () { return selectedMonth(); }) ||
      (byId("monthPicker") && byId("monthPicker").value) ||
      new Date().toISOString().slice(0, 7);
  }

  function injectCss() {
    if (byId("cockpit-mobile-home-action-v4-css")) return;

    const css = `
@media (max-width: 900px) {
  html.cockpit-mobile-force #dashboard .dashboard-grid-12,
  html.cockpit-mobile-force #dashboard .dashboard-grid-12 > *,
  html.cockpit-mobile-force #dashboard .dashboard-grid-12 > .panel,
  html.cockpit-mobile-force #dashboard .dashboard-grid-12 > .goal-mini-card {
    display: none !important;
  }

  html.cockpit-mobile-force #dashboard .dashboard-kpis {
    margin-bottom: 0 !important;
  }

  html.cockpit-mobile-force #dashboard .dashboard-kpis .kpi,
  html.cockpit-mobile-force #dashboard .dashboard-kpis .card.kpi {
    position: relative !important;
    cursor: pointer !important;
    user-select: none !important;
    transition: transform .14s ease, border-color .14s ease, background .14s ease !important;
  }

  html.cockpit-mobile-force #dashboard .dashboard-kpis .kpi:active,
  html.cockpit-mobile-force #dashboard .dashboard-kpis .card.kpi:active {
    transform: scale(.985) !important;
  }

  html.cockpit-mobile-force #dashboard .dashboard-kpis .kpi::after,
  html.cockpit-mobile-force #dashboard .dashboard-kpis .card.kpi::after {
    content: "toque para ver";
    position: absolute;
    right: 12px;
    bottom: 9px;
    font-size: 8px;
    font-weight: 900;
    letter-spacing: .08em;
    text-transform: uppercase;
    color: rgba(190, 210, 232, .52);
    pointer-events: none;
  }

  html.cockpit-mobile-force #dashboard .dashboard-kpis .kpi[data-home-action="expense"]::after,
  html.cockpit-mobile-force #dashboard .dashboard-kpis .card.kpi[data-home-action="expense"]::after {
    content: "ver saídas";
  }

  html.cockpit-mobile-force #dashboard .dashboard-kpis .kpi[data-home-action="income"]::after,
  html.cockpit-mobile-force #dashboard .dashboard-kpis .card.kpi[data-home-action="income"]::after {
    content: "ver entradas";
  }

  html.cockpit-mobile-force #dashboard .dashboard-kpis .kpi[data-home-action="statement"]::after,
  html.cockpit-mobile-force #dashboard .dashboard-kpis .card.kpi[data-home-action="statement"]::after {
    content: "ver extrato";
  }

  html.cockpit-mobile-force #dashboard .dashboard-kpis .kpi[data-home-action="wallet"]::after,
  html.cockpit-mobile-force #dashboard .dashboard-kpis .card.kpi[data-home-action="wallet"]::after {
    content: "ver carteira";
  }

  html.cockpit-mobile-force #dashboard .dashboard-kpis .kpi .delta,
  html.cockpit-mobile-force #dashboard .dashboard-kpis .card.kpi .delta {
    padding-right: 62px !important;
  }
}
`;

    const style = document.createElement("style");
    style.id = "cockpit-mobile-home-action-v4-css";
    style.textContent = css;
    document.head.appendChild(style);
  }

  function markCards() {
    const cards = qa("#dashboard .dashboard-kpis > *");

    if (cards[0]) {
      cards[0].dataset.homeAction = "wallet";
      cards[0].setAttribute("role", "button");
      cards[0].setAttribute("tabindex", "0");
      cards[0].setAttribute("aria-label", "Abrir patrimônio e carteira");
    }

    if (cards[1]) {
      cards[1].dataset.homeAction = "statement";
      cards[1].setAttribute("role", "button");
      cards[1].setAttribute("tabindex", "0");
      cards[1].setAttribute("aria-label", "Abrir extrato geral");
    }

    if (cards[2]) {
      cards[2].dataset.homeAction = "income";
      cards[2].setAttribute("role", "button");
      cards[2].setAttribute("tabindex", "0");
      cards[2].setAttribute("aria-label", "Abrir entradas no extrato");
    }

    if (cards[3]) {
      cards[3].dataset.homeAction = "expense";
      cards[3].setAttribute("role", "button");
      cards[3].setAttribute("tabindex", "0");
      cards[3].setAttribute("aria-label", "Abrir saídas no extrato");
    }

    cards.forEach(function (card, index) {
      card.style.display = index >= 4 ? "none" : "";
    });

    qa("#dashboard .dashboard-grid-12, #dashboard .dashboard-grid-12 > *").forEach(function (node) {
      node.style.display = "none";
    });
  }

  function activateStatementFilter(filter) {
    safe(function () {
      txFilter = filter;
    });

    qa("[data-tx-filter]").forEach(function (button) {
      const active = button.dataset.txFilter === filter;
      button.classList.toggle("active", active);
    });

    safe(function () {
      renderTxList(selectedMonthSafe());
    });

    const search = byId("txSearch");
    if (search && filter !== "all") {
      search.blur();
    }
  }

  function goToFilteredStatement(filter) {
    safe(function () {
      setView("register");
    });

    setTimeout(function () {
      activateStatementFilter(filter);

      const title = byId("pageTitle");
      if (title) {
        title.textContent =
          filter === "expense" ? "Despesas" :
          filter === "income" ? "Receitas" :
          "Extrato";
      }

      const hint = byId("monthHint");
      if (hint) {
        hint.textContent =
          filter === "expense" ? "Saídas do mês selecionado" :
          filter === "income" ? "Entradas do mês selecionado" :
          "Movimentações do mês";
      }

      const target =
        q('[data-tx-filter="' + filter + '"]') ||
        byId("txList") ||
        byId("register");

      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 90);
  }

  function goToWallet() {
    safe(function () {
      setView("wallet");
    });

    setTimeout(function () {
      const title = byId("pageTitle");
      if (title) title.textContent = "Patrimônio";

      const hint = byId("monthHint");
      if (hint) hint.textContent = "Carteira, investimentos e patrimônio";

      const target = byId("wallet") || q(".section.active");
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 90);
  }

  function handleAction(action) {
    if (!isMobileLike()) return;

    if (action === "wallet") {
      goToWallet();
      return;
    }

    if (action === "statement") {
      goToFilteredStatement("all");
      return;
    }

    if (action === "income") {
      goToFilteredStatement("income");
      return;
    }

    if (action === "expense") {
      goToFilteredStatement("expense");
    }
  }

  function bindEvents() {
    if (window.__cockpitMobileHomeActionV4Click) return;
    window.__cockpitMobileHomeActionV4Click = true;

    document.addEventListener("click", function (event) {
      const card = event.target.closest("#dashboard .dashboard-kpis > *[data-home-action]");
      if (!card) return;

      event.preventDefault();
      event.stopPropagation();

      handleAction(card.dataset.homeAction);
    }, true);

    document.addEventListener("keydown", function (event) {
      if (event.key !== "Enter" && event.key !== " ") return;

      const card = event.target.closest && event.target.closest("#dashboard .dashboard-kpis > *[data-home-action]");
      if (!card) return;

      event.preventDefault();
      handleAction(card.dataset.homeAction);
    }, true);
  }

  function run() {
    injectCss();

    if (isMobileLike()) {
      document.documentElement.classList.add("cockpit-mobile-force");
      markCards();
      bindEvents();
    }
  }

  run();
  setTimeout(run, 300);
  setTimeout(run, 900);
  setTimeout(run, 1800);
  setTimeout(run, 3000);

  window.addEventListener("resize", run);
  window.addEventListener("orientationchange", function () {
    setTimeout(run, 300);
  });

  document.addEventListener("click", function () {
    setTimeout(run, 120);
  }, true);
})();


/* ===== DEBT DIRECT FORM PATCH v5 =====
   Corrige definitivamente:
   - aba Dívidas abre, mas não mostra formulário;
   - usuário não consegue cadastrar dívida no desktop nem mobile.

   Solução:
   - cria um formulário próprio e independente dentro da aba Dívidas;
   - salva diretamente em state.debts no mesmo formato do app original;
   - atualiza lista de dívidas, painel, extrato e fluxo;
   - não depende do formulário antigo do Extrato aparecer.
*/
(function () {
  "use strict";

  const FLAG = "cockpit-debt-direct-form-v5";
  if (window[FLAG]) return;
  window[FLAG] = true;

  function q(selector, root = document) {
    return root.querySelector(selector);
  }

  function qa(selector, root = document) {
    return Array.from(root.querySelectorAll(selector));
  }

  function byId(id) {
    return document.getElementById(id);
  }

  function safe(fn) {
    try {
      return fn();
    } catch (error) {
      console.warn("[Cockpit debt v5]", error);
      return null;
    }
  }

  function uidSafe() {
    return safe(function () { return uid(); }) || ("debt_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2));
  }

  function todaySafe() {
    return safe(function () { return today(); }) || new Date().toISOString().slice(0, 10);
  }

  function selectedMonthSafe() {
    return safe(function () { return selectedMonth(); }) ||
      (byId("monthPicker") && byId("monthPicker").value) ||
      new Date().toISOString().slice(0, 7);
  }

  function numSafe(value) {
    return Math.max(0, Number(String(value || "0").replace(",", ".")) || 0);
  }

  function getStateSafe() {
    return safe(function () { return state; }) || window.state || null;
  }

  function setValue(id, value) {
    const node = byId(id);
    if (node) node.value = value == null ? "" : String(value);
  }

  function getValue(id) {
    const node = byId(id);
    return node ? node.value : "";
  }

  function injectDebtDirectCss() {
    if (byId("cockpit-debt-direct-form-v5-css")) return;

    const css = `
.cockpit-debt-direct-panel {
  margin-bottom: 14px !important;
}

.cockpit-debt-direct-panel .form-grid {
  align-items: end;
}

.cockpit-debt-direct-summary {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  margin: 12px 0 0;
}

.cockpit-debt-direct-summary .mini-result {
  border: 1px solid rgba(142,213,255,.13);
  background: rgba(255,255,255,.035);
  border-radius: 14px;
  padding: 10px 12px;
}

.cockpit-debt-direct-summary .mini-result span {
  display: block;
  font-size: 9px;
  letter-spacing: .11em;
  text-transform: uppercase;
  color: var(--muted, #7f94ae);
  font-weight: 900;
}

.cockpit-debt-direct-summary .mini-result b {
  display: block;
  margin-top: 5px;
  font-size: 15px;
  color: var(--text, #e7f1ff);
}

@media (max-width: 780px) {
  .cockpit-debt-direct-summary {
    grid-template-columns: 1fr;
  }

  .cockpit-debt-direct-panel {
    margin-bottom: 10px !important;
  }
}
`;

    const style = document.createElement("style");
    style.id = "cockpit-debt-direct-form-v5-css";
    style.textContent = css;
    document.head.appendChild(style);
  }

  function createDebtSectionIfNeeded() {
    const content = q(".content");
    if (!content) return null;

    let section = byId("debts");

    if (!section) {
      section = document.createElement("section");
      section.id = "debts";
      section.className = "section cockpit-debts-section";
      section.innerHTML =
        '<div class="page-head">' +
          '<div class="page-title">' +
            '<div class="overline">Debt control</div>' +
            '<h1>Dívidas <span>& Parcelas</span></h1>' +
            '<p>Cadastre financiamentos, empréstimos, parcelamentos e compromissos recorrentes diretamente por aqui.</p>' +
          '</div>' +
        '</div>' +
        '<div class="cockpit-debt-workspace"></div>';

      const register = byId("register");
      if (register && register.nextSibling) content.insertBefore(section, register.nextSibling);
      else content.appendChild(section);
    }

    let workspace = q(".cockpit-debt-workspace", section);
    if (!workspace) {
      workspace = document.createElement("div");
      workspace.className = "cockpit-debt-workspace";
      section.appendChild(workspace);
    }

    return section;
  }

  function buildDirectDebtForm() {
    const panel = document.createElement("div");
    panel.id = "debtDirectFormPanel";
    panel.className = "panel cockpit-debt-direct-panel";
    panel.innerHTML =
      '<div class="panel-head">' +
        '<div>' +
          '<h2>Cadastrar dívida</h2>' +
          '<p>Cadastro direto. A dívida salva aqui entra nas parcelas, no Extrato, no Painel e no Fluxo de Caixa.</p>' +
        '</div>' +
      '</div>' +
      '<div class="form-grid">' +
        '<label class="field"><span>Nome da dívida</span><input id="directDebtName" placeholder="Ex.: financiamento do apartamento"></label>' +
        '<label class="field"><span>Tipo</span><select id="directDebtType">' +
          '<option value="real_estate_financing">Financiamento imobiliário</option>' +
          '<option value="vehicle_financing">Financiamento de veículo</option>' +
          '<option value="credit_card_installment">Parcelamento de cartão</option>' +
          '<option value="personal_loan">Empréstimo pessoal</option>' +
          '<option value="payroll_loan">Consignado</option>' +
          '<option value="consortium">Consórcio</option>' +
          '<option value="student_loan">Financiamento estudantil</option>' +
          '<option value="informal_debt">Dívida informal</option>' +
          '<option value="other">Outra dívida</option>' +
        '</select></label>' +
        '<label class="field"><span>Banco, loja ou credor</span><input id="directDebtCreditor" placeholder="Ex.: Caixa, Nubank, C6"></label>' +
        '<label class="field"><span>Valor original</span><input id="directDebtOriginal" type="number" min="0" step="0.01" placeholder="0,00"></label>' +
        '<label class="field"><span>Valor financiado</span><input id="directDebtFinanced" type="number" min="0" step="0.01" placeholder="0,00"></label>' +
        '<label class="field"><span>Entrada paga</span><input id="directDebtDownPayment" type="number" min="0" step="0.01" placeholder="0,00"></label>' +
        '<label class="field"><span>Juros (%)</span><input id="directDebtInterest" type="number" min="0" step="0.0001" placeholder="Ex.: 0.89"></label>' +
        '<label class="field"><span>Periodicidade dos juros</span><select id="directDebtRatePeriod"><option value="monthly">Ao mês</option><option value="annual">Ao ano</option></select></label>' +
        '<label class="field"><span>Sistema de cálculo</span><select id="directDebtSystem"><option value="fixed_installment">Sem juros / parcela fixa</option><option value="price">Price</option><option value="sac">SAC</option><option value="manual">Manual</option></select></label>' +
        '<label class="field"><span>Total de parcelas</span><input id="directDebtInstallmentsTotal" type="number" min="1" step="1" value="12"></label>' +
        '<label class="field"><span>Parcelas já pagas</span><input id="directDebtInstallmentsPaid" type="number" min="0" step="1" value="0"></label>' +
        '<label class="field"><span>Valor da parcela manual</span><input id="directDebtManualPayment" type="number" min="0" step="0.01" placeholder="Use quando souber o valor exato"></label>' +
        '<label class="field"><span>Saldo devedor atual</span><input id="directDebtCurrentBalance" type="number" min="0" step="0.01" placeholder="Opcional"></label>' +
        '<label class="field"><span>Primeira parcela</span><input id="directDebtFirstPayment" type="date"></label>' +
        '<label class="field"><span>Dia de vencimento</span><input id="directDebtDueDay" type="number" min="1" max="31"></label>' +
        '<label class="field"><span>Observações</span><textarea id="directDebtNotes" placeholder="Detalhes opcionais"></textarea></label>' +
      '</div>' +
      '<div class="cockpit-debt-direct-summary">' +
        '<div class="mini-result"><span>Parcela estimada</span><b id="directDebtPreviewPayment">R$ 0,00</b></div>' +
        '<div class="mini-result"><span>Saldo base</span><b id="directDebtPreviewBase">R$ 0,00</b></div>' +
        '<div class="mini-result"><span>Prazo restante</span><b id="directDebtPreviewTerm">0 meses</b></div>' +
      '</div>' +
      '<div class="split" style="margin-top:14px">' +
        '<button class="btn primary" id="saveDirectDebt" type="button">Salvar dívida</button>' +
        '<button class="btn ghost" id="clearDirectDebt" type="button">Limpar</button>' +
      '</div>';

    return panel;
  }

  function ensureDebtListPanel(workspace) {
    let list = byId("debtListPanel");

    if (!list) {
      list = document.createElement("div");
      list.id = "debtListPanel";
      list.className = "panel statement-debts";
      list.innerHTML =
        '<div class="panel-head"><div><h2>Dívidas ativas e parcelas futuras</h2><p>Obrigações que impactam seu fluxo de caixa.</p></div></div>' +
        '<div id="debtList" class="list"></div>';
    }

    if (list.parentNode !== workspace) workspace.appendChild(list);
    list.style.marginTop = "0";
  }

  function ensureDebtFormVisible() {
    injectDebtDirectCss();

    const section = createDebtSectionIfNeeded();
    if (!section) return;

    const workspace = q(".cockpit-debt-workspace", section);
    if (!workspace) return;

    let directForm = byId("debtDirectFormPanel");

    if (!directForm) {
      directForm = buildDirectDebtForm();
      workspace.insertBefore(directForm, workspace.firstChild);
    } else if (directForm.parentNode !== workspace) {
      workspace.insertBefore(directForm, workspace.firstChild);
    }

    directForm.style.display = "block";

    const oldForm = byId("debtFormPanel");
    if (oldForm) oldForm.style.display = "none";

    ensureDebtListPanel(workspace);
    bindDirectDebtForm();
    setDefaultDirectDebtDates();
    updateDebtPreview();
  }

  function setDefaultDirectDebtDates() {
    const firstPayment = byId("directDebtFirstPayment");
    if (firstPayment && !firstPayment.value) firstPayment.value = todaySafe();

    const dueDay = byId("directDebtDueDay");
    if (dueDay && !dueDay.value) dueDay.value = String(new Date().getDate());

    const total = byId("directDebtInstallmentsTotal");
    if (total && !total.value) total.value = "12";

    const paid = byId("directDebtInstallmentsPaid");
    if (paid && !paid.value) paid.value = "0";
  }

  function formatMoney(value) {
    return Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }

  function directDebtBaseValue() {
    const financed = numSafe(getValue("directDebtFinanced"));
    const original = numSafe(getValue("directDebtOriginal"));
    const down = numSafe(getValue("directDebtDownPayment"));
    return financed || Math.max(0, original - down) || original;
  }

  function estimateDirectPayment() {
    const manual = numSafe(getValue("directDebtManualPayment"));
    if (manual > 0) return manual;

    const base = directDebtBaseValue();
    const total = Math.max(1, Math.floor(numSafe(getValue("directDebtInstallmentsTotal")) || 1));
    const paid = Math.max(0, Math.floor(numSafe(getValue("directDebtInstallmentsPaid")) || 0));
    const remaining = Math.max(1, total - paid);

    const annualOrMonthlyRate = numSafe(getValue("directDebtInterest")) / 100;
    const period = getValue("directDebtRatePeriod") || "monthly";
    const monthlyRate = period === "annual"
      ? Math.pow(1 + annualOrMonthlyRate, 1 / 12) - 1
      : annualOrMonthlyRate;

    if (!base) return 0;

    if (monthlyRate > 0) {
      return base * (monthlyRate * Math.pow(1 + monthlyRate, remaining)) / (Math.pow(1 + monthlyRate, remaining) - 1);
    }

    return base / remaining;
  }

  function updateDebtPreview() {
    const base = directDebtBaseValue();
    const total = Math.max(1, Math.floor(numSafe(getValue("directDebtInstallmentsTotal")) || 1));
    const paid = Math.max(0, Math.floor(numSafe(getValue("directDebtInstallmentsPaid")) || 0));
    const remaining = Math.max(0, total - paid);

    const paymentNode = byId("directDebtPreviewPayment");
    const baseNode = byId("directDebtPreviewBase");
    const termNode = byId("directDebtPreviewTerm");

    if (paymentNode) paymentNode.textContent = formatMoney(estimateDirectPayment());
    if (baseNode) baseNode.textContent = formatMoney(base);
    if (termNode) termNode.textContent = remaining + " meses";
  }

  function debtFromDirectForm() {
    const now = new Date().toISOString();
    const original = numSafe(getValue("directDebtOriginal"));
    const financed = numSafe(getValue("directDebtFinanced"));
    const down = numSafe(getValue("directDebtDownPayment"));
    const current = numSafe(getValue("directDebtCurrentBalance"));
    const base = directDebtBaseValue();

    return {
      id: uidSafe(),
      name: getValue("directDebtName").trim(),
      debtType: getValue("directDebtType") || "other",
      creditor: getValue("directDebtCreditor").trim(),
      original: original || base,
      financed: financed || base,
      downPayment: down,
      interestRate: numSafe(getValue("directDebtInterest")),
      ratePeriod: getValue("directDebtRatePeriod") || "monthly",
      fees: 0,
      insurance: 0,
      totalInstallments: Math.max(1, Math.floor(numSafe(getValue("directDebtInstallmentsTotal")) || 1)),
      paidInstallments: Math.max(0, Math.floor(numSafe(getValue("directDebtInstallmentsPaid")) || 0)),
      startDate: getValue("directDebtFirstPayment") || todaySafe(),
      firstPaymentDate: getValue("directDebtFirstPayment") || todaySafe(),
      dueDay: Math.max(1, Math.min(31, Math.floor(numSafe(getValue("directDebtDueDay")) || 1))),
      amortizationSystem: getValue("directDebtSystem") || "fixed_installment",
      manualPayment: numSafe(getValue("directDebtManualPayment")),
      currentBalance: current || base,
      notes: getValue("directDebtNotes"),
      status: "active",
      createdAt: now,
      updatedAt: now
    };
  }

  function clearDirectDebtForm() {
    [
      "directDebtName",
      "directDebtCreditor",
      "directDebtOriginal",
      "directDebtFinanced",
      "directDebtDownPayment",
      "directDebtInterest",
      "directDebtManualPayment",
      "directDebtCurrentBalance",
      "directDebtNotes"
    ].forEach(function (id) {
      setValue(id, "");
    });

    setValue("directDebtType", "real_estate_financing");
    setValue("directDebtRatePeriod", "monthly");
    setValue("directDebtSystem", "fixed_installment");
    setValue("directDebtInstallmentsTotal", "12");
    setValue("directDebtInstallmentsPaid", "0");
    setValue("directDebtFirstPayment", todaySafe());
    setValue("directDebtDueDay", String(new Date().getDate()));

    updateDebtPreview();
  }

  function saveDirectDebt() {
    const stateObj = getStateSafe();
    if (!stateObj) {
      alert("Não foi possível acessar os dados do app. Recarregue a página e tente novamente.");
      return;
    }

    const debt = debtFromDirectForm();

    if (!debt.name) {
      alert("Informe o nome da dívida.");
      return;
    }

    if (!debt.original && !debt.financed && !debt.currentBalance) {
      alert("Informe o valor original ou financiado da dívida.");
      return;
    }

    stateObj.debts = Array.isArray(stateObj.debts) ? stateObj.debts : [];
    stateObj.debts.push(debt);

    clearDirectDebtForm();

    safe(function () { renderDebts(selectedMonthSafe()); });
    safe(function () { renderDashboard(selectedMonthSafe()); });
    safe(function () { renderTxList(selectedMonthSafe()); });
    safe(function () { render(); });
    safe(function () { saveNow(); });
    safe(function () { toast("Dívida cadastrada. Parcelas atualizadas no Painel, Extrato e Fluxo de Caixa."); });

    ensureDebtFormVisible();
    forceOpenDebtsV5();
  }

  function bindDirectDebtForm() {
    const save = byId("saveDirectDebt");
    if (save && save.dataset.bound !== "1") {
      save.dataset.bound = "1";
      save.addEventListener("click", saveDirectDebt);
    }

    const clear = byId("clearDirectDebt");
    if (clear && clear.dataset.bound !== "1") {
      clear.dataset.bound = "1";
      clear.addEventListener("click", clearDirectDebtForm);
    }

    [
      "directDebtOriginal",
      "directDebtFinanced",
      "directDebtDownPayment",
      "directDebtInterest",
      "directDebtRatePeriod",
      "directDebtInstallmentsTotal",
      "directDebtInstallmentsPaid",
      "directDebtManualPayment",
      "directDebtCurrentBalance",
      "directDebtSystem"
    ].forEach(function (id) {
      const node = byId(id);
      if (node && node.dataset.previewBound !== "1") {
        node.dataset.previewBound = "1";
        node.addEventListener("input", updateDebtPreview);
        node.addEventListener("change", updateDebtPreview);
      }
    });
  }

  function forceOpenDebtsV5() {
    ensureDebtFormVisible();

    const section = byId("debts");
    if (!section) return;

    qa(".section").forEach(function (node) {
      node.classList.remove("active");
      node.style.display = "none";
    });

    section.classList.add("active");
    section.style.display = "block";

    qa("#nav button, .nav-hub button, .mobile-nav button").forEach(function (button) {
      const text = (button.textContent || "").toLowerCase();
      const isDebt = text.includes("dívida") || text.includes("divida") || button.dataset.view === "debts";
      button.classList.toggle("active", isDebt);
    });

    const pageTitle = byId("pageTitle");
    if (pageTitle) pageTitle.textContent = "Dívidas";

    const monthHint = byId("monthHint");
    if (monthHint) monthHint.textContent = "Cadastro e acompanhamento de parcelas";
  }

  function patchDebtNavV5() {
    qa("#nav button, .nav-hub button, .desktop-nav button, .grouped-nav button, .mobile-nav button").forEach(function (button) {
      const text = (button.textContent || "").toLowerCase();

      if (text.includes("dívida") || text.includes("divida")) {
        button.dataset.view = "debts";
        button.dataset.debtNav = "1";
      }
    });
  }

  function patchDebtClickV5() {
    if (window.__cockpitDebtDirectClickV5) return;
    window.__cockpitDebtDirectClickV5 = true;

    document.addEventListener("click", function (event) {
      const button = event.target.closest("button");
      if (!button) return;

      const text = (button.textContent || "").toLowerCase();
      const action = button.dataset.registerAction;
      const isDebtNav = button.dataset.debtNav === "1" || button.dataset.view === "debts";
      const isDebtSheet = action === "debt" || ((text.includes("dívida") || text.includes("divida") || text.includes("financiamento")) && button.closest("#registerActionSheet"));

      if (!isDebtNav && !isDebtSheet) return;

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();

      const sheet = byId("registerActionSheet");
      if (sheet) {
        sheet.classList.add("hidden");
        sheet.setAttribute("aria-hidden", "true");
      }

      forceOpenDebtsV5();
    }, true);
  }

  function addDebtOptionToSheetV5() {
    const grid = q("#registerActionSheet .sheet-grid");
    if (!grid || q('[data-register-action="debt"]', grid)) return;

    const button = document.createElement("button");
    button.type = "button";
    button.dataset.registerAction = "debt";
    button.innerHTML = '<span>⚠</span><b>Dívida / financiamento</b><small>Parcelas, empréstimos e financiamentos</small>';
    grid.appendChild(button);
  }

  function bootDebtDirectV5() {
    injectDebtDirectCss();
    patchDebtNavV5();
    ensureDebtFormVisible();
    patchDebtClickV5();
    addDebtOptionToSheetV5();
  }

  bootDebtDirectV5();
  setTimeout(bootDebtDirectV5, 300);
  setTimeout(bootDebtDirectV5, 900);
  setTimeout(bootDebtDirectV5, 1800);
  setTimeout(bootDebtDirectV5, 3000);

  document.addEventListener("click", function () {
    setTimeout(bootDebtDirectV5, 120);
  }, true);
})();


/* ===== DESKTOP SIDEBAR ACCOUNT PATCH v6 =====
   Corrige:
   - os itens da seção "Conta" ficam escondidos no desktop;
   - sidebar cortava Perfil, Configurações, Categorias e Ajuda.
*/
(function () {
  "use strict";

  const FLAG = "cockpit-desktop-sidebar-account-v6";
  if (window[FLAG]) return;
  window[FLAG] = true;

  function q(selector, root = document) {
    return root.querySelector(selector);
  }

  function qa(selector, root = document) {
    return Array.from(root.querySelectorAll(selector));
  }

  function byId(id) {
    return document.getElementById(id);
  }

  function injectCss() {
    if (byId("cockpit-desktop-sidebar-account-v6-css")) return;

    const css = `
@media (min-width: 781px) {
  .sidebar {
    overflow-y: auto !important;
    overflow-x: hidden !important;
    scrollbar-width: thin !important;
    scrollbar-color: rgba(76,201,255,.38) rgba(255,255,255,.04) !important;
    padding-bottom: 14px !important;
  }

  .sidebar::-webkit-scrollbar {
    width: 6px !important;
  }

  .sidebar::-webkit-scrollbar-track {
    background: rgba(255,255,255,.04) !important;
    border-radius: 999px !important;
  }

  .sidebar::-webkit-scrollbar-thumb {
    background: rgba(76,201,255,.38) !important;
    border-radius: 999px !important;
  }

  .nav-hub,
  .desktop-nav,
  .grouped-nav,
  #nav {
    overflow: visible !important;
    padding-bottom: 10px !important;
  }

  .nav-section:last-child,
  .nav-label:last-of-type {
    margin-bottom: 4px !important;
  }

  .nav-hub button:last-child,
  .desktop-nav button:last-child,
  .grouped-nav button:last-child,
  #nav button:last-child {
    margin-bottom: 8px !important;
  }

  .side-footer {
    display: none !important;
  }
}

/* Em notebooks mais baixos, compacta um pouco mais a navegação */
@media (min-width: 781px) and (max-height: 760px) {
  .sidebar {
    padding-top: 8px !important;
    padding-bottom: 10px !important;
  }

  .nav-label {
    margin-top: 6px !important;
    margin-bottom: 2px !important;
  }

  .nav-hub button,
  .desktop-nav button,
  .grouped-nav button,
  #nav button {
    height: 28px !important;
    min-height: 28px !important;
  }

  .status-card {
    min-height: 30px !important;
  }
}
`;

    const style = document.createElement("style");
    style.id = "cockpit-desktop-sidebar-account-v6-css";
    style.textContent = css;
    document.head.appendChild(style);
  }

  function scrollActiveIntoView() {
    const sidebar = q(".sidebar");
    const active =
      q("#nav button.active") ||
      q(".nav-hub button.active") ||
      q(".desktop-nav button.active") ||
      q(".grouped-nav button.active");

    if (!sidebar || !active) return;

    const sidebarRect = sidebar.getBoundingClientRect();
    const activeRect = active.getBoundingClientRect();

    if (activeRect.bottom > sidebarRect.bottom || activeRect.top < sidebarRect.top) {
      active.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }

  function makeAccountItemsReachable() {
    const sidebar = q(".sidebar");
    if (!sidebar) return;

    sidebar.style.overflowY = "auto";
    sidebar.style.overflowX = "hidden";

    qa("#nav button, .nav-hub button, .desktop-nav button, .grouped-nav button").forEach(function (button) {
      if (button.dataset.sidebarScrollBound === "1") return;
      button.dataset.sidebarScrollBound = "1";
      button.addEventListener("click", function () {
        setTimeout(scrollActiveIntoView, 120);
      });
    });
  }

  function run() {
    injectCss();
    makeAccountItemsReachable();
    setTimeout(scrollActiveIntoView, 250);
  }

  run();
  setTimeout(run, 500);
  setTimeout(run, 1500);

  window.addEventListener("resize", function () {
    setTimeout(run, 150);
  });

  document.addEventListener("click", function () {
    setTimeout(run, 120);
  }, true);
})();

