const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ledger = require('../norteia-ledger.js');

function sample(overrides = {}) {
  return Object.assign({
    packageId: 'synthetic-import-a', schemaVersion: '1.0.0',
    packageType: 'canonical_financial_migration_staging_package',
    currency: 'BRL', moneyRepresentation: 'integer_cents', asOfDate: '2034-04-15',
    accounts: [{ id: 'card-a', name: 'Cartão exemplo', kind: 'credit_card' }],
    historicalTransactions: [], financialCharges: [], installmentPlans: [],
    futureInstallmentCommitments: [], invoices: [], invoiceSnapshots: [],
    payments: [], debts: [], receivables: [], taxObligations: [], recurringBills: [],
    inactiveSimulations: [], knownInvoiceComponents: [], pendingItems: []
  }, overrides);
}
function purchase(overrides = {}) {
  return Object.assign({ id: 'purchase-a', accountId: 'card-a',
    purchaseDate: '2034-04-02', postingDate: null, billingPeriod: '2034-05',
    invoiceId: null, description: 'Compra exemplo', amountCents: 10000,
    kind: 'purchase', isCashPayment: false }, overrides);
}
function invoice(overrides = {}) {
  return Object.assign({ id: 'invoice-a', accountId: 'card-a', billingPeriod: '2034-05',
    nominalDueDate: null, effectiveDueDate: null, lifecycleStatus: 'unpaid' }, overrides);
}
function snapshot(overrides = {}) {
  return Object.assign({ id: 'snapshot-a', invoiceId: 'invoice-a', accountId: 'card-a',
    billingPeriod: '2034-05', asOfDate: '2034-04-15', amountCents: 50000,
    isExpense: false, includeInCurrentLiability: true, supersededBySnapshotId: null }, overrides);
}
function plan(overrides = {}) {
  return Object.assign({ id: 'plan-a', accountId: 'card-a', description: 'Plano exemplo',
    originalPurchaseDate: null, originalPrincipalCents: null,
    currentInstallmentNumber: 2, totalInstallments: 4, installmentAmountCents: 10000 }, overrides);
}
function installment(overrides = {}) {
  return Object.assign({ id: 'commitment-a', installmentPlanId: 'plan-a', accountId: 'card-a',
    description: 'Plano exemplo', installmentNumber: 3, totalInstallments: 4,
    billingPeriod: '2034-05', invoiceId: 'invoice-a', dueDate: null, amountCents: 10000,
    alreadyIncludedInKnownInvoiceSnapshot: true, includedSnapshotId: 'snapshot-a', isSettled: false }, overrides);
}
function payment(overrides = {}) {
  return Object.assign({ id: 'payment-a', accountId: 'card-a', description: 'Pagamento exemplo',
    amountCents: 20000, paymentDate: null, paymentMonth: '2034-04',
    kind: 'debt_payment', paymentConfirmed: true,
    cashFlowTreatment: 'bank_or_cash_outflow', isConsumptionExpense: false,
    invoiceId: null, debtId: null }, overrides);
}
function imported(pkg, base = {}) { return ledger.mergePackage(base, pkg, { importedAt: '2034-04-15T12:00:00Z' }).state; }
let cases = 0;
function test(name, fn) { fn(); cases++; console.log('OK ' + name); }

test('validates a canonical package and preserves base state without mutation', () => {
  const pkg = sample({ historicalTransactions: [purchase()] });
  const base = { profile: { name: 'Pessoa exemplo' }, transactions: [], settings: { privacyDefault: true }, assets: [{ value: 7 }] };
  const original = JSON.stringify(base), packageOriginal = JSON.stringify(pkg);
  assert.equal(ledger.validatePackage(pkg).valid, true);
  const next = imported(pkg, base);
  assert.equal(JSON.stringify(base), original);
  assert.equal(JSON.stringify(pkg), packageOriginal);
  assert.deepEqual(next.profile, base.profile);
  assert.deepEqual(next.settings, base.settings);
  assert.deepEqual(next.assets, base.assets);
  assert.equal(ledger.data(next).historicalTransactions.length, 1);
});

test('same package is idempotent; changed content with same ID is rejected', () => {
  const pkg = sample({ historicalTransactions: [purchase()] }), state = imported(pkg);
  const again = ledger.mergePackage(state, pkg);
  assert.equal(again.state, state);
  assert.equal(again.report.noOp, true);
  assert.equal(again.report.addedCount, 0);
  const changed = structuredClone(pkg); changed.historicalTransactions[0].amountCents++;
  assert.throws(() => ledger.mergePackage(state, changed), /conteúdo diferente/);
  assert.equal(ledger.data(state).historicalTransactions[0].amountCents, 10000);
});

