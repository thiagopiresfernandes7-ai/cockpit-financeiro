(function (root, factory) {
  'use strict';
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.NorteiaLedger = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  // The migration ledger keeps economic events, cash settlements and liability
  // snapshots independent. Amounts are integer cents; unknown facts stay null.
  var COLLECTIONS = [
    'sources', 'referencedDocuments', 'accounts', 'cardBillingRules',
    'historicalTransactions', 'financialCharges', 'installmentPlans',
    'futureInstallmentCommitments', 'invoices', 'invoiceSnapshots', 'payments',
    'debts', 'receivables', 'taxObligations', 'recurringBills',
    'knownInvoiceComponents', 'inactiveSimulations', 'pendingItems'
  ];
  var MONEY_COLLECTIONS = ['historicalTransactions', 'financialCharges',
    'futureInstallmentCommitments', 'invoiceSnapshots', 'payments',
    'receivables', 'taxObligations', 'knownInvoiceComponents'];
  var ARRAY_KEYS = new Set(COLLECTIONS);
  var has = function (o, key) { return Object.prototype.hasOwnProperty.call(o, key); };
  function clone(value) { return value == null ? value : JSON.parse(JSON.stringify(value)); }
  function list(o, key) { return o && Array.isArray(o[key]) ? o[key] : []; }
  function stable(value) {
    if (Array.isArray(value)) return '[' + value.map(stable).join(',') + ']';
    if (value && typeof value === 'object') return '{' + Object.keys(value).sort().map(function (key) {
      return JSON.stringify(key) + ':' + stable(value[key]);
    }).join(',') + '}';
    return JSON.stringify(value);
  }
  function digest(value) {
    var input = stable(value), hash = 2166136261;
    for (var i = 0; i < input.length; i++) { hash ^= input.charCodeAt(i); hash = Math.imul(hash, 16777619); }
    return (hash >>> 0).toString(16).padStart(8, '0');
  }
  function normalize(value) {
    return String(value == null ? '' : value).normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  }
  function isDate(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    var parsed = new Date(value + 'T12:00:00Z');
    return !isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
  }
  function isMonth(value) { return typeof value === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(value); }
  function monthOf(value) { return typeof value === 'string' ? value.slice(0, 7) : null; }
  function addMonths(ym, count) {
    var parts = ym.split('-');
    return new Date(Date.UTC(Number(parts[0]), Number(parts[1]) - 1 + count, 1)).toISOString().slice(0, 7);
  }
  function monthDistance(from, to) {
    return (Number(to.slice(0, 4)) - Number(from.slice(0, 4))) * 12 + Number(to.slice(5)) - Number(from.slice(5));
  }
  function cents(value) { return Number.isSafeInteger(value) ? value : 0; }
  function active(row) { return row && !['paid', 'settled', 'cancelled', 'inactive'].includes(row.lifecycleStatus); }
  function mapById(rows) { return new Map(rows.map(function (row) { return [row.id, row]; })); }
  function emptyData() {
    var out = { schemaVersion: '1.0.0', asOfDate: null, importedPackages: [] };
    COLLECTIONS.forEach(function (key) { out[key] = []; });
    return out;
  }
  function ledgerOf(state) { return state && state.migrationLedger || null; }
  function internalData(state) {
    var ledger = ledgerOf(state);
    return ledger && ledger.data && typeof ledger.data === 'object' ? ledger.data : emptyData();
  }
  function data(state) { return clone(internalData(state)); }

  function validatePackage(pkg) {
    var errors = [], warnings = [], counts = {};
    function error(message) { errors.push(message); }
    if (!pkg || typeof pkg !== 'object' || Array.isArray(pkg)) {
      return { valid: false, errors: ['O pacote precisa ser um objeto JSON.'], warnings: [], counts: {} };
    }
    if (typeof pkg.packageId !== 'string' || !pkg.packageId.trim()) error('packageId é obrigatório.');
    if (pkg.schemaVersion !== '1.0.0') error('Versão de pacote não suportada: ' + String(pkg.schemaVersion));
    if (pkg.packageType !== 'canonical_financial_migration_staging_package') error('Tipo de pacote não suportado.');
    if (!isDate(pkg.asOfDate)) error('asOfDate deve ser uma data válida.');
    if (pkg.currency && pkg.currency !== 'BRL') error('Este importador aceita apenas BRL.');
    if (pkg.moneyRepresentation && pkg.moneyRepresentation !== 'integer_cents') error('Valores devem usar centavos inteiros.');
    Object.keys(pkg).forEach(function (key) {
      if (Array.isArray(pkg[key]) && !ARRAY_KEYS.has(key)) error('Coleção não suportada: ' + key);
    });
    var indexes = {};
    function validateMoneyObject(object, path, allowRefund) {
      Object.keys(object).forEach(function (field) {
        var value = object[field], fieldPath = path + '.' + field;
        if (value == null) return;
        if (/RangeCents$/.test(field)) {
          if (!value || typeof value !== 'object' || !Number.isSafeInteger(value.minimum) || !Number.isSafeInteger(value.maximum) || value.minimum < 0 || value.minimum > value.maximum) error(fieldPath + ': faixa de centavos inválida.');
        } else if (/Cents$/.test(field)) {
          if (!Number.isSafeInteger(value)) error(fieldPath + ': centavos inteiros obrigatórios.');
          else if (value < 0 && !(allowRefund && field === 'amountCents') && !/(?:Difference|Discrepancy)Cents$/.test(field)) error(fieldPath + ': valor monetário negativo não permitido.');
        } else if (value && typeof value === 'object' && !Array.isArray(value)) validateMoneyObject(value, fieldPath, false);
      });
    }
    COLLECTIONS.forEach(function (key) {
      if (has(pkg, key) && !Array.isArray(pkg[key])) error(key + ' deve ser uma lista.');
      indexes[key] = new Set();
      counts[key] = list(pkg, key).length;
      list(pkg, key).forEach(function (row, index) {
        var prefix = key + '[' + index + ']';
        if (!row || typeof row !== 'object' || Array.isArray(row)) { error(prefix + ' inválido.'); return; }
        if (typeof row.id !== 'string' || !row.id) error(prefix + ': id obrigatório.');
        else if (indexes[key].has(row.id)) error(prefix + ': id duplicado ' + row.id);
        else indexes[key].add(row.id);
        validateMoneyObject(row, prefix, key === 'historicalTransactions' && row.kind === 'refund');
        Object.keys(row).forEach(function (field) {
          var value = row[field];
          if (/(?:Date|DateFrom|DateThrough)$/.test(field) && value != null && !isDate(value)) error(prefix + '.' + field + ': data inválida.');
          if (/(?:Period|Month)$/.test(field) && value != null && !isMonth(value)) error(prefix + '.' + field + ': mês inválido.');
        });
        if (MONEY_COLLECTIONS.includes(key) && !Number.isSafeInteger(row.amountCents)) error(prefix + ': amountCents obrigatório.');
        if (Number.isSafeInteger(row.amountCents)) {
          if (key === 'historicalTransactions' && row.kind === 'refund') {
            if (row.amountCents >= 0) error(prefix + ': estorno deve ser negativo.');
          } else if (row.amountCents < 0) error(prefix + ': valor negativo permitido apenas para estorno.');
        }
      });
    });
    if (errors.length) return { valid: false, errors: errors, warnings: warnings, counts: counts };
    function ref(collection, field, target) {
      list(pkg, collection).forEach(function (row) {
        if (row && row[field] != null && !indexes[target].has(row[field])) error(collection + '/' + row.id + ': referência inexistente ' + field + '=' + row[field]);
      });
    }
    ['cardBillingRules', 'historicalTransactions', 'financialCharges', 'installmentPlans',
      'futureInstallmentCommitments', 'invoices', 'invoiceSnapshots', 'payments', 'debts',
      'taxObligations', 'recurringBills', 'knownInvoiceComponents', 'inactiveSimulations'].forEach(function (key) { ref(key, 'accountId', 'accounts'); });
    ['historicalTransactions', 'financialCharges', 'futureInstallmentCommitments', 'invoiceSnapshots', 'payments'].forEach(function (key) { ref(key, 'invoiceId', 'invoices'); });
    ref('historicalTransactions', 'installmentPlanId', 'installmentPlans');
    ref('futureInstallmentCommitments', 'installmentPlanId', 'installmentPlans');
    ref('futureInstallmentCommitments', 'includedSnapshotId', 'invoiceSnapshots');
    ref('invoiceSnapshots', 'supersededBySnapshotId', 'invoiceSnapshots');
    ref('payments', 'debtId', 'debts');
    ref('debts', 'representedByInstallmentPlanId', 'installmentPlans');
    ref('receivables', 'relatedInvoiceId', 'invoices');
    ref('receivables', 'relatedInstallmentPlanId', 'installmentPlans');
    ref('receivables', 'relatedFutureCommitmentId', 'futureInstallmentCommitments');
    list(pkg, 'historicalTransactions').forEach(function (row) {
      if (!isDate(row.purchaseDate)) error('historicalTransactions/' + row.id + ': data da compra obrigatória.');
      if (row.purchaseDate > pkg.asOfDate) error('historicalTransactions/' + row.id + ': compra posterior à data de referência.');
      if (!['purchase', 'refund', 'card_fee'].includes(row.kind)) error('historicalTransactions/' + row.id + ': tipo não suportado.');
    });
    list(pkg, 'financialCharges').forEach(function (row) {
      if (!isDate(row.chargeDate) || row.chargeDate > pkg.asOfDate) error('financialCharges/' + row.id + ': data do encargo inválida.');
    });
    list(pkg, 'invoiceSnapshots').forEach(function (row) {
      if (row.isExpense !== false) error('invoiceSnapshots/' + row.id + ': saldo de fatura não pode ser despesa.');
    });
    list(pkg, 'payments').forEach(function (row) {
      if (row.isConsumptionExpense !== false) error('payments/' + row.id + ': pagamento não pode ser consumo.');
      if (!row.paymentDate && !isMonth(row.paymentMonth)) error('payments/' + row.id + ': informe data ou mês conhecido do pagamento.');
      if (!['bank_or_cash_outflow', 'payroll_deduction_not_bank_outflow'].includes(row.cashFlowTreatment)) error('payments/' + row.id + ': tratamento de caixa não suportado.');
      if ((row.kind === 'payroll_deduction' || row.paymentMethod === 'payroll_deduction') && row.cashFlowTreatment !== 'payroll_deduction_not_bank_outflow') error('payments/' + row.id + ': desconto em folha não é pagamento bancário.');
    });
    list(pkg, 'futureInstallmentCommitments').forEach(function (row) {
      if (!isMonth(row.billingPeriod)) error('futureInstallmentCommitments/' + row.id + ': competência obrigatória.');
      if (!Number.isSafeInteger(row.installmentNumber) || !Number.isSafeInteger(row.totalInstallments) || row.installmentNumber < 1 || row.installmentNumber > row.totalInstallments) error('futureInstallmentCommitments/' + row.id + ': numeração inválida.');
      if (row.alreadyIncludedInKnownInvoiceSnapshot === true && !row.includedSnapshotId) error('futureInstallmentCommitments/' + row.id + ': vínculo de snapshot obrigatório.');
    });
    list(pkg, 'inactiveSimulations').forEach(function (row) {
      if (row.active !== false || row.contracted !== false || row.createDebt !== false || row.createPayment !== false || row.createCommitments !== false) error('inactiveSimulations/' + row.id + ': simulação deve permanecer inativa e não contratada.');
    });
    if (list(pkg, 'pendingItems').some(function (row) { return row.blocksEntirePackage === true; })) error('O pacote contém uma pendência que impede a importação.');
    if (list(pkg, 'debts').some(function (row) { return active(row) && row.outstandingPrincipalCents == null; })) warnings.push('Há dívidas sem saldo principal confirmado; o passivo total permanece parcial.');
    if (list(pkg, 'taxObligations').some(function (row) { return active(row) && row.dueDate == null; })) warnings.push('Obrigações sem vencimento ficam no passivo e não recebem data de pagamento.');
    if (list(pkg, 'recurringBills').length) warnings.push('Contas recorrentes são referências; este pacote não comprova pagamentos nem cria despesas históricas.');
    return { valid: errors.length === 0, errors: errors, warnings: warnings, counts: counts };
  }

  function legacyFingerprint(row) {
    if (!row || !Number.isFinite(Number(row.value))) return null;
    var date = row.originalPurchaseDate || row.date;
    if (!isDate(date)) return null;
    var type = row.type || 'expense';
    return [date, type, normalize(row.description), Math.round(Number(row.value) * 100)].join('|');
  }
  function canonicalFingerprint(row, collection) {
    var date = collection === 'historicalTransactions' ? row.purchaseDate : collection === 'financialCharges' ? row.chargeDate : row.paymentDate;
    if (!isDate(date)) return null;
    var type = collection === 'payments' ? 'debt' : 'expense';
    return [date, type, normalize(row.description), row.amountCents].join('|');
  }
  function legacyMatches(state, incomingData) {
    var candidates = new Map(), canonical = new Map(), errors = [], exclusions = [];
    list(state, 'transactions').forEach(function (row) {
      var key = legacyFingerprint(row);
      if (!key) return;
      if (!candidates.has(key)) candidates.set(key, []);
      candidates.get(key).push(row);
    });
    ['historicalTransactions', 'financialCharges', 'payments'].forEach(function (collection) {
      list(incomingData, collection).forEach(function (row) {
        var key = canonicalFingerprint(row, collection);
        if (!key) return;
        if (!canonical.has(key)) canonical.set(key, []);
        canonical.get(key).push(row);
      });
    });
    canonical.forEach(function (rows, key) {
      var matched = candidates.get(key) || [];
      if (!matched.length) return;
      if (matched.length !== 1 || rows.length !== 1 || !matched[0].id) {
        errors.push('Correspondência ambígua com transações antigas: ' + key);
        return;
      }
      var old = matched[0], row = rows[0];
      var count = old.installments && old.installments.count || old.installmentCount || 1;
      if (Number(count) > 1) {
        errors.push('Compra antiga parcelada precisa de conciliação explícita: ' + old.id);
        return;
      }
      exclusions.push({ legacyId: old.id, legacyFingerprint: legacyFingerprint(old), ledgerRowId: row.id, reason: 'unique_exact_fingerprint' });
    });
    list(state, 'transactions').forEach(function (old) {
      var count = Number(old.installments && old.installments.count || old.installmentCount || 1);
      if (count <= 1) return;
      var monthlyCents = Math.round(Number(old.value || 0) * 100 / count);
      var description = normalize(old.description);
      var matchingRow = list(incomingData, 'historicalTransactions').some(function (row) {
        return normalize(row.description) === description && row.amountCents === monthlyCents && row.purchaseDate === (old.originalPurchaseDate || old.date);
      });
      var matchingPlan = list(incomingData, 'installmentPlans').some(function (row) {
        return normalize(row.description) === description && row.installmentAmountCents === monthlyCents;
      });
      if (matchingRow || matchingPlan) errors.push('Compra antiga parcelada precisa de conciliação explícita: ' + (old.id || description));
    });
    // With an unknown day, a same-month candidate cannot be safely identified.
    list(incomingData, 'payments').filter(function (row) { return !row.paymentDate; }).forEach(function (row) {
      var possible = list(state, 'transactions').some(function (old) {
        return monthOf(old.date) === row.paymentMonth && normalize(old.description) === normalize(row.description) && Math.round(Number(old.value || 0) * 100) === row.amountCents;
      });
      if (possible) errors.push('Pagamento com dia desconhecido precisa de conciliação: ' + row.id);
    });
    list(incomingData, 'payments').filter(function (row) { return row.paymentDate; }).forEach(function (row) {
      var mismatchedType = list(state, 'transactions').some(function (old) {
        return (old.type || 'expense') !== 'debt' && old.date === row.paymentDate && normalize(old.description) === normalize(row.description) && Math.round(Number(old.value || 0) * 100) === row.amountCents;
      });
      if (mismatchedType) errors.push('Pagamento já classificado no histórico antigo precisa de conciliação: ' + row.id);
    });
    list(state, 'debts').filter(function (old) { return old && old.status !== 'paid'; }).forEach(function (old) {
      var description = normalize(old.name || old.description), creditor = normalize(old.creditor);
      var match = list(incomingData, 'debts').find(function (row) {
        return (description && description === normalize(row.description)) || (creditor && creditor === normalize(row.creditor));
      });
      if (!match) match = list(incomingData, 'accounts').find(function (row) {
        var name = normalize(row.name);
        return name && (name === description || name === creditor);
      });
      if (match) errors.push('Dívida antiga possivelmente equivalente precisa de conciliação: ' + (old.id || description));
    });
    list(state, 'futureCashflowItems').filter(function (old) { return old && old.status !== 'cancelled'; }).forEach(function (old) {
      var description = normalize(old.description), amount = Math.round(Number(old.amount || 0) * 100);
      var match = list(incomingData, 'futureInstallmentCommitments').some(function (row) { return normalize(row.description) === description && row.amountCents === amount; });
      if (!match) match = list(incomingData, 'debts').some(function (row) { return normalize(row.description) === description && [row.installmentAmountCents, row.nextKnownInstallmentAmountCents].includes(amount); });
      if (!match) match = list(incomingData, 'invoiceSnapshots').some(function (row) {
        var account = list(incomingData, 'accounts').find(function (a) { return a.id === row.accountId; });
        var accountName = account && normalize(account.name);
        return row.includeInCurrentLiability === true && row.amountCents === amount && accountName && description.includes(accountName);
      });
      if (match) errors.push('Compromisso futuro antigo possivelmente equivalente precisa de conciliação: ' + (old.id || description));
    });
    return { exclusions: exclusions, errors: errors };
  }
  function failure(errors) {
    var err = new Error(errors.join('\n'));
    err.name = 'LedgerValidationError'; err.errors = errors;
    return err;
  }
  function mergePackage(state, pkg, options) {
    options = options || {};
    var validation = validatePackage(pkg);
    if (!validation.valid) throw failure(validation.errors);
    var sourceState = state && typeof state === 'object' ? state : {};
    var ledger = ledgerOf(sourceState), imports = ledger && Array.isArray(ledger.imports) ? ledger.imports : [];
    var signature = stable(pkg), existingImport = imports.find(function (record) { return record.packageId === pkg.packageId; });
    if (existingImport) {
      if (existingImport.signature !== signature) throw failure(['O packageId já existe com conteúdo diferente. Gere um novo pacote para corrigir os dados.']);
      return { state: sourceState, report: { packageId: pkg.packageId, noOp: true, addedCount: 0, counts: validation.counts, warnings: validation.warnings, legacyExclusions: clone(ledger.legacyExclusions || []) } };
    }
    var merged = clone(internalData(sourceState)), addedCounts = {}, added = 0;
    COLLECTIONS.forEach(function (collection) {
      var rows = list(merged, collection), existing = mapById(rows);
      addedCounts[collection] = 0;
      list(pkg, collection).forEach(function (row) {
        if (existing.has(row.id)) {
          if (stable(existing.get(row.id)) !== stable(row)) throw failure(['Registro existente com conteúdo diferente: ' + collection + '/' + row.id]);
          return;
        }
        rows.push(clone(row)); existing.set(row.id, row); addedCounts[collection]++; added++;
      });
      merged[collection] = rows;
    });
    var metadata = {};
    Object.keys(pkg).forEach(function (key) { if (!ARRAY_KEYS.has(key)) Object.defineProperty(metadata, key, { value: clone(pkg[key]), enumerable: true, writable: true, configurable: true }); });
    var importedAt = options.importedAt || new Date().toISOString();
    merged.asOfDate = [merged.asOfDate, pkg.asOfDate].filter(Boolean).sort().pop() || null;
    merged.importedPackages = list(merged, 'importedPackages').concat([{ packageId: pkg.packageId, asOfDate: pkg.asOfDate, importedAt: importedAt, metadata: metadata }]);
    var matching = legacyMatches(sourceState, merged);
    if (matching.errors.length) throw failure(matching.errors);
    var nextState = clone(sourceState);
    nextState.migrationLedger = {
      schemaVersion: 1, revision: Number(ledger && ledger.revision || 0) + 1,
      updatedAt: importedAt, data: merged, legacyExclusions: matching.exclusions,
      imports: clone(imports).concat([{ packageId: pkg.packageId, asOfDate: pkg.asOfDate, importedAt: importedAt, checksum: digest(pkg), signature: signature }])
    };
    return { state: nextState, report: { packageId: pkg.packageId, noOp: false, addedCount: added, counts: addedCounts, warnings: validation.warnings, legacyExclusions: clone(matching.exclusions) } };
  }
  function effectiveLegacyTransactions(state) {
    var exclusions = list(ledgerOf(state), 'legacyExclusions');
    return list(state, 'transactions').filter(function (row) {
      return !exclusions.some(function (exclusion) { return row.id === exclusion.legacyId && legacyFingerprint(row) === exclusion.legacyFingerprint; });
    });
  }

  function summary(state, ym) {
    if (!isMonth(ym)) throw failure(['Mês de resumo inválido.']);
    var d = internalData(state), result = {
      month: ym, consumptionCents: 0, cardFeesCents: 0, financialChargesCents: 0,
      economicExpenseCents: 0, cashInflowCents: 0, cashOutflowCents: 0,
      payrollDeductionsCents: 0, reimbursementIncomeCents: 0, rows: [], warnings: []
    };
    list(d, 'historicalTransactions').filter(function (row) { return monthOf(row.purchaseDate) === ym; }).forEach(function (row) {
      if (row.kind === 'card_fee') result.cardFeesCents += row.amountCents;
      else result.consumptionCents += row.amountCents;
      if (row.isCashPayment === true) {
        if (row.amountCents < 0) result.cashInflowCents -= row.amountCents;
        else result.cashOutflowCents += row.amountCents;
      }
      result.rows.push(Object.assign(clone(row), { date: row.purchaseDate, sourceKind: 'historical_transaction', cashImpact: row.isCashPayment === true }));
    });
    list(d, 'financialCharges').filter(function (row) { return monthOf(row.chargeDate) === ym; }).forEach(function (row) {
      result.financialChargesCents += row.amountCents;
      if (row.isCashPayment === true) result.cashOutflowCents += row.amountCents;
      result.rows.push(Object.assign(clone(row), { date: row.chargeDate, sourceKind: 'financial_charge', cashImpact: row.isCashPayment === true }));
    });
    list(d, 'payments').filter(function (row) { return (monthOf(row.paymentDate) || row.paymentMonth) === ym && row.paymentConfirmed === true; }).forEach(function (row) {
      var payroll = row.cashFlowTreatment === 'payroll_deduction_not_bank_outflow';
      if (payroll) result.payrollDeductionsCents += row.amountCents;
      else if (row.cashFlowTreatment === 'bank_or_cash_outflow') result.cashOutflowCents += row.amountCents;
      result.rows.push(Object.assign(clone(row), { date: row.paymentDate || null, sourceKind: 'payment', cashImpact: !payroll, amountDatePrecision: row.paymentDate ? 'day' : 'month' }));
    });
    list(d, 'receivables').filter(function (row) { return row.receiptConfirmed === true && monthOf(row.receivedDate) === ym; }).forEach(function (row) {
      var amount = cents(row.receivedAmountCents);
      result.reimbursementIncomeCents += amount;
      result.cashInflowCents += amount;
      result.rows.push(Object.assign(clone(row), { date: row.receivedDate, amountCents: amount, sourceKind: 'reimbursement_received', cashImpact: true }));
    });
    result.economicExpenseCents = result.consumptionCents + result.cardFeesCents + result.financialChargesCents;
    result.historicalNetTransactionsCents = result.consumptionCents + result.cardFeesCents;
    result.cashNetCents = result.cashInflowCents - result.cashOutflowCents;
    result.rows.sort(function (a, b) { return String(a.date || ym).localeCompare(String(b.date || ym)) || a.id.localeCompare(b.id); });
    if (d.asOfDate && ym > monthOf(d.asOfDate)) result.warnings.push('Este mês contém apenas compromissos conhecidos; não há histórico realizado confirmado pelo pacote.');
    return result;
  }

  function selectedSnapshots(d, asOfDate) {
    var groups = new Map(), invoices = mapById(list(d, 'invoices')), snapshots = mapById(list(d, 'invoiceSnapshots'));
    list(d, 'invoiceSnapshots').forEach(function (snapshot) {
      var successor = snapshots.get(snapshot.supersededBySnapshotId);
      var historicalPredecessor = successor && asOfDate && successor.asOfDate && successor.asOfDate > asOfDate && snapshot.asOfDate && snapshot.asOfDate <= asOfDate;
      if (!historicalPredecessor && (snapshot.includeInCurrentLiability !== true || snapshot.supersededBySnapshotId)) return;
      if (snapshot.asOfDate && asOfDate && snapshot.asOfDate > asOfDate) return;
      var invoice = invoices.get(snapshot.invoiceId);
      if (invoice && (invoice.excludeFromCurrentLiabilityTotal === true || !active(invoice))) return;
      var previous = groups.get(snapshot.invoiceId);
      if (!previous || String(snapshot.asOfDate || '') > String(previous.asOfDate || '')) groups.set(snapshot.invoiceId, snapshot);
    });
    return Array.from(groups.values());
  }
  function snapshotBalance(d, snapshot, asOfDate, warnings) {
    var amount = snapshot.amountCents;
    list(d, 'payments').filter(function (payment) { return payment.invoiceId === snapshot.invoiceId && payment.paymentConfirmed === true; }).forEach(function (payment) {
      if (snapshot.asOfDate && payment.paymentDate && payment.paymentDate > snapshot.asOfDate && (!asOfDate || payment.paymentDate <= asOfDate)) amount -= payment.amountCents;
      else if (!payment.paymentDate && snapshot.asOfDate && payment.paymentMonth > monthOf(snapshot.asOfDate) && (!asOfDate || payment.paymentMonth <= monthOf(asOfDate))) {
        if (payment.paymentMonth < monthOf(asOfDate || payment.paymentMonth + '-01')) amount -= payment.amountCents;
        else warnings.push('Pagamento sem dia exato não foi abatido de snapshot diário: ' + payment.id);
      }
    });
    return Math.max(0, amount);
  }
  function liabilities(state, asOfDate) {
    var d = internalData(state), cutoff = asOfDate || d.asOfDate;
    if (cutoff != null && !isDate(cutoff)) throw failure(['Data de referência de passivos inválida.']);
    var result = { asOfDate: cutoff, knownLiabilityCents: 0, invoiceLiabilityCents: 0,
      obligationLiabilityCents: 0, loanKnownPrincipalCents: 0, nominalFutureDebtCents: 0,
      nominalInstallmentCommitmentsCents: 0, hasUnknownBalances: false, items: [], unknownItems: [], warnings: [] };
    result.sourceAsOfDate = d.asOfDate;
    result.historicalComplete = !(cutoff && d.asOfDate && cutoff < d.asOfDate);
    if (!result.historicalComplete) result.warnings.push('Consulta anterior ao pacote: a posição histórica completa não pode ser reconstruída com os dados disponíveis.');
    selectedSnapshots(d, cutoff).forEach(function (snapshot) {
      var amount = snapshotBalance(d, snapshot, cutoff, result.warnings);
      result.invoiceLiabilityCents += amount;
      result.items.push(Object.assign(clone(snapshot), { sourceKind: 'invoice_snapshot', amountCents: amount }));
      if (snapshot.isMinimumKnownAmount === true) result.hasUnknownBalances = true;
    });
    list(d, 'taxObligations').filter(function (row) { return active(row) && !row.paidDate && (!row.asOfDate || !cutoff || row.asOfDate <= cutoff); }).forEach(function (row) {
      result.obligationLiabilityCents += row.amountCents;
      result.items.push(Object.assign(clone(row), { sourceKind: 'tax_obligation' }));
    });
    list(d, 'debts').filter(active).forEach(function (row) {
      if (row.representedByInstallmentPlanId || row.includeSeparatelyInFutureCommitmentTotals === false) return;
      if (Number.isSafeInteger(row.outstandingPrincipalCents)) {
        result.loanKnownPrincipalCents += row.outstandingPrincipalCents;
        result.items.push(Object.assign(clone(row), { sourceKind: 'loan_principal', amountCents: row.outstandingPrincipalCents }));
      } else { result.hasUnknownBalances = true; result.unknownItems.push(clone(row)); }
      result.nominalFutureDebtCents += cents(row.futureNominalInstallmentTotalCents);
    });
    result.nominalInstallmentCommitmentsCents = list(d, 'futureInstallmentCommitments').filter(function (row) { return row.isSettled !== true; }).reduce(function (total, row) { return total + row.amountCents; }, 0);
    result.knownLiabilityCents = result.invoiceLiabilityCents + result.obligationLiabilityCents + result.loanKnownPrincipalCents;
    if (result.hasUnknownBalances) result.warnings.push('Passivo conhecido parcial: saldos não informados não foram convertidos em zero nem em principal estimado.');
    return result;
  }

  function commitments(state, ym) {
    if (!isMonth(ym)) throw failure(['Mês de compromissos inválido.']);
    var d = internalData(state), invoices = mapById(list(d, 'invoices'));
    var result = { month: ym, items: [], excludedDetails: [], cashOutflowCents: 0,
      cashInflowCents: 0, payrollDeductionsCents: 0, knownInvoiceCents: 0,
      installmentDetailCents: 0, warnings: [] };
    var snapshots = selectedSnapshots(d, d.asOfDate), coveredInvoices = new Map(), allSnapshots = mapById(list(d, 'invoiceSnapshots'));
    function push(row, sourceKind, amount, cashImpact, direction, date) {
      var item = { id: sourceKind + ':' + row.id + ':' + ym, sourceId: row.id,
        description: row.description || row.name || '', accountId: row.accountId || null,
        amountCents: amount, cashImpact: cashImpact, direction: direction || 'outflow',
        signedCents: cashImpact ? (direction === 'inflow' ? amount : -amount) : 0,
        dueDate: date || null, billingPeriod: ym, sourceKind: sourceKind,
        status: row.status || 'exact', coveredBySnapshot: false };
      result.items.push(item);
      if (!cashImpact) result.payrollDeductionsCents += amount;
      else if (direction === 'inflow') result.cashInflowCents += amount;
      else result.cashOutflowCents += amount;
      return item;
    }
    snapshots.filter(function (row) { return row.billingPeriod === ym; }).forEach(function (row) {
      var invoice = invoices.get(row.invoiceId) || {}, account = list(d, 'accounts').find(function (a) { return a.id === row.accountId; });
      var amount = snapshotBalance(d, row, d.asOfDate, result.warnings);
      var item = push(Object.assign({}, row, { description: (account && account.name || 'Cartão') + ' — fatura ' + ym }), 'invoice_snapshot', amount, true, 'outflow', invoice.effectiveDueDate || invoice.nominalDueDate || null);
      item.invoiceId = row.invoiceId; item.isMinimumKnownAmount = row.isMinimumKnownAmount === true;
      result.knownInvoiceCents += amount; coveredInvoices.set(row.invoiceId, row);
    });
    list(d, 'futureInstallmentCommitments').filter(function (row) { return row.billingPeriod === ym && row.isSettled !== true; }).forEach(function (row) {
      result.installmentDetailCents += row.amountCents;
      var chosen = coveredInvoices.get(row.invoiceId), included = allSnapshots.get(row.includedSnapshotId);
      var explicitlyCovered = row.alreadyIncludedInKnownInvoiceSnapshot === true && chosen && included && included.invoiceId === row.invoiceId &&
        (included.id === chosen.id || (included.asOfDate && chosen.asOfDate && included.asOfDate <= chosen.asOfDate));
      if (explicitlyCovered) {
        result.excludedDetails.push(Object.assign(clone(row), { coveredBySnapshot: true, reason: 'included_in_invoice_snapshot' }));
        return;
      }
      if (chosen) result.warnings.push('Parcela não conciliada ao saldo conhecido foi mantida separada: ' + row.id);
      var invoice = invoices.get(row.invoiceId) || {};
      var item = push(row, 'installment_commitment', row.amountCents, true, 'outflow', row.dueDate || invoice.effectiveDueDate || invoice.nominalDueDate || null);
      item.invoiceId = row.invoiceId; item.installmentNumber = row.installmentNumber; item.totalInstallments = row.totalInstallments;
    });
    list(d, 'debts').filter(active).forEach(function (row) {
      if (row.includeSeparatelyInFutureCommitmentTotals === false || row.representedByInstallmentPlanId) return;
      var payroll = row.paymentMethod === 'payroll_deduction' || row.kind === 'payroll_loan';
      if (row.nextPaymentDate && monthOf(row.nextPaymentDate) === ym && Number.isSafeInteger(row.nextKnownInstallmentAmountCents)) {
        push(row, 'known_debt_installment', row.nextKnownInstallmentAmountCents, !payroll, 'outflow', row.nextPaymentDate);
        return;
      }
      var remaining = row.remainingInstallmentsAfterOctober;
      var first = row.nextExpectedPeriod || (isMonth(row.currentInstallmentPeriod) ? addMonths(row.currentInstallmentPeriod, 1) : null);
      if (!Number.isSafeInteger(remaining) || !isMonth(first) || !Number.isSafeInteger(row.installmentAmountCents)) return;
      var distance = monthDistance(first, ym);
      if (distance < 0 || distance >= remaining) return;
      var item = push(row, 'debt_installment', row.installmentAmountCents, !payroll, 'outflow', row.nextPaymentDate && monthOf(row.nextPaymentDate) === ym ? row.nextPaymentDate : null);
      item.installmentNumber = Number.isSafeInteger(row.currentInstallmentNumber) ? row.currentInstallmentNumber + distance + 1 : null;
      item.totalInstallments = row.totalInstallments == null ? null : row.totalInstallments;
      item.monthlySequenceAssumption = true;
    });
    list(d, 'taxObligations').filter(function (row) { return active(row) && !row.paidDate && row.dueDate && monthOf(row.dueDate) === ym; }).forEach(function (row) { push(row, 'tax_obligation', row.amountCents, true, 'outflow', row.dueDate); });
    list(d, 'receivables').filter(function (row) { return row.receiptConfirmed !== true && row.billingPeriod === ym; }).forEach(function (row) {
      var amount = Math.max(0, row.amountCents - cents(row.receivedAmountCents));
      var item = push(row, 'receivable', amount, true, 'inflow', row.dueDate);
      item.isUnconfirmedInflow = true;
    });
    result.netCashCents = result.cashInflowCents - result.cashOutflowCents;
    if (result.items.some(function (row) { return !row.dueDate; })) result.warnings.push('Parte dos compromissos tem somente mês conhecido; nenhuma data diária foi inventada.');
    return result;
  }
  function migrationSummary(state) {
    var ledger = ledgerOf(state), d = internalData(state), counts = {};
    COLLECTIONS.forEach(function (key) { counts[key] = list(d, key).length; });
    return { hasData: !!ledger, revision: ledger && ledger.revision || 0,
      asOfDate: d.asOfDate, packages: clone(list(d, 'importedPackages')),
      counts: counts, pending: clone(list(d, 'pendingItems')),
      pendingCount: list(d, 'pendingItems').length,
      legacyExclusions: clone(list(ledger, 'legacyExclusions')),
      hasUnknownBalances: liabilities(state).hasUnknownBalances };
  }
  return Object.freeze({ validatePackage: validatePackage, mergePackage: mergePackage,
    data: data, packageData: data, summary: summary, liabilities: liabilities,
    commitments: commitments, migrationSummary: migrationSummary,
    effectiveLegacyTransactions: effectiveLegacyTransactions, legacyFingerprint: legacyFingerprint });
});
