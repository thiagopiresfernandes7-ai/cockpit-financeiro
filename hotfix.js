/* ============================================================
   Cockpit Financeiro — SALVAR MÊS DA FATURA NA EDIÇÃO
   Corrige o caso em que o campo aparece, mas não persiste.
   Versão: save-billing-month-2026-07-03
============================================================ */

(function () {
  "use strict";

  const FLAG = "cockpit-save-billing-month-2026-07-03";
  if (window[FLAG]) return;
  window[FLAG] = true;

  let pendingBillingSnapshot = null;

  function $(id) {
    return document.getElementById(id);
  }

  function safe(fn, fallback) {
    try {
      return fn();
    } catch (e) {
      console.warn("[Cockpit salvar fatura]", e);
      return fallback;
    }
  }

  function getState() {
    return safe(function () {
      if (window.state) return window.state;
      if (typeof state !== "undefined") return state;
      return null;
    }, null);
  }

  function normalizeText(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
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

  function numberValue(value) {
    return Number(String(value || "0").replace(",", ".")) || 0;
  }

  function currentMonth() {
    return safe(function () {
      if (typeof selectedMonth === "function") return selectedMonth();
      if ($("monthPicker") && $("monthPicker").value) return $("monthPicker").value;
      return new Date().toISOString().slice(0, 7);
    }, new Date().toISOString().slice(0, 7));
  }

  function isExpenseLike(tx) {
    const type = String(tx && tx.type || "").toLowerCase();

    return (
      type === "expense" ||
      type === "debt" ||
      type === "transfer"
    );
  }

  function takeBillingSnapshot() {
    const type = $("txType");
    const date = $("txDate");
    const desc = $("txDesc");
    const value = $("txValue");
    const installments = $("txInstallments");
    const firstMonth = $("txFirstMonth");
    const billingMonth = $("txBillingMonth");

    const selectedBillingMonth =
      normalizeMonth(billingMonth && billingMonth.value) ||
      normalizeMonth(firstMonth && firstMonth.value) ||
      monthFromDate(date && date.value);

    return {
      type: String(type && type.value || "").toLowerCase(),
      date: String(date && date.value || ""),
      description: String(desc && desc.value || "").trim(),
      descriptionNorm: normalizeText(desc && desc.value),
      value: numberValue(value && value.value),
      installments: Math.max(1, Number(installments && installments.value || 1)),
      billingMonth: selectedBillingMonth,
      capturedAt: Date.now()
    };
  }

  function isSaveButton(target) {
    const button = target && target.closest
      ? target.closest("button")
      : null;

    if (!button) return false;

    const text = normalizeText(button.textContent);

    return (
      button.id === "saveTx" ||
      text.includes("salvar alteracao") ||
      text.includes("salvar alteracoes") ||
      text.includes("salvar registro") ||
      text.includes("salvar lancamento")
    );
  }

  function findTransaction(snapshot) {
    const appState = getState();
    if (!appState || !Array.isArray(appState.transactions)) return null;

    const txs = appState.transactions;

    const exactMatches = txs.filter(function (tx) {
      if (!isExpenseLike(tx)) return false;

      const txDesc = normalizeText(tx.description || tx.desc);
      const txDate = String(tx.date || "");
      const txValue = Number(tx.value || 0);

      const sameDesc = txDesc && txDesc === snapshot.descriptionNorm;
      const sameDate = txDate === snapshot.date;
      const sameValue = Math.abs(txValue - snapshot.value) < 0.01;

      return sameDesc && sameDate && sameValue;
    });

    if (exactMatches.length) {
      return exactMatches[exactMatches.length - 1];
    }

    const closeMatches = txs.filter(function (tx) {
      if (!isExpenseLike(tx)) return false;

      const txDesc = normalizeText(tx.description || tx.desc);
      const txValue = Number(tx.value || 0);

      const sameDesc = txDesc && txDesc === snapshot.descriptionNorm;
      const sameValue = Math.abs(txValue - snapshot.value) < 0.01;

      return sameDesc && sameValue;
    });

    if (closeMatches.length) {
      return closeMatches[closeMatches.length - 1];
    }

    const dateMatches = txs.filter(function (tx) {
      if (!isExpenseLike(tx)) return false;

      const txDate = String(tx.date || "");
      const txValue = Number(tx.value || 0);

      const sameDate = txDate === snapshot.date;
      const sameValue = Math.abs(txValue - snapshot.value) < 0.01;

      return sameDate && sameValue;
    });

    if (dateMatches.length) {
      return dateMatches[dateMatches.length - 1];
    }

    return null;
  }

  function applyBillingSnapshot(snapshot) {
    if (!snapshot) return false;

    if (
      snapshot.type !== "expense" &&
      snapshot.type !== "debt" &&
      snapshot.type !== "transfer"
    ) {
      return false;
    }

    if (!snapshot.billingMonth) return false;

    const appState = getState();
    if (!appState || !Array.isArray(appState.transactions)) return false;

    const tx = findTransaction(snapshot);
    if (!tx) {
      console.warn("[Cockpit salvar fatura] Transação não encontrada para aplicar mês da fatura.", snapshot);
      return false;
    }

    tx.billingMonth = snapshot.billingMonth;
    tx.competenceMonth = snapshot.billingMonth;
    tx.invoiceMonth = snapshot.billingMonth;
    tx.cardBillMonth = snapshot.billingMonth;
    tx.firstBillingMonth = snapshot.billingMonth;

    tx.installments = tx.installments || {};
    tx.installments.count = snapshot.installments;
    tx.installments.firstMonth = snapshot.billingMonth;
    tx.installments.monthlyAmount = Number(tx.value || 0) / Math.max(1, snapshot.installments);

    tx.updatedAt = new Date().toISOString();

    safe(function () {
      if (typeof saveNow === "function") saveNow();
    });

    safe(function () {
      if (typeof render === "function") render();
    });

    safe(function () {
      if (typeof renderTxList === "function") renderTxList(currentMonth());
    });

    setTimeout(function () {
      safe(function () {
        if (typeof render === "function") render();
      });

      safe(function () {
        if (typeof renderTxList === "function") renderTxList(currentMonth());
      });
    }, 300);

    console.log("[Cockpit salvar fatura] Mês da fatura salvo:", {
      description: tx.description || tx.desc,
      date: tx.date,
      billingMonth: tx.billingMonth,
      competenceMonth: tx.competenceMonth,
      installments: tx.installments
    });

    return true;
  }

  document.addEventListener("pointerdown", function (event) {
    if (!isSaveButton(event.target)) return;

    pendingBillingSnapshot = takeBillingSnapshot();
  }, true);

  document.addEventListener("click", function (event) {
    if (!isSaveButton(event.target)) return;

    const snapshot = pendingBillingSnapshot || takeBillingSnapshot();

    setTimeout(function () {
      applyBillingSnapshot(snapshot);
    }, 80);

    setTimeout(function () {
      applyBillingSnapshot(snapshot);
    }, 350);

    setTimeout(function () {
      applyBillingSnapshot(snapshot);
    }, 900);
  }, true);

  window.__cockpitApplyBillingSnapshotNow = function () {
    const snapshot = takeBillingSnapshot();
    return applyBillingSnapshot(snapshot);
  };
})();