test('different batches merge collections and reject conflicting stable row IDs atomically', () => {
  const state = imported(sample({ historicalTransactions: [purchase()] }));
  const pkg = sample({ packageId: 'synthetic-import-b', historicalTransactions: [purchase({ id: 'purchase-b', purchaseDate: '2034-04-03' })] });
  const next = imported(pkg, state);
  assert.equal(ledger.data(next).historicalTransactions.length, 2);
  assert.equal(ledger.migrationSummary(next).packages.length, 2);
  const conflict = sample({ packageId: 'synthetic-import-c', historicalTransactions: [purchase({ description: 'Alterada' })] });
  assert.throws(() => imported(conflict, state), /Registro existente/);
  assert.equal(ledger.data(state).historicalTransactions.length, 1);
});

test('unique legacy fingerprint is excluded from aggregation without deleting or editing it', () => {
  const old = { id: 'legacy-a', date: '2034-04-02', type: 'expense', description: 'Compra Exemplo', value: 100 };
  const base = { transactions: [old, { id: 'legacy-other', date: '2034-04-03', type: 'expense', description: 'Outra', value: 20 }] };
  const state = imported(sample({ historicalTransactions: [purchase()] }), base);
  assert.deepEqual(state.transactions, base.transactions);
  assert.equal(state.transactions.length, 2);
  assert.deepEqual(ledger.effectiveLegacyTransactions(state).map(row => row.id), ['legacy-other']);
  assert.equal(ledger.migrationSummary(state).legacyExclusions[0].legacyId, 'legacy-a');
  state.transactions[0].value = 101;
  assert.equal(ledger.effectiveLegacyTransactions(state).length, 2);
});

test('ambiguous legacy matches and old installment purchases require reconciliation', () => {
  const old = { id: 'legacy-a', date: '2034-04-02', type: 'expense', description: 'Compra exemplo', value: 100 };
  const pkg = sample({ historicalTransactions: [purchase()] });
  assert.throws(() => imported(pkg, { transactions: [old, { ...old, id: 'legacy-b' }] }), /ambígua/);
  assert.throws(() => imported(pkg, { transactions: [{ ...old, installments: { count: 2 } }] }), /parcelada/);
  assert.throws(() => imported(pkg, { transactions: [{ ...old, value: 200, installments: { count: 2 } }] }), /parcelada/);
  const two = sample({ historicalTransactions: [purchase(), purchase({ id: 'purchase-b' })] });
  assert.throws(() => imported(two, { transactions: [old] }), /ambígua/);
});

test('refund stays negative, uses purchase date and never becomes received cash', () => {
  const state = imported(sample({ historicalTransactions: [purchase(), purchase({ id: 'refund-a', purchaseDate: '2034-04-03', kind: 'refund', amountCents: -1234 })] }));
  const result = ledger.summary(state, '2034-04');
  assert.equal(result.consumptionCents, 8766);
  assert.equal(result.economicExpenseCents, 8766);
  assert.equal(result.cashNetCents, 0);
  assert.equal(result.rows[1].amountCents, -1234);
  assert.equal(result.rows[1].billingPeriod, '2034-05');
  assert.equal(ledger.summary(state, '2034-05').economicExpenseCents, 0);
});

test('card fee and financial charges are reported separately from consumption', () => {
  const state = imported(sample({ historicalTransactions: [purchase(), purchase({ id: 'fee-a', kind: 'card_fee', amountCents: 700 })],
    financialCharges: [{ id: 'interest-a', accountId: 'card-a', chargeDate: '2034-04-05', description: 'Encargo exemplo', amountCents: 333, isCashPayment: false }] }));
  const result = ledger.summary(state, '2034-04');
  assert.equal(result.consumptionCents, 10000);
  assert.equal(result.cardFeesCents, 700);
  assert.equal(result.financialChargesCents, 333);
  assert.equal(result.economicExpenseCents, 11033);
  assert.equal(result.cashOutflowCents, 0);
});

test('debt payments affect cash only; payroll never repeats a bank outflow', () => {
  const state = imported(sample({ payments: [payment(), payment({ id: 'payroll-a', amountCents: 3000,
    kind: 'payroll_deduction', cashFlowTreatment: 'payroll_deduction_not_bank_outflow' }),
    payment({ id: 'unconfirmed-a', paymentConfirmed: false, amountCents: 999 })] }));
  const result = ledger.summary(state, '2034-04');
  assert.equal(result.economicExpenseCents, 0);
  assert.equal(result.cashOutflowCents, 20000);
  assert.equal(result.payrollDeductionsCents, 3000);
  assert.equal(result.rows[0].date, null);
  assert.equal(result.rows[0].amountDatePrecision, 'month');
});

