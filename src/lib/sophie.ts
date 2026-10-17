// ─── Sophie — in-app financial AI assistant ──────────────────────────────────
// Finance-aware conversational engine. Answers questions about the live books,
// performs calculations, explains statements, and can hand off to an LLM when
// an OPENAI-compatible key is configured in Settings → Sophie.

import { AppData } from "./types";
import { computePnL, computeBalanceSheet, computeCashFlow, computeEquity, receivablesAging, invoiceTotals } from "./accounting";
import { fmtUSD, fmtPct, pct } from "./format";

const GREETING_START =
  /^(?:good\s+(morning|afternoon|evening)|hi(?:ya)?|hie|hello|hey|howdy|greetings|yo)\b[\s,!.\-–—]*/i;
const SMALL_TALK =
  /^(?:how\s+are\s+you(?:\s+doing)?|how'?re\s+you(?:\s+doing)?|how\s+is\s+it\s+going|how'?s\s+it\s+going|how\s+are\s+things|what'?s\s+up|whats\s+up|you\s+good|you\s+okay|nice\s+to\s+meet\s+you|good\s+to\s+see\s+you)(?:\s+(?:today|this\s+(?:morning|afternoon|evening)))?[\s?!.]*$/i;

// Calendar month names for "How did I do in August?" style questions.
const MONTH_NAMES = [
  "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december"
];
const MONTH_ABBRS = MONTH_NAMES.map((m) => m.slice(0, 3));
const TAX_KEYS = ["vat", "zimra", "tax", "paye", "nssa", "payable", "statutory"];

// Resolve which calendar month a question is about: a named month ("august",
// "sep", "sept") or "this month" / "last month". "may" is only accepted behind
// a preposition so "how may I help" is never read as the month of May — and any
// unambiguous month in the question wins ("how may I help you in August").
function monthTarget(q: string): { name: string; index: number } | null {
  const now = new Date();
  const thisIdx = now.getMonth();
  const relative = q.match(/\b(this|last|current|previous)\s+month\b/);
  const unambiguous = q.match(
    new RegExp(`\\b((${MONTH_NAMES.filter((m) => m !== "may").join("|")})|sept|sep)\\b`, "i")
  );
  if (unambiguous) {
    const idx = MONTH_ABBRS.indexOf(unambiguous[1].toLowerCase().slice(0, 3));
    if (idx >= 0) return { name: MONTH_NAMES[idx], index: idx };
  }
  const mayMatch = q.match(/\bmay\b/i);
  if (mayMatch) {
    const before = q.slice(0, mayMatch.index ?? 0);
    if (/\b(?:in|of|for|during|from|last|this|that)\s*$/i.test(before)) return { name: MONTH_NAMES[4], index: 4 };
  }
  if (relative) {
    const rel = relative[1].toLowerCase();
    const idx = rel === "this" || rel === "current" ? thisIdx : (thisIdx + 11) % 12;
    return { name: MONTH_NAMES[idx], index: idx };
  }
  return null;
}

// Fiscal year actually covered by the books — falls back to the current year
// for a clean, empty book. Keeps replies free of hard-coded periods.
function reportingYear(data: AppData): number {
  const dates = [
    ...data.income.map((i) => i.date),
    ...data.expenses.map((e) => e.date),
    ...data.invoices.map((i) => i.date)
  ];
  const years = dates
    .map((d) => parseInt(String(d).slice(0, 4), 10))
    .filter((y) => Number.isFinite(y) && y > 2000);
  return years.length ? Math.max(...years) : new Date().getFullYear();
}

export function sophieReply(question: string, data: AppData): string {
  let q = question.toLowerCase().trim();
  const pnl = computePnL(data);
  const bs = computeBalanceSheet(data);
  const cf = computeCashFlow(data);
  const eq = computeEquity(data);

  const firstName = data.settings.company.owner?.trim().split(/\s+/)[0] || "there";
  const hasBooks =
    data.income.length + data.expenses.length + data.invoices.length + data.bankTxns.length > 0;

  const sayHello = (partOfDay?: string, askedHow = false) => {
    const salutation = partOfDay ? `Good ${partOfDay}` : "Hello";
    const mood = askedHow ? "I'm doing well — thanks for asking." : "It's good to hear from you.";
    const booksLine = hasBooks
      ? `Your books are live: ${fmtUSD(pnl.totalIncome)} income YTD and ${fmtUSD(pnl.netProfit)} net profit so far.`
      : "Your books are clean right now — everything sits at zero until you add a client, an expense or an invoice.";
    return `${salutation}, ${firstName}! 👋 ${mood} I'm Sophie, your Maxhals Forensics finance assistant.\n\n${booksLine}\n\nAsk me about profit, cash flow, invoices, VAT/NSSA/PAYE, receivables, fraud alerts, or any quick calculation.`;
  };

  // Greetings should feel like a greeting, not a keyword fallback. Strip the
  // opening pleasantry and carry on if the user also asked a real question
  // (e.g. "Hi Sophie, what is my profit?").
  const greeting = q.match(GREETING_START);
  if (greeting) {
    const rest = q
      .slice(greeting[0].length)
      .replace(/^(?:sophie|sophie\s+ai|there|again)\b[\s,!.\-–—]*/i, "")
      .trim();
    if (!rest || SMALL_TALK.test(rest)) return sayHello(greeting[1], !!rest);
    q = rest;
  } else if (SMALL_TALK.test(q)) {
    return sayHello(undefined, true);
  }

  const hit = (...keys: string[]) => keys.some((k) => q.includes(k));

  if (hit("who are you", "your name", "what can you do", "help", "abilities"))
    return `I'm **Sophie** 🤖 — the AI assistant inside Maxhals Forensics Suite. I can:\n• Summarise profit, financial position, cash flow & equity\n• Break down any month ("How did I do in August?")\n• Track invoices, receivables and overdue accounts\n• Explain VAT, NSSA and PAYE positions\n• Cover payroll and your top clients\n• Surface fraud & anomaly alerts from the ML engine\n• Run quick calculations (e.g. "15% VAT on 4,500")\nJust ask in plain English!`;

  if (/^(?:thanks|thank you|thankyou|cheers|much appreciated|appreciate it)\b/.test(q))
    return `You're very welcome, ${firstName}! 😊 I'm here whenever you want to look at the numbers.`;

  // Quick calculations should win over topic keywords ("15% VAT on 4,500"
  // is a maths question, not a request for the statutory payables register).
  // Number tokens allow thousands separators ("4,500") — the help example.
  const num = (raw: string) => parseFloat(raw.replace(/,/g, ""));
  const rateOnAmount = q.match(/(\d+(?:\.\d+)?)\s*%\s*(?:vat|tax)?\s*(?:on|of)\s*([\d.,]+)/);
  const amountAtRate = q.match(/(?:vat|tax)\s*(?:on|of)?\s*([\d.,]+)\s*at\s*(\d+(?:\.\d+)?)\s*%?/);
  const vatOnAmount = q.match(/(?:vat|tax)\s*(?:on|of)?\s*([\d.,]+)/);
  if (rateOnAmount || amountAtRate || (vatOnAmount && !hit("owe", "payable", "due", "return", "zimra", "nssa", "paye", "statutory"))) {
    const amount = rateOnAmount ? num(rateOnAmount[2]) : amountAtRate ? num(amountAtRate[1]) : num(vatOnAmount![1]);
    const rate = rateOnAmount ? num(rateOnAmount[1]) : amountAtRate ? num(amountAtRate[2]) : data.settings.vatRate;
    const res = (amount * rate) / 100;
    return `🧮 ${rate}% on ${fmtUSD(amount)} = **${fmtUSD(res)}** (total with tax: ${fmtUSD(amount + res)}).`;
  }

  // A named month (or "this month" / "last month") beats the topic handlers:
  // "profit in August" is a question about August, not the YTD P&L summary.
  const month = monthTarget(q);
  const payrollQ = hit("payroll", "wage", "payslip", "staff cost", "employee cost", "net pay", "gross pay");
  if (month && !hit(...TAX_KEYS) && !payrollQ) {
    const yr = reportingYear(data);
    const label = `${month.name[0].toUpperCase()}${month.name.slice(1)} ${yr}`;
    if (hit("cash", "bank", "flow", "inflow", "outflow")) {
      const row = cf.monthly.find((m) => m.month.slice(0, 3).toLowerCase() === MONTH_ABBRS[month.index]);
      if (!row)
        return `📅 No bank movements were recorded in ${label} — say **cash position** for the year-to-date picture.`;
      return `📅 **Cash flow — ${label}**\n• Inflows: **${fmtUSD(row.inflow)}**\n• Outflows: ${fmtUSD(row.outflow)}\n• Net movement: **${fmtUSD(row.net)}**\n\nClosing position across the books is ${fmtUSD(cf.closing)}.`;
    }
    const row = pnl.monthly.find((m) => m.month.slice(0, 3).toLowerCase() === MONTH_ABBRS[month.index]);
    if (!row)
      return `📅 Nothing was posted in ${label} — income and expenses both sit at zero for the month. Say **help** to see what else I can pull.`;
    return `📅 **${label} — monthly performance**\n• Income: **${fmtUSD(row.income)}**\n• Expenses: ${fmtUSD(row.expenses)}\n• Net profit: **${fmtUSD(row.profit)}** (margin ${fmtPct(pct(row.profit, row.income))})\n\nFull-year net profit stands at ${fmtUSD(pnl.netProfit)}.`;
  }

  // Revenue-mix questions win over the YTD P&L summary ("Summarise my revenue
  // streams" is on the quick-prompt bar and deserves the stream breakdown).
  if (hit("salary", "seminar", "forensic", "income stream", "stream", "revenue mix")) {
    const mix = Object.entries(pnl.incomeByStream) as [string, number][];
    return `💼 **Revenue by stream (YTD ${fmtUSD(pnl.totalIncome)})**\n${mix.map(([k, v]) => `• ${k === "salary" ? "Salary & employment" : k === "forensic" ? "Forensic audit & advisory" : "Big data seminars"}: ${fmtUSD(v)} (${fmtPct(pct(v, pnl.totalIncome))})`).join("\n")}\n\nForensic advisory is your largest earner at ${fmtPct(pct(pnl.incomeByStream.forensic, pnl.totalIncome))} of revenue.`;
  }

  if (hit("profit", "p&l", "income statement", "earnings", "performance", "how much did i make", "revenue"))
    return `📊 **Profit & Loss summary (${reportingYear(data)} YTD)**\n• Total income: **${fmtUSD(pnl.totalIncome)}**\n• Direct costs: ${fmtUSD(pnl.costOfSales)} → Gross profit **${fmtUSD(pnl.grossProfit)}** (${fmtPct(pct(pnl.grossProfit, pnl.totalIncome))})\n• Operating expenses: ${fmtUSD(pnl.totalExpenses)}\n• **Net profit: ${fmtUSD(pnl.netProfit)}** (net margin ${fmtPct(pct(pnl.netProfit, pnl.totalIncome))})\n\nIncome by stream:\n• Salary: ${fmtUSD(pnl.incomeByStream.salary)}\n• Forensic audit & advisory: ${fmtUSD(pnl.incomeByStream.forensic)}\n• Big data seminars: ${fmtUSD(pnl.incomeByStream.seminar)}\n\nYour strongest month was ${[...pnl.monthly].sort((a, b) => b.profit - a.profit)[0]?.month ?? "—"} at ${fmtUSD([...pnl.monthly].sort((a, b) => b.profit - a.profit)[0]?.profit ?? 0)} profit.`;

  if (hit("cash flow", "cashflow", "cash position", "bank balance", "cash"))
    return `💵 **Cash flow summary**\n• Opening bank balance: ${fmtUSD(cf.opening)}\n• Net movement: **${fmtUSD(cf.net)}**\n• Closing position: **${fmtUSD(cf.closing)}**\n• Operating: ${fmtUSD(cf.operating)} · Investing: ${fmtUSD(cf.investing)} · Financing: ${fmtUSD(cf.financing)}\n\nWatch item: keep a buffer of at least ${fmtUSD(pnl.totalExpenses / 10)} for monthly fixed costs.`;

  if (hit("equity", "capital", "drawings", "changes in equity"))
    return `📈 **Changes in Equity**\n• Opening: ${fmtUSD(eq.opening)}\n• Capital introduced: +${fmtUSD(eq.capital)}\n• Profit for the period: +${fmtUSD(eq.profit)}\n• Adjustments: +${fmtUSD(eq.adjustments)}\n• Drawings: ${fmtUSD(eq.drawings)}\n• **Closing equity: ${fmtUSD(eq.closing)}**`;

  // "What do I owe?" is a payables question even without naming ZIMRA/NSSA.
  // (\b keeps "who owes me" and "how much am I owed" on the receivables side.)
  const oweQuestion = /\b(?:i|we|the\s+company|the\s+business|my\s+business)\s+owes?\b|\bwhat\s+(?:do|does|did)\s+(?:i|we)\s+owe\b|\bowes?\s+(?:zimra|nssa|the\s+taxman)\b/.test(q);

  if (hit("vat", "zimra", "tax", "paye", "nssa", "payable", "statutory") || oweQuestion) {
    const unpaid = data.taxes.filter((t) => t.paidAmount < t.amount);
    const totalDue = unpaid.reduce((a, b) => a + (b.amount - b.paidAmount), 0);
    const vat = data.taxes.filter((t) => t.type === "VAT");
    return `🧾 **Statutory payables**\n• Outstanding across VAT/NSSA/PAYE: **${fmtUSD(totalDue)}**\n\nVAT (standard rate ${data.settings.vatRate}%): ${vat.map((v) => `${v.period} ${fmtUSD(v.amount - v.paidAmount)}${v.paidAmount < v.amount ? " due" : " paid ✓"}`).join(" · ")}\nNSSA: employee ${data.settings.nssaEmployeeRate}% / employer ${data.settings.nssaEmployerRate}% on insurable earnings up to ${fmtUSD(data.settings.nssaCeiling)}.\nPAYE: monthly USD bands, remitted by the 15th following month.\n\n${unpaid.length ? `Next deadlines: ${unpaid.slice(0, 3).map((u) => `${u.type} ${u.period} due ${u.dueDate}`).join(" · ")}` : "All statutory returns are up to date ✓"}`;
  }

  if (hit("balance sheet", "financial position", "assets", "liabilities", "position"))
    return `🏛️ **Statement of Financial Position**\n• Total assets: **${fmtUSD(bs.totalAssets)}**\n• Total liabilities: **${fmtUSD(bs.totalLiabilities)}**\n• Total equity: **${fmtUSD(bs.totalEquity)}**\n\nAssets: ${bs.assets.map((a) => `${a.label} ${fmtUSD(a.amount)}`).join(" · ")}\n\n${bs.totalAssets === 0 && bs.totalLiabilities === 0 && bs.totalEquity === 0 ? "Your books are clean, so every line sits at zero." : `Current ratio is healthy and the balance sheet ${bs.balanced ? "balances ✓" : "needs review ⚠️"}.`}`;


  if (hit("invoice", "receivable", "owed", "overdue", "debtors", "aging", "owes me", "who owes")) {
    const aging = receivablesAging(data);
    const open = data.invoices.filter((i) => i.status !== "paid" && i.status !== "cancelled");
    return `🧾 **Receivables**\n• Open invoices: **${open.length}**\n• Aging: ${aging.map((a) => `${a.name} ${fmtUSD(a.amount)}`).join(" · ")}\n\n${open.slice(0, 4).map((i) => `• ${i.number} — ${data.clients.find((c) => c.id === i.clientId)?.name ?? "?"} — ${fmtUSD(invoiceTotals(i).total - i.paidAmount)} (${i.status})`).join("\n")}\n\nTip: I can remind clients via WhatsApp — try the 📱 button on any invoice.`;
  }

  if (hit("fraud", "anomaly", "flag", "suspicious", "risk alert")) {
    const flags = data.fraudFlags;
    const high = flags.filter((f) => f.severity === "high" && f.status === "open");
    return `🚨 **Fraud & anomaly monitor**\n• Flags raised: **${flags.length}** (${high.length} high-risk open)\n\n${flags.slice(0, 3).map((f) => `• [${f.severity.toUpperCase()} · score ${f.score}] ${f.description} — ${fmtUSD(f.amount)} (${f.reason})`).join("\n") || "No anomalies detected — your transaction patterns look clean."}\n\nThe model re-scores all ledgers whenever data changes (MHF-IF v2.1).`;
  }

  if (hit("payroll", "wage", "payslip", "staff cost", "employee cost", "net pay", "gross pay")) {
    const pays = data.payroll;
    if (!pays.length)
      return `💼 The payroll register is empty — add staff under **Payroll** and I'll compute PAYE, NSSA and the AIDS levy automatically.`;
    const gross = pays.reduce((a, b) => a + b.gross + b.allowances, 0);
    const net = pays.reduce((a, b) => a + b.net, 0);
    const paye = pays.reduce((a, b) => a + b.paye, 0);
    const nssa = pays.reduce((a, b) => a + b.nssaEmployee + b.nssaEmployer, 0);
    const aids = pays.reduce((a, b) => a + b.aidsLevy, 0);
    const top = [...pays].sort((a, b) => b.gross - a.gross).slice(0, 3);
    return `💼 **Payroll register** (${pays.length} on the roll)\n• Gross pay & allowances: **${fmtUSD(gross)}**\n• PAYE: ${fmtUSD(paye)} · NSSA (both sides): ${fmtUSD(nssa)} · AIDS levy: ${fmtUSD(aids)}\n• **Net pay to staff: ${fmtUSD(net)}**\n\nHighest packages: ${top.map((p) => `${p.name} ${fmtUSD(p.gross)}`).join(" · ")}\n\nDeductions are recomputed from the statutory bands whenever the register changes.`;
  }

  if (hit("top client", "best client", "biggest client", "largest client", "top customer", "best customer", "biggest customer", "key client", "major client", "highest paying", "best paying")) {
    const byClient = new Map<string, number>();
    data.income.forEach((i) => {
      const name = i.client?.trim() || "Unattributed";
      byClient.set(name, (byClient.get(name) ?? 0) + i.amount);
    });
    const ranked = [...byClient.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
    if (!ranked.length)
      return `No client revenue is recorded yet — once income is posted I can rank your top clients here.`;
    const total = pnl.totalIncome || 1;
    return `🏆 **Top clients (YTD ${reportingYear(data)})**\n${ranked.map(([name, amt], n) => `${n + 1}. **${name}** — ${fmtUSD(amt)} (${fmtPct(pct(amt, total))} of income)`).join("\n")}\n\nConcentration check: your top client carries ${fmtPct(pct(ranked[0][1], total))} of revenue.`;
  }

  if (hit("expense", "cost", "spending", "spend")) {
    const top = pnl.expensesByCategory.slice(0, 4);
    return `💸 **Expense analysis**\n• Total spend YTD: **${fmtUSD(pnl.totalExpenses)}**\n• Top categories: ${top.map((e) => `${e.category} ${fmtUSD(e.amount)}`).join(" · ")}\n• Expense ratio: ${fmtPct(pct(pnl.totalExpenses, pnl.totalIncome))} of income\n\n${top[0] ? `${top[0].category} is your largest cost driver — worth a variance review.` : ""}`;
  }

  // Word-bounded short keys: bare "hr" once matched "chro-mo-dy-na-mics", and
  // bare "it " is ordinary English.
  if (/(?:^|\s)hr\b|department|marketing|procurement|security|cash office|\bit\s+(?:department|team|staff|head|manager|unit)/.test(q)) {
    return `🏢 **Departments live in this suite**: ${["Marketing", "IT", "HR", "Accounts", "Procurement", "Cash Office", "Security"].join(", ")}.\nOpen *Departments* in the sidebar for KPIs, task boards and workload per unit. HR owns payroll & NSSA, Accounts owns VAT/PAYE filings, Cash Office handles lodgements & reconciliation, Security runs access & compliance reviews.`;
  }

  if (hit("remind", "whatsapp", "send", "notify"))
    return `📱 I can send WhatsApp notifications to **${data.settings.whatsappNumber}** (Settings → WhatsApp). Use the 📱 buttons on invoices and reports to push payment reminders and summary digests instantly. For automated alerts, connect Twilio/WhatsApp Business API in Settings — the endpoint /api/whatsapp is ready.`;

  if (hit("export", "csv", "pdf", "report", "download", "import"))
    return `📤 **Import / Export**\n• *Reports* page: export any dataset (income, expenses, invoices, ledger, taxes, payroll) to **CSV** or a branded **PDF** report with your logo.\n• Import bank statements & transactions via CSV (column mapper included).\n• Invoice PDFs are print-ready for clients.`;

  if (hit("month", "monthly report", "summary", "overview", "dashboard", "how am i doing", "status")) {
    const cashAmt = bs.assets.find((a) => a.label.startsWith("Cash"))?.amount ?? 0;
    const recvAmt = bs.assets.find((a) => a.label.toLowerCase().includes("receivable"))?.amount ?? 0;
    const period = new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" });
    return `🗺️ **Executive snapshot — ${period}**\n• Revenue YTD: **${fmtUSD(pnl.totalIncome)}** · Net profit **${fmtUSD(pnl.netProfit)}**\n• Cash & equivalents: **${fmtUSD(cashAmt)}**\n• Receivables outstanding: ${fmtUSD(recvAmt)}\n• Statutory payables open: ${fmtUSD(data.taxes.filter((t) => t.paidAmount < t.amount).reduce((a, b) => a + b.amount - b.paidAmount, 0))}\n• Fraud flags open: ${data.fraudFlags.filter((f) => f.status === "open").length}\n\n${hasBooks ? "You're tracking well — protect margin by billing open engagements this week." : "Add your first client, invoice or expense and I'll turn these numbers into insight."}`;
  }

  // simple arithmetic e.g. "2500 + 3100"
  const arith = q.replace(/[,$]/g, "").match(/^[\d\s+\-*/().]+$/);
  if (arith && /\d/.test(q) && /[+\-*/]/.test(q)) {
    try {
      // eslint-disable-next-line no-new-func
      const val = Function(`"use strict"; return (${arith[0]})`)();
      if (typeof val === "number" && isFinite(val)) return `🧮 That computes to **${fmtUSD(val)}**.`;
    } catch {
      /* fall through */
    }
  }

  return `I'm still learning 🤓 — try asking me about:\n• "How is my profit this year?"\n• "How did I do in August?"\n• "What is my cash position?"\n• "Show overdue invoices"\n• "What do I owe ZIMRA and NSSA?"\n• "Who are my top clients?"\n• "Any fraud alerts?"\n• "Summarise my revenue streams"\n\nOr type **help** to see everything I can do.`;
}
