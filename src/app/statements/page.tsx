"use client";
import React from "react";
import { Download, Printer, FileText, Scale, Landmark, ArrowLeftRight, Coins } from "lucide-react";
import { Card, PageHeader, Badge } from "@/components/ui";
import { useStore } from "@/lib/store";
import { fmtUSD, fmtDate, pct } from "@/lib/format";
import { computePnL, computeBalanceSheet, computeCashFlow, computeEquity } from "@/lib/accounting";
import { exportPDF } from "@/lib/export";

type Tab = "pnl" | "position" | "cashflow" | "equity" | "notes";

const TABS: { id: Tab; label: string; icon: typeof FileText }[] = [
  { id: "pnl", label: "Profit or Loss", icon: FileText },
  { id: "position", label: "Financial Position", icon: Scale },
  { id: "cashflow", label: "Cash Flows", icon: Landmark },
  { id: "equity", label: "Changes in Equity", icon: ArrowLeftRight },
  { id: "notes", label: "Notes", icon: Coins }
];

export default function StatementsPage() {
  const data = useStore((s) => s.data);
  const [tab, setTab] = React.useState<Tab>("pnl");
  const pnl = computePnL(data);
  const bs = computeBalanceSheet(data);
  const cf = computeCashFlow(data);
  const eq = computeEquity(data);

  const exportAll = () =>
    exportPDF({
      title: "Financial Statements 2026",
      subtitle: `Maxhals Forensics · Tatenda Makuvaza · prepared ${fmtDate("2026-10-17")} · USD`,
      filename: "maxhals-financial-statements-2026.pdf",
      sections: [
        {
          title: "Statement of Profit or Loss and Other Comprehensive Income",
          head: [["Line item", "Amount (USD)"]],
          body: [
            ["Salary & employment income", pnl.incomeByStream.salary.toFixed(2)],
            ["Forensic audit & advisory fees", pnl.incomeByStream.forensic.toFixed(2)],
            ["Big data analytics seminar fees", pnl.incomeByStream.seminar.toFixed(2)],
            ["Total revenue", pnl.totalIncome.toFixed(2)],
            ["Cost of sales (direct seminar costs)", `(${pnl.costOfSales.toFixed(2)})`],
            ["Gross profit", pnl.grossProfit.toFixed(2)],
            ...pnl.expensesByCategory.filter((e) => e.category !== "Direct Seminar Costs").map((e) => [e.category, `(${e.amount.toFixed(2)})`]),
            ["Total expenses", `(${pnl.totalExpenses.toFixed(2)})`],
            ["Net profit for the year", pnl.netProfit.toFixed(2)]
          ],
          foot: [["Net profit", pnl.netProfit.toFixed(2)]]
        },
        {
          title: "Statement of Financial Position",
          head: [["Assets", "Amount"], ["", ""], ["Equity & Liabilities", "Amount"]],
          body: [
            ...bs.assets.map((a) => [a.label, a.amount.toFixed(2), ""]),
            ["Total assets", bs.totalAssets.toFixed(2), ""],
            ...bs.liabilities.map((l) => ["", "", `${l.label}: ${l.amount.toFixed(2)}`]),
            ...bs.equity.map((e) => ["", "", `${e.label}: ${e.amount.toFixed(2)}`]),
            ["", "", `Total equity & liabilities: ${(bs.totalLiabilities + bs.totalEquity).toFixed(2)}`]
          ]
        },
        {
          title: "Statement of Cash Flows",
          head: [["Movement", "Amount"]],
          body: [
            ["Net cash from operating activities", cf.operating.toFixed(2)],
            ["Net cash used in investing activities", cf.investing.toFixed(2)],
            ["Net cash from financing activities", cf.financing.toFixed(2)],
            ["Net increase/(decrease) in cash", cf.net.toFixed(2)],
            ["Cash at beginning of year", cf.opening.toFixed(2)],
            ["Cash at end of period", cf.closing.toFixed(2)]
          ]
        },
        {
          title: "Statement of Changes in Equity",
          head: [["Movement", "Amount"]],
          body: eq.rows.map((r) => [r.label, r.amount.toFixed(2)])
        },
        {
          title: "Notes to the Financial Statements",
          head: [["Note", "Narrative"]],
          body: [
            ["1. Basis of preparation", "Financial statements prepared under accrual basis in USD (functional currency), IFRS for SMEs."],
            ["2. Revenue recognition", "Income recognised when services rendered; seminar fees on completion of delivery; salary monthly."],
            ["3. Value Added Tax", `Output VAT at ${data.settings.vatRate}% on standard-rated supplies; input VAT recovered on valid tax invoices.`],
            ["4. Statutory obligations", `NSSA (${data.settings.nssaEmployeeRate}% employee / ${data.settings.nssaEmployerRate}% employer), PAYE monthly bands and AIDS levy (3% of PAYE) remitted to ZIMRA/NSSA.`],
            ["5. Trade receivables", "Ageing reviewed monthly; credit terms 30 days; expected credit losses assessed on overdue balances."],
            ["6. Related party transactions", "Salary income from Maxhals Group under employment contract at arm's length."],
            ["7. Events after reporting date", "Open forensic engagements (ZINARA, Old Mutual, Delta) expected to settle in Q4 2026."]
          ]
        }
      ]
    });

  return (
    <div>
      <PageHeader
        title="Financial Statements"
        subtitle="Complete IFRS-SME style pack — profit or loss, financial position, cash flows, changes in equity and disclosure notes."
        actions={
          <>
            <button onClick={() => window.print()} className="btn-ghost"><Printer size={15} /> Print</button>
            <button onClick={exportAll} className="btn-primary"><Download size={15} /> Download PDF pack</button>
          </>
        }
      />

      <div className="mb-5 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold transition ${
              tab === t.id ? "bg-ink-900 text-white shadow-card" : "border border-slate-200 bg-white text-slate-500 hover:border-aqua-400"
            }`}
          >
            <t.icon size={14} /> {t.label}
          </button>
        ))}
      </div>

      <Card className="print:shadow-none">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-aqua-500">Maxhals Forensics</p>
            <h2 className="mt-1 text-xl font-extrabold text-ink-900">
              {tab === "pnl" && "Statement of Profit or Loss and Other Comprehensive Income"}
              {tab === "position" && "Statement of Financial Position"}
              {tab === "cashflow" && "Statement of Cash Flows"}
              {tab === "equity" && "Statement of Changes in Equity"}
              {tab === "notes" && "Notes to the Financial Statements"}
            </h2>
            <p className="mt-1 text-xs text-slate-500">For the year ended 31 December 2026 (YTD to 17 Oct 2026) · presented in USD</p>
          </div>
          <div className="text-right">
            <Badge color={bs.balanced ? "green" : "red"}>{bs.balanced ? "Balance sheet balances ✓" : "Check classification"}</Badge>
            <p className="mt-2 text-xs text-slate-400">Prepared by {data.settings.company.owner}</p>
          </div>
        </div>

        {tab === "pnl" && <PnLView pnl={pnl} />}
        {tab === "position" && <PositionView bs={bs} />}
        {tab === "cashflow" && <CashView cf={cf} />}
        {tab === "equity" && <EquityView eq={eq} />}
        {tab === "notes" && <NotesView data={data} pnl={pnl} />}
      </Card>
    </div>
  );
}

function Row({ label, value, bold, indent, danger }: { label: string; value: string; bold?: boolean; indent?: boolean; danger?: boolean }) {
  return (
    <div className={`flex items-center justify-between border-b border-slate-50 py-2.5 ${indent ? "pl-6" : ""}`}>
      <span className={`text-sm ${bold ? "font-extrabold text-ink-900" : "text-slate-600"}`}>{label}</span>
      <span className={`text-sm tabular-nums ${bold ? "font-extrabold text-ink-900" : danger ? "font-semibold text-rose-500" : "font-semibold text-ink-800"}`}>{value}</span>
    </div>
  );
}

function PnLView({ pnl }: { pnl: ReturnType<typeof computePnL> }) {
  return (
    <div className="mx-auto max-w-2xl">
      <Row label="Salary & employment income" value={fmtUSD(pnl.incomeByStream.salary)} />
      <Row label="Forensic audit & advisory fees" value={fmtUSD(pnl.incomeByStream.forensic)} />
      <Row label="Big data analytics seminar fees" value={fmtUSD(pnl.incomeByStream.seminar)} />
      <Row label="Total revenue" value={fmtUSD(pnl.totalIncome)} bold />
      <Row label="Cost of sales — direct seminar costs" value={`(${fmtUSD(pnl.costOfSales)})`} danger />
      <Row label="Gross profit" value={fmtUSD(pnl.grossProfit)} bold />
      <div className="my-3">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Operating expenses</p>
      </div>
      {pnl.expensesByCategory.filter((e) => e.category !== "Direct Seminar Costs").map((e) => (
        <Row key={e.category} label={e.category} value={`(${fmtUSD(e.amount)})`} indent danger />
      ))}
      <Row label="Total operating expenses" value={`(${fmtUSD(pnl.totalExpenses)})`} bold danger />
      <div className="mt-4 rounded-2xl bg-ink-950 px-5 py-4 text-white">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-white/60">Net profit for the period</span>
          <span className="text-2xl font-extrabold text-gold-400">{fmtUSD(pnl.netProfit)}</span>
        </div>
        <div className="mt-1 text-right text-xs text-white/50">Net profit margin {pct(pnl.netProfit, pnl.totalIncome).toFixed(1)}%</div>
      </div>
    </div>
  );
}

function PositionView({ bs }: { bs: ReturnType<typeof computeBalanceSheet> }) {
  return (
    <div className="mx-auto grid max-w-3xl gap-8 md:grid-cols-2">
      <div>
        <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">Assets</p>
        {bs.assets.map((a) => <Row key={a.label} label={a.label} value={fmtUSD(a.amount)} />)}
        <Row label="Total assets" value={fmtUSD(bs.totalAssets)} bold />
      </div>
      <div>
        <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">Equity & liabilities</p>
        {bs.equity.map((e) => <Row key={e.label} label={e.label} value={fmtUSD(e.amount)} />)}
        {bs.liabilities.map((l) => <Row key={l.label} label={l.label} value={fmtUSD(l.amount)} />)}
        <Row label="Total equity & liabilities" value={fmtUSD(bs.totalLiabilities + bs.totalEquity)} bold />
        <div className={`mt-4 rounded-xl p-3 text-xs font-semibold ${bs.balanced ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"}`}>
          {bs.balanced ? "✓ Accounting equation holds: Assets = Equity + Liabilities" : `⚠ Difference of ${fmtUSD(bs.totalAssets - bs.totalLiabilities - bs.totalEquity)}`}
        </div>
      </div>
    </div>
  );
}