test('liability snapshots supersede previous balances; purchases and details do not add to them', () => {
  const state = imported(sample({ historicalTransactions: [purchase({ invoiceId: 'invoice-a' })],
    invoices: [invoice()], installmentPlans: [plan()], futureInstallmentCommitments: [installment()],
    invoiceSnapshots: [snapshot({ id: 'snapshot-old', amountCents: 40000, includeInCurrentLiability: false, asOfDate: '2034-04-14', supersededBySnapshotId: 'snapshot-a' }), snapshot()] }));
  const result = ledger.liabilities(state);
  assert.equal(result.invoiceLiabilityCents, 50000);
  assert.equal(result.knownLiabilityCents, 50000);
  assert.equal(result.items.length, 1);
  assert.equal(result.nominalInstallmentCommitmentsCents, 10000);
});

test('invoice snapshots cover installment details once and retain the effective due date', () => {
  const state = imported(sample({ invoices: [invoice({ nominalDueDate: '2034-05-01', effectiveDueDate: '2034-05-03' })],
    invoiceSnapshots: [snapshot()], installmentPlans: [plan()], futureInstallmentCommitments: [installment()] }));
  const result = ledger.commitments(state, '2034-05');
  assert.equal(result.cashOutflowCents, 50000);
  assert.equal(result.knownInvoiceCents, 50000);
  assert.equal(result.installmentDetailCents, 10000);
  assert.equal(result.items.length, 1);
  assert.equal(result.excludedDetails.length, 1);
  assert.equal(result.items[0].dueDate, '2034-05-03');
});

test('future installments without known invoice totals remain commitments with unknown day', () => {
  const state = imported(sample({ invoices: [invoice()], installmentPlans: [plan()],
    futureInstallmentCommitments: [installment({ alreadyIncludedInKnownInvoiceSnapshot: false, includedSnapshotId: null })] }));
  const result = ledger.commitments(state, '2034-05');
  assert.equal(result.cashOutflowCents, 10000);
  assert.equal(result.items[0].dueDate, null);
  assert.equal(result.items[0].installmentNumber, 3);
  assert.equal(ledger.summary(state, '2034-05').economicExpenseCents, 0);
});

test('a later installment not included in a snapshot is not silently discarded', () => {
  const state = imported(sample({ invoices: [invoice()], invoiceSnapshots: [snapshot()], installmentPlans: [plan()],
    futureInstallmentCommitments: [installment({ alreadyIncludedInKnownInvoiceSnapshot: false, includedSnapshotId: null })] }));
  const result = ledger.commitments(state, '2034-05');
  assert.equal(result.cashOutflowCents, 60000);
  assert.equal(result.excludedDetails.length, 0);
  assert.equal(result.items.length, 2);
  assert.equal(result.warnings.some(w => w.includes('não conciliada')), true);
});

test('legacy debts and projected commitments are blocked for explicit reconciliation', () => {
  const pkg = sample({ debts: [{ id: 'loan-a', accountId: 'card-a', creditor: 'Credor exemplo', description: 'Dívida exemplo', lifecycleStatus: 'active', installmentAmountCents: 10000 }] });
  assert.throws(() => imported(pkg, { debts: [{ id: 'old-debt', name: 'Dívida exemplo', status: 'active' }] }), /Dívida antiga/);
  const installments = sample({ invoices: [invoice()], installmentPlans: [plan()],
    futureInstallmentCommitments: [installment({ alreadyIncludedInKnownInvoiceSnapshot: false, includedSnapshotId: null })] });
  assert.throws(() => imported(installments, { futureCashflowItems: [{ id: 'old-future', description: 'Plano exemplo', amount: 100, status: 'projected' }] }), /Compromisso futuro antigo/);
});

