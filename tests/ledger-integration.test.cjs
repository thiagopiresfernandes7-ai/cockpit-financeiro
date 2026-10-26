const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ledger = require('../norteia-ledger.js');
const source = fs.readFileSync('index.html', 'utf8');
const pkg = {
  packageId: 'synthetic-import-test', schemaVersion: '1.0.0',
  packageType: 'canonical_financial_migration_staging_package', asOfDate: '2030-01-20', currency: 'BRL',
  accounts: [{id: 'card-a', name: 'Cartão de teste'}],
  invoices: [{id: 'invoice-a', accountId: 'card-a', billingPeriod: '2030-02', effectiveDueDate: '2030-02-03', lifecycleStatus: 'unpaid'}],
  invoiceSnapshots: [{id: 'snapshot-a', invoiceId: 'invoice-a', accountId: 'card-a', billingPeriod: '2030-02', asOfDate: '2030-01-20', amountCents: 30000, includeInCurrentLiability: true}],
  historicalTransactions: [{id: 'purchase-a', accountId: 'card-a', invoiceId: 'invoice-a', purchaseDate: '2030-01-01', billingPeriod: '2030-02', description: 'Compra de teste', amountCents: 10000, kind: 'purchase', isCashPayment: false}],
  financialCharges: [{id: 'charge-a', accountId: 'card-a', invoiceId: 'invoice-a', chargeDate: '2030-01-02', amountCents: 1200, description: 'Encargo', isCashPayment: false}],
  payments: [
    {id: 'payment-a', accountId: 'card-a', paymentDate: '2030-01-05', paymentMonth: '2030-01', amountCents: 50000, kind: 'debt_payment', paymentConfirmed: true, cashFlowTreatment: 'bank_or_cash_outflow'},
    {id: 'payroll-a', accountId: 'card-a', paymentDate: null, paymentMonth: '2030-01', amountCents: 10000, kind: 'payroll_deduction', paymentConfirmed: true, cashFlowTreatment: 'payroll_deduction_not_bank_outflow'}
  ],
  taxObligations: [{id: 'tax-a', accountId: 'card-a', description: 'Tributo', asOfDate: '2030-01-20', dueDate: null, amountCents: 20000, lifecycleStatus: 'outstanding_at_reset'}]
};
pkg.invoiceSnapshots.forEach(row => { row.isExpense = false; });
pkg.payments.forEach(row => { row.isConsumptionExpense = false; });
assert.equal(ledger.validatePackage(pkg).valid, true, JSON.stringify(ledger.validatePackage(pkg).errors));
const before = {transactions: [], debts: [], investments: [], profile: {name: 'Pessoa de teste'}, settings: {}, ui: {}, cashflowSettings: {baseBalance: 0}};
const merged = ledger.mergePackage(before, pkg).state;
const context = {
  window: {NorteiaLedger: ledger}, state: merged, user: {id: 'owner-test'},
  localStorage: { values: new Map(), setItem(k,v) { this.values.set(k,v); } },
  migrate: value => value, render() {}, clearTimeout() {}, saveTimer: null,
  sb: {}, saveNow: async () => ({error: {message: 'offline test'}})
};
vm.createContext(context);
vm.runInContext(source.slice(source.indexOf('function applyMigrationLedgerPosition('), source.indexOf('function byCat(')), context);
const legacy = {tx: [], income: 0, expense: 0, ordinaryExpense: 0, debtPayments: 0, debtInterest: 0, investmentCashOutflow: 0, cash: 0, investments: 0, otherAssets: 0, debtBalance: 0};
const result = context.applyMigrationLedgerPosition(legacy, '2030-01');
assert.equal(result.expense, 112, 'Payments and invoice snapshot must not become consumption.');
assert.equal(result.ordinaryExpense, 100);
assert.equal(result.debtInterest, 12);
assert.equal(result.cash, -500, 'Payroll deduction must not reduce bank cash twice.');
assert.equal(result.cashOutflow, 500);
assert.equal(result.payrollDeductions, 100);
assert.equal(result.liabilities, 500, 'Liability is snapshot plus obligation, not purchases again.');
assert.equal(result.tx[0].date, '2030-01-01');
assert.equal(result.tx[0].billingMonth, '2030-02');
assert.equal(result.ledgerBalanceKnown, false);
const chooseCode = source.slice(source.indexOf('function safeParseState('), source.indexOf('async function fetchPublicAppConfig('));
vm.runInContext(chooseCode, context);
const remoteOld = {...before, meta: {ledgerUpdatedAt: '2030-01-01T00:00:00Z'}};
const localNew = {...merged, meta: {ledgerUpdatedAt: '2030-01-20T00:00:00Z'}};
assert.equal(context.chooseBestStoredState(remoteOld, localNew).source, 'local');
assert.equal(context.chooseBestStoredState(localNew, remoteOld).source, 'cloud');
assert.equal(context.chooseBestStoredState(localNew, {...before, meta: {resetAt: '2030-01-21T00:00:00Z'}}).source, 'local', 'An intentional reset must beat an older import.');
(async function () {
  const outcome = await context.importLedgerPackage(pkg);
  assert.equal(outcome.saved, false, 'Do not claim cloud synchronization after an error.');
  assert.equal(context.state.profile.name, before.profile.name);
  assert.ok(context.localStorage.values.has('norteia_pre_ledger_import_owner-test'));
  const firstCount = ledger.data(context.state).historicalTransactions.length;
  await context.importLedgerPackage(pkg);
  assert.equal(ledger.data(context.state).historicalTransactions.length, firstCount);
  console.log('Ledger application integration: OK');
})().catch(error => { console.error(error); process.exitCode = 1; });
