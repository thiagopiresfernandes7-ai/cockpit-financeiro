/* ============================================================
   Cockpit Financeiro — Correção mobile + extrato por fatura
   Versão emergencial 2026-07
============================================================ */

(function () {
  "use strict";

  const FLAG = "cockpit-mobile-billing-final-2026-07";
  if (window[FLAG]) return;
  window[FLAG] = true;

  function $(id) {
    return document.getElementById(id);
  }

  function q(selector, root = document) {
    return root.querySelector(selector);
  }

  function qa(selector, root = document) {
    return Array.from(root.querySelectorAll(selector));
  }

  function safe(fn, fallback) {
    try {
      return fn();
    } catch (e) {
      console.warn("[Cockpit mobile/billing final]", e);
      return fallback;
    }
  }

  function currentMonth() {
    return safe(function () {
      if (typeof selectedMonth === "function") return selectedMonth();
      if ($("monthPicker") && $("monthPicker").value) return $("monthPicker").value;
      return new Date().toISOString().slice(0, 7);
    }, new Date().toISOString().slice(0, 7));
  }

  function normalizeMonth(value) {
    const text = String(value || "").trim();
    if (/^\d{4}-\d{2}$/.test(text)) return text;
    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text.slice(0, 7);
    return "";
  }

  function monthFromDate(value) {
    return String(value || "").slice(0, 7);
  }

  function addMonths(ym, amount) {
    const base = normalizeMonth(ym) || currentMonth();
    const parts = base.split("-");
    const date = new Date(Number(parts[0]), Number(parts[1]) - 1 + amount, 1);
    return date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0");
  }

  function getState() {
    return safe(function () {
      if (window.state) return window.state;
      if (typeof state !== "undefined") return state;
      return null;
    }, null);
  }

  function isExpense(tx) {
    const type = String(tx && tx.type || "").toLowerCase();
    return type === "expense" || type === "debt" || type === "transfer";
  }

  function billingMonth(tx) {
    if (!tx) return "";
    return (
      normalizeMonth(tx.billingMonth) ||
      normalizeMonth(tx.competenceMonth) ||
      normalizeMonth(tx.invoiceMonth) ||
      normalizeMonth(tx.cardBillMonth) ||
      normalizeMonth(tx.firstBillingMonth) ||
      normalizeMonth(tx.firstMonth) ||
      normalizeMonth(tx.installments && tx.installments.firstMonth) ||
      monthFromDate(tx.date)
    );
  }

  function installmentsCount(tx) {
    if (!tx) return 1;

    if (tx.installments && Number(tx.installments.count || 0) > 0) {
      return Math.max(1, Number(tx.installments.count || 1));
    }

    if (Number(tx.installmentsCount || 0) > 0) {
      return Math.max(1, Number(tx.installmentsCount || 1));
    }

    if (Number(tx.installmentCount || 0) > 0) {
      return Math.max(1, Number(tx.installmentCount || 1));
    }

    return 1;
  }

  function monthlyAmount(tx) {
    const count = installmentsCount(tx);

    if (tx.installments && Number(tx.installments.monthlyAmount || 0) > 0) {
      return Number(tx.installments.monthlyAmount || 0);
    }

    if (Number(tx.monthlyAmount || 0) > 0) {
      return Number(tx.monthlyAmount || 0);
    }

    return Number(tx.value || 0) / Math.max(1, count);
  }

  function patchMonthTransactionsHard() {
    if (window.__cockpitMonthTransactionsHardPatched) return;

    const original =
      window.monthTransactions ||
      safe(function () {
        if (typeof monthTransactions === "function") return monthTransactions;
        return null;
      }, null);

    if (typeof original !== "function") return;

    window.__cockpitMonthTransactionsHardPatched = true;
    window.__cockpitOriginalMonthTransactionsHard = original;

    window.monthTransactions = function (targetMonth) {
      const ym = normalizeMonth(targetMonth) || currentMonth();
      const appState = getState();
      const txs = appState && Array.isArray(appState.transactions)
        ? appState.transactions
        : [];

      const originalRows = safe(function () {
        return window.__cockpitOriginalMonthTransactionsHard.apply(this, arguments) || [];
      }, []);

      const controlledIds = new Set();

      txs.forEach(function (tx) {
        if (!isExpense(tx)) return;

        const purchaseMonth = monthFromDate(tx.date);
        const billMonth = billingMonth(tx);
        const count = installmentsCount(tx);

        if (billMonth && billMonth !== purchaseMonth) controlledIds.add(tx.id);
        if (count > 1) controlledIds.add(tx.id);
      });

      const rows = originalRows.filter(function (row) {
        return !controlledIds.has(row.id);
      });

      txs.forEach(function (tx) {
        if (!isExpense(tx)) return;

        const purchaseMonth = monthFromDate(tx.date);
        const firstBillMonth = billingMonth(tx) || purchaseMonth;
        const count = installmentsCount(tx);
        const valuePerMonth = monthlyAmount(tx);

        if (count > 1) {
          for (let i = 0; i < count; i++) {
            const installmentMonth = addMonths(firstBillMonth, i);
            if (installmentMonth !== ym) continue;

            rows.push(Object.assign({}, tx, {
              value: valuePerMonth,
              billingMonth: installmentMonth,
              competenceMonth: installmentMonth,
              originalPurchaseDate: tx.date,
              installmentNumber: i + 1,
              installmentTotal: count,
              installmentLabel: String(i + 1) + "/" + String(count)
            }));
          }

          return;
        }

        if (firstBillMonth === ym) {
          rows.push(Object.assign({}, tx, {
            billingMonth: firstBillMonth,
            competenceMonth: firstBillMonth,
            originalPurchaseDate: tx.date
          }));
        }
      });

      return rows;
    };

    safe(function () {
      monthTransactions = window.monthTransactions;
    });
  }

  function patchTxFormHard() {
    if (window.__cockpitTxFormHardPatched) return;

    const original =
      window.txFromForm ||
      safe(function () {
        if (typeof txFromForm === "function") return txFromForm;
        return null;
      }, null);

    if (typeof original !== "function") return;

    window.__cockpitTxFormHardPatched = true;
    window.__cockpitOriginalTxFromFormHard = original;

    window.txFromForm = function () {
      const tx = window.__cockpitOriginalTxFromFormHard.apply(this, arguments);
      if (!tx) return tx;

      const type = String(tx.type || "").toLowerCase();

      if (type === "expense" || type === "debt" || type === "transfer") {
        const billingInput = $("txBillingMonth");
        const firstInput = $("txFirstMonth");

        const selectedBillingMonth =
          normalizeMonth(billingInput && billingInput.value) ||
          normalizeMonth(firstInput && firstInput.value) ||
          monthFromDate(tx.date) ||
          currentMonth();

        const count = installmentsCount(tx);

        tx.billingMonth = selectedBillingMonth;
        tx.competenceMonth = selectedBillingMonth;

        tx.installments = tx.installments || {};
        tx.installments.count = count;
        tx.installments.firstMonth = selectedBillingMonth;
        tx.installments.monthlyAmount = Number(tx.value || 0) / Math.max(1, count);
      }

      return tx;
    };

    safe(function () {
      txFromForm = window.txFromForm;
    });
  }

  function ensureBillingFieldHard() {
    const first = $("txFirstMonth");
    if (!first) return;

    const firstLabel = first.closest("label");

    if (firstLabel) {
      const span = firstLabel.querySelector("span");
      if (span) span.textContent = "Mês da fatura / 1ª parcela";
    }

    let billing = $("txBillingMonth");

    if (!billing) {
      const label = document.createElement("label");
      label.className = "field";
      label.id = "txBillingMonthField";
      label.innerHTML =
        '<span>Mês da fatura</span>' +
        '<input id="txBillingMonth" type="month">' +
        '<small style="display:block;margin-top:6px;color:var(--muted,#8ea6c1);line-height:1.35">' +
        'É o mês em que a despesa será paga. Compra em junho paga em julho = julho.' +
        '</small>';

      if (firstLabel && firstLabel.parentNode) {
        firstLabel.parentNode.insertBefore(label, firstLabel.nextSibling);
      }

      billing = $("txBillingMonth");
    }

    if (billing && !billing.value) {
      billing.value = first.value || currentMonth();
    }

    if (billing && billing.dataset.finalBillingBound !== "1") {
      billing.dataset.finalBillingBound = "1";
      billing.addEventListener("change", function () {
        first.value = billing.value || first.value;
      });
    }

    if (first.dataset.finalBillingBound !== "1") {
      first.dataset.finalBillingBound = "1";
      first.addEventListener("change", function () {
        if (billing) billing.value = first.value || billing.value;
      });
    }
  }

  function injectMobileCss() {
    if ($("cockpit-mobile-final-css")) return;

    const style = document.createElement("style");
    style.id = "cockpit-mobile-final-css";

    style.textContent = `
@media (max-width: 900px) {
  html,
  body {
    overflow-x: hidden !important;
  }

  .top {
    position: relative !important;
    top: auto !important;
    height: auto !important;
    min-height: 58px !important;
    padding: 10px 14px !important;
    z-index: 5 !important;
  }

  .top .title {
    display: block !important;
  }

  .top .title h1,
  #pageTitle {
    font-size: 22px !important;
    line-height: 1.08 !important;
  }

  #monthHint {
    font-size: 14px !important;
    line-height: 1.25 !important;
    max-width: 230px !important;
  }

  #topGlobalAddBtn,
  .statement-desktop-actions,
  #statementAddBtn {
    display: none !important;
  }

  #userMenuButton,
  .user-avatar {
    width: 38px !important;
    height: 38px !important;
    min-width: 38px !important;
    max-width: 38px !important;
    border-radius: 50% !important;
    overflow: hidden !important;
    padding: 0 !important;
    position: relative !important;
  }

  #userMenuButton img,
  .user-avatar img,
  img.user-avatar {
    width: 38px !important;
    height: 38px !important;
    max-width: 38px !important;
    max-height: 38px !important;
    object-fit: cover !important;
    border-radius: 50% !important;
    display: block !important;
  }

  .content {
    padding: 12px 14px calc(150px + env(safe-area-inset-bottom)) !important;
    overflow-x: hidden !important;
  }

  #register .page-head {
    margin-bottom: 14px !important;
  }

  #register .page-head h1 {
    font-size: 40px !important;
    line-height: 1 !important;
  }

  #register .page-head p {
    font-size: 18px !important;
    line-height: 1.35 !important;
  }

  .statement-summary-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
    gap: 10px !important;
  }

  .statement-summary-grid .kpi {
    min-width: 0 !important;
    padding: 16px 12px !important;
  }

  .statement-summary-grid .kpi span {
    font-size: 11px !important;
    letter-spacing: .18em !important;
  }

  .statement-summary-grid .kpi b {
    font-size: 20px !important;
    white-space: normal !important;
  }

  #txFormPanel {
    display: none !important;
    margin-top: 16px !important;
  }

  #txFormPanel.cockpit-form-open {
    display: block !important;
  }

  .global-add-btn {
    position: fixed !important;
    width: 58px !important;
    height: 58px !important;
    left: 50% !important;
    right: auto !important;
    bottom: calc(78px + env(safe-area-inset-bottom)) !important;
    transform: translateX(-50%) !important;
    z-index: 60 !important;
    border-radius: 20px !important;
  }

  .mobile-nav {
    position: fixed !important;
    left: 12px !important;
    right: 12px !important;
    bottom: calc(10px + env(safe-area-inset-bottom)) !important;
    min-height: 66px !important;
    z-index: 55 !important;
    border-radius: 26px !important;
  }

  .mobile-nav button {
    min-width: 0 !important;
  }
}
`;

    document.head.appendChild(style);
  }

  function closeMobileFormByDefault() {
    if (window.innerWidth > 900) return;

    const form = $("txFormPanel");
    if (!form) return;

    if (!form.dataset.mobileDefaultClosed) {
      form.dataset.mobileDefaultClosed = "1";
      form.classList.remove("cockpit-form-open");
    }
  }

  function bindGlobalAddMobile() {
    if (window.__cockpitGlobalAddMobileBound) return;
    window.__cockpitGlobalAddMobileBound = true;

    document.addEventListener("click", function (event) {
      const add = event.target.closest(".global-add-btn, #mobileGlobalAddBtn, #floatingAddBtn");
      if (!add) return;

      const form = $("txFormPanel");
      if (!form) return;

      form.classList.add("cockpit-form-open");

      setTimeout(function () {
        form.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 80);
    }, true);
  }

  function fixAvatar() {
    const imgs = qa("#userMenuButton img, .user-avatar img, img.user-avatar");

    imgs.forEach(function (img) {
      img.setAttribute("referrerpolicy", "no-referrer");
      img.style.width = "38px";
      img.style.height = "38px";
      img.style.maxWidth = "38px";
      img.style.maxHeight = "38px";
      img.style.objectFit = "cover";
      img.style.borderRadius = "50%";
      img.style.display = "block";
    });
  }

  function rerender() {
    safe(function () {
      if (typeof render === "function") render();
    });

    safe(function () {
      if (typeof renderTxList === "function") renderTxList(currentMonth());
    });
  }

  function boot() {
    injectMobileCss();
    fixAvatar();
    ensureBillingFieldHard();
    patchTxFormHard();
    patchMonthTransactionsHard();
    closeMobileFormByDefault();
    bindGlobalAddMobile();
  }

  boot();
  setTimeout(boot, 300);
  setTimeout(boot, 900);
  setTimeout(boot, 1800);
  setTimeout(boot, 3000);

  window.addEventListener("resize", function () {
    setTimeout(boot, 150);
  });

  document.addEventListener("change", function (event) {
    const target = event.target;
    if (!target) return;

    if (
      target.id === "txBillingMonth" ||
      target.id === "txFirstMonth" ||
      target.id === "txDate" ||
      target.id === "monthPicker"
    ) {
      setTimeout(rerender, 120);
    }
  }, true);
})();