test('payroll schedules remain visible with zero cash impact and unknown principal', () => {
  const debt = { id: 'loan-a', accountId: 'card-a', description: 'Empréstimo exemplo', kind: 'payroll_loan', lifecycleStatus: 'active',
    paymentMethod: 'payroll_deduction', contractDate: null, originalPrincipalCents: null, outstandingPrincipalCents: null,
    interestRate: null, cet: null, currentInstallmentPeriod: '2034-04', currentInstallmentNumber: 3,
    totalInstallments: 5, remainingInstallmentsAfterOctober: 2, nextExpectedPeriod: '2034-05',
    installmentAmountCents: 3000, futureNominalInstallmentTotalCents: 6000 };
  const state = imported(sample({ debts: [debt] }));
  const result = ledger.commitments(state, '2034-05');
  assert.equal(result.payrollDeductionsCents, 3000);
  assert.equal(result.cashOutflowCents, 0);
  assert.equal(result.items[0].cashImpact, false);
  assert.equal(result.items[0].signedCents, 0);
  assert.equal(result.items[0].dueDate, null);
  assert.equal(ledger.commitments(state, '2034-07').items.length, 0);
  const liability = ledger.liabilities(state);
  assert.equal(liability.knownLiabilityCents, 0);
  assert.equal(liability.hasUnknownBalances, true);
  assert.equal(liability.nominalFutureDebtCents, 6000);
  assert.equal(ledger.data(state).debts[0].outstandingPrincipalCents, null);
});

test('known mortgage installment does not invent principal or subsequent installments', () => {
  const state = imported(sample({ debts: [{ id: 'mortgage-a', accountId: 'card-a', description: 'Contrato exemplo', kind: 'mortgage',
    lifecycleStatus: 'active', outstandingPrincipalCents: null, originalPrincipalCents: null, contractDate: null,
    nextPaymentDate: '2034-05-01', nextKnownInstallmentAmountCents: 12345,
    totalInstallments: null, remainingInstallmentsAfterOctober: null, installmentAmountCents: null }] }));
  assert.equal(ledger.commitments(state, '2034-05').cashOutflowCents, 12345);
  assert.equal(ledger.commitments(state, '2034-06').items.length, 0);
  assert.equal(ledger.liabilities(state).loanKnownPrincipalCents, 0);
  assert.equal(ledger.liabilities(state).unknownItems.length, 1);
});

test('refinancing represented by an installment plan is not generated twice', () => {
  const state = imported(sample({ invoices: [invoice()], installmentPlans: [plan()],
    futureInstallmentCommitments: [installment({ alreadyIncludedInKnownInvoiceSnapshot: false, includedSnapshotId: null })],
    debts: [{ id: 'refinance-a', accountId: 'card-a', lifecycleStatus: 'active', kind: 'invoice_refinancing',
      outstandingPrincipalCents: null, representedByInstallmentPlanId: 'plan-a', includeSeparatelyInFutureCommitmentTotals: false,
      currentInstallmentPeriod: '2034-04', remainingInstallmentsAfterOctober: 2, installmentAmountCents: 10000 }] }));
  assert.equal(ledger.commitments(state, '2034-05').cashOutflowCents, 10000);
});

test('tax with unknown due date is a liability, never fabricated historical or future cash', () => {
  const state = imported(sample({ taxObligations: [{ id: 'tax-a', accountId: 'card-a', description: 'Tributo exemplo',
    amountCents: 23456, asOfDate: '2034-04-15', dueDate: null, paidDate: null, lifecycleStatus: 'outstanding_at_reset' }] }));
  assert.equal(ledger.liabilities(state).obligationLiabilityCents, 23456);
  assert.equal(ledger.commitments(state, '2034-05').items.length, 0);
  assert.equal(ledger.summary(state, '2034-04').economicExpenseCents, 0);
});

test('references, included components and inactive simulations never become expenses or obligations', () => {
  const state = imported(sample({ recurringBills: [{ id: 'reference-a', description: 'Conta exemplo', referenceAmountCents: null, dueDay: null }],
    knownInvoiceComponents: [{ id: 'component-a', accountId: 'card-a', amountCents: 9999, alreadyInInvoiceTotals: true, createAdditionalExpense: false }],
    inactiveSimulations: [{ id: 'simulation-a', active: false, contracted: false, createDebt: false, createPayment: false, createCommitments: false, installmentAmountCents: 88888 }],
    pendingItems: [{ id: 'pending-a', description: 'Informação pendente', blocksEntirePackage: false }] }));
  assert.equal(ledger.summary(state, '2034-04').economicExpenseCents, 0);
  assert.equal(ledger.liabilities(state).knownLiabilityCents, 0);
  assert.equal(ledger.commitments(state, '2034-05').items.length, 0);
  assert.equal(ledger.migrationSummary(state).pendingCount, 1);
  const retrieved = ledger.data(state); retrieved.recurringBills[0].referenceAmountCents = 1;
  assert.equal(ledger.data(state).recurringBills[0].referenceAmountCents, null);
});

