(function () {
  'use strict';
  var pendingPackage = null, selectedPackage = null, working = false, lastOwner = null;
  var months = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  var labels = {
    active: 'Ativa', paid: 'Paga', paid_as_reported: 'Pago no histórico', unpaid_or_renegotiate: 'A pagar / renegociar',
    previous_balance_rolled_forward: 'Saldo incorporado à fatura seguinte', open_partial: 'Em aberto · valor parcial',
    known_future_amount: 'Valor futuro conhecido', future_commitments_only: 'Somente parcelas conhecidas',
    schedule_completed_current_invoice_still_payable: 'Última parcela na fatura atual', outstanding_at_reset: 'A pagar',
    expected_receipt_unconfirmed: 'A receber · recebimento não confirmado', forecast: 'Previsão de reembolso',
    estimated_until_bill: 'Estimativa até chegar a conta', variable: 'Valor variável', active_under_review: 'Em uso · em análise',
    identify_service: 'Identificar serviço', cancellation_requested_not_verified: 'Cancelamento a confirmar',
    unrecognized_disputed: 'Não reconhecido · contestação', pending: 'Pendente'
  };
  function api() { return window.norteiaApp; }
  function state() { return api() && api().getState(); }
  function element(tag, text, cls) { var n = document.createElement(tag); if (text != null) n.textContent = text; if (cls) n.className = cls; return n; }
  function clear(n) { if (n) n.replaceChildren(); }
  function money(cents) { return cents == null ? 'Não informado' : api() && api().money ? api().money(cents / 100) : 'R$ •••'; }
  function valueMoney(cents, record) { return (cents != null && record && record.status === 'estimated' ? '≈ ' : '') + money(cents); }
  function period(value) { var m = /^(\d{4})-(\d{2})$/.exec(String(value || '')); return m ? months[Number(m[2]) - 1] + '/' + m[1] : 'Mês não informado'; }
  function date(value) { if (!value) return 'Não informado'; return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value.split('-').reverse().join('/') : /^\d{4}-\d{2}$/.test(value) ? period(value) + ' · dia não informado' : value; }
  function data() { return window.NorteiaLedger && window.NorteiaLedger.data ? window.NorteiaLedger.data(state()) : null; }
  function name(r) { return r.description || r.name || r.label || r.creditor || 'Registro'; }
  function accountName(pkg, id) { var r = (pkg.accounts || []).find(function (x) { return x.id === id; }); return r ? r.name : 'Instituição não informada'; }
  function status(r) { return labels[r.lifecycleStatus] || labels[r.paymentStatus] || (r.status === 'estimated' ? 'Valor aproximado' : 'Informado'); }
  function host(id, parent, title) {
    var n = document.getElementById(id); if (n) return n;
    var p = document.getElementById(parent); if (!p) return null;
    n = element('section', null, 'ledger-panel card'); n.id = id;
    n.appendChild(element('h2', title)); n.appendChild(element('div', null, 'ledger-body'));
    var anchor = p.querySelector('.page-head');
    if (id === 'ledgerPending') p.appendChild(n);
    else if (anchor) anchor.insertAdjacentElement('afterend', n);
    else if (parent === 'dashboard' && p.firstElementChild) p.firstElementChild.insertAdjacentElement('afterend', n);
    else p.prepend(n);
    return n;
  }
  function notice(parent, text) { if (parent) parent.appendChild(element('p', text, 'ledger-notice')); }
  function table(parent, title, headings, rows) {
    if (!parent) return;
    var details = element('details', null, 'ledger-details'); details.open = rows.length < 10;
    details.appendChild(element('summary', title + ' (' + rows.length + ')'));
    if (!rows.length) { details.appendChild(element('p', 'Nenhum registro neste período.')); parent.appendChild(details); return; }
    var wrap = element('div', null, 'ledger-table-wrap'), t = element('table'), head = element('thead'), tr = element('tr');
    wrap.tabIndex = 0; wrap.setAttribute('role', 'region'); wrap.setAttribute('aria-label', title);
    headings.forEach(function (h) { var th = element('th', h); th.scope = 'col'; tr.appendChild(th); }); head.appendChild(tr); t.appendChild(head);
    var body = element('tbody'); rows.forEach(function (row) { var r = element('tr'); row.forEach(function (v) { r.appendChild(element('td', v == null ? 'Não informado' : String(v))); }); body.appendChild(r); });
    t.appendChild(body); wrap.appendChild(t); details.appendChild(wrap); parent.appendChild(details);
  }
  function latestSnapshot(pkg, invoiceId) {
    var rows = (pkg.invoiceSnapshots || []).filter(function (r) { return r.invoiceId === invoiceId; });
    rows.sort(function (a, b) { return String(b.asOfDate || '').localeCompare(String(a.asOfDate || '')); }); return rows.find(function (r) { return !r.supersededBySnapshotId; }) || rows[0] || null;
  }
  function dueLabel(invoice) {
    var out = invoice.effectiveDueDate ? date(invoice.effectiveDueDate) + ' efetivo' : invoice.nominalDueDate ? date(invoice.nominalDueDate) + ' nominal' : 'Data não informada';
    if (invoice.standardDueDay) out += ' · padrão dia ' + invoice.standardDueDay;
    return out;
  }
  function paymentLabel(r) {
    if (r.kind === 'payroll_deduction' || r.cashFlowTreatment === 'payroll_deduction_not_bank_outflow') return 'Desconto em folha';
    return 'Pagamento informado';
  }
  function debtType(r) { return {payroll_loan: 'Consignado', renegotiated_card_debt: 'Renegociação', mortgage: 'Financiamento imobiliário', invoice_refinancing: 'Parcelamento de fatura'}[r.kind] || 'Dívida'; }
  function currentInstallment(r) { return r.currentInstallmentNumber != null && r.totalInstallments != null ? r.currentInstallmentNumber + '/' + r.totalInstallments + ' · ' + period(r.currentInstallmentPeriod || r.currentBillingPeriod) : 'Não informada'; }
  function recurringAmount(r) { if (r.referenceAmountRangeCents) return valueMoney(r.referenceAmountRangeCents.minimum, r) + ' a ' + money(r.referenceAmountRangeCents.maximum); return valueMoney(r.referenceAmountCents, r); }
  function recurringNote(r) {
    if (r.nextKnownAmountCents != null) return period(r.nextKnownBillingPeriod) + ': ' + money(r.nextKnownAmountCents) + '; pagamento histórico pendente';
    if (r.lifecycleStatus === 'cancellation_requested_not_verified') return 'Cancelamento não confirmado';
    if (r.lifecycleStatus === 'unrecognized_disputed') return 'Sem reconhecimento da cobrança';
    if ((r.relatedHistoricalTransactionIds || []).length) return 'Cobrança histórica vinculada; não lançar de novo';
    return 'Referência mensal; pagamento histórico não confirmado';
  }
  function renderRecords() {
    var s = state(), pkg = data(); if (!s || !pkg) return;
    if (!(pkg.historicalTransactions || []).length && !(pkg.debts || []).length && !(pkg.invoices || []).length) return;
    var ym = api().selectedMonth(), lsum = window.NorteiaLedger.summary(s, ym);
    [['ledgerMovements', 'register', 'Histórico importado'], ['ledgerDebts', 'debts', 'Faturas, parcelas e dívidas importadas'], ['ledgerFuture', 'projection', 'Compromissos conhecidos'], ['ledgerOverview', 'dashboard', 'Histórico e posição financeira']].forEach(function (spec) { host(spec[0], spec[1], spec[2]); });
    var m = document.querySelector('#ledgerMovements .ledger-body'); clear(m);
    notice(m, 'Compras pela data original. A fatura indica quando serão cobradas. Pagamentos de dívida ficam separados dos gastos.');
    table(m, 'Compras e estornos de ' + period(ym), ['Compra', 'Descrição', 'Valor', 'Fatura', 'Categoria / observação'], (pkg.historicalTransactions || []).filter(function (r) { return String(r.purchaseDate || '').slice(0, 7) === ym; }).map(function (r) {
      return [date(r.purchaseDate), name(r), valueMoney(r.amountCents, r), period(r.billingPeriod), r.categorySourceText || 'A classificar'];
    }));
    table(m, 'Encargos financeiros', ['Data', 'Descrição', 'Valor', 'Fatura'], (pkg.financialCharges || []).filter(function (r) { return String(r.chargeDate || r.date || '').slice(0, 7) === ym; }).map(function (r) { return [date(r.chargeDate || r.date), name(r), valueMoney(r.amountCents, r), period(r.billingPeriod)]; }));
    table(m, 'Pagamentos de dívida', ['Data / mês', 'Descrição', 'Valor', 'Forma de pagamento'], (pkg.payments || []).filter(function (r) { return String(r.paymentDate || r.paymentMonth || '').slice(0, 7) === ym; }).map(function (r) { return [date(r.paymentDate || r.paymentMonth), name(r), valueMoney(r.amountCents, r), paymentLabel(r)]; }));
    var d = document.querySelector('#ledgerDebts .ledger-body'); clear(d);
    notice(d, 'As faturas mostram a posição conhecida, sem repetir compras como nova despesa. Valores em aberto podem ser parciais; parcelas já incluídas na fatura não são somadas novamente.');
    table(d, 'Faturas e valores conhecidos', ['Instituição', 'Fatura', 'Valor conhecido', 'Vencimento', 'Situação'], (pkg.invoices || []).map(function (r) {
      var snapshot = latestSnapshot(pkg, r.id), amount = snapshot ? (snapshot.isMinimumKnownAmount ? 'Pelo menos ' : '') + valueMoney(snapshot.amountCents, snapshot) : 'Total ainda não informado';
      return [accountName(pkg, r.accountId), r.billingPeriod ? period(r.billingPeriod) : 'Fatura anterior', amount, dueLabel(r), status(r)];
    }));
    table(d, 'Compras parceladas e parcelamento de fatura', ['Compra', 'Parcela atual', 'Valor mensal', 'Próximas parcelas', 'Situação'], (pkg.installmentPlans || []).map(function (r) {
      return [name(r), currentInstallment(r), valueMoney(r.installmentAmountCents, r), r.sourceFutureSchedule || 'Não informadas', r.currentInstallmentAlreadyInHistoricalTransactions ? 'Parcela atual já vinculada ao histórico' : status(r)];
    }));
    table(d, 'Empréstimos e financiamento', ['Dívida', 'Tipo', 'Parcela atual', 'Valor da parcela', 'Restantes', 'Saldo principal', 'CET', 'Próximo vencimento'], (pkg.debts || []).map(function (r) {
      var remaining = r.remainingInstallmentsAfterOctober != null ? r.remainingInstallmentsAfterOctober : r.remainingInstallmentsAfterCurrent;
      return [name(r), debtType(r), currentInstallment(r), r.installmentAmountCents != null ? valueMoney(r.installmentAmountCents, r) : r.nextKnownInstallmentAmountCents != null ? money(r.nextKnownInstallmentAmountCents) + ' · próxima conhecida' : 'Não informado', remaining == null ? 'Não informado' : (r.status === 'estimated' ? 'Cerca de ' : '') + remaining, money(r.outstandingPrincipalCents), r.cet == null ? 'Não informado' : String(r.cet), r.nextPaymentDate ? date(r.nextPaymentDate) : r.nextExpectedPeriod ? period(r.nextExpectedPeriod) + ' · dia não informado' : 'Não informado'];
    }));
    notice(d, 'Descontos em folha ficam separados dos pagamentos bancários. Saldos, taxas e quitações não informados permanecem pendentes.');
    table(d, 'Tributos e obrigações existentes', ['Obrigação', 'Valor', 'Vencimento', 'Situação', 'Pagamento planejado'], (pkg.taxObligations || []).map(function (r) { return [name(r), valueMoney(r.amountCents, r), date(r.dueDate), status(r), r.intendedFundingSource === '13o_salario' ? 'Com o 13º salário' : 'A definir']; }));
    table(d, 'Regras de cobrança de cartão', ['Data da compra', 'Fatura', 'Vencimento nominal', 'Vencimento efetivo'], (pkg.cardBillingRules || []).map(function (r) {
      return [date(r.purchaseDateFrom) + ' a ' + (r.purchaseDateThrough ? date(r.purchaseDateThrough) : r.purchaseDateThroughApproximateText ? 'aproximadamente ' + r.purchaseDateThroughApproximateText.replace(/^~/, '') : 'data pendente'), period(r.billingPeriod), date(r.nominalDueDate), date(r.effectiveDueDate)];
    }));
    var f = document.querySelector('#ledgerFuture .ledger-body'); clear(f); var c = window.NorteiaLedger.commitments(s, ym);
    table(f, 'Compromissos de ' + period(ym), ['Descrição', 'Valor', 'Vencimento', 'Forma / situação'], (c.items || []).map(function (r) {
      return [name(r), valueMoney(r.amountCents, r), date(r.dueDate), r.direction === 'inflow' ? 'Recebimento previsto' : r.cashImpact === false || r.kind === 'payroll_deduction' ? 'Desconto em folha / já incluído na fatura' : 'A pagar'];
    }));
    table(f, 'Parcelas futuras listadas', ['Compra', 'Parcela', 'Fatura', 'Valor', 'Situação'], (pkg.futureInstallmentCommitments || []).filter(function (r) { return r.billingPeriod === ym; }).map(function (r) {
      return [name(r), r.installmentNumber + '/' + r.totalInstallments, period(r.billingPeriod), valueMoney(r.amountCents, r), r.alreadyIncludedInKnownInvoiceSnapshot ? 'Já incluída na posição da fatura' : 'Compromisso futuro'];
    }));
    table(f, 'Reembolsos a receber', ['Referência', 'Parcela', 'Valor', 'Situação', 'Recebimento'], (pkg.receivables || []).map(function (r) { return [period(r.billingPeriod), r.installmentNumber, valueMoney(r.amountCents, r), status(r), r.receiptConfirmed ? date(r.receivedDate) : 'Não confirmado']; }));
    notice(f, 'Reembolsos previstos ainda não são entrada de caixa. As contas recorrentes são referências; o histórico só recebe pagamentos e cobranças confirmados.');
    table(f, 'Contas recorrentes de referência', ['Conta', 'Valor de referência', 'Situação', 'Observação'], (pkg.recurringBills || []).map(function (r) { return [name(r), recurringAmount(r), status(r), recurringNote(r)]; }));
    table(f, 'Componentes conhecidos das faturas', ['Componente', 'Valor', 'Frequência', 'Tratamento'], (pkg.knownInvoiceComponents || []).map(function (r) { return [name(r), valueMoney(r.amountCents, r), r.frequency === 'monthly' ? 'Mensal' : 'Não informada', 'Já pode integrar a fatura; não somar de novo']; }));
    table(f, 'Simulação de acordo sem contratação', ['Entrada simulada', 'Parcelas simuladas', 'Total nominal simulado', 'Situação'], (pkg.inactiveSimulations || []).map(function (r) {
      return [money(r.downPaymentAmountCents), r.installmentCount + ' × ' + money(r.installmentAmountCents), money(r.totalNominalSimulatedCents), 'Inativa · contratação não confirmada'];
    }));
    var o = document.querySelector('#ledgerOverview .ledger-body'); clear(o);
    table(o, 'Resumo de ' + period(ym), ['Informação', 'Valor'], [['Compras líquidas por data', money((lsum.consumptionCents || 0) + (lsum.cardFeesCents || 0))], ['Encargos financeiros', money(lsum.financialChargesCents)], ['Pagamentos bancários informados', money(lsum.cashOutflowCents)], ['Descontos em folha', money(lsum.payrollDeductionsCents)]]);
    notice(o, 'Posição informada em ' + date(pkg.asOfDate) + '. Alguns valores de dívida e informações de caixa ainda dependem de confirmação.');
    var pendingHost = host('ledgerPending', 'settings', 'Pendências da importação'), pending = pendingHost && pendingHost.querySelector('.ledger-body'); clear(pending);
    (pkg.pendingItems || []).forEach(function (r) { notice(pending, r.description || 'Informação pendente de confirmação.'); });
    renderIntegratedSummaries(s, pkg, ym, lsum);
    protectUnknownBalances(s);
  }
  function renderIntegratedSummaries(s, pkg, ym, lsum) {
    var c = window.NorteiaLedger.commitments(s, ym), historical = ym <= String(pkg.asOfDate).slice(0, 7);
    var monthly = historical ? lsum.cashOutflowCents + lsum.payrollDeductionsCents : c.cashOutflowCents + c.payrollDeductionsCents;
    ['dashboardDebtMonth', 'debtMonthKpi'].forEach(function (id) { var n = document.getElementById(id); if (n) n.textContent = money(monthly); });
    var liabilities = window.NorteiaLedger.liabilities(s), balance = document.getElementById('debtBalanceKpi');
    if (balance) balance.textContent = money(liabilities.knownLiabilityCents) + (liabilities.hasUnknownBalances ? ' · parcial' : '');
    var count = document.getElementById('debtActiveKpi'); if (count) count.textContent = String((s.debts || []).filter(function (r) { return r.status !== 'paid'; }).length + (pkg.debts || []).filter(function (r) { return r.lifecycleStatus === 'active'; }).length);
    if (!(s.debts || []).length) { var oldDebts = document.getElementById('debtList'); if (oldDebts) oldDebts.replaceChildren(element('p', 'As faturas e dívidas importadas estão detalhadas nesta página.')); }
    if (!window.NorteiaLedger.effectiveLegacyTransactions(s).length) {
      var oldRows = document.getElementById('txList'); if (oldRows) oldRows.replaceChildren(element('p', 'Consulte o histórico importado acima para ver compras, encargos e pagamentos.'));
      var next = document.getElementById('nextActions'); if (next) next.replaceChildren(element('p', 'Histórico importado. Complete renda e saldo atual para calcular sua margem.'));
    }
    var latest = document.getElementById('latestTransactions');
    if (latest) {
      var imported = (pkg.historicalTransactions || []).filter(function (r) { return String(r.purchaseDate).slice(0, 7) === ym; }).slice().sort(function (a, b) { return b.purchaseDate.localeCompare(a.purchaseDate); }).slice(0, 5);
      if (imported.length && !window.NorteiaLedger.effectiveLegacyTransactions(s).length) {
        clear(latest); imported.forEach(function (r) { var row = element('div', null, 'item'), body = element('div'); body.append(element('b', name(r)), element('small', date(r.purchaseDate) + ' · Fatura ' + period(r.billingPeriod))); row.append(body, element('strong', money(r.amountCents))); latest.appendChild(row); });
      }
    }
    var due = document.getElementById('dashboardDueList');
    if (due && !(s.debts || []).length) {
      var items = c.items.filter(function (r) { return r.direction !== 'inflow'; });
      if (!items.length) { var bits = ym.split('-'), nextMonth = new Date(Date.UTC(Number(bits[0]), Number(bits[1]), 1)).toISOString().slice(0, 7); items = window.NorteiaLedger.commitments(s, nextMonth).items.filter(function (r) { return r.direction !== 'inflow'; }); }
      if (items.length) { clear(due); items.slice(0, 5).forEach(function (r) { var row = element('div', null, 'item'), body = element('div'); body.append(element('b', name(r)), element('small', r.dueDate ? date(r.dueDate) : period(r.billingPeriod) + ' · dia não informado')); row.append(body, element('strong', money(r.amountCents))); due.appendChild(row); }); }
    }
  }
  function protectUnknownBalances(s) {
    if (!s.migrationLedger || !window.summary) return;
    var sum = window.summary(api().selectedMonth()), n;
    if (!sum.ledgerNetKnown) {
      n = document.getElementById('netWorth'); if (n) n.textContent = 'A informar';
      n = document.getElementById('netWorthStatus'); if (n) n.textContent = 'Saldos devedores ainda incompletos';
    }
    if (sum.ledgerBalanceKnown) return;
    ['cashBalance', 'statementNet', 'futureEndBalance', 'futureCanInvest', 'analysisCashYear'].forEach(function (id) { var item = document.getElementById(id); if (item) item.textContent = 'A informar'; });
    ['todaySafeValue', 'mobileSpendToday'].forEach(function (id) { var item = document.getElementById(id); if (item) item.textContent = 'Complete renda e saldo'; });
    n = document.getElementById('todayStatus'); if (n) n.textContent = 'Dados parciais';
    n = document.getElementById('todayCommand'); if (n) n.textContent = 'Informe renda e saldo para calcular sua margem.';
    n = document.getElementById('todayExplanation'); if (n) n.textContent = 'O histórico já está registrado. Faltam dados de caixa para avaliar sua margem.';
    n = document.getElementById('dashboardCashflowProjection'); if (n) n.replaceChildren(element('p', 'Projeção de saldo pendente. Consulte os compromissos conhecidos no Fluxo futuro.'));
    n = document.getElementById('futureMonthList'); if (n) n.querySelectorAll('.amount').forEach(function (a) { a.textContent = 'Saldo a informar'; });
    n = document.getElementById('todayPrimaryAction'); if (n) { n.textContent = 'Ver histórico'; n.onclick = function () { window.setView('register'); }; }
  }
  function setupImporter() {
    var h = host('ledgerImporter', 'settings', 'Importar histórico detalhado'); if (!h || h.dataset.bound) return; h.dataset.bound = 'true';
    var b = h.querySelector('.ledger-body'); notice(b, 'Escolha o arquivo do histórico e confira os registros antes de importar. Itens já importados serão reconhecidos.');
    var fileLabel = element('label', 'Arquivo do histórico'), file = element('input'); file.type = 'file'; file.id = 'ledgerImportFile'; file.accept = '.json,application/json'; fileLabel.appendChild(file); b.appendChild(fileLabel);
    var advanced = element('details', null, 'ledger-details ledger-advanced'); advanced.appendChild(element('summary', 'Colar dados · avançado'));
    var label = element('label', 'Dados do histórico'), input = element('textarea'); input.id = 'ledgerImportText'; input.rows = 5; input.setAttribute('spellcheck', 'false'); input.setAttribute('autocomplete', 'off'); label.appendChild(input); advanced.appendChild(label); b.appendChild(advanced);
    var preview = element('button', 'Conferir importação', 'btn'); preview.type = 'button'; preview.id = 'ledgerPreviewBtn'; b.appendChild(preview);
    var result = element('div'); result.id = 'ledgerImportPreview'; result.setAttribute('role', 'status'); result.setAttribute('aria-live', 'polite'); b.appendChild(result);
    var confirm = element('button', 'Importar histórico conferido', 'btn primary'); confirm.type = 'button'; confirm.id = 'ledgerConfirmBtn'; confirm.hidden = true; b.appendChild(confirm);
    function invalidate() { pendingPackage = null; confirm.hidden = true; clear(result); }
    input.addEventListener('input', function () { selectedPackage = null; file.value = ''; invalidate(); });
    file.addEventListener('change', async function () {
      invalidate(); selectedPackage = null; input.value = '';
      if (!file.files || !file.files[0]) return;
      preview.disabled = true;
      try { selectedPackage = JSON.parse(await file.files[0].text()); notice(result, 'Arquivo selecionado. Confira a importação para continuar.'); }
      catch (e) { notice(result, 'Não foi possível ler o arquivo. Escolha um histórico válido.'); }
      finally { preview.disabled = false; }
    });
    preview.addEventListener('click', function () {
      if (working) return; invalidate();
      try {
        var pkg = selectedPackage || JSON.parse(input.value); api().previewLedgerPackage(pkg); pendingPackage = pkg;
        notice(result, 'Histórico conferido. A importação combina os registros e reconhece itens já importados.');
        var sample = pkg.historicalTransactions || [];
        table(result, 'Compras e estornos do arquivo', ['Data', 'Descrição', 'Valor', 'Fatura'], sample.map(function (r) { return [date(r.purchaseDate), name(r), valueMoney(r.amountCents, r), period(r.billingPeriod)]; }));
        notice(result, sample.length + ' compras/estornos; ' + (pkg.financialCharges || []).length + ' encargos; ' + (pkg.installmentPlans || []).length + ' parcelamentos; ' + (pkg.debts || []).length + ' dívidas.');
        confirm.hidden = false;
      } catch (e) { notice(result, 'Não foi possível conferir: ' + e.message); }
    });
    confirm.addEventListener('click', async function () {
      if (!pendingPackage || working) return; working = true; confirm.disabled = true; preview.disabled = true; file.disabled = true; input.disabled = true;
      try { var imported = await api().importLedgerPackage(pendingPackage); clear(result); notice(result, imported.saved ? 'Histórico importado e sincronizado.' : 'Histórico salvo neste aparelho. A sincronização está pendente.'); confirm.hidden = true; input.value = ''; file.value = ''; pendingPackage = null; selectedPackage = null; }
      catch (e) { clear(result); notice(result, 'Importação não concluída: ' + e.message); }
      finally { working = false; confirm.disabled = false; preview.disabled = false; file.disabled = false; input.disabled = false; }
    });
  }
  function clearImportedPanels() { ['ledgerMovements', 'ledgerDebts', 'ledgerFuture', 'ledgerOverview', 'ledgerPending'].forEach(function (id) { var panel = document.getElementById(id); if (panel) panel.remove(); }); }
  function render() {
    if (!api() || !state() || !window.NorteiaLedger) { clearImportedPanels(); return; }
    setupImporter();
    var owner = window.cockpitUser && window.cockpitUser.id || '', pkg = data();
    if (lastOwner !== null && lastOwner !== owner) {
      ['ledgerImportText', 'ledgerImportFile'].forEach(function (id) { var input = document.getElementById(id); if (input) input.value = ''; });
      selectedPackage = null;
    }
    lastOwner = owner;
    var preview = document.getElementById('ledgerImportPreview'), confirm = document.getElementById('ledgerConfirmBtn');
    if (preview) clear(preview); if (confirm) confirm.hidden = true; pendingPackage = null;
    if (!pkg || !(pkg.historicalTransactions || []).length && !(pkg.debts || []).length && !(pkg.invoices || []).length) { clearImportedPanels(); return; }
    renderRecords();
  }
  window.addEventListener('norteia:rendered', render); document.addEventListener('norteia:render', render);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', render); else render();
})();
