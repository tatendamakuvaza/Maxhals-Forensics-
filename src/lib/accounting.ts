import { AppData, CHART_OF_ACCOUNTS, IncomeStream, STREAM_LABELS } from "./types";

export interface AccountBalance {
  code: string;
  name: string;
  type: "asset" | "liability" | "equity" | "income" | "expense";
  debit: number;
  credit: number;
  balance: number; // natural balance
}

export function accountBalances(data: AppData): AccountBalance[] {
  const map = new Map<string, AccountBalance>();
  CHART_OF_ACCOUNTS.forEach((a) => map.set(a.code, { ...a, debit: 0, credit: 0, balance: 0 }));
  data.journal.forEach((je) =>
    je.lines.forEach((l) => {
      const acc = map.get(l.accountCode);
      if (!acc) return;
      acc.debit += l.debit;
      acc.credit += l.credit;
    })
  );
  map.forEach((a) => {
    a.balance =
      a.type === "asset" || a.type === "expense"
        ? a.debit - a.credit
        : a.credit - a.debit;
    a.debit = Math.round(a.debit * 100) / 100;
    a.credit = Math.round(a.credit * 100) / 100;
    a.balance = Math.round(a.balance * 100) / 100;
  });
  return [...map.values()];
}

export interface PnL {
  incomeByStream: Record<IncomeStream, number>;
  totalIncome: number;
  costOfSales: number;
  grossProfit: number;
  expensesByCategory: { category: string; amount: number }[];
  totalExpenses: number;
  netProfit: number;
  monthly: { month: string; income: number; expenses: number; profit: number }[];
}

export function computePnL(data: AppData): PnL {
  const incomeByStream = { salary: 0, forensic: 0, seminar: 0 } as Record<IncomeStream, number>;
  data.income.forEach((i) => (incomeByStream[i.stream] += i.amount));
  const totalIncome = Object.values(incomeByStream).reduce((a, b) => a + b, 0);

  const expMap = new Map<string, number>();
  data.expenses.forEach((e) => expMap.set(e.category, (expMap.get(e.category) ?? 0) + e.amount));
  const expensesByCategory = [...expMap.entries()]
    .map(([category, amount]) => ({ category, amount: Math.round(amount * 100) / 100 }))
    .sort((a, b) => b.amount - a.amount);
  const totalExpenses = expensesByCategory.reduce((a, b) => a + b.amount, 0);
  const costOfSales = expMap.get("Direct Seminar Costs") ?? 0;
  const grossProfit = totalIncome - costOfSales;

  const m = new Map<string, { income: number; expenses: number }>();
  const key = (d: string) => d.slice(0, 7);
  data.income.forEach((i) => {
    const k = key(i.date);
    m.set(k, { income: (m.get(k)?.income ?? 0) + i.amount, expenses: m.get(k)?.expenses ?? 0 });
  });
  data.expenses.forEach((e) => {
    const k = key(e.date);
    m.set(k, { income: m.get(k)?.income ?? 0, expenses: (m.get(k)?.expenses ?? 0) + e.amount });
  });
  const monthly = [...m.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([month, v]) => ({
      month: new Date(month + "-01T00:00:00").toLocaleDateString("en-US", { month: "short" }),
      income: Math.round(v.income),
      expenses: Math.round(v.expenses),
      profit: Math.round(v.income - v.expenses)
    }));

  return {
    incomeByStream: Object.fromEntries(
      Object.entries(incomeByStream).map(([k, v]) => [k, Math.round(v * 100) / 100])
    ) as Record<IncomeStream, number>,
    totalIncome: Math.round(totalIncome * 100) / 100,
    costOfSales: Math.round(costOfSales * 100) / 100,
    grossProfit: Math.round(grossProfit * 100) / 100,
    expensesByCategory,
    totalExpenses: Math.round(totalExpenses * 100) / 100,
    netProfit: Math.round((totalIncome - totalExpenses) * 100) / 100,
    monthly
  };
}

export interface BalanceSheet {
  assets: { label: string; amount: number }[];
  liabilities: { label: string; amount: number }[];
  equity: { label: string; amount: number }[];
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
  balanced: boolean;
}