test('reimbursements remain receivables until confirmation and preserve unknown dates', () => {
  const row = { id: 'receivable-a', description: 'Reembolso exemplo', amountCents: 2000, billingPeriod: '2034-05',
    dueDate: null, receivedDate: null, receivedAmountCents: 0, receiptConfirmed: false };
  const state = imported(sample({ receivables: [row] }));
  assert.equal(ledger.summary(state, '2034-05').cashInflowCents, 0);
  const commitment = ledger.commitments(state, '2034-05');
  assert.equal(commitment.cashInflowCents, 2000);
  assert.equal(commitment.items[0].dueDate, null);
  assert.equal(commitment.items[0].isUnconfirmedInflow, true);
  const received = imported(sample({ receivables: [{ ...row, receivedDate: '2034-04-10', receivedAmountCents: 2000, receiptConfirmed: true }] }));
  assert.equal(ledger.summary(received, '2034-04').reimbursementIncomeCents, 2000);
  assert.equal(ledger.commitments(received, '2034-05').cashInflowCents, 0);
});

test('a confirmed payment after a snapshot reduces liability once', () => {
  const state = imported(sample({ invoices: [invoice()], invoiceSnapshots: [snapshot({ asOfDate: '2034-04-10' })],
    payments: [payment({ paymentDate: '2034-04-12', invoiceId: 'invoice-a' })] }));
  assert.equal(ledger.liabilities(state, '2034-04-11').knownLiabilityCents, 50000);
  assert.equal(ledger.liabilities(state, '2034-04-15').knownLiabilityCents, 30000);
});

test('historical cutoff selects an available predecessor and warns that history is incomplete', () => {
  const state = imported(sample({ invoices: [invoice()], invoiceSnapshots: [
    snapshot({ id: 'snapshot-old', asOfDate: '2034-04-10', amountCents: 40000, includeInCurrentLiability: false, supersededBySnapshotId: 'snapshot-a' }), snapshot()
  ] }));
  const historical = ledger.liabilities(state, '2034-04-12');
  assert.equal(historical.invoiceLiabilityCents, 40000);
  assert.equal(historical.historicalComplete, false);
  assert.equal(ledger.liabilities(state).invoiceLiabilityCents, 50000);
});

test('validation rejects decimal cents, invalid dates, positive refund and dangling references', () => {
  assert.equal(ledger.validatePackage(sample({ historicalTransactions: [purchase({ amountCents: 1.1 })] })).valid, false);
  assert.equal(ledger.validatePackage(sample({ historicalTransactions: [purchase({ purchaseDate: '2034-02-31' })] })).valid, false);
  assert.equal(ledger.validatePackage(sample({ historicalTransactions: [purchase({ kind: 'refund', amountCents: 100 })] })).valid, false);
  assert.equal(ledger.validatePackage(sample({ historicalTransactions: [purchase({ invoiceId: 'missing' })] })).valid, false);
  assert.equal(ledger.validatePackage(sample({ invoiceSnapshots: [snapshot({ isExpense: true })] })).valid, false);
  assert.equal(ledger.validatePackage(sample({ inactiveSimulations: [{ id: 'active-a', active: true }] })).valid, false);
  assert.equal(ledger.validatePackage(sample({ historicalTransactions: [purchase({ purchaseDate: '2034-04-16' })] })).valid, false);
  assert.equal(ledger.validatePackage(sample({ otherUnsupportedRows: [] })).valid, false);
  assert.equal(ledger.validatePackage(sample({ recurringBills: [{ id: 'range-a', referenceAmountRangeCents: { minimum: 1000, maximum: 2000 } }] })).valid, true);
  assert.equal(ledger.validatePackage(sample({ recurringBills: [{ id: 'range-a', referenceAmountRangeCents: { minimum: 1000.5, maximum: 2000 } }] })).valid, false);
  assert.equal(ledger.validatePackage(sample({ debts: [{ id: 'negative-a', outstandingPrincipalCents: -100, installmentAmountCents: -100 }] })).valid, false);
  assert.equal(ledger.validatePackage(sample({ debts: [{ id: 'nested-a', historicalObligation: { amountCents: 100.5 } }] })).valid, false);
  const nullRow = ledger.validatePackage(sample({ historicalTransactions: [null] }));
  assert.equal(nullRow.valid, false);
  assert.equal(nullRow.errors.length > 0, true);
});

test('the same standalone module works in a browser without CommonJS or dependencies', () => {
  const context = {}; vm.createContext(context);
  vm.runInContext(fs.readFileSync(require.resolve('../norteia-ledger.js'), 'utf8'), context);
  assert.equal(typeof context.NorteiaLedger.mergePackage, 'function');
  assert.equal(context.NorteiaLedger.validatePackage(sample()).valid, true);
});

console.log('Ledger: ' + cases + ' cenários sintéticos verificados.');
