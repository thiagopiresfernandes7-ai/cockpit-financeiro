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
