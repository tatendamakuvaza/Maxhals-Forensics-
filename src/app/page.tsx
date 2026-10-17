"use client";
import React from "react";
import Link from "next/link";
import {
  TrendingUp, TrendingDown, Wallet, PiggyBank, Receipt, ShieldAlert, ArrowUpRight,
  FileText, Bot, Sparkles, Banknote, Clock, CheckCircle2, AlertTriangle
} from "lucide-react";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart,
  Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, RadialBarChart, RadialBar
} from "recharts";
import { Card, PageHeader, StatCard, Badge } from "@/components/ui";
import { useStore } from "@/lib/store";
import { fmtCompact, fmtUSD, fmtDate, fmtPct, pct } from "@/lib/format";
import {
  computePnL, computeBalanceSheet, computeCashFlow, computeEquity, revenueMix, receivablesAging, invoiceTotals
} from "@/lib/accounting";

const COLORS = ["#33d6c2", "#f6c453", "#8b5cf6", "#60a5fa", "#f87171", "#34d399"];

export default function DashboardPage() {
  const data = useStore((s) => s.data);
  const user = useStore((s) => s.data.users.find((u) => u.id === s.sessionUser));
  const pnl = computePnL(data);
  const bs = computeBalanceSheet(data);
  const cf = computeCashFlow(data);
  const eq = computeEquity(data);
  const mix = revenueMix(data);
  const aging = receivablesAging(data);

  const openInvoices = data.invoices.filter((i) => i.status !== "paid" && i.status !== "cancelled");
  const owed = openInvoices.reduce((a, i) => a + invoiceTotals(i).total - i.paidAmount, 0);
  const taxDue = data.taxes.filter((t) => t.paidAmount < t.amount).reduce((a, b) => a + b.amount - b.paidAmount, 0);
  const openFlags = data.fraudFlags.filter((f) => f.status === "open");
  const hasBooks = data.income.length + data.expenses.length + data.invoices.length + data.bankTxns.length > 0;
  const netMargin = pct(pnl.netProfit, pnl.totalIncome);
  const profitTrend = pnl.monthly.length > 1
    ? pct(pnl.monthly[pnl.monthly.length - 1].profit - pnl.monthly[pnl.monthly.length - 2].profit, Math.abs(pnl.monthly[pnl.monthly.length - 2].profit))
    : 0;
  const totalInvoiced = data.invoices.reduce((a, i) => a + invoiceTotals(i).total, 0);
  const totalCollected = data.invoices.reduce((a, i) => a + i.paidAmount, 0);
  const activeStreams = Object.values(pnl.incomeByStream).filter((v) => v > 0).length;

  const gauge = [
    { name: "Margin", value: Math.max(0, Math.min(100, netMargin * 1.4)), fill: "#33d6c2" }
  ];

  const radar = hasBooks
    ? [
        { subject: "Liquidity", A: Math.min(100, (bs.assets[0].amount / Math.max(1, pnl.totalExpenses)) * 240), fullMark: 100 },
        { subject: "Profitability", A: Math.max(0, Math.min(100, netMargin * 1.6)), fullMark: 100 },
        { subject: "Collections", A: Math.max(0, Math.min(100, pct(totalCollected, totalInvoiced))), fullMark: 100 },
        { subject: "Compliance", A: Math.max(0, 100 - (taxDue / 100) * 4), fullMark: 100 },
        { subject: "Growth", A: Math.max(0, Math.min(100, 55 + profitTrend)), fullMark: 100 },
        { subject: "Diversity", A: Math.round((activeStreams / 3) * 100), fullMark: 100 }
      ]
    : [
        { subject: "Liquidity", A: 0, fullMark: 100 },
        { subject: "Profitability", A: 0, fullMark: 100 },
        { subject: "Collections", A: 0, fullMark: 100 },
        { subject: "Compliance", A: 0, fullMark: 100 },
        { subject: "Growth", A: 0, fullMark: 100 },
        { subject: "Diversity", A: 0, fullMark: 100 }
      ];

  return (
    <div>
      <PageHeader
        title={`Good day, ${user?.name?.split(" ")[0] ?? "Tatenda"} 🚀`}
        subtitle="Here is the full picture of Maxhals Forensics — profits, position, cash, equity and risk, all live."
        actions={
          <>
            <Link href="/invoices/new" className="btn-primary"><FileText size={15} /> New Invoice</Link>
            <Link href="/sophie" className="btn-ghost"><Bot size={15} /> Ask Sophie</Link>
          </>
        }
      />

      {/* KPI ROW */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Revenue YTD (3 streams)"
          value={fmtUSD(pnl.totalIncome, 0)}
          delta={`+${fmtPct(Math.max(0, profitTrend), 0)} MoM`}
          hint="salary · forensic · seminars"
          icon={<Wallet size={20} />}
        />
        <StatCard
          label="Net Profit"
          value={fmtUSD(pnl.netProfit, 0)}
          delta={`${fmtPct(netMargin, 1)} margin`}
          hint={`gross ${fmtUSD(pnl.grossProfit, 0)}`}
          icon={<TrendingUp size={20} />}
        />
        <StatCard
          label="Cash & Equivalents"
          value={fmtUSD(bs.assets[0].amount, 0)}
          delta={`+${fmtUSD(cf.net, 0)} net`}
          hint={`equity ${fmtUSD(eq.closing, 0)}`}
          icon={<PiggyBank size={20} />}
        />
        <StatCard
          label="Statutory Payables"
          value={fmtUSD(taxDue, 0)}
          delta={`${openFlags.length} fraud flags`}
          hint="VAT · NSSA · PAYE"
          icon={<ShieldAlert size={20} />}
        />
      </div>

      {/* MAIN CHART ROW */}
      <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-base font-extrabold text-ink-900">Income vs Expenses vs Profit</h3>
              <p className="text-xs text-slate-500">Monthly performance — 2026 fiscal year</p>
            </div>
            <Badge color="aqua">Live ledger</Badge>
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer>
              <AreaChart data={pnl.monthly}>
                <defs>
                  <linearGradient id="gIn" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#33d6c2" stopOpacity={0.55} />
                    <stop offset="100%" stopColor="#33d6c2" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="gPr" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f6c453" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="#f6c453" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#64748b" }} />
                <YAxis tick={{ fontSize: 11, fill: "#64748b" }} tickFormatter={fmtCompact} />
                <Tooltip formatter={(v: number) => fmtUSD(v)} contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }} />
                <Area type="monotone" dataKey="income" stroke="#12b5a3" strokeWidth={2.5} fill="url(#gIn)" />
                <Area type="monotone" dataKey="expenses" stroke="#f87171" strokeWidth={2} fill="rgba(248,113,113,.08)" />
                <Area type="monotone" dataKey="profit" stroke="#e8aF2e" strokeWidth={2.5} fill="url(#gPr)" />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <h3 className="text-base font-extrabold text-ink-900">Revenue Mix</h3>
          <p className="mb-2 text-xs text-slate-500">Three income streams — YTD</p>
          <div className="h-[220px]">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={mix} dataKey="value" nameKey="name" innerRadius={62} outerRadius={92} paddingAngle={4}>
                  {mix.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: number) => fmtUSD(v)} contentStyle={{ borderRadius: 12, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2">
            {mix.map((m, i) => (
              <div key={m.name} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 font-medium text-slate-600">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                  {m.name}
                </span>
                <span className="font-bold text-ink-900">{fmtUSD(m.value, 0)}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* SECOND ROW */}
      <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-3">
        <Card>
          <h3 className="text-base font-extrabold text-ink-900">Cash Flow Waterfall</h3>
          <p className="mb-3 text-xs text-slate-500">Monthly inflows vs outflows</p>
          <div className="h-[240px]">
            <ResponsiveContainer>
              <BarChart data={cf.monthly}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#64748b" }} />
                <YAxis tick={{ fontSize: 11, fill: "#64748b" }} tickFormatter={fmtCompact} />
                <Tooltip formatter={(v: number) => fmtUSD(v)} contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                <Bar dataKey="inflow" fill="#33d6c2" radius={[6, 6, 0, 0]} />
                <Bar dataKey="outflow" fill="#f87171" radius={[6, 6, 0, 0]} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <h3 className="text-base font-extrabold text-ink-900">Receivables Aging</h3>
          <p className="mb-3 text-xs text-slate-500">Open invoice exposure · {fmtUSD(owed, 0)} total</p>
          <div className="h-[240px]">
            <ResponsiveContainer>
              <BarChart data={aging} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis type="number" tick={{ fontSize: 11, fill: "#64748b" }} tickFormatter={fmtCompact} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "#64748b" }} width={80} />
                <Tooltip formatter={(v: number) => fmtUSD(v)} contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                <Bar dataKey="amount" radius={[0, 8, 8, 0]}>
                  {aging.map((_, i) => <Cell key={i} fill={COLORS[(i + 1) % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <h3 className="text-base font-extrabold text-ink-900">Financial Health</h3>
          <p className="mb-1 text-xs text-slate-500">Composite score across 6 dimensions</p>
          <div className="h-[130px]">
            <ResponsiveContainer>
              <RadialBarChart innerRadius="72%" outerRadius="100%" data={gauge} startAngle={180} endAngle={0}>
                <RadialBar dataKey="value" background cornerRadius={10} />
              </RadialBarChart>
            </ResponsiveContainer>
          </div>
          <div className="-mt-14 text-center">
            <p className="text-3xl font-extrabold text-ink-900">{Math.round((radar.reduce((a, b) => a + b.A, 0) / 6))}</p>
            <p className="text-[11px] font-semibold text-slate-500">HEALTH SCORE / 100</p>
          </div>
          <div className="mt-6 space-y-2">
            {radar.map((r) => (
              <div key={r.subject} className="flex items-center gap-2">
                <span className="w-24 text-[11px] font-medium text-slate-500">{r.subject}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-aqua-500 to-gold-400"
                    style={{ width: `${Math.min(100, r.A)}%` }}
                  />
                </div>
                <span className="w-8 text-right text-[11px] font-bold text-ink-800">{Math.round(r.A)}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* THIRD ROW: statements snapshot + tasks + fraud */}
      <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-3">
        <Card>
          <div className="flex items-center justify-between">
            <h3 className="text-base font-extrabold text-ink-900">Statements Snapshot</h3>
            <Link href="/statements" className="flex items-center gap-1 text-xs font-bold text-aqua-500 hover:underline">
              Full statements <ArrowUpRight size={13} />
            </Link>
          </div>
          <div className="mt-4 space-y-3">
            {[
              { l: "Total Income (P&L)", v: pnl.totalIncome, i: TrendingUp, c: "text-emerald-500" },
              { l: "Net Profit", v: pnl.netProfit, i: Wallet, c: "text-aqua-500" },
              { l: "Total Assets", v: bs.totalAssets, i: PiggyBank, c: "text-blue-500" },
              { l: "Total Liabilities", v: bs.totalLiabilities, i: TrendingDown, c: "text-rose-500" },
              { l: "Total Equity", v: eq.closing, i: Banknote, c: "text-gold-500" },
              { l: "Closing Cash", v: cf.closing, i: CheckCircle2, c: "text-violet-500" }
            ].map((r) => (
              <div key={r.l} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/60 px-3.5 py-2.5">
                <span className="flex items-center gap-2.5 text-xs font-semibold text-slate-600">
                  <r.i size={15} className={r.c} /> {r.l}
                </span>
                <span className="text-sm font-extrabold text-ink-900">{fmtUSD(r.v)}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <h3 className="text-base font-extrabold text-ink-900">Upcoming & Overdue</h3>
            <Link href="/taxes" className="flex items-center gap-1 text-xs font-bold text-aqua-500 hover:underline">
              Payables <ArrowUpRight size={13} />
            </Link>
          </div>
          <div className="mt-4 space-y-2.5">
            {data.taxes.filter((t) => t.paidAmount < t.amount).slice(0, 5).map((t) => {
              const due = new Date(t.dueDate) < new Date("2026-10-17");
              return (
                <div key={t.id} className="flex items-center gap-3 rounded-xl border border-slate-100 px-3.5 py-3">
                  <div className={`grid h-9 w-9 place-items-center rounded-xl ${due ? "bg-rose-50 text-rose-500" : "bg-amber-50 text-amber-500"}`}>
                    {due ? <AlertTriangle size={16} /> : <Clock size={16} />}
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-bold text-ink-900">{t.type} — {t.period}</p>
                    <p className="text-[10px] text-slate-400">Due {fmtDate(t.dueDate)}</p>
                  </div>
                  <span className="text-sm font-extrabold text-ink-900">{fmtUSD(t.amount - t.paidAmount, 0)}</span>
                </div>
              );
            })}
            {openInvoices.slice(0, 3).map((inv) => (
              <div key={inv.id} className="flex items-center gap-3 rounded-xl border border-slate-100 px-3.5 py-3">
                <div className="grid h-9 w-9 place-items-center rounded-xl bg-blue-50 text-blue-500">
                  <FileText size={16} />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-bold text-ink-900">{inv.number} · {data.clients.find((c) => c.id === inv.clientId)?.name}</p>
                  <p className="text-[10px] text-slate-400">Due {fmtDate(inv.dueDate)}</p>
                </div>
                <Badge color={inv.status === "overdue" ? "red" : "blue"}>{inv.status}</Badge>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <h3 className="text-base font-extrabold text-ink-900">ML Fraud Radar</h3>
            <Link href="/fraud" className="flex items-center gap-1 text-xs font-bold text-aqua-500 hover:underline">
              Open monitor <ArrowUpRight size={13} />
            </Link>
          </div>
          <p className="mt-1 text-xs text-slate-500">MHF-IF v2.1 isolation-forest ensemble · rescored live</p>
          <div className="mt-4 space-y-2.5">
            {data.fraudFlags.slice(0, 5).map((f) => (
              <div key={f.id} className="rounded-xl border border-slate-100 p-3">
                <div className="flex items-center justify-between">
                  <Badge color={f.severity === "high" ? "red" : f.severity === "medium" ? "amber" : "slate"}>
                    {f.severity.toUpperCase()} · score {f.score}
                  </Badge>
                  <span className="text-xs font-bold text-ink-900">{fmtUSD(f.amount, 0)}</span>
                </div>
                <p className="mt-1.5 line-clamp-1 text-xs font-medium text-slate-700">{f.description}</p>
                <p className="mt-0.5 line-clamp-1 text-[10px] text-slate-400">{f.reason}</p>
              </div>
            ))}
            {data.fraudFlags.length === 0 && (
              <div className="rounded-xl bg-emerald-50 p-4 text-center text-xs font-medium text-emerald-600">
                🎉 No anomalies — transaction patterns are clean.
              </div>
            )}
          </div>
          <Link href="/sophie" className="btn-gold mt-4 w-full">
            <Sparkles size={15} /> Let Sophie explain this
          </Link>
        </Card>
      </div>

      {/* DEPARTMENT STRIP */}
      <Card className="mt-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-extrabold text-ink-900">Department Activity</h3>
            <p className="text-xs text-slate-500">All seven units — tasks in flight</p>
          </div>
          <Link href="/departments" className="btn-ghost">Manage departments</Link>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          {(["Marketing", "IT", "HR", "Accounts", "Procurement", "Cash Office", "Security"] as const).map((d) => {
            const tasks = data.tasks.filter((t) => t.department === d);
            const done = tasks.filter((t) => t.status === "done").length;
            return (
              <div key={d} className="rounded-2xl border border-slate-100 bg-gradient-to-b from-slate-50 to-white p-4 text-center">
                <p className="text-xs font-extrabold text-ink-900">{d}</p>
                <p className="mt-1 text-[10px] text-slate-400">{done}/{tasks.length} tasks done</p>
                <div className="mx-auto mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-gradient-to-r from-aqua-500 to-gold-400" style={{ width: `${tasks.length ? (done / tasks.length) * 100 : 0}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
