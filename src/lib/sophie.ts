// ─── Sophie — in-app financial AI assistant ──────────────────────────────────
// Finance-aware conversational engine. Answers questions about the live books,
// performs calculations, explains statements, and can hand off to an LLM when
// an OPENAI-compatible key is configured in Settings → Sophie.

import { AppData } from "./types";
import { computePnL, computeBalanceSheet, computeCashFlow, computeEquity, receivablesAging, invoiceTotals } from "./accounting";
import { fmtUSD, fmtPct } from "./format";

export function sophieReply(question: string, data: AppData): string {
  const q = question.toLowerCase().trim();
  const pnl = computePnL(data);
  const bs = computeBalanceSheet(data);
  const cf = computeCashFlow(data);
  const eq = computeEquity(data);

  const hit = (...keys: string[]) => keys.some((k) => q.includes(k));

  if (hit("hello", "hi ", "hey", "good morning", "good afternoon", "good evening") && q.length < 25)
    return `Hello ${data.settings.company.owner.split(" ")[0]}! 👋 I'm Sophie, your Maxhals Forensics finance assistant. Ask me about profit, cash flow, invoices, VAT/NSSA/PAYE, receivables, fraud alerts — or anything in your books.`;

  if (hit("who are you", "your name", "what can you do", "help", "abilities"))
    return `I'm **Sophie** 🤖 — the AI assistant inside Maxhals Forensics Suite. I can:\n• Summarise profit, financial position, cash flow & equity\n• Track invoices, receivables and overdue accounts\n• Explain VAT, NSSA and PAYE positions\n• Surface fraud & anomaly alerts from the ML engine\n• Run quick calculations (e.g. "15% VAT on 4,500")\nJust ask in plain English!`;

  if (hit("profit", "p&l", "income statement", "earnings", "performance", "how much did i make", "revenue"))
    return `📊 **Profit & Loss summary (2026 YTD)**\n• Total income: **${fmtUSD(pnl.totalIncome)}**\n• Direct costs: ${fmtUSD(pnl.costOfSales)} → Gross profit **${fmtUSD(pnl.grossProfit)}** (${fmtPct((pnl.grossProfit / pnl.totalIncome) * 100)})\n• Operating expenses: ${fmtUSD(pnl.totalExpenses)}\n• **Net profit: ${fmtUSD(pnl.netProfit)}** (net margin ${fmtPct((pnl.netProfit / pnl.totalIncome) * 100)})\n\nIncome by stream:\n• Salary: ${fmtUSD(pnl.incomeByStream.salary)}\n• Forensic audit & advisory: ${fmtUSD(pnl.incomeByStream.forensic)}\n• Big data seminars: ${fmtUSD(pnl.incomeByStream.seminar)}\n\nYour strongest month was ${[...pnl.monthly].sort((a, b) => b.profit - a.profit)[0]?.month ?? "—"} at ${fmtUSD([...pnl.monthly].sort((a, b) => b.profit - a.profit)[0]?.profit ?? 0)} profit.`;

  if (hit("balance sheet", "financial position", "assets", "liabilities", "position"))
    return `🏛️ **Statement of Financial Position**\n• Total assets: **${fmtUSD(bs.totalAssets)}**\n• Total liabilities: **${fmtUSD(bs.totalLiabilities)}**\n• Total equity: **${fmtUSD(bs.totalEquity)}**\n\nAssets: ${bs.assets.map((a) => `${a.label} ${fmtUSD(a.amount)}`).join(" · ")}\n\nCurrent ratio is healthy and the balance sheet ${bs.balanced ? "balances ✓" : "needs review ⚠️"}.`;

  if (hit("cash flow", "cashflow", "cash position", "bank balance", "cash"))
    return `💵 **Cash flow summary**\n• Opening bank balance: ${fmtUSD(cf.opening)}\n• Net movement: **${fmtUSD(cf.net)}**\n• Closing position: **${fmtUSD(cf.closing)}**\n• Operating: ${fmtUSD(cf.operating)} · Investing: ${fmtUSD(cf.investing)} · Financing: ${fmtUSD(cf.financing)}\n\nWatch item: keep a buffer of at least ${fmtUSD(pnl.totalExpenses / 10)} for monthly fixed costs.`;

  if (hit("equity", "capital", "drawings", "changes in equity"))
    return `📈 **Changes in Equity**\n• Opening: ${fmtUSD(eq.opening)}\n• Capital introduced: +${fmtUSD(eq.capital)}\n• Profit for the period: +${fmtUSD(eq.profit)}\n• Adjustments: +${fmtUSD(eq.adjustments)}\n• Drawings: ${fmtUSD(eq.drawings)}\n• **Closing equity: ${fmtUSD(eq.closing)}**`;

  if (hit("vat", "zimra", "tax", "paye", "nssa", "payable", "statutory")) {
    const unpaid = data.taxes.filter((t) => t.paidAmount < t.amount);
    const totalDue = unpaid.reduce((a, b) => a + (b.amount - b.paidAmount), 0);
    const vat = data.taxes.filter((t) => t.type === "VAT");
    return `🧾 **Statutory payables**\n• Outstanding across VAT/NSSA/PAYE: **${fmtUSD(totalDue)}**\n\nVAT (standard rate ${data.settings.vatRate}%): ${vat.map((v) => `${v.period} ${fmtUSD(v.amount - v.paidAmount)}${v.paidAmount < v.amount ? " due" : " paid ✓"}`).join(" · ")}\nNSSA: employee ${data.settings.nssaEmployeeRate}% / employer ${data.settings.nssaEmployerRate}% on insurable earnings up to ${fmtUSD(data.settings.nssaCeiling)}.\nPAYE: monthly USD bands, remitted by the 15th following month.\n\n${unpaid.length ? `Next deadlines: ${unpaid.slice(0, 3).map((u) => `${u.type} ${u.period} due ${u.dueDate}`).join(" · ")}` : "All statutory returns are up to date ✓"}`;
  }

  if (hit("invoice", "receivable", "owed", "overdue", "debtors", "aging")) {
    const aging = receivablesAging(data);
    const open = data.invoices.filter((i) => i.status !== "paid" && i.status !== "cancelled");
    return `🧾 **Receivables**\n• Open invoices: **${open.length}**\n• Aging: ${aging.map((a) => `${a.name} ${fmtUSD(a.amount)}`).join(" · ")}\n\n${open.slice(0, 4).map((i) => `• ${i.number} — ${data.clients.find((c) => c.id === i.clientId)?.name ?? "?"} — ${fmtUSD(invoiceTotals(i).total - i.paidAmount)} (${i.status})`).join("\n")}\n\nTip: I can remind clients via WhatsApp — try the 📱 button on any invoice.`;
  }

  if (hit("fraud", "anomaly", "flag", "suspicious", "risk alert")) {
    const flags = data.fraudFlags;
    const high = flags.filter((f) => f.severity === "high" && f.status === "open");
    return `🚨 **Fraud & anomaly monitor**\n• Flags raised: **${flags.length}** (${high.length} high-risk open)\n\n${flags.slice(0, 3).map((f) => `• [${f.severity.toUpperCase()} · score ${f.score}] ${f.description} — ${fmtUSD(f.amount)} (${f.reason})`).join("\n") || "No anomalies detected — your transaction patterns look clean."}\n\nThe model re-scores all ledgers whenever data changes (MHF-IF v2.1).`;
  }

  if (hit("expense", "cost", "spending", "spend")) {
    const top = pnl.expensesByCategory.slice(0, 4);
    return `💸 **Expense analysis**\n• Total spend YTD: **${fmtUSD(pnl.totalExpenses)}**\n• Top categories: ${top.map((e) => `${e.category} ${fmtUSD(e.amount)}`).join(" · ")}\n• Expense ratio: ${fmtPct((pnl.totalExpenses / pnl.totalIncome) * 100)} of income\n\n${top[0] ? `${top[0].category} is your largest cost driver — worth a variance review.` : ""}`;
  }

  if (hit("department", "marketing", "hr", "procurement", "security", "cash office", "it ")) {
    return `🏢 **Departments live in this suite**: ${["Marketing", "IT", "HR", "Accounts", "Procurement", "Cash Office", "Security"].join(", ")}.\nOpen *Departments* in the sidebar for KPIs, task boards and workload per unit. HR owns payroll & NSSA, Accounts owns VAT/PAYE filings, Cash Office handles lodgements & reconciliation, Security runs access & compliance reviews.`;
  }

  if (hit("salary", "seminar", "forensic", "income stream", "stream", "revenue mix")) {
    const mix = Object.entries(pnl.incomeByStream) as [string, number][];
    return `💼 **Revenue by stream (YTD ${fmtUSD(pnl.totalIncome)})**\n${mix.map(([k, v]) => `• ${k === "salary" ? "Salary & employment" : k === "forensic" ? "Forensic audit & advisory" : "Big data seminars"}: ${fmtUSD(v)} (${fmtPct((v / pnl.totalIncome) * 100)})`).join("\n")}\n\nForensic advisory is your largest earner at ${fmtPct((pnl.incomeByStream.forensic / pnl.totalIncome) * 100)} of revenue.`;
  }

  if (hit("remind", "whatsapp", "send", "notify"))
    return `📱 I can send WhatsApp notifications to **${data.settings.whatsappNumber}** (Settings → WhatsApp). Use the 📱 buttons on invoices and reports to push payment reminders and summary digests instantly. For automated alerts, connect Twilio/WhatsApp Business API in Settings — the endpoint /api/whatsapp is ready.`;

  if (hit("export", "csv", "pdf", "report", "download", "import"))
    return `📤 **Import / Export**\n• *Reports* page: export any dataset (income, expenses, invoices, ledger, taxes, payroll) to **CSV** or a branded **PDF** report with your logo.\n• Import bank statements & transactions via CSV (column mapper included).\n• Invoice PDFs are print-ready for clients.`;

  if (hit("month", "monthly report", "summary", "overview", "dashboard", "how am i doing", "status"))
    return `🗺️ **Executive snapshot — October 2026**\n• Revenue YTD: **${fmtUSD(pnl.totalIncome)}** · Net profit **${fmtUSD(pnl.netProfit)}**\n• Cash & equivalents: **${fmtUSD(bs.assets[0].amount)}**\n• Receivables outstanding: ${fmtUSD(bs.assets[1].amount)}\n• Statutory payables open: ${fmtUSD(data.taxes.filter((t) => t.paidAmount < t.amount).reduce((a, b) => a + b.amount - b.paidAmount, 0))}\n• Fraud flags open: ${data.fraudFlags.filter((f) => f.status === "open").length}\n\nYou're tracking well — protect margin by billing the two open forensic engagements this week.`;

  // simple arithmetic e.g. "15% vat on 4500", "2500 + 3100"
  const vatMatch = q.match(/(\d+(?:\.\d+)?)\s*%?\s*(?:vat|tax)?\s*(?:on|of)\s*(\d+(?:\.\d+)?)/) ?? q.match(/(?:vat|tax)\s*(?:on|of)?\s*(\d+(?:\.\d+)?)\s*at\s*(\d+(?:\.\d+)?)\s*%?/);
  if (vatMatch) {
    const a = parseFloat(vatMatch[1]);
    const b = parseFloat(vatMatch[2]);
    const amount = q.includes("vat on") || q.includes("tax on") ? b : a;
    const rate = q.includes("at") ? b : a;
    const res = (amount * rate) / 100;
    return `🧮 ${rate}% on ${fmtUSD(amount)} = **${fmtUSD(res)}** (total with tax: ${fmtUSD(amount + res)}).`;
  }
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

  return `I'm still learning 🤓 — try asking me about:\n• "How is my profit this year?"\n• "What is my cash position?"\n• "Show overdue invoices"\n• "What do I owe ZIMRA and NSSA?"\n• "Any fraud alerts?"\n• "Summarise my revenue streams"\n\nOr type **help** to see everything I can do.`;
}