export function computeBalanceSheet(data: AppData): BalanceSheet {
  const pnl = computePnL(data);
  const ledger = new Map(accountBalances(data).map((a) => [a.code, a.balance]));
  const bankBalance =
    data.bankAccounts.reduce((a, b) => a + b.openingBalance, 0) +
    data.bankTxns.reduce((a, b) => a + b.amount, 0);
  // Petty cash and fixed assets come from the ledger, not hard-coded opening balances.
  const cashInHand = Math.max(0, ledger.get("1000") ?? 0);
  const receivables = data.income
    .filter((i) => !i.received)
    .reduce((a, b) => a + b.amount + b.vatCharged, 0);
  const equipmentExpense = data.expenses
    .filter((e) => e.category === "Equipment & Fixtures")
    .reduce((a, b) => a + b.amount, 0);
  const equipment = Math.max(0, ledger.get("1200") ?? 0, equipmentExpense);
  const inputVat = data.expenses.reduce((a, b) => a + b.vatClaimable, 0);
  const outputVat = data.income.reduce((a, b) => a + b.vatCharged, 0);
  const vatNet = Math.round((outputVat - inputVat) * 100) / 100;

  const assets = [
    { label: "Cash and cash equivalents", amount: Math.round((bankBalance + cashInHand) * 100) / 100 },
    { label: "Trade receivables", amount: Math.round(receivables * 100) / 100 },
    { label: "Property, equipment & intangibles (net)", amount: Math.round(equipment * 100) / 100 },
    { label: "Input VAT recoverable", amount: Math.round(Math.max(0, inputVat) * 100) / 100 }
  ];

  const unpaidTaxes = data.taxes
    .filter((t) => t.paidAmount < t.amount)
    .reduce((a, b) => a + (b.amount - b.paidAmount), 0);

  const liabilities = [
    { label: "Trade and other payables", amount: 0 },
    { label: "VAT, NSSA & PAYE payable", amount: Math.round(unpaidTaxes * 100) / 100 },
    { label: "Output VAT control (net)", amount: Math.round(Math.max(0, vatNet - unpaidTaxes) * 100) / 100 }
  ];

  const capitalIn = data.equity.filter((e) => e.type === "capital" || e.type === "adjustment").reduce((a, b) => a + b.amount, 0);
  const drawings = data.equity.filter((e) => e.type === "drawing").reduce((a, b) => a + b.amount, 0);
  // No brought-forward balance is assumed: a clean set of books opens at zero.
  const retained = 0;
  const equity = [
    { label: "Owner's capital", amount: capitalIn },
    { label: "Retained earnings (b/f)", amount: retained },
    { label: "Profit for the year", amount: pnl.netProfit },
    { label: "Owner's drawings", amount: drawings }
  ];

  const totalAssets = assets.reduce((a, b) => a + b.amount, 0);
  const totalLiabilities = liabilities.reduce((a, b) => a + b.amount, 0);
  const totalEquity = equity.reduce((a, b) => a + b.amount, 0);

  return {
    assets,
    liabilities,
    equity,
    totalAssets: Math.round(totalAssets * 100) / 100,
    totalLiabilities: Math.round(totalLiabilities * 100) / 100,
    totalEquity: Math.round(totalEquity * 100) / 100,
    balanced: Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 1
  };
}

export interface CashFlow {
  operating: number;
  investing: number;
  financing: number;
  net: number;
  opening: number;
  closing: number;
  monthly: { month: string; inflow: number; outflow: number; net: number }[];
}

