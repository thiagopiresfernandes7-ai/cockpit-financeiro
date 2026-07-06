/*
  Cockpit Financeiro — versão estabilizada 2026-07
  Substituição consolidada do hotfix.js.

  Objetivo:
  - Unificar navegação, Dívidas, Dividendos, Simulador, mobile e fatura/competência.
  - Evitar pilha v10 + v11 + novos remendos.
  - Salvar localmente antes de tentar sincronização remota.

  Observação honesta:
  - Este hotfix estabiliza o front-end estático atual.
  - RLS, políticas LGPD formais e criptografia real ponta a ponta no Supabase exigem ajuste definitivo de banco/schema.
*/
(function () {
  "use strict";

  const VERSION = "stable-2026-07";
  const FLAG = "cockpitFinanceiroStable202607";
  if (window[FLAG]) return;
  window[FLAG] = true;

  const VIEW_TITLES = {
    dashboard: ["Início", "Resumo do mês"],
    register: ["Extrato", "Movimentações do mês"],
    analysis: ["Análise", "Diagnóstico financeiro"],
    wallet: ["Investimentos", "Carteira e patrimônio"],
    debts: ["Dívidas", "Parcelas, financiamentos e obrigações"],
    dividends: ["Dividendos", "Rendimentos e renda passiva"],
    simulator: ["Simulador", "Liberdade financeira"],
    projection: ["Fluxo de caixa", "Projeção dos próximos meses"],
    decisions: ["Decisões", "Compras e escolhas financeiras"],
    budget: ["Orçamento", "Limites e planejamento"],
    plan: ["Orçamento", "Limites e planejamento"],
    profile: ["Perfil", "Dados da conta"],
    settings: ["Configurações", "Preferências do app"],
    categories: ["Categorias", "Organização dos lançamentos"],
    help: ["Ajuda", "Tutoriais e suporte"],
    security: ["Segurança e Privacidade", "Proteção dos dados financeiros"],
    more: ["Mais", "Recursos adicionais"]
  };

  const CUSTOM_VIEWS = new Set(["debts", "dividends", "simulator", "security", "more"]);
  let internalView = "dashboard";
  let debtEditingId = null;
  let dividendEditingId = null;
  let txFilterRequested = null;

  function q(selector, root = document) { return root.querySelector(selector); }
  function qa(selector, root = document) { return Array.from(root.querySelectorAll(selector)); }
  function byId(id) { return document.getElementById(id); }
  function noop() {}
  function safe(fn, fallback) {
    try { return fn(); } catch (error) { console.warn("[Cockpit " + VERSION + "]", error); return fallback; }
  }
  function esc(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (char) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char];
    });
  }
  function num(value) {
    if (typeof value === "number") return Number.isFinite(value) ? value : 0;
    const raw = String(value == null ? "" : value).trim().replace(/\./g, "").replace(",", ".");
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  function positiveNum(value) { return Math.max(0, num(value)); }
  function intNum(value, fallback) {
    const n = Math.floor(num(value));
    return Number.isFinite(n) ? n : fallback;
  }
  function brl(value) {
    return Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }
  function today() { return new Date().toISOString().slice(0, 10); }
  function nowIso() { return new Date().toISOString(); }
  function uid(prefix) { return (prefix || "id") + "_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 10); }
  function monthFromDate(value) { return String(value || "").slice(0, 7); }
  function normalizeMonth(value) {
    const text = String(value || "").trim();
    if (/^\d{4}-\d{2}$/.test(text)) return text;
    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text.slice(0, 7);
    return "";
  }
  function selectedYm() {
    return safe(function () { return typeof selectedMonth === "function" ? selectedMonth() : ""; }, "") ||
      (byId("monthPicker") && byId("monthPicker").value) ||
      today().slice(0, 7);
  }
  function addMonthsSafe(ym, delta) {
    return safe(function () {
      if (typeof addMonths === "function") return addMonths(ym, delta);
      throw new Error("fallback");
    }, (function () {
      const parts = String(ym || selectedYm()).split("-");
      const date = new Date(Number(parts[0]), Number(parts[1]) - 1 + delta, 1);
      return date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0");
    })());
  }
  function monthLabel(ym) {
    return safe(function () {
      if (typeof monthName === "function") return monthName(ym);
      throw new Error("fallback");
    }, (function () {
      if (!/^\d{4}-\d{2}$/.test(String(ym || ""))) return ym || "";
      const d = new Date(Number(ym.slice(0, 4)), Number(ym.slice(5, 7)) - 1, 1);
      return d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
    })());
  }
  function isMobile() {
    return window.innerWidth <= 900 || window.matchMedia("(max-width: 900px)").matches;
  }
  function getUserId() {
    return safe(function () { return (window.user && window.user.id) || (typeof user !== "undefined" && user && user.id) || "local"; }, "local") || "local";
  }
  function getState() {
    const existing = safe(function () { return window.state || (typeof state !== "undefined" ? state : null); }, null);
    if (existing && typeof existing === "object") {
      normalizeState(existing);
      return existing;
    }
    window.state = defaultState();
    safe(function () { state = window.state; });
    return window.state;
  }
  function defaultState() {
    return {
      transactions: [], investments: [], debts: [], dividends: [], futureItems: [], categories: [],
      settings: {}, security: {}, auditEvents: []
    };
  }
  function normalizeState(st) {
    if (!st || typeof st !== "object") return;
    ["transactions", "investments", "debts", "dividends", "futureItems", "categories", "auditEvents"].forEach(function (key) {
      if (!Array.isArray(st[key])) st[key] = [];
    });
    if (!st.settings || typeof st.settings !== "object") st.settings = {};
    if (!st.security || typeof st.security !== "object") st.security = {};
  }
  function localStateKeys() {
    const userId = getUserId();
    return ["cockpit_state_" + userId, "cockpit_state_local", "cockpit_state_backup"];
  }
  function setSyncStatus(text) {
    const el = byId("syncStatus") || byId("saveStatus") || q("[data-sync-status]");
    if (el) el.textContent = text;
  }
  function saveLocalSnapshot(reason) {
    const st = getState();
    const text = JSON.stringify(st);
    localStateKeys().forEach(function (key) {
      safe(function () { localStorage.setItem(key, text); });
    });
    safe(function () {
      localStorage.setItem("cockpit_last_local_save", JSON.stringify({ at: nowIso(), reason: reason || "manual", version: VERSION }));
    });
    setSyncStatus("Salvo neste aparelho");
    return true;
  }
  function restoreLocalIfNeeded() {
    const st = getState();
    const hasUsefulData = ["transactions", "investments", "debts", "dividends", "futureItems"].some(function (key) {
      return Array.isArray(st[key]) && st[key].length;
    });
    if (hasUsefulData) return;

    for (const key of localStateKeys()) {
      const raw = safe(function () { return localStorage.getItem(key); }, null);
      if (!raw) continue;
      const parsed = safe(function () { return JSON.parse(raw); }, null);
      if (!parsed || typeof parsed !== "object") continue;
      normalizeState(parsed);
      Object.assign(st, parsed);
      window.state = st;
      safe(function () { state = st; });
      break;
    }
  }
  function audit(eventName, extra) {
    const st = getState();
    const evt = {
      id: uid("audit"),
      event: eventName,
      at: nowIso(),
      version: VERSION,
      device: navigator.userAgent ? navigator.userAgent.slice(0, 120) : "browser"
    };
    if (extra && typeof extra === "object") {
      Object.keys(extra).forEach(function (key) {
        if (["value", "amount", "balance", "description", "name", "notes"].includes(key)) return;
        evt[key] = extra[key];
      });
    }
    st.auditEvents.push(evt);
    if (st.auditEvents.length > 100) st.auditEvents = st.auditEvents.slice(-100);
  }

  function injectCss() {
    if (byId("cockpit-stable-2026-07-css")) return;
    const css = `
      :root{--cockpit-cyan:#36e4c6;--cockpit-blue:#4cc9ff;--cockpit-gold:#f5c451;--cockpit-danger:#ff6b7a;--cockpit-ok:#38f2a6;}
      .cockpit-hidden{display:none!important;}
      .cockpit-grid-2{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:14px;align-items:start;}
      .cockpit-grid-3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;}
      .cockpit-kpis-4{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-bottom:14px;}
      .cockpit-kpi{border:1px solid rgba(142,213,255,.18);background:radial-gradient(circle at 90% 0%,rgba(54,228,198,.10),transparent 38%),linear-gradient(180deg,rgba(26,45,71,.84),rgba(13,26,45,.90));border-radius:18px;padding:14px;box-shadow:0 16px 50px rgba(0,0,0,.14);}
      .cockpit-kpi span{display:block;font-size:9px;letter-spacing:.13em;text-transform:uppercase;color:var(--muted,#7f94ae);font-weight:1000;}
      .cockpit-kpi b{display:block;margin-top:8px;font-family:"JetBrains Mono",ui-monospace,Menlo,monospace;font-size:22px;color:var(--text,#e7f1ff);letter-spacing:-.04em;}
      .cockpit-kpi small{display:block;margin-top:4px;color:var(--soft,#bfd0e5);font-size:10px;line-height:1.35;}
      .cockpit-empty{border:1px dashed rgba(142,213,255,.20);background:rgba(255,255,255,.025);border-radius:16px;padding:18px;color:var(--soft,#bfd0e5);line-height:1.45;}
      .cockpit-note{border:1px solid rgba(76,201,255,.14);background:rgba(76,201,255,.055);color:var(--soft,#bfd0e5);border-radius:13px;padding:10px 12px;font-size:11px;line-height:1.45;margin-top:10px;}
      .cockpit-warning{border-color:rgba(245,196,81,.24);background:rgba(245,196,81,.08);}
      .cockpit-danger{border-color:rgba(255,107,122,.24);background:rgba(255,107,122,.07);}
      .cockpit-billing-badge{display:inline-flex;align-items:center;gap:4px;margin-left:6px;padding:2px 7px;border-radius:999px;background:rgba(245,196,81,.12);border:1px solid rgba(245,196,81,.22);color:var(--cockpit-gold);font-size:9px;font-weight:900;letter-spacing:.03em;}
      .cockpit-actions{display:flex;gap:8px;flex-wrap:wrap;align-items:center;justify-content:flex-end;}
      .cockpit-mini-btn{border:1px solid rgba(142,213,255,.16);background:rgba(255,255,255,.04);color:var(--soft,#bfd0e5);border-radius:999px;padding:7px 10px;font-size:11px;font-weight:800;cursor:pointer;}
      .cockpit-mini-btn:hover{border-color:rgba(76,201,255,.34);color:var(--text,#e7f1ff);}
      .cockpit-more-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;}
      .cockpit-more-card{display:block;text-align:left;border:1px solid rgba(142,213,255,.16);background:linear-gradient(180deg,rgba(26,45,71,.72),rgba(13,26,45,.82));border-radius:18px;padding:15px;color:var(--text,#e7f1ff);cursor:pointer;}
      .cockpit-more-card b{display:block;font-size:14px;margin-bottom:4px;}
      .cockpit-more-card small{display:block;color:var(--soft,#bfd0e5);line-height:1.35;}
      .cockpit-section-page{animation:cockpitFade .12s ease-out;}
      @keyframes cockpitFade{from{opacity:.65;transform:translateY(4px)}to{opacity:1;transform:none}}
      .cockpit-annual-list{max-height:360px;overflow:auto;padding-right:4px;}
      .cockpit-legal-text h3{margin:16px 0 6px;font-size:15px}.cockpit-legal-text p{color:var(--soft,#bfd0e5);line-height:1.55;font-size:13px;}
      @media(min-width:901px){.sidebar{overflow-y:auto!important;overflow-x:hidden!important;scrollbar-width:thin!important}.side-footer,#desktopGlobalAddBtn{display:none!important}#appView.app,.app{grid-template-columns:198px minmax(0,1fr)!important}.top{min-height:52px!important;height:52px!important}.content{height:calc(100vh - 52px)!important;overflow:auto!important}#userMenuButton,.user-avatar{width:38px!important;height:38px!important;border-radius:50%!important;overflow:hidden!important;padding:0!important}#userMenuButton img,.user-avatar img{width:38px!important;height:38px!important;object-fit:cover!important;border-radius:50%!important}}
      @media(max-width:900px){html.cockpit-mobile-stable,html.cockpit-mobile-stable body{overflow-x:hidden!important}html.cockpit-mobile-stable .top{position:relative!important;top:auto!important;min-height:54px!important;height:54px!important;padding:7px 12px!important;overflow:visible!important}html.cockpit-mobile-stable .top .title,html.cockpit-mobile-stable #pageTitle,html.cockpit-mobile-stable #monthHint{display:none!important}html.cockpit-mobile-stable .actions{width:100%!important;justify-content:flex-end!important;gap:8px!important}html.cockpit-mobile-stable .monthbar #prevMonth,html.cockpit-mobile-stable .monthbar #nextMonth,html.cockpit-mobile-stable .monthbar #todayBtn,html.cockpit-mobile-stable #exportBtn,html.cockpit-mobile-stable #topGlobalAddBtn,html.cockpit-mobile-stable .statement-desktop-actions{display:none!important}html.cockpit-mobile-stable .monthbar input{width:158px!important;min-width:158px!important;max-width:158px!important;height:34px!important;text-align:center!important;font-size:13px!important}html.cockpit-mobile-stable #userMenuButton,html.cockpit-mobile-stable .user-avatar{width:40px!important;height:40px!important;min-width:40px!important;max-width:40px!important;border-radius:50%!important;overflow:hidden!important;padding:0!important}html.cockpit-mobile-stable #userMenuButton img,html.cockpit-mobile-stable .user-avatar img{width:40px!important;height:40px!important;object-fit:cover!important;border-radius:50%!important}html.cockpit-mobile-stable .content{padding:10px 12px calc(112px + env(safe-area-inset-bottom))!important;max-width:none!important}html.cockpit-mobile-stable #dashboard>.page-head,html.cockpit-mobile-stable #dashboard .dashboard-head{display:none!important}html.cockpit-mobile-stable #dashboard .dashboard-kpis{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:10px!important;margin:0!important}html.cockpit-mobile-stable #dashboard .dashboard-kpis>*:nth-child(n+5),html.cockpit-mobile-stable #dashboard .dashboard-grid-12,html.cockpit-mobile-stable #dashboard .dashboard-grid-12>*{display:none!important}html.cockpit-mobile-stable .mobile-nav{left:10px!important;right:10px!important;bottom:calc(8px + env(safe-area-inset-bottom))!important;min-height:64px!important;padding:6px!important;border-radius:24px!important}html.cockpit-mobile-stable .global-add-btn{width:52px!important;height:52px!important;right:18px!important;left:auto!important;bottom:calc(84px + env(safe-area-inset-bottom))!important;transform:none!important;border-radius:18px!important}.cockpit-grid-2,.cockpit-grid-3,.cockpit-kpis-4,.cockpit-more-grid{grid-template-columns:1fr!important;gap:10px}.cockpit-kpi b{font-size:19px}.cockpit-actions{justify-content:flex-start}.cockpit-section-page .page-head{margin-bottom:12px!important}}
    `;
    const style = document.createElement("style");
    style.id = "cockpit-stable-2026-07-css";
    style.textContent = css;
    document.head.appendChild(style);
  }

  function setTitle(view) {
    const pair = VIEW_TITLES[view] || VIEW_TITLES.dashboard;
    const title = byId("pageTitle");
    const hint = byId("monthHint");
    if (title) title.textContent = pair[0];
    if (hint) hint.textContent = pair[1];
    document.title = pair[0] === "Início" ? "Cockpit Financeiro" : pair[0] + " • Cockpit Financeiro";
  }
  function normalizeViewName(view, text) {
    const raw = String(view || "").trim().toLowerCase();
    const label = String(text || "").toLowerCase();
    if (["dashboard", "home", "inicio", "início"].includes(raw) || label.includes("início") || label.includes("inicio")) return "dashboard";
    if (["register", "extract", "extrato"].includes(raw) || label.includes("extrato")) return "register";
    if (["analysis", "analise", "análise"].includes(raw) || label.includes("análise") || label.includes("analise")) return "analysis";
    if (["wallet", "investments", "patrimonio", "patrimônio"].includes(raw) || label.includes("investimento") || label.includes("patrimônio") || label.includes("patrimonio")) return "wallet";
    if (["debts", "debt", "dividas", "dívidas"].includes(raw) || label.includes("dívida") || label.includes("divida")) return "debts";
    if (["dividends", "dividendos", "income-passive"].includes(raw) || label.includes("dividendo") || label.includes("rendimento")) return "dividends";
    if (["simulator", "simulador", "simulation"].includes(raw) || label.includes("simulador")) return "simulator";
    if (["projection", "cashflow", "fluxo"].includes(raw) || label.includes("fluxo")) return "projection";
    if (["decisions", "decision"].includes(raw) || label.includes("decis")) return "decisions";
    if (["budget", "plan", "orcamento", "orçamento"].includes(raw) || label.includes("orçamento") || label.includes("orcamento")) return byId("budget") ? "budget" : "plan";
    if (["profile", "perfil"].includes(raw) || label.includes("perfil")) return "profile";
    if (["settings", "configuracoes", "configurações"].includes(raw) || label.includes("configura")) return "settings";
    if (["categories", "categorias"].includes(raw) || label.includes("categoria")) return "categories";
    if (["help", "ajuda"].includes(raw) || label.includes("ajuda")) return "help";
    if (["security", "privacy", "seguranca", "segurança"].includes(raw) || label.includes("segurança") || label.includes("privacidade")) return "security";
    if (["more", "mais"].includes(raw) || label.trim() === "mais") return "more";
    return raw;
  }
  function normalizeNavigationButtons() {
    qa("button[data-view], [data-view]").forEach(function (button) {
      const normalized = normalizeViewName(button.dataset.view, button.textContent);
      if (normalized) button.dataset.view = normalized;
    });
  }
  function markNavActive(view) {
    qa("#nav button, .nav-hub button, .desktop-nav button, .grouped-nav button, .mobile-nav button, button[data-view]").forEach(function (button) {
      const normalized = normalizeViewName(button.dataset.view, button.textContent);
      button.classList.toggle("active", normalized === view || (view !== "more" && normalized === "more" && CUSTOM_VIEWS.has(view) && isMobile()));
    });
  }
  function scrollTopNow() {
    const content = q(".content");
    if (content) {
      try { content.scrollTo({ top: 0, behavior: "instant" }); } catch (_) { content.scrollTop = 0; }
    }
    try { window.scrollTo({ top: 0, behavior: "instant" }); } catch (_) { window.scrollTo(0, 0); }
  }
  function showOnly(view) {
    qa(".section").forEach(function (section) {
      const active = section.id === view;
      section.classList.toggle("active", active);
      section.style.display = active ? "block" : "none";
      section.setAttribute("aria-hidden", active ? "false" : "true");
    });
    internalView = view;
    setTitle(view);
    markNavActive(view);
    fixMobileChrome();
    if (isMobile()) scrollTopNow();
  }
  function ensureSection(id, html) {
    let section = byId(id);
    if (section) {
      section.classList.add("section", "cockpit-section-page");
      return section;
    }
    const content = q(".content") || q("main") || document.body;
    section = document.createElement("section");
    section.id = id;
    section.className = "section cockpit-section-page";
    section.style.display = "none";
    section.innerHTML = html;
    content.appendChild(section);
    return section;
  }
  function openOriginalView(view) {
    view = normalizeViewName(view, "");
    const original = window.__cockpitOriginalSetViewStable || null;
    if (typeof original === "function" && !CUSTOM_VIEWS.has(view)) {
      safe(function () { original(view); });
      setTimeout(function () {
        if (byId(view)) showOnly(view);
        else { setTitle(view); markNavActive(view); fixMobileChrome(); }
        applyTxFilterIfNeeded();
      }, 60);
      return;
    }
    if (byId(view)) showOnly(view);
  }
  function openView(view) {
    view = normalizeViewName(view, "");
    if (view === "debts") { ensureDebtSection(); showOnly("debts"); renderDebtSection(); return; }
    if (view === "dividends") { ensureDividendsSection(); showOnly("dividends"); renderDividendSection(); return; }
    if (view === "simulator") { ensureSimulatorSection(); showOnly("simulator"); runSimulator(); return; }
    if (view === "security") { ensureSecuritySection(); showOnly("security"); renderSecuritySection(); return; }
    if (view === "more") { ensureMoreSection(); showOnly("more"); return; }
    openOriginalView(view);
  }
  function patchSetView() {
    if (!window.__cockpitOriginalSetViewStable && typeof window.setView === "function") {
      window.__cockpitOriginalSetViewStable = window.setView;
    }
    window.setView = function (view) { openView(view); };
    safe(function () { setView = window.setView; });
  }
  function interceptNavigation() {
    if (window.__cockpitStableNavigationBound) return;
    window.__cockpitStableNavigationBound = true;
    document.addEventListener("click", function (event) {
      const button = event.target.closest("[data-view]");
      if (!button) return;
      const view = normalizeViewName(button.dataset.view, button.textContent);
      if (!view) return;
      button.dataset.view = view;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      openView(view);
    }, true);
  }

  function debtPayment(debt) {
    const total = Math.max(1, Number(debt.totalInstallments || debt.installmentsTotal || 1));
    const paid = Math.max(0, Number(debt.paidInstallments || debt.installmentsPaid || 0));
    const remaining = Math.max(1, total - paid);
    const manual = Number(debt.manualPayment || debt.payment || 0);
    if (manual > 0) return manual;
    const balance = Number(debt.currentBalance || debt.financed || debt.original || 0);
    const system = String(debt.amortizationSystem || debt.system || "manual");
    const annualRate = String(debt.ratePeriod || "annual") === "annual" ? Number(debt.interestRate || 0) / 100 : 0;
    const monthlyRate = String(debt.ratePeriod || "annual") === "monthly" ? Number(debt.interestRate || 0) / 100 : Math.pow(1 + annualRate, 1 / 12) - 1;
    if (system === "price" && monthlyRate > 0) {
      return balance * (monthlyRate * Math.pow(1 + monthlyRate, remaining)) / (Math.pow(1 + monthlyRate, remaining) - 1);
    }
    if (system === "sac") return balance / remaining + balance * Math.max(0, monthlyRate);
    return balance / remaining;
  }
  function debtRemaining(debt) {
    return Math.max(0, Number(debt.totalInstallments || 0) - Number(debt.paidInstallments || 0));
  }
  function debtStatus(debt) {
    if (debt.status === "settled") return "Liquidada";
    const remaining = debtRemaining(debt);
    if (remaining <= 0) return "Finalizada";
    return "Ativa";
  }
  function debtTypeLabel(value) {
    const map = {
      real_estate_financing: "Financiamento imobiliário",
      vehicle_financing: "Financiamento de veículo",
      credit_card_installment: "Parcelamento de cartão",
      personal_loan: "Empréstimo pessoal",
      payroll_loan: "Consignado",
      consortium: "Consórcio",
      student_loan: "Financiamento estudantil",
      informal_debt: "Dívida informal",
      other: "Outra dívida"
    };
    return map[value] || value || "Dívida";
  }
  function ensureDebtSection() {
    const section = ensureSection("debts", `
      <div class="page-head"><div class="page-title"><div class="overline">Debt control</div><h1>Dívidas <span>& Financiamentos</span></h1><p>Financiamentos, empréstimos, parcelas futuras e obrigações que impactam seu fluxo de caixa.</p></div><div class="controls"><button class="btn primary" id="cockpitFillApartmentDebt" type="button">Preencher exemplo do apartamento</button></div></div>
      <div class="cockpit-kpis-4" id="cockpitDebtKpis"></div>
      <div class="cockpit-grid-2">
        <div class="panel cockpit-direct-form"><div class="panel-head"><div><h2 id="cockpitDebtFormTitle">Cadastrar dívida</h2><p>Salva primeiro neste aparelho. Se o Supabase falhar, o cadastro não será perdido.</p></div></div>
          <div class="form-grid">
            <label class="field"><span>Nome da dívida</span><input id="stableDebtName" placeholder="Ex.: financiamento do apartamento"></label>
            <label class="field"><span>Tipo da dívida</span><select id="stableDebtType"><option value="real_estate_financing">Financiamento imobiliário</option><option value="vehicle_financing">Financiamento de veículo</option><option value="credit_card_installment">Parcelamento de cartão</option><option value="personal_loan">Empréstimo pessoal</option><option value="payroll_loan">Consignado</option><option value="consortium">Consórcio</option><option value="student_loan">Financiamento estudantil</option><option value="informal_debt">Dívida informal</option><option value="other">Outra dívida</option></select></label>
            <label class="field"><span>Banco/loja/credor</span><input id="stableDebtCreditor" placeholder="Caixa, banco, loja ou pessoa"></label>
            <label class="field"><span>Valor original</span><input id="stableDebtOriginal" type="number" step="0.01" min="0"></label>
            <label class="field"><span>Valor financiado</span><input id="stableDebtFinanced" type="number" step="0.01" min="0"></label>
            <label class="field"><span>Entrada paga</span><input id="stableDebtDownPayment" type="number" step="0.01" min="0"></label>
            <label class="field"><span>Juros (%)</span><input id="stableDebtInterest" type="number" step="0.0001" min="0"></label>
            <label class="field"><span>Periodicidade dos juros</span><select id="stableDebtRatePeriod"><option value="annual">Ao ano</option><option value="monthly">Ao mês</option></select></label>
            <label class="field"><span>Sistema de cálculo</span><select id="stableDebtSystem"><option value="manual">Manual</option><option value="fixed_installment">Sem juros / parcela fixa</option><option value="price">Price</option><option value="sac">SAC</option></select></label>
            <label class="field"><span>Total de parcelas</span><input id="stableDebtTotal" type="number" min="1" step="1" value="12"></label>
            <label class="field"><span>Parcelas já pagas</span><input id="stableDebtPaid" type="number" min="0" step="1" value="0"></label>
            <label class="field"><span>Valor da parcela manual</span><input id="stableDebtManualPayment" type="number" step="0.01" min="0"></label>
            <label class="field"><span>Saldo devedor atual</span><input id="stableDebtCurrentBalance" type="number" step="0.01" min="0"></label>
            <label class="field"><span>Primeira parcela</span><input id="stableDebtFirstPayment" type="date"></label>
            <label class="field"><span>Dia de vencimento</span><input id="stableDebtDueDay" type="number" min="1" max="31"></label>
            <label class="field"><span>Observações</span><textarea id="stableDebtNotes" placeholder="Detalhes opcionais"></textarea></label>
          </div>
          <div class="split" style="margin-top:14px"><button class="btn primary" id="stableSaveDebt" type="button">Salvar dívida</button><button class="btn ghost" id="stableClearDebt" type="button">Limpar</button><button class="btn ghost hidden" id="stableCancelDebtEdit" type="button">Cancelar edição</button></div>
          <div class="cockpit-note">A dívida entra no fluxo mensal como parcela prevista. Para financiamento real, mantenha o saldo devedor atualizado.</div>
        </div>
        <div class="panel"><div class="panel-head"><div><h2>Dívidas ativas</h2><p>Saldo, parcelas restantes, vencimento e status.</p></div></div><div id="stableDebtList" class="list"></div></div>
      </div>
    `);
    bindDebtSection();
    return section;
  }
  function bindDebtSection() {
    const save = byId("stableSaveDebt");
    const clear = byId("stableClearDebt");
    const cancel = byId("stableCancelDebtEdit");
    const example = byId("cockpitFillApartmentDebt");
    if (save && save.dataset.bound !== "1") { save.dataset.bound = "1"; save.addEventListener("click", saveDebtFromStableForm); }
    if (clear && clear.dataset.bound !== "1") { clear.dataset.bound = "1"; clear.addEventListener("click", clearDebtForm); }
    if (cancel && cancel.dataset.bound !== "1") { cancel.dataset.bound = "1"; cancel.addEventListener("click", function () { debtEditingId = null; clearDebtForm(); }); }
    if (example && example.dataset.bound !== "1") { example.dataset.bound = "1"; example.addEventListener("click", fillApartmentDebtExample); }
    if (byId("stableDebtFirstPayment") && !byId("stableDebtFirstPayment").value) byId("stableDebtFirstPayment").value = today();
    if (byId("stableDebtDueDay") && !byId("stableDebtDueDay").value) byId("stableDebtDueDay").value = String(new Date().getDate());
  }
  function debtFromForm() {
    const original = positiveNum(byId("stableDebtOriginal") && byId("stableDebtOriginal").value);
    const financed = positiveNum(byId("stableDebtFinanced") && byId("stableDebtFinanced").value) || original;
    const currentBalance = positiveNum(byId("stableDebtCurrentBalance") && byId("stableDebtCurrentBalance").value) || financed;
    const total = Math.max(1, intNum(byId("stableDebtTotal") && byId("stableDebtTotal").value, 1));
    const paid = Math.max(0, Math.min(total, intNum(byId("stableDebtPaid") && byId("stableDebtPaid").value, 0)));
    const name = (byId("stableDebtName") && byId("stableDebtName").value.trim()) || "";
    if (!name) throw new Error("Informe o nome da dívida.");
    if (!financed && !currentBalance) throw new Error("Informe o valor financiado ou o saldo devedor atual.");
    return {
      id: debtEditingId || uid("debt"),
      name,
      debtType: (byId("stableDebtType") && byId("stableDebtType").value) || "other",
      creditor: (byId("stableDebtCreditor") && byId("stableDebtCreditor").value.trim()) || "",
      original,
      financed,
      downPayment: positiveNum(byId("stableDebtDownPayment") && byId("stableDebtDownPayment").value),
      interestRate: positiveNum(byId("stableDebtInterest") && byId("stableDebtInterest").value),
      ratePeriod: (byId("stableDebtRatePeriod") && byId("stableDebtRatePeriod").value) || "annual",
      amortizationSystem: (byId("stableDebtSystem") && byId("stableDebtSystem").value) || "manual",
      totalInstallments: total,
      paidInstallments: paid,
      manualPayment: positiveNum(byId("stableDebtManualPayment") && byId("stableDebtManualPayment").value),
      currentBalance,
      firstPaymentDate: (byId("stableDebtFirstPayment") && byId("stableDebtFirstPayment").value) || today(),
      startDate: (byId("stableDebtFirstPayment") && byId("stableDebtFirstPayment").value) || today(),
      dueDay: Math.max(1, Math.min(31, intNum(byId("stableDebtDueDay") && byId("stableDebtDueDay").value, 1))),
      notes: (byId("stableDebtNotes") && byId("stableDebtNotes").value) || "",
      status: "active",
      createdAt: debtEditingId ? undefined : nowIso(),
      updatedAt: nowIso()
    };
  }
  function saveDebtFromStableForm() {
    let debt;
    try { debt = debtFromForm(); } catch (error) { alert(error.message); return; }
    const st = getState();
    const index = st.debts.findIndex(function (item) { return item.id === debt.id; });
    if (index >= 0) debt.createdAt = st.debts[index].createdAt || nowIso();
    if (index >= 0) st.debts[index] = Object.assign({}, st.debts[index], debt);
    else st.debts.push(debt);
    audit(index >= 0 ? "debt_updated" : "debt_created", { debtType: debt.debtType });
    saveLocalSnapshot("debt");
    safe(function () { if (typeof saveNow === "function") Promise.resolve(saveNow()).catch(noop); });
    safe(function () { if (typeof render === "function") render(); });
    debtEditingId = null;
    clearDebtForm();
    renderDebtSection();
    setSyncStatus("Salvo neste aparelho");
  }
  function clearDebtForm() {
    ["stableDebtName", "stableDebtCreditor", "stableDebtOriginal", "stableDebtFinanced", "stableDebtDownPayment", "stableDebtInterest", "stableDebtManualPayment", "stableDebtCurrentBalance", "stableDebtNotes"].forEach(function (id) { const el = byId(id); if (el) el.value = ""; });
    if (byId("stableDebtType")) byId("stableDebtType").value = "real_estate_financing";
    if (byId("stableDebtRatePeriod")) byId("stableDebtRatePeriod").value = "annual";
    if (byId("stableDebtSystem")) byId("stableDebtSystem").value = "manual";
    if (byId("stableDebtTotal")) byId("stableDebtTotal").value = "12";
    if (byId("stableDebtPaid")) byId("stableDebtPaid").value = "0";
    if (byId("stableDebtFirstPayment")) byId("stableDebtFirstPayment").value = today();
    if (byId("stableDebtDueDay")) byId("stableDebtDueDay").value = String(new Date().getDate());
    if (byId("cockpitDebtFormTitle")) byId("cockpitDebtFormTitle").textContent = "Cadastrar dívida";
    if (byId("stableCancelDebtEdit")) byId("stableCancelDebtEdit").classList.add("hidden");
  }
  function fillApartmentDebtExample() {
    ensureDebtSection();
    const fill = {
      stableDebtName: "Financiamento do apartamento",
      stableDebtType: "real_estate_financing",
      stableDebtCreditor: "Caixa",
      stableDebtOriginal: "275000",
      stableDebtFinanced: "175000",
      stableDebtDownPayment: "100000",
      stableDebtInterest: "8.16",
      stableDebtRatePeriod: "annual",
      stableDebtSystem: "manual",
      stableDebtTotal: "360",
      stableDebtPaid: "34",
      stableDebtCurrentBalance: "178771.25",
      stableDebtFirstPayment: "2023-09-01",
      stableDebtDueDay: "1"
    };
    Object.keys(fill).forEach(function (id) { if (byId(id)) byId(id).value = fill[id]; });
    if (byId("stableDebtManualPayment") && !byId("stableDebtManualPayment").value) byId("stableDebtManualPayment").value = "1400";
  }
  function editDebt(id) {
    const debt = getState().debts.find(function (item) { return item.id === id; });
    if (!debt) return;
    debtEditingId = id;
    ensureDebtSection();
    const fill = {
      stableDebtName: debt.name,
      stableDebtType: debt.debtType || "other",
      stableDebtCreditor: debt.creditor,
      stableDebtOriginal: debt.original,
      stableDebtFinanced: debt.financed,
      stableDebtDownPayment: debt.downPayment,
      stableDebtInterest: debt.interestRate,
      stableDebtRatePeriod: debt.ratePeriod || "annual",
      stableDebtSystem: debt.amortizationSystem || "manual",
      stableDebtTotal: debt.totalInstallments,
      stableDebtPaid: debt.paidInstallments,
      stableDebtManualPayment: debt.manualPayment,
      stableDebtCurrentBalance: debt.currentBalance,
      stableDebtFirstPayment: debt.firstPaymentDate || debt.startDate,
      stableDebtDueDay: debt.dueDay,
      stableDebtNotes: debt.notes
    };
    Object.keys(fill).forEach(function (field) { if (byId(field)) byId(field).value = fill[field] == null ? "" : fill[field]; });
    if (byId("cockpitDebtFormTitle")) byId("cockpitDebtFormTitle").textContent = "Editar dívida";
    if (byId("stableCancelDebtEdit")) byId("stableCancelDebtEdit").classList.remove("hidden");
    q("#debts .panel")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  function deleteDebt(id) {
    if (!confirm("Excluir esta dívida?")) return;
    const st = getState();
    st.debts = st.debts.filter(function (item) { return item.id !== id; });
    audit("debt_deleted");
    saveLocalSnapshot("debt_delete");
    safe(function () { if (typeof saveNow === "function") Promise.resolve(saveNow()).catch(noop); });
    renderDebtSection();
  }
  function settleDebt(id) {
    const debt = getState().debts.find(function (item) { return item.id === id; });
    if (!debt) return;
    debt.status = "settled";
    debt.settledAt = nowIso();
    debt.updatedAt = nowIso();
    audit("debt_settled");
    saveLocalSnapshot("debt_settled");
    safe(function () { if (typeof saveNow === "function") Promise.resolve(saveNow()).catch(noop); });
    renderDebtSection();
  }
  function renderDebtSection() {
    const st = getState();
    const debts = st.debts.filter(function (d) { return d.status !== "settled"; });
    const totalBalance = debts.reduce(function (sum, d) { return sum + Number(d.currentBalance || d.financed || 0); }, 0);
    const monthly = debts.reduce(function (sum, d) { return sum + debtPayment(d); }, 0);
    const remaining = debts.reduce(function (sum, d) { return sum + debtRemaining(d); }, 0);
    const kpis = byId("cockpitDebtKpis");
    if (kpis) kpis.innerHTML = `
      <div class="cockpit-kpi"><span>Saldo devedor</span><b>${brl(totalBalance)}</b><small>Total informado</small></div>
      <div class="cockpit-kpi"><span>Parcelas mensais</span><b>${brl(monthly)}</b><small>Impacto previsto</small></div>
      <div class="cockpit-kpi"><span>Dívidas ativas</span><b>${debts.length}</b><small>Contratos cadastrados</small></div>
      <div class="cockpit-kpi"><span>Parcelas restantes</span><b>${remaining}</b><small>Soma aproximada</small></div>`;
    const list = byId("stableDebtList");
    if (!list) return;
    if (!debts.length) {
      list.innerHTML = '<div class="cockpit-empty"><b>Nenhuma dívida cadastrada.</b><br>Cadastre financiamentos, empréstimos, parcelas ou obrigações recorrentes.</div>';
      return;
    }
    list.innerHTML = debts.map(function (debt) {
      const payment = debtPayment(debt);
      const rem = debtRemaining(debt);
      return `<div class="item"><div><b>${esc(debt.name || "Dívida")}</b><small>${esc(debtTypeLabel(debt.debtType))} • ${esc(debt.creditor || "credor não informado")} • venc. dia ${esc(debt.dueDay || "-")} • ${rem} restante(s) • ${esc(debtStatus(debt))}</small></div><div><div class="amount negative">${brl(payment)}</div><div class="cockpit-actions" style="margin-top:8px"><button class="cockpit-mini-btn" data-debt-edit="${esc(debt.id)}">Editar</button><button class="cockpit-mini-btn" data-debt-settle="${esc(debt.id)}">Liquidar</button><button class="cockpit-mini-btn" data-debt-delete="${esc(debt.id)}">Excluir</button></div></div></div>`;
    }).join("");
  }

  function ensureDividendsSection() {
    const section = ensureSection("dividends", `
      <div class="page-head"><div class="page-title"><div class="overline">Renda passiva</div><h1>Dividendos <span>& Rendimentos</span></h1><p>Dividendos, JCP, rendimentos de renda fixa e renda passiva recebida.</p></div></div>
      <div class="cockpit-kpis-4" id="stableDividendKpis"></div>
      <div class="cockpit-grid-2">
        <div class="panel"><div class="panel-head"><div><h2 id="stableDividendFormTitle">Registrar rendimento</h2><p>Vincule a um investimento ou lance como rendimento avulso.</p></div></div>
          <div class="form-grid">
            <label class="field"><span>Investimento vinculado</span><select id="stableDividendInvestment"><option value="">Avulso / sem ativo</option></select></label>
            <label class="field"><span>Tipo</span><select id="stableDividendType"><option value="dividend">Dividendo</option><option value="jcp">JCP</option><option value="fixed_income_yield">Rendimento renda fixa</option><option value="interest">Juros</option><option value="other">Outro rendimento</option></select></label>
            <label class="field"><span>Data de recebimento</span><input id="stableDividendDate" type="date"></label>
            <label class="field"><span>Descrição</span><input id="stableDividendDesc" placeholder="Ex.: MXRF11, CDB, JCP"></label>
            <label class="field"><span>Valor recebido</span><input id="stableDividendValue" type="number" step="0.01" min="0"></label>
            <label class="field"><span>Observações</span><input id="stableDividendNotes" placeholder="Opcional"></label>
          </div>
          <div class="split" style="margin-top:14px"><button class="btn primary" id="stableSaveDividend" type="button">Salvar rendimento</button><button class="btn ghost" id="stableClearDividend" type="button">Limpar</button><button class="btn ghost hidden" id="stableCancelDividendEdit" type="button">Cancelar edição</button></div>
        </div>
        <div class="panel"><div class="panel-head"><div><h2>Rendimentos do mês</h2><p>Recebidos no mês selecionado.</p></div></div><div id="stableDividendMonthList" class="list"></div></div>
      </div>
      <div class="panel" style="margin-top:14px"><div class="panel-head"><div><h2>Histórico recente</h2><p>Últimos dividendos e rendimentos registrados.</p></div></div><div id="stableDividendHistory" class="list"></div></div>
    `);
    bindDividendSection();
    populateDividendInvestments();
    return section;
  }
  function bindDividendSection() {
    const save = byId("stableSaveDividend"), clear = byId("stableClearDividend"), cancel = byId("stableCancelDividendEdit");
    if (save && save.dataset.bound !== "1") { save.dataset.bound = "1"; save.addEventListener("click", saveDividendFromStableForm); }
    if (clear && clear.dataset.bound !== "1") { clear.dataset.bound = "1"; clear.addEventListener("click", clearDividendForm); }
    if (cancel && cancel.dataset.bound !== "1") { cancel.dataset.bound = "1"; cancel.addEventListener("click", function () { dividendEditingId = null; clearDividendForm(); }); }
    if (byId("stableDividendDate") && !byId("stableDividendDate").value) byId("stableDividendDate").value = today();
  }
  function populateDividendInvestments() {
    const select = byId("stableDividendInvestment");
    if (!select) return;
    const current = select.value;
    const st = getState();
    select.innerHTML = '<option value="">Avulso / sem ativo</option>' + st.investments.map(function (inv) {
      const label = inv.ticker || inv.name || inv.asset || inv.type || "Investimento";
      return `<option value="${esc(inv.id || label)}">${esc(label)}</option>`;
    }).join("");
    select.value = current;
  }
  function dividendRows() {
    const st = getState();
    const rows = [];
    const seen = new Set();
    st.dividends.forEach(function (d) {
      const id = d.id || d.sourceDividendId || uid("div");
      seen.add(id);
      rows.push(Object.assign({ id: id, type: "dividend" }, d, { source: "dividends" }));
    });
    st.transactions.forEach(function (tx) {
      const type = String(tx.type || "").toLowerCase();
      const cat = String(tx.category || tx.categoryName || "").toLowerCase();
      const desc = String(tx.description || "").toLowerCase();
      const dividendLike = type === "dividend" || cat.includes("dividendo") || cat.includes("rendimento") || cat.includes("provento") || desc.includes("dividendo") || desc.includes("rendimento") || desc.includes("jcp");
      const sourceId = tx.sourceDividendId || tx.id;
      if (dividendLike && !seen.has(sourceId)) {
        seen.add(sourceId);
        rows.push(Object.assign({}, tx, { source: "transactions" }));
      }
    });
    return rows.sort(function (a, b) { return String(b.date || "").localeCompare(String(a.date || "")); });
  }
  function saveDividendFromStableForm() {
    const value = positiveNum(byId("stableDividendValue") && byId("stableDividendValue").value);
    if (!value) { alert("Informe o valor recebido."); return; }
    const st = getState();
    const invId = (byId("stableDividendInvestment") && byId("stableDividendInvestment").value) || "";
    const date = (byId("stableDividendDate") && byId("stableDividendDate").value) || today();
    const desc = (byId("stableDividendDesc") && byId("stableDividendDesc").value.trim()) || "Dividendos / rendimentos";
    const div = {
      id: dividendEditingId || uid("dividend"),
      investmentId: invId,
      dividendType: (byId("stableDividendType") && byId("stableDividendType").value) || "dividend",
      date,
      description: desc,
      value,
      notes: (byId("stableDividendNotes") && byId("stableDividendNotes").value) || "",
      createdAt: dividendEditingId ? undefined : nowIso(),
      updatedAt: nowIso()
    };
    const idx = st.dividends.findIndex(function (item) { return item.id === div.id; });
    if (idx >= 0) div.createdAt = st.dividends[idx].createdAt || nowIso();
    if (idx >= 0) st.dividends[idx] = Object.assign({}, st.dividends[idx], div); else st.dividends.push(div);

    const txIdx = st.transactions.findIndex(function (tx) { return tx.sourceDividendId === div.id; });
    const tx = {
      id: txIdx >= 0 ? st.transactions[txIdx].id : uid("tx"),
      sourceDividendId: div.id,
      type: "dividend",
      date,
      description: desc,
      category: "Dividendos e rendimentos",
      value,
      notes: div.notes,
      createdAt: txIdx >= 0 ? st.transactions[txIdx].createdAt : nowIso(),
      updatedAt: nowIso()
    };
    if (txIdx >= 0) st.transactions[txIdx] = Object.assign({}, st.transactions[txIdx], tx); else st.transactions.push(tx);

    audit(idx >= 0 ? "dividend_updated" : "dividend_created", { dividendType: div.dividendType });
    saveLocalSnapshot("dividend");
    safe(function () { if (typeof saveNow === "function") Promise.resolve(saveNow()).catch(noop); });
    safe(function () { if (typeof render === "function") render(); });
    dividendEditingId = null;
    clearDividendForm();
    renderDividendSection();
  }
  function clearDividendForm() {
    ["stableDividendDesc", "stableDividendValue", "stableDividendNotes"].forEach(function (id) { if (byId(id)) byId(id).value = ""; });
    if (byId("stableDividendInvestment")) byId("stableDividendInvestment").value = "";
    if (byId("stableDividendType")) byId("stableDividendType").value = "dividend";
    if (byId("stableDividendDate")) byId("stableDividendDate").value = today();
    if (byId("stableDividendFormTitle")) byId("stableDividendFormTitle").textContent = "Registrar rendimento";
    if (byId("stableCancelDividendEdit")) byId("stableCancelDividendEdit").classList.add("hidden");
  }
  function editDividend(id) {
    const row = getState().dividends.find(function (item) { return item.id === id; });
    if (!row) return;
    dividendEditingId = id;
    ensureDividendsSection();
    populateDividendInvestments();
    const fill = {
      stableDividendInvestment: row.investmentId || "",
      stableDividendType: row.dividendType || "dividend",
      stableDividendDate: row.date || today(),
      stableDividendDesc: row.description || "",
      stableDividendValue: row.value || "",
      stableDividendNotes: row.notes || ""
    };
    Object.keys(fill).forEach(function (field) { if (byId(field)) byId(field).value = fill[field]; });
    if (byId("stableDividendFormTitle")) byId("stableDividendFormTitle").textContent = "Editar rendimento";
    if (byId("stableCancelDividendEdit")) byId("stableCancelDividendEdit").classList.remove("hidden");
  }
  function deleteDividend(id) {
    if (!confirm("Excluir este rendimento?")) return;
    const st = getState();
    st.dividends = st.dividends.filter(function (d) { return d.id !== id; });
    st.transactions = st.transactions.filter(function (tx) { return tx.sourceDividendId !== id; });
    audit("dividend_deleted");
    saveLocalSnapshot("dividend_delete");
    safe(function () { if (typeof saveNow === "function") Promise.resolve(saveNow()).catch(noop); });
    renderDividendSection();
  }
  function renderDividendSection() {
    populateDividendInvestments();
    const ym = selectedYm();
    const year = ym.slice(0, 4);
    const rows = dividendRows();
    const monthRows = rows.filter(function (r) { return monthFromDate(r.date) === ym; });
    const yearRows = rows.filter(function (r) { return String(r.date || "").slice(0, 4) === year; });
    const monthTotal = monthRows.reduce(function (sum, r) { return sum + Number(r.value || 0); }, 0);
    const yearTotal = yearRows.reduce(function (sum, r) { return sum + Number(r.value || 0); }, 0);
    const avg = yearTotal / 12;
    const last = rows[0];
    const kpis = byId("stableDividendKpis");
    if (kpis) kpis.innerHTML = `
      <div class="cockpit-kpi"><span>No mês</span><b>${brl(monthTotal)}</b><small>${monthRows.length} recebimento(s)</small></div>
      <div class="cockpit-kpi"><span>No ano</span><b>${brl(yearTotal)}</b><small>${esc(year)}</small></div>
      <div class="cockpit-kpi"><span>Média mensal</span><b>${brl(avg)}</b><small>base anual</small></div>
      <div class="cockpit-kpi"><span>Último</span><b>${brl(last ? last.value : 0)}</b><small>${esc(last ? ((last.description || "Rendimento") + " • " + (last.date || "")) : "sem registros")}</small></div>`;
    const monthList = byId("stableDividendMonthList");
    if (monthList) monthList.innerHTML = monthRows.length ? monthRows.map(renderDividendItem).join("") : '<div class="cockpit-empty"><b>Nenhum rendimento neste mês.</b><br>Registre dividendos, JCP ou rendimentos de renda fixa.</div>';
    const history = byId("stableDividendHistory");
    if (history) history.innerHTML = rows.length ? rows.slice(0, 12).map(renderDividendItem).join("") : '<div class="cockpit-empty"><b>Sem histórico.</b><br>Os rendimentos registrados aparecerão aqui.</div>';
  }
  function renderDividendItem(row) {
    const canEdit = row.source === "dividends";
    return `<div class="item"><div><b>${esc(row.description || "Rendimento")}</b><small>${esc(monthLabel(monthFromDate(row.date)))} • ${esc(row.dividendType || row.category || "Dividendos")}</small></div><div><div class="amount positive">${brl(row.value)}</div>${canEdit ? `<div class="cockpit-actions" style="margin-top:8px"><button class="cockpit-mini-btn" data-dividend-edit="${esc(row.id)}">Editar</button><button class="cockpit-mini-btn" data-dividend-delete="${esc(row.id)}">Excluir</button></div>` : ""}</div></div>`;
  }

  function ensureSimulatorSection() {
    const section = ensureSection("simulator", `
      <div class="page-head"><div class="page-title"><div class="overline">Financial freedom simulator</div><h1>Simulador de <span>Liberdade Financeira</span></h1><p>Projeção educativa de patrimônio, aportes, inflação e renda passiva.</p></div></div>
      <div class="cockpit-grid-2">
        <div class="panel"><h2>Parâmetros</h2><div class="form-grid">
          <label class="field"><span>Valor inicial</span><input id="stableSimInitial" type="number" min="0" step="0.01" value="10000"></label>
          <label class="field"><span>Aporte mensal</span><input id="stableSimMonthly" type="number" min="0" step="0.01" value="1000"></label>
          <label class="field"><span>Rentabilidade anual esperada (%)</span><input id="stableSimRate" type="number" step="0.01" value="8"></label>
          <label class="field"><span>Inflação anual estimada (%)</span><input id="stableSimInflation" type="number" step="0.01" value="4"></label>
          <label class="field"><span>Prazo em anos</span><input id="stableSimYears" type="number" min="1" step="1" value="20"></label>
          <label class="field"><span>Meta patrimonial</span><input id="stableSimGoal" type="number" min="0" step="0.01" value="1000000"></label>
          <label class="field"><span>Custo mensal desejado</span><input id="stableSimMonthlyCost" type="number" min="0" step="0.01" value="30000"></label>
          <label class="field"><span>Taxa de retirada anual segura (%)</span><input id="stableSimWithdraw" type="number" min="0" step="0.01" value="4"></label>
          <label class="field"><span>Idade atual opcional</span><input id="stableSimAge" type="number" min="0" step="1" placeholder="Opcional"></label>
        </div><div class="split" style="margin-top:14px"><button class="btn primary" id="stableRunSim" type="button">Simular</button></div><div class="cockpit-note cockpit-warning">Simulação educativa. Não é promessa de rentabilidade nem recomendação individualizada de investimento.</div></div>
        <div class="panel"><h2>Resultado</h2><div id="stableSimResult" class="list"></div></div>
      </div>
      <div class="panel" style="margin-top:14px"><div class="panel-head"><div><h2>Evolução anual</h2><p>Projeção nominal e real ano a ano.</p></div></div><div id="stableSimAnnual" class="list cockpit-annual-list"></div></div>
    `);
    bindSimulatorSection();
    return section;
  }
  function bindSimulatorSection() {
    const run = byId("stableRunSim");
    if (run && run.dataset.bound !== "1") { run.dataset.bound = "1"; run.addEventListener("click", runSimulator); }
    ["stableSimInitial", "stableSimMonthly", "stableSimRate", "stableSimInflation", "stableSimYears", "stableSimGoal", "stableSimMonthlyCost", "stableSimWithdraw", "stableSimAge"].forEach(function (id) {
      const el = byId(id);
      if (el && el.dataset.bound !== "1") { el.dataset.bound = "1"; el.addEventListener("input", runSimulator); }
    });
  }
  function simVal(id) { return num(byId(id) && byId(id).value); }
  function runSimulator() {
    const initial = Math.max(0, simVal("stableSimInitial"));
    const monthly = Math.max(0, simVal("stableSimMonthly"));
    const annualRate = simVal("stableSimRate") / 100;
    const annualInflation = simVal("stableSimInflation") / 100;
    const years = Math.max(1, intNum(byId("stableSimYears") && byId("stableSimYears").value, 1));
    const goal = Math.max(0, simVal("stableSimGoal"));
    const monthlyCost = Math.max(0, simVal("stableSimMonthlyCost"));
    const withdrawRate = Math.max(0.0001, simVal("stableSimWithdraw") / 100 || 0.04);
    const age = intNum(byId("stableSimAge") && byId("stableSimAge").value, 0);
    const monthlyRate = Math.pow(1 + annualRate, 1 / 12) - 1;
    const monthlyInflation = Math.pow(1 + annualInflation, 1 / 12) - 1;
    let balance = initial;
    let realBalance = initial;
    let invested = initial;
    const annual = [];
    let goalMonth = null;
    const freedomTarget = monthlyCost > 0 ? (monthlyCost * 12 / withdrawRate) : goal;
    const target = goal > 0 && freedomTarget > 0 ? Math.min(goal, freedomTarget) : Math.max(goal, freedomTarget);
    const maxMonths = Math.max(years * 12, 720);
    for (let m = 1; m <= maxMonths; m++) {
      balance = balance * (1 + monthlyRate) + monthly;
      realBalance = realBalance * ((1 + monthlyRate) / (1 + monthlyInflation)) + monthly;
      invested += monthly;
      if (!goalMonth && target > 0 && balance >= target) goalMonth = m;
      if (m <= years * 12 && m % 12 === 0) annual.push({ year: m / 12, balance, realBalance, invested });
    }
    const shown = annual[annual.length - 1] || { balance, realBalance, invested };
    const gains = shown.balance - shown.invested;
    const passiveMonth = shown.balance * withdrawRate / 12;
    const result = byId("stableSimResult");
    if (result) result.innerHTML = `
      <div class="item"><div><b>Patrimônio futuro nominal</b><small>Valor projetado sem descontar inflação</small></div><div class="amount positive">${brl(shown.balance)}</div></div>
      <div class="item"><div><b>Patrimônio futuro real</b><small>Poder de compra estimado</small></div><div class="amount positive">${brl(shown.realBalance)}</div></div>
      <div class="item"><div><b>Total aportado</b><small>Capital próprio investido</small></div><div class="amount neutral">${brl(shown.invested)}</div></div>
      <div class="item"><div><b>Juros acumulados</b><small>Resultado estimado dos juros compostos</small></div><div class="amount positive">${brl(gains)}</div></div>
      <div class="item"><div><b>Renda passiva estimada</b><small>Taxa de retirada de ${(withdrawRate * 100).toFixed(2).replace(".", ",")}% ao ano</small></div><div class="amount positive">${brl(passiveMonth)}/mês</div></div>
      <div class="item"><div><b>Patrimônio-alvo liberdade</b><small>Com base no custo mensal desejado</small></div><div class="amount neutral">${brl(freedomTarget)}</div></div>
      <div class="item"><div><b>Tempo estimado até a meta</b><small>${age && goalMonth ? "idade aproximada: " + (age + Math.ceil(goalMonth / 12)) : "projeção"}</small></div><div class="amount neutral">${goalMonth ? Math.ceil(goalMonth / 12) + " anos" : "acima do horizonte"}</div></div>`;
    const list = byId("stableSimAnnual");
    if (list) list.innerHTML = annual.map(function (row) {
      return `<div class="item"><div><b>Ano ${row.year}</b><small>Aportado: ${brl(row.invested)} • Real: ${brl(row.realBalance)}</small></div><div class="amount positive">${brl(row.balance)}</div></div>`;
    }).join("");
  }

  function ensureSecuritySection() {
    const section = ensureSection("security", `
      <div class="page-head"><div class="page-title"><div class="overline">Security & privacy</div><h1>Segurança <span>& Privacidade</span></h1><p>Controle local dos dados, exportação, limpeza do aparelho e preparação LGPD.</p></div></div>
      <div class="cockpit-kpis-4" id="stableSecurityKpis"></div>
      <div class="cockpit-grid-2">
        <div class="panel"><div class="panel-head"><div><h2>Proteção neste aparelho</h2><p>Recursos locais de segurança. Criptografia remota exige schema próprio no Supabase.</p></div></div>
          <div class="form-grid">
            <label class="field"><span>Chave de segurança local</span><input id="stableSecurityKey" type="password" autocomplete="new-password" placeholder="Crie uma chave forte"></label>
            <label class="field"><span>Ocultar valores por padrão</span><select id="stableHideValues"><option value="false">Não</option><option value="true">Sim</option></select></label>
            <label class="field"><span>Bloqueio automático</span><select id="stableAutoLock"><option value="5">5 minutos</option><option value="10">10 minutos</option><option value="30">30 minutos</option></select></label>
          </div>
          <div class="split" style="margin-top:14px"><button class="btn primary" id="stableEnableLocalCrypto" type="button">Ativar proteção local</button><button class="btn ghost" id="stableLockNow" type="button">Bloquear agora</button><button class="btn ghost" id="stableClearLocalData" type="button">Apagar dados deste aparelho</button></div>
          <div class="cockpit-note cockpit-warning">Se a criptografia avançada estiver ativa, seus dados financeiros devem ser criptografados antes de sair deste aparelho. A chave não deve ser enviada ao servidor. Se você perder a chave de recuperação, não conseguiremos restaurar os dados. Este hotfix prepara o fluxo local; a criptografia remota definitiva depende de ajustar Supabase para encrypted_payload, nonce e salt.</div>
        </div>
        <div class="panel"><div class="panel-head"><div><h2>LGPD e dados</h2><p>Exportação, consentimento e solicitação de exclusão.</p></div></div>
          <div class="split"><button class="btn primary" id="stableExportData" type="button">Exportar dados</button><button class="btn ghost" id="stableAcceptPrivacy" type="button">Aceitar termos/política</button><button class="btn ghost" id="stableDeletionRequest" type="button">Solicitar exclusão da conta</button></div>
          <div id="stableSecurityLog" class="list" style="margin-top:14px"></div>
        </div>
      </div>
      <div class="panel cockpit-legal-text" style="margin-top:14px"><h2>Textos base</h2><h3>Política de Privacidade</h3><p>O Cockpit Financeiro armazena dados financeiros fornecidos pelo usuário para organizar receitas, despesas, dívidas, investimentos, dividendos, patrimônio, metas e projeções. Dados financeiros não devem ser vendidos e não devem ser usados para anúncios.</p><h3>Termos de Uso</h3><p>O app é uma ferramenta educativa e organizacional. Simulações não são promessa de rentabilidade nem recomendação individualizada de investimento.</p><h3>Política de Exclusão</h3><p>O usuário deve poder exportar dados, apagar dados locais e solicitar exclusão da conta e dos registros associados.</p><h3>Política de Segurança</h3><p>Segurança deve ser aplicada em camadas: autenticação, RLS no Supabase, mínimo de dados sensíveis em logs, proteção contra XSS e, na arquitetura definitiva, criptografia antes de sincronizar.</p></div>
    `);
    bindSecuritySection();
    return section;
  }
  function bindSecuritySection() {
    const binds = [
      ["stableEnableLocalCrypto", enableLocalCrypto], ["stableLockNow", lockNow], ["stableClearLocalData", clearLocalData],
      ["stableExportData", exportData], ["stableAcceptPrivacy", acceptPrivacy], ["stableDeletionRequest", deletionRequest]
    ];
    binds.forEach(function (pair) {
      const el = byId(pair[0]);
      if (el && el.dataset.bound !== "1") { el.dataset.bound = "1"; el.addEventListener("click", pair[1]); }
    });
    const st = getState();
    if (byId("stableHideValues")) byId("stableHideValues").value = String(!!st.settings.hideValuesByDefault);
    if (byId("stableAutoLock")) byId("stableAutoLock").value = String(st.security.autoLockMinutes || 5);
  }
  async function deriveLocalKey(password, salt) {
    const enc = new TextEncoder();
    const material = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveKey"]);
    return crypto.subtle.deriveKey({ name: "PBKDF2", salt, iterations: 210000, hash: "SHA-256" }, material, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
  }
  function b64(bytes) { return btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(bytes)))); }
  async function enableLocalCrypto() {
    if (!window.crypto || !crypto.subtle) { alert("WebCrypto indisponível neste navegador."); return; }
    const password = byId("stableSecurityKey") && byId("stableSecurityKey").value;
    if (!password || password.length < 8) { alert("Crie uma chave com pelo menos 8 caracteres."); return; }
    const st = getState();
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await deriveLocalKey(password, salt);
    const payload = new TextEncoder().encode(JSON.stringify(st));
    const cipher = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, payload);
    localStorage.setItem("cockpit_local_encrypted_payload", JSON.stringify({ encrypted_payload: b64(cipher), nonce: b64(iv), salt: b64(salt), kdf: "PBKDF2-SHA256-210000", encryption_version: 1, updated_at: nowIso() }));
    st.security.localCryptoEnabled = true;
    st.security.localCryptoUpdatedAt = nowIso();
    st.security.autoLockMinutes = Number(byId("stableAutoLock") && byId("stableAutoLock").value) || 5;
    st.settings.hideValuesByDefault = (byId("stableHideValues") && byId("stableHideValues").value) === "true";
    audit("local_crypto_enabled");
    saveLocalSnapshot("security");
    renderSecuritySection();
    alert("Proteção local ativada. Guarde sua chave: sem ela, o backup criptografado local não poderá ser lido.");
  }
  function lockNow() {
    document.documentElement.classList.add("cockpit-values-locked");
    audit("manual_lock");
    alert("Bloqueio visual aplicado. Para bloqueio real com desbloqueio por PIN, será necessário integrar fluxo próprio no app principal.");
  }
  function clearLocalData() {
    if (!confirm("Apagar os dados salvos neste aparelho? Isso não exclui automaticamente dados remotos.")) return;
    localStateKeys().forEach(function (key) { safe(function () { localStorage.removeItem(key); }); });
    localStorage.removeItem("cockpit_local_encrypted_payload");
    audit("local_data_cleared");
    setSyncStatus("Dados locais apagados");
    renderSecuritySection();
  }
  function exportData() {
    const st = getState();
    const blob = new Blob([JSON.stringify({ exportedAt: nowIso(), version: VERSION, data: st }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "cockpit-financeiro-export-" + today() + ".json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    audit("data_exported");
    saveLocalSnapshot("export");
  }
  function acceptPrivacy() {
    const st = getState();
    st.settings.privacyAcceptedAt = st.settings.privacyAcceptedAt || nowIso();
    st.settings.termsAcceptedAt = st.settings.termsAcceptedAt || nowIso();
    st.settings.securityVersionAccepted = VERSION;
    audit("privacy_terms_accepted");
    saveLocalSnapshot("privacy");
    renderSecuritySection();
  }
  function deletionRequest() {
    const st = getState();
    st.settings.accountDeletionRequestedAt = nowIso();
    audit("account_deletion_requested");
    saveLocalSnapshot("deletion_request");
    alert("Solicitação registrada localmente. Na versão comercial, isso deve abrir um fluxo real de suporte/exclusão no backend.");
    renderSecuritySection();
  }
  function renderSecuritySection() {
    const st = getState();
    const kpis = byId("stableSecurityKpis");
    if (kpis) kpis.innerHTML = `
      <div class="cockpit-kpi"><span>Criptografia local</span><b>${st.security.localCryptoEnabled ? "Ativa" : "Pendente"}</b><small>Backup local protegido</small></div>
      <div class="cockpit-kpi"><span>Consentimento</span><b>${st.settings.privacyAcceptedAt ? "Registrado" : "Pendente"}</b><small>${esc(st.settings.privacyAcceptedAt || "sem aceite")}</small></div>
      <div class="cockpit-kpi"><span>Sincronização</span><b>${esc((byId("syncStatus") && byId("syncStatus").textContent) || "Local")}</b><small>Fallback habilitado</small></div>
      <div class="cockpit-kpi"><span>MFA</span><b>Recomendado</b><small>Preparar via Supabase Auth</small></div>`;
    const log = byId("stableSecurityLog");
    if (log) log.innerHTML = st.auditEvents.slice(-8).reverse().map(function (evt) {
      return `<div class="item"><div><b>${esc(evt.event)}</b><small>${esc(evt.at)}</small></div><div class="amount neutral">audit</div></div>`;
    }).join("") || '<div class="cockpit-empty"><b>Sem eventos.</b><br>Eventos de segurança aparecerão aqui sem valores financeiros.</div>';
  }

  function ensureMoreSection() {
    return ensureSection("more", `
      <div class="page-head"><div class="page-title"><div class="overline">Mobile hub</div><h1>Mais</h1><p>Recursos secundários sem poluir a tela inicial mobile.</p></div></div>
      <div class="cockpit-more-grid">
        <button class="cockpit-more-card" data-view="debts"><b>Dívidas</b><small>Financiamentos, parcelas e saldo devedor.</small></button>
        <button class="cockpit-more-card" data-view="dividends"><b>Dividendos</b><small>Rendimentos, JCP e renda passiva.</small></button>
        <button class="cockpit-more-card" data-view="simulator"><b>Simulador</b><small>Liberdade financeira e metas.</small></button>
        <button class="cockpit-more-card" data-view="budget"><b>Orçamento</b><small>Limites e planejamento.</small></button>
        <button class="cockpit-more-card" data-view="projection"><b>Fluxo de caixa</b><small>Próximos meses e obrigações.</small></button>
        <button class="cockpit-more-card" data-view="decisions"><b>Decisões</b><small>Compras e escolhas.</small></button>
        <button class="cockpit-more-card" data-view="profile"><b>Perfil</b><small>Conta e preferências.</small></button>
        <button class="cockpit-more-card" data-view="security"><b>Segurança e Privacidade</b><small>Exportação, LGPD e proteção local.</small></button>
        <button class="cockpit-more-card" data-view="help"><b>Ajuda</b><small>Tutoriais de uso.</small></button>
      </div>
    `);
  }

  function ensureBillingField() {
    const first = byId("txFirstMonth");
    if (!first) return;
    const firstLabel = first.closest("label");
    if (firstLabel) {
      const span = firstLabel.querySelector("span");
      if (span) span.textContent = "Mês da fatura / 1ª parcela";
    }
    let billing = byId("txBillingMonth");
    if (!billing) {
      const label = document.createElement("label");
      label.className = "field";
      label.id = "txBillingMonthField";
      label.innerHTML = '<span>Mês da fatura</span><input id="txBillingMonth" type="month"><div class="cockpit-note">Se comprou em 25/06, mas paga na fatura de julho, coloque julho aqui.</div>';
      if (firstLabel && firstLabel.parentNode) firstLabel.parentNode.insertBefore(label, firstLabel.nextSibling);
      billing = byId("txBillingMonth");
    }
    if (billing && !billing.value) billing.value = first.value || selectedYm();
    if (first && !first.value) first.value = billing.value || selectedYm();
    bindBillingSync();
  }
  function bindBillingSync() {
    const billing = byId("txBillingMonth");
    const first = byId("txFirstMonth");
    const date = byId("txDate");
    if (billing && billing.dataset.boundStable !== "1") {
      billing.dataset.boundStable = "1";
      billing.addEventListener("change", function () { if (first) first.value = billing.value || first.value; });
    }
    if (first && first.dataset.boundStable !== "1") {
      first.dataset.boundStable = "1";
      first.addEventListener("change", function () { if (billing) billing.value = first.value || billing.value; });
    }
    if (date && date.dataset.billingDateBoundStable !== "1") {
      date.dataset.billingDateBoundStable = "1";
      date.addEventListener("change", function () {
        const dm = monthFromDate(date.value);
        if (billing && !billing.value) billing.value = dm || selectedYm();
        if (first && !first.value) first.value = billing && billing.value || dm || selectedYm();
      });
    }
  }
  function billingMonthOf(tx) {
    if (!tx) return "";
    return normalizeMonth(tx.billingMonth) || normalizeMonth(tx.competenceMonth) || normalizeMonth(tx.invoiceMonth) || normalizeMonth(tx.cardBillMonth) || normalizeMonth(tx.firstBillingMonth) || (tx.installments && normalizeMonth(tx.installments.firstMonth)) || monthFromDate(tx.date);
  }
  function isExpenseLike(tx) {
    const type = String(tx && tx.type || "").toLowerCase();
    return type === "expense" || type === "debt" || type === "transfer" || type === "future_debt_payment";
  }
  function isInstallment(tx) {
    return tx && tx.installments && Number(tx.installments.count || 0) > 1;
  }
  function patchTxForm() {
    if (!window.__cockpitStableTxFromFormPatched) {
      const original = window.txFromForm || safe(function () { return typeof txFromForm === "function" ? txFromForm : null; }, null);
      if (typeof original === "function") {
        window.__cockpitStableTxFromFormPatched = true;
        window.__cockpitOriginalTxFromFormStable = original;
        window.txFromForm = function (existing) {
          const tx = original.apply(this, arguments);
          normalizeTxBilling(tx);
          return tx;
        };
        safe(function () { txFromForm = window.txFromForm; });
      }
    }
    const clearOriginal = window.clearTxForm || safe(function () { return typeof clearTxForm === "function" ? clearTxForm : null; }, null);
    if (typeof clearOriginal === "function" && !window.__cockpitStableClearTxPatched) {
      window.__cockpitStableClearTxPatched = true;
      window.clearTxForm = function () {
        const result = clearOriginal.apply(this, arguments);
        setTimeout(function () { ensureBillingField(); const ym = selectedYm(); if (byId("txBillingMonth")) byId("txBillingMonth").value = ym; if (byId("txFirstMonth")) byId("txFirstMonth").value = ym; }, 0);
        return result;
      };
      safe(function () { clearTxForm = window.clearTxForm; });
    }
  }
  function normalizeTxBilling(tx) {
    if (!tx || typeof tx !== "object") return tx;
    const type = String(tx.type || "").toLowerCase();
    const billing = normalizeMonth((byId("txBillingMonth") && byId("txBillingMonth").value) || "");
    const first = normalizeMonth((byId("txFirstMonth") && byId("txFirstMonth").value) || "");
    const dm = monthFromDate(tx.date) || selectedYm();
    if (type === "expense" || type === "debt" || type === "transfer") {
      const chosen = billing || first || dm;
      tx.billingMonth = chosen;
      tx.competenceMonth = chosen;
      tx.purchaseDate = tx.date;
      if (!tx.installments) tx.installments = { count: Math.max(1, Number(tx.installmentCount || 1)), firstMonth: chosen, monthlyAmount: Number(tx.value || 0) };
      tx.installments.count = Math.max(1, Number(tx.installments.count || tx.installmentCount || 1));
      tx.installments.firstMonth = chosen;
      tx.installments.monthlyAmount = Number(tx.installments.monthlyAmount || 0) || (Number(tx.value || 0) / Math.max(1, tx.installments.count));
    }
    return tx;
  }
  function installmentRowsForTx(tx, ym) {
    const rows = [];
    if (!isExpenseLike(tx)) return rows;
    const dm = monthFromDate(tx.date);
    const bm = billingMonthOf(tx) || dm || ym;
    if (isInstallment(tx)) {
      const count = Math.max(1, Number(tx.installments.count || 1));
      const first = normalizeMonth(tx.installments.firstMonth) || bm || dm;
      const monthlyAmount = Number(tx.installments.monthlyAmount || 0) || (Number(tx.value || 0) / count);
      for (let i = 0; i < count; i++) {
        const rowMonth = addMonthsSafe(first, i);
        if (rowMonth === ym) rows.push(Object.assign({}, tx, {
          id: tx.id + "__" + (i + 1),
          parentId: tx.id,
          value: monthlyAmount,
          billingMonth: rowMonth,
          competenceMonth: rowMonth,
          originalPurchaseDate: tx.date,
          installmentNumber: i + 1,
          installmentTotal: count,
          installmentLabel: (i + 1) + "/" + count
        }));
      }
      return rows;
    }
    if (bm === ym) rows.push(Object.assign({}, tx, { billingMonth: bm, competenceMonth: bm, originalPurchaseDate: dm !== bm ? tx.date : undefined }));
    return rows;
  }
  function debtRowsForMonth(ym) {
    const st = getState();
    const rows = [];
    st.debts.forEach(function (debt) {
      if (debt.status === "settled") return;
      const first = monthFromDate(debt.firstPaymentDate || debt.startDate || today());
      const total = Math.max(1, Number(debt.totalInstallments || 1));
      const paid = Math.max(0, Number(debt.paidInstallments || 0));
      for (let i = paid; i < total; i++) {
        const m = addMonthsSafe(first, i);
        if (m === ym) {
          const dueDay = String(debt.dueDay || 1).padStart(2, "0");
          rows.push({
            id: "debt_payment_" + debt.id + "_" + ym,
            debtId: debt.id,
            type: "expense",
            category: "Dívidas e financiamentos",
            description: "Parcela: " + (debt.name || "Dívida"),
            date: ym + "-" + dueDay,
            billingMonth: ym,
            competenceMonth: ym,
            value: debtPayment(debt),
            isDebtProjection: true
          });
        }
      }
    });
    return rows;
  }
  function patchMonthTransactions() {
    if (window.__cockpitStableMonthTransactionsPatched) return;
    const original = window.monthTransactions || safe(function () { return typeof monthTransactions === "function" ? monthTransactions : null; }, null);
    if (typeof original !== "function") return;
    window.__cockpitStableMonthTransactionsPatched = true;
    window.__cockpitOriginalMonthTransactionsStable = original;
    window.monthTransactions = function (targetMonth) {
      const ym = normalizeMonth(targetMonth) || selectedYm();
      const originalRows = safe(function () { return original.apply(this, arguments) || []; }, []);
      const st = getState();
      const blocked = new Set();
      st.transactions.forEach(function (tx) {
        if (!isExpenseLike(tx)) return;
        const dm = monthFromDate(tx.date);
        const bm = billingMonthOf(tx);
        if (dm === ym && bm && bm !== dm) blocked.add(tx.id);
        if (isInstallment(tx)) blocked.add(tx.id);
      });
      let rows = originalRows.filter(function (row) { return !blocked.has(row.id) && !blocked.has(row.parentId); });
      st.transactions.forEach(function (tx) {
        installmentRowsForTx(tx, ym).forEach(function (row) {
          if (!rows.some(function (r) { return r.id === row.id || (r.parentId === row.parentId && r.installmentNumber === row.installmentNumber); })) rows.push(row);
        });
      });
      debtRowsForMonth(ym).forEach(function (row) {
        if (!rows.some(function (r) { return r.id === row.id; })) rows.push(row);
      });
      return rows.sort(function (a, b) { return String(b.date || "").localeCompare(String(a.date || "")); });
    };
    safe(function () { monthTransactions = window.monthTransactions; });
  }
  function patchGeneratedInstallments() {
    if (window.__cockpitStableGeneratedInstallmentsPatched) return;
    const original = window.generatedInstallments || safe(function () { return typeof generatedInstallments === "function" ? generatedInstallments : null; }, null);
    window.__cockpitStableGeneratedInstallmentsPatched = true;
    window.generatedInstallments = function (tx, ym) {
      const rows = installmentRowsForTx(tx, normalizeMonth(ym) || selectedYm());
      if (rows.length) return rows;
      return typeof original === "function" ? safe(function () { return original.apply(this, arguments) || []; }, []) : [];
    };
    safe(function () { generatedInstallments = window.generatedInstallments; });
  }
  function decorateStatementRows() {
    const list = byId("txList");
    if (!list) return;
    const ym = selectedYm();
    const st = getState();
    const hints = [];
    st.transactions.forEach(function (tx) {
      if (!isExpenseLike(tx)) return;
      const bm = billingMonthOf(tx), dm = monthFromDate(tx.date);
      if (bm === ym && dm && dm !== bm) hints.push(String(tx.description || "").toLowerCase());
    });
    qa(".item, .statement-tx", list).forEach(function (row) {
      const text = String(row.textContent || "").toLowerCase();
      const hit = hints.some(function (h) { return h && text.includes(h); });
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
    if (!panel || byId("cockpitStableBillingHint")) return;
    const head = q(".panel-head", panel);
    if (!head) return;
    const hint = document.createElement("div");
    hint.id = "cockpitStableBillingHint";
    hint.className = "cockpit-note";
    hint.innerHTML = "<b>Compra no cartão:</b> se você comprou em 25/06, mas a fatura fecha em julho, informe Data da compra = 25/06 e Mês da fatura = julho. O Cockpit considera a despesa no mês em que ela será paga.";
    head.insertAdjacentElement("afterend", hint);
  }

  function patchSaveNow() {
    if (window.__cockpitStableSaveNowPatched) return;
    const original = window.saveNow || safe(function () { return typeof saveNow === "function" ? saveNow : null; }, null);
    window.__cockpitStableSaveNowPatched = true;
    window.saveNow = async function () {
      saveLocalSnapshot("before_remote_sync");
      if (typeof original !== "function") return true;
      try {
        setSyncStatus("Salvando...");
        const result = await original.apply(this, arguments);
        saveLocalSnapshot("after_remote_sync");
        setSyncStatus("Sincronizado");
        return result;
      } catch (error) {
        console.warn("[Cockpit " + VERSION + "] Supabase falhou. Dados preservados localmente.", error);
        setSyncStatus("Salvo neste aparelho");
        audit("sync_failed");
        return false;
      }
    };
    safe(function () { saveNow = window.saveNow; });
  }
  function patchLoadRender() {
    restoreLocalIfNeeded();
    safe(function () { if (typeof render === "function") render(); });
  }

  function fixMobileChrome() {
    if (isMobile()) document.documentElement.classList.add("cockpit-mobile-stable");
    else document.documentElement.classList.remove("cockpit-mobile-stable");
    const avatar = q("#userMenuButton img, .user-avatar img");
    if (avatar) {
      avatar.setAttribute("referrerpolicy", "no-referrer");
      avatar.style.width = isMobile() ? "40px" : "38px";
      avatar.style.height = isMobile() ? "40px" : "38px";
      avatar.style.objectFit = "cover";
      avatar.style.borderRadius = "50%";
    }
  }
  function setupMobileHomeCards() {
    if (!isMobile()) return;
    const cards = qa("#dashboard .dashboard-kpis > *");
    const actions = ["wallet", "register", "register-income", "register-expense"];
    cards.forEach(function (card, index) {
      if (index >= 4) { card.style.display = "none"; return; }
      card.style.cursor = "pointer";
      card.dataset.mobileHomeAction = actions[index] || "register";
    });
  }
  function applyTxFilterIfNeeded() {
    if (!txFilterRequested) return;
    const filter = txFilterRequested;
    txFilterRequested = null;
    safe(function () { txFilter = filter; });
    qa("[data-tx-filter]").forEach(function (button) { button.classList.toggle("active", button.dataset.txFilter === filter); });
    safe(function () { if (typeof renderTxList === "function") renderTxList(selectedYm()); });
  }
  function interceptMobileHomeCards() {
    if (window.__cockpitStableHomeCardsBound) return;
    window.__cockpitStableHomeCardsBound = true;
    document.addEventListener("click", function (event) {
      const card = event.target.closest("#dashboard .dashboard-kpis > *[data-mobile-home-action]");
      if (!card || !isMobile()) return;
      const action = card.dataset.mobileHomeAction;
      if (action === "wallet") { openView("wallet"); return; }
      txFilterRequested = action === "register-income" ? "income" : action === "register-expense" ? "expense" : "all";
      openView("register");
    }, true);
  }
  function addActionsToSheet() {
    const grid = q("#registerActionSheet .sheet-grid");
    if (!grid) return;
    const actions = [
      ["debt", "⚠", "Dívida / financiamento", "Parcelas, empréstimos e financiamentos"],
      ["dividend", "◆", "Dividendo / rendimento", "Proventos e renda passiva"]
    ];
    actions.forEach(function (a) {
      if (q('[data-register-action="' + a[0] + '"]', grid)) return;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.dataset.registerAction = a[0];
      btn.innerHTML = `<span>${a[1]}</span><b>${a[2]}</b><small>${a[3]}</small>`;
      grid.appendChild(btn);
    });
  }
  function interceptRegisterActions() {
    if (window.__cockpitStableRegisterActionsBound) return;
    window.__cockpitStableRegisterActionsBound = true;
    document.addEventListener("click", function (event) {
      const button = event.target.closest("button[data-register-action]");
      if (!button) return;
      if (button.dataset.registerAction === "debt" || button.dataset.registerAction === "dividend") {
        event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation();
        const sheet = byId("registerActionSheet");
        if (sheet) { sheet.classList.add("hidden"); sheet.setAttribute("aria-hidden", "true"); }
        openView(button.dataset.registerAction === "debt" ? "debts" : "dividends");
      }
    }, true);
  }
  function bindInlineActions() {
    if (window.__cockpitStableInlineActionsBound) return;
    window.__cockpitStableInlineActionsBound = true;
    document.addEventListener("click", function (event) {
      const debtEdit = event.target.closest("[data-debt-edit]");
      const debtDelete = event.target.closest("[data-debt-delete]");
      const debtSettle = event.target.closest("[data-debt-settle]");
      const divEdit = event.target.closest("[data-dividend-edit]");
      const divDelete = event.target.closest("[data-dividend-delete]");
      if (debtEdit) { editDebt(debtEdit.dataset.debtEdit); return; }
      if (debtDelete) { deleteDebt(debtDelete.dataset.debtDelete); return; }
      if (debtSettle) { settleDebt(debtSettle.dataset.debtSettle); return; }
      if (divEdit) { editDividend(divEdit.dataset.dividendEdit); return; }
      if (divDelete) { deleteDividend(divDelete.dataset.dividendDelete); return; }
    }, true);
  }
  function ensureDividendOption() {
    const select = byId("txType");
    if (!select || q('option[value="dividend"]', select)) return;
    const opt = document.createElement("option");
    opt.value = "dividend";
    opt.textContent = "Dividendo / rendimento";
    select.appendChild(opt);
  }
  function hideTechnicalAreasOnMobile() {
    if (!isMobile()) return;
    qa(".panel, .card, section").forEach(function (node) {
      const text = String(node.textContent || "").toLowerCase();
      if (text.includes("zona de risco") || text.includes("exportar extrato manualmente")) node.style.display = "none";
    });
  }
  function addHelpTutorials() {
    const help = byId("help");
    if (!help || byId("cockpitStableHelpTutorials")) return;
    const panel = document.createElement("div");
    panel.id = "cockpitStableHelpTutorials";
    panel.className = "panel";
    panel.style.marginTop = "14px";
    panel.innerHTML = `<div class="panel-head"><div><h2>Tutoriais rápidos</h2><p>Uso correto dos lançamentos principais.</p></div></div><div class="list">
      <div class="item"><div><b>Receita</b><small>Use + Novo lançamento, tipo Receita, data de recebimento e categoria correta.</small></div></div>
      <div class="item"><div><b>Despesa no cartão</b><small>Se comprou em 25/06, mas paga em julho, use Data da compra = 25/06 e Mês da fatura = julho.</small></div></div>
      <div class="item"><div><b>Compra parcelada</b><small>Informe o valor total, número de parcelas e mês da primeira fatura. O app distribui as parcelas por competência.</small></div></div>
      <div class="item"><div><b>Dívida / financiamento</b><small>Cadastre em Dívidas para refletir no fluxo de caixa futuro.</small></div></div>
      <div class="item"><div><b>Dividendos</b><small>Registre rendimentos na aba Dividendos. Eles também entram como movimentação de renda passiva.</small></div></div>
      <div class="item"><div><b>Segurança e Privacidade</b><small>Exporte dados, apague dados locais e registre aceite de termos.</small></div></div>
    </div>`;
    help.appendChild(panel);
  }

  function boot() {
    injectCss();
    normalizeState(getState());
    restoreLocalIfNeeded();
    patchSaveNow();
    patchSetView();
    interceptNavigation();
    normalizeNavigationButtons();
    ensureBillingField();
    bindBillingSync();
    patchTxForm();
    patchMonthTransactions();
    patchGeneratedInstallments();
    addBillingHintToRegister();
    addActionsToSheet();
    interceptRegisterActions();
    bindInlineActions();
    ensureDividendOption();
    setupMobileHomeCards();
    interceptMobileHomeCards();
    fixMobileChrome();
    hideTechnicalAreasOnMobile();
    addHelpTutorials();
    if (byId("debts")) { bindDebtSection(); renderDebtSection(); }
    if (byId("dividends")) { bindDividendSection(); renderDividendSection(); }
    if (byId("simulator")) { bindSimulatorSection(); runSimulator(); }
    if (byId("security")) { bindSecuritySection(); renderSecuritySection(); }
    decorateStatementRows();
  }

  boot();
  setTimeout(boot, 200);
  setTimeout(boot, 700);
  setTimeout(function () { boot(); patchLoadRender(); }, 1400);
  setTimeout(boot, 3000);

  document.addEventListener("DOMContentLoaded", boot);
  window.addEventListener("load", function () { boot(); patchLoadRender(); });
  window.addEventListener("resize", function () { setTimeout(boot, 150); });
  window.addEventListener("orientationchange", function () { setTimeout(boot, 300); });
  window.addEventListener("change", function (event) {
    if (event.target && ["monthPicker", "txBillingMonth", "txFirstMonth"].includes(event.target.id)) {
      setTimeout(function () {
        safe(function () { if (typeof render === "function") render(); });
        decorateStatementRows();
        if (internalView === "debts") renderDebtSection();
        if (internalView === "dividends") renderDividendSection();
      }, 80);
    }
  }, true);

  window.CockpitStableHotfix = {
    version: VERSION,
    openView,
    saveLocalSnapshot,
    renderDebtSection,
    renderDividendSection,
    runSimulator
  };
})();