function CashView({ cf }: { cf: ReturnType<typeof computeCashFlow> }) {
  return (
    <div className="mx-auto max-w-2xl">
      <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">Operating activities</p>
      <Row label="Net cash from operations (incl. tax & working capital)" value={fmtUSD(cf.operating)} />
      <p className="mb-3 mt-5 text-xs font-bold uppercase tracking-wider text-slate-400">Investing activities</p>
      <Row label="Purchase of equipment & intangibles" value={fmtUSD(cf.investing)} danger />
      <p className="mb-3 mt-5 text-xs font-bold uppercase tracking-wider text-slate-400">Financing activities</p>
      <Row label="Capital, drawings & equity movements" value={fmtUSD(cf.financing)} />
      <div className="mt-6 space-y-0">
        <Row label="Net increase/(decrease) in cash" value={fmtUSD(cf.net)} bold />
        <Row label="Cash at beginning of year" value={fmtUSD(cf.opening)} />
        <div className="mt-4 rounded-2xl bg-ink-950 px-5 py-4 text-white">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-white/60">Cash at end of period</span>
            <span className="text-2xl font-extrabold text-aqua-400">{fmtUSD(cf.closing)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function EquityView({ eq }: { eq: ReturnType<typeof computeEquity> }) {
  return (
    <div className="mx-auto max-w-2xl">
      {eq.rows.map((r, i) => (
        <Row key={r.label} label={r.label} value={fmtUSD(r.amount)} bold={i === 0 || i === eq.rows.length - 1} danger={r.amount < 0 && r.label !== "Balance at 1 January 2026"} />
      ))}
      <div className="mt-5 rounded-xl bg-aqua-400/10 p-4 text-xs text-ink-700">
        💡 Capital introduced funds equipment & working capital; drawings are tracked against owner's current account. Profit for the period flows directly from the P&amp;L.
      </div>
    </div>
  );
}

function NotesView({ data, pnl }: { data: ReturnType<typeof useStore.getState>["data"]; pnl: ReturnType<typeof computePnL> }) {
  const notes = [
    ["1. Corporate information", `Maxhals Forensics is a sole practice owned by ${data.settings.company.owner}, providing forensic auditing, advisory services and big data analytics training. Registered office: ${data.settings.company.address}.`],
    ["2. Basis of preparation", "These financial statements are prepared under the accruals basis of accounting in accordance with IFRS for SMEs. The presentation currency is the United States Dollar (USD), the functional currency of the practice."],
    ["3. Revenue", `Revenue comprises salary & employment (${fmtUSD(pnl.incomeByStream.salary)}), forensic audit & advisory fees (${fmtUSD(pnl.incomeByStream.forensic)}), and big data analytics seminar fees (${fmtUSD(pnl.incomeByStream.seminar)}). Revenue is recognised when services are rendered and performance obligations satisfied.`],
    ["4. Value Added Tax", `The practice is registered for VAT (Reg. ${data.settings.company.vatNumber}) at the standard rate of ${data.settings.vatRate}%. Output VAT is levied on standard-rated supplies and input VAT recovered on valid tax invoices from suppliers.`],
    ["5. Statutory payables", `NSSA social security contributions (${data.settings.nssaEmployeeRate}% employee / ${data.settings.nssaEmployerRate}% employer up to ${fmtUSD(data.settings.nssaCeiling)} insurable earnings), PAYE under monthly USD tax bands, and AIDS levy of 3% of PAYE are remitted monthly by the 15th following month.`],
    ["6. Trade receivables", "Credit terms are 30 days. Receivables are stated at amortised cost less allowance for expected credit losses. Ageing is reviewed monthly and follow-up escalated via management and client WhatsApp reminders."],
    ["7. Cash & equivalents", `Cash comprises CBZ and Steward Bank USD current accounts and petty cash. Bank reconciliation is performed monthly; unmatched items are escalated to the fraud monitor.`],
    ["8. Employee benefits", "Salaries, NSSA and PAYE on payroll are recognised in the period services are rendered. Payroll for 4 employees is processed monthly through the Payroll module."],
    ["9. Related party transactions", "Salary income arises from employment with Maxhals Group of Companies, a related party under common control. Terms are commercial and at arm's length."],
    ["10. Events after the reporting period", "Open engagements with ZINARA, Old Mutual Zimbabwe and Delta Corporation are expected to be billed and collected in Q4 2026. No adjusting events identified."]
  ];
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      {notes.map(([t, b]) => (
        <div key={t} className="rounded-2xl border border-slate-100 bg-slate-50/50 p-5">
          <p className="text-sm font-extrabold text-ink-900">{t}</p>
          <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{b}</p>
        </div>
      ))}
    </div>
  );
}