export function computeCashFlow(data: AppData): CashFlow {
  const inflows = data.bankTxns.filter((t) => t.amount > 0).reduce((a, b) => a + b.amount, 0);
  const outflows = data.bankTxns.filter((t) => t.amount < 0).reduce((a, b) => a + Math.abs(b.amount), 0);
  const investing = data.expenses
    .filter((e) => e.category === "Equipment & Fixtures")
    .reduce((a, b) => a + b.amount * 1.15, 0);
  const financing = data.equity.reduce((a, b) => a + b.amount, 0) * -1;
  const operating = Math.round((inflows - outflows - investing + financing) * 100) / 100;
  const opening = data.bankAccounts.reduce((a, b) => a + b.openingBalance, 0);
  const net = Math.round((inflows - outflows) * 100) / 100;

  const m = new Map<string, { inflow: number; outflow: number }>();
  data.bankTxns.forEach((t) => {
    const k = t.date.slice(0, 7);
    const cur = m.get(k) ?? { inflow: 0, outflow: 0 };
    if (t.amount > 0) cur.inflow += t.amount;
    else cur.outflow += Math.abs(t.amount);
    m.set(k, cur);
  });
  const monthly = [...m.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([month, v]) => ({
      month: new Date(month + "-01T00:00:00").toLocaleDateString("en-US", { month: "short" }),
      inflow: Math.round(v.inflow),
      outflow: Math.round(v.outflow),
      net: Math.round(v.inflow - v.outflow)
    }));

  return {
    operating,
    investing: -Math.round(investing * 100) / 100,
    financing: Math.round(financing * 100) / 100,
    net,
    opening,
    closing: opening + net,
    monthly
  };
}

export interface EquityStatement {
  opening: number;
  capital: number;
  profit: number;
  drawings: number;
  adjustments: number;
  closing: number;
  rows: { label: string; amount: number }[];
}

export function computeEquity(data: AppData): EquityStatement {
  const opening = 0;
  const capital = data.equity.filter((e) => e.type === "capital").reduce((a, b) => a + b.amount, 0);
  const adjustments = data.equity.filter((e) => e.type === "adjustment").reduce((a, b) => a + b.amount, 0);
  const drawings = data.equity.filter((e) => e.type === "drawing").reduce((a, b) => a + b.amount, 0);
  const profit = computePnL(data).netProfit;
  const closing = opening + capital + adjustments + profit + drawings;
  return {
    opening,
    capital,
    profit,
    drawings,
    adjustments,
    closing: Math.round(closing * 100) / 100,
    rows: [
      { label: "Balance at 1 January 2026", amount: opening },
      { label: "Capital introduced", amount: capital },
      { label: "Profit for the period", amount: profit },
      { label: "Other comprehensive adjustments", amount: adjustments },
      { label: "Owner's drawings", amount: drawings },
      { label: "Balance at reporting date", amount: Math.round(closing * 100) / 100 }
    ]
  };
}

export function revenueMix(data: AppData) {
  const pnl = computePnL(data);
  return (Object.keys(pnl.incomeByStream) as IncomeStream[]).map((s) => ({
    name: STREAM_LABELS[s].replace(" & Employment", "").replace(" Analytics Seminars", " Seminars").replace("Audit & Advisory", "Audit"),
    value: Math.round(pnl.incomeByStream[s])
  }));
}

export function receivablesAging(data: AppData) {
  const buckets = { current: 0, d30: 0, d60: 0, d90: 0 };
  const today = new Date("2026-10-17T00:00:00");
  data.invoices
    .filter((i) => i.status !== "paid" && i.status !== "cancelled" && i.status !== "draft")
    .forEach((inv) => {
      const total = inv.items.reduce((a, b) => a + b.qty * b.rate * (1 + b.vatRate / 100), 0);
      const owed = Math.max(0, total - inv.paidAmount);
      const days = Math.floor((today.getTime() - new Date(inv.dueDate + "T00:00:00").getTime()) / 86400000);
      if (days <= 0) buckets.current += owed;
      else if (days <= 30) buckets.d30 += owed;
      else if (days <= 60) buckets.d60 += owed;
      else buckets.d90 += owed;
    });
  return [
    { name: "Current", amount: Math.round(buckets.current) },
    { name: "1–30 days", amount: Math.round(buckets.d30) },
    { name: "31–60 days", amount: Math.round(buckets.d60) },
    { name: "61+ days", amount: Math.round(buckets.d90) }
  ];
}

export function invoiceTotals(inv: AppData["invoices"][number]) {
  const sub = inv.items.reduce((a, b) => a + b.qty * b.rate, 0);
  const vat = inv.items.reduce((a, b) => a + (b.qty * b.rate * b.vatRate) / 100, 0);
  return { sub: Math.round(sub * 100) / 100, vat: Math.round(vat * 100) / 100, total: Math.round((sub + vat) * 100) / 100 };
}
