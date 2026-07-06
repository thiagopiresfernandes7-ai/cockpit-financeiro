/* ============================================================
   Cockpit Financeiro — Correção definitiva de fatura/competência
   Regra: compra entra no mês da fatura, não no mês da compra.
   Ex.: compra em junho com fatura em julho aparece em julho.
============================================================ */

(function () {
  "use strict";

  const FLAG = "cockpit-billing-competence-stable-2026-07";
  if (window[FLAG]) return;
  window[FLAG] = true;

  function byId(id) {
    return document.getElementById(id);
  }

  function safe(fn, fallback) {
    try {
      return fn();
    } catch (error) {
      console.warn("[Cockpit fatura/competência]", error);
      return fallback;
    }
  }

  function getAppState() {
    return safe(function () {
      if (window.state) return window.state;
      if (typeof state !== "undefined") return state;
      return null;
    }, null);
  }

  function currentMonth() {
    return safe(function () {
      if (typeof selectedMonth === "function") return selectedMonth();
      const picker = byId("monthPicker");
      if (picker && picker.value) return picker.value;
      return new Date().toISOString().slice(0, 7);
    }, new Date().toISOString().slice(0, 7));
  }

  function monthFromDate(date) {
    return String(date || "").slice(0, 7);
  }

  function normalizeMonth(value) {
    const text = String(value || "").trim();

    if (/^\d{4}-\d{2}$/.test(text)) return text;
    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text.slice(0, 7);

    return "";
  }

  function addMonths(ym, amount) {
    const base = normalizeMonth(ym) || currentMonth();
    const parts = base.split("-");
    const date = new Date(Number(parts[0]), Number(parts[1]) - 1 + amount, 1);

    return (
      date.getFullYear() +
      "-" +
      String(date.getMonth() + 1).padStart(2, "0")
    );
  }

  function isExpenseLike(tx) {
    const type = String(tx && tx.type || "").toLowerCase();

    return (
      type === "expense" ||
      type === "debt" ||
      type === "transfer"
    );
  }

  function getInstallmentCount(tx) {
    if (!tx) return 1;

    if (tx.installments && Number(tx.installments.count || 0) > 0) {
      return Math.max(1, Number(tx.installments.count || 1));
    }

    if (Number(tx.installmentCount || 0) > 0) {
      return Math.max(1, Number(tx.installmentCount || 1));
    }

    return 1;
  }

  function getBillingMonth(tx) {
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

  function getMonthlyAmount(tx) {
    const count = getInstallmentCount(tx);

    if (tx.installments && Number(tx.installments.monthlyAmount || 0) > 0) {
      return Number(tx.installments.monthlyAmount || 0);
    }

    if (Number(tx.monthlyAmount || 0) > 0) {
      return Number(tx.monthlyAmount || 0);
    }

    return Number(tx.value || 0) / Math.max(1, count);
  }

  function ensureBillingField() {
    const firstMonthInput = byId("txFirstMonth");
    if (!firstMonthInput) return;

    const firstMonthLabel = firstMonthInput.closest("label");

    if (firstMonthLabel) {
      const span = firstMonthLabel.querySelector("span");
      if (span) span.textContent = "Mês da fatura / 1ª parcela";
    }

    let billingInput = byId("txBillingMonth");

    if (!billingInput) {
      const label = document.createElement("label");
      label.className = "field";
      label.id = "txBillingMonthField";

      label.innerHTML =
        '<span>Mês da fatura</span>' +
        '<input id="txBillingMonth" type="month">' +
        '<small style="display:block;margin-top:6px;color:var(--muted,#8ea6c1);line-height:1.35">' +
        'Use o mês em que a despesa será paga. Ex.: compra em 25/06 com fatura em julho = 2026-07.' +
        '</small>';

      if (firstMonthLabel && firstMonthLabel.parentNode) {
        firstMonthLabel.parentNode.insertBefore(label, firstMonthLabel.nextSibling);
      }

      billingInput = byId("txBillingMonth");
    }

    if (billingInput && !billingInput.value) {
      billingInput.value = firstMonthInput.value || currentMonth();
    }

    if (billingInput && billingInput.dataset.boundCompetence !== "1") {
      billingInput.dataset.boundCompetence = "1";

      billingInput.addEventListener("change", function () {
        firstMonthInput.value = billingInput.value || firstMonthInput.value;
      });
    }

    if (firstMonthInput.dataset.boundCompetence !== "1") {
      firstMonthInput.dataset.boundCompetence = "1";

      firstMonthInput.addEventListener("change", function () {
        if (billingInput) billingInput.value = firstMonthInput.value || billingInput.value;
      });
    }
  }

  function patchTxFromForm() {
    const original =
      window.txFromForm ||
      safe(function () {
        if (typeof txFromForm === "function") return txFromForm;
        return null;
      }, null);

    if (typeof original !== "function") return;
    if (window.__cockpitOriginalTxFromFormCompetence) return;

    window.__cockpitOriginalTxFromFormCompetence = original;

    window.txFromForm = function () {
      const tx = window.__cockpitOriginalTxFromFormCompetence.apply(this, arguments);

      if (!tx) return tx;

      const type = String(tx.type || "").toLowerCase();

      const billingInput = byId("txBillingMonth");
      const firstMonthInput = byId("txFirstMonth");

      const chosenMonth =
        normalizeMonth(billingInput && billingInput.value) ||
        normalizeMonth(firstMonthInput && firstMonthInput.value) ||
        monthFromDate(tx.date) ||
        currentMonth();

      if (type === "expense" || type === "debt" || type === "transfer") {
        tx.billingMonth = chosenMonth;
        tx.competenceMonth = chosenMonth;

        const count = getInstallmentCount(tx);

        tx.installments = tx.installments || {};
        tx.installments.count = count;
        tx.installments.firstMonth = chosenMonth;
        tx.installments.monthlyAmount = Number(tx.value || 0) / Math.max(1, count);
      }

      return tx;
    };

    safe(function () {
      txFromForm = window.txFromForm;
    });
  }

  function patchMonthTransactions() {
    const original =
      window.monthTransactions ||
      safe(function () {
        if (typeof monthTransactions === "function") return monthTransactions;
        return null;
      }, null);

    if (typeof original !== "function") return;
    if (window.__cockpitOriginalMonthTransactionsCompetence) return;

    window.__cockpitOriginalMonthTransactionsCompetence = original;

    window.monthTransactions = function (targetMonth) {
      const ym = normalizeMonth(targetMonth) || currentMonth();
      const appState = getAppState();
      const transactions = appState && Array.isArray(appState.transactions)
        ? appState.transactions
        : [];

      const originalRows = safe(function () {
        return window.__cockpitOriginalMonthTransactionsCompetence.apply(this, arguments) || [];
      }, []);

      const controlledIds = new Set();

      transactions.forEach(function (tx) {
        if (!isExpenseLike(tx)) return;

        const purchaseMonth = monthFromDate(tx.date);
        const billingMonth = getBillingMonth(tx);
        const count = getInstallmentCount(tx);

        if (billingMonth && billingMonth !== purchaseMonth) {
          controlledIds.add(tx.id);
        }

        if (count > 1) {
          controlledIds.add(tx.id);
        }
      });

      const rows = originalRows.filter(function (row) {
        return !controlledIds.has(row.id);
      });

      transactions.forEach(function (tx) {
        if (!isExpenseLike(tx)) return;

        const purchaseMonth = monthFromDate(tx.date);
        const billingMonth = getBillingMonth(tx) || purchaseMonth;
        const count = getInstallmentCount(tx);
        const monthlyAmount = getMonthlyAmount(tx);

        if (count > 1) {
          for (let index = 0; index < count; index++) {
            const installmentMonth = addMonths(billingMonth, index);

            if (installmentMonth !== ym) continue;

            rows.push(Object.assign({}, tx, {
              value: monthlyAmount,
              billingMonth: installmentMonth,
              competenceMonth: installmentMonth,
              originalPurchaseDate: tx.date,
              installmentNumber: index + 1,
              installmentTotal: count,
              installmentLabel: String(index + 1) + "/" + String(count)
            }));
          }

          return;
        }

        if (billingMonth === ym) {
          rows.push(Object.assign({}, tx, {
            billingMonth: billingMonth,
            competenceMonth: billingMonth,
            originalPurchaseDate: tx.date
          }));
        }
      });

      return rows.sort(function (a, b) {
        const ad = String(a.billingMonth || a.competenceMonth || a.date || "");
        const bd = String(b.billingMonth || b.competenceMonth || b.date || "");
        return bd.localeCompare(ad);
      });
    };

    safe(function () {
      monthTransactions = window.monthTransactions;
    });
  }

  function addBillingNotice() {
    const panel = byId("txFormPanel");
    if (!panel || byId("billingCompetenceNotice")) return;

    const notice = document.createElement("div");
    notice.id = "billingCompetenceNotice";
    notice.className = "notice";
    notice.style.marginTop = "10px";
    notice.innerHTML =
      "<b>Regra da fatura:</b> se você comprou em junho, mas vai pagar na fatura de julho, informe " +
      "<b>Mês da fatura = julho</b>. O Cockpit vai considerar essa despesa em julho, não em junho.";

    const head = panel.querySelector(".panel-head");
    if (head) {
      head.insertAdjacentElement("afterend", notice);
    } else {
      panel.prepend(notice);
    }
  }

  function decorateStatement() {
    const list = byId("txList");
    if (!list) return;

    const ym = currentMonth();

    list.querySelectorAll(".item, .statement-tx").forEach(function (row) {
      if (row.dataset.billingDecorated === "1") return;

      const text = row.textContent || "";

      if (
        text.includes("Fatura") ||
        text.includes("fatura") ||
        text.includes("parcela")
      ) {
        row.dataset.billingDecorated = "1";
        return;
      }

      row.dataset.billingDecorated = "1";
    });

    const appState = getAppState();
    if (!appState || !Array.isArray(appState.transactions)) return;

    const hasDifferentBilling = appState.transactions.some(function (tx) {
      return (
        isExpenseLike(tx) &&
        getBillingMonth(tx) === ym &&
        monthFromDate(tx.date) !== ym
      );
    });

    if (!hasDifferentBilling) return;

    if (!byId("statementBillingInfo")) {
      const info = document.createElement("div");
      info.id = "statementBillingInfo";
      info.className = "notice";
      info.style.marginBottom = "12px";
      info.innerHTML =
        "Este extrato considera despesas pelo <b>mês da fatura</b>. " +
        "Compras feitas em junho e pagas em julho aparecem em julho.";

      list.parentNode.insertBefore(info, list);
    }
  }

  function rerender() {
    safe(function () {
      if (typeof render === "function") render();
    });

    safe(function () {
      if (typeof renderTxList === "function") renderTxList(currentMonth());
    });

    setTimeout(decorateStatement, 100);
  }

  function boot() {
    ensureBillingField();
    addBillingNotice();
    patchTxFromForm();
    patchMonthTransactions();
    decorateStatement();
  }

  boot();
  setTimeout(boot, 300);
  setTimeout(boot, 900);
  setTimeout(boot, 1800);

  document.addEventListener("click", function () {
    setTimeout(boot, 80);
    setTimeout(decorateStatement, 180);
  }, true);

  document.addEventListener("change", function (event) {
    const target = event.target;

    if (!target) return;

    if (
      target.id === "txBillingMonth" ||
      target.id === "txFirstMonth" ||
      target.id === "txDate" ||
      target.id === "monthPicker"
    ) {
      setTimeout(rerender, 80);
    }
  }, true);
})();
