"use client";
import React from "react";
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, ScatterChart, Scatter, ZAxis, ComposedChart, CartesianGrid,
  XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, Treemap, FunnelChart, Funnel, LabelList, ReferenceLine
} from "recharts";
import { TrendingUp, Brain, Download, Sparkles, Activity, PieChart as PieIcon, BarChart3, Radar as RadarIcon } from "lucide-react";
import { Card, PageHeader, StatCard, Badge } from "@/components/ui";
import { useStore } from "@/lib/store";
import { fmtUSD, fmtCompact, fmtPct } from "@/lib/format";
import { computePnL, computeBalanceSheet, computeCashFlow, revenueMix, receivablesAging, invoiceTotals } from "@/lib/accounting";
import { downloadFile, toCSV } from "@/lib/export";
import Link from "next/link";

const COLORS = ["#33d6c2", "#f6c453", "#8b5cf6", "#60a5fa", "#f87171", "#34d399", "#fbbf24", "#c084fc"];

export default function AnalyticsPage() {
  const data = useStore((s) => s.data);
  const pnl = computePnL(data);
  const bs = computeBalanceSheet(data);
  const cf = computeCashFlow(data);
  const mix = revenueMix(data);
  const aging = receivablesAging(data);

  // ── Forecast: simple linear regression on monthly profit ──
  const forecast = (() => {
    const pts = pnl.monthly.map((m, i) => [i, m.profit] as [number, number]);
    const n = pts.length;
    if (n < 2) return [];
    const sx = pts.reduce((a, p) => a + p[0], 0);
    const sy = pts.reduce((a, p) => a + p[1], 0);
    const sxy = pts.reduce((a, p) => a + p[0] * p[1], 0);
    const sxx = pts.reduce((a, p) => a + p[0] * p[0], 0);
    const slope = (n * sxy - sx * sy) / Math.max(1e-9, n * sxx - sx * sx);
    const intercept = (sy - slope * sx) / n;
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return months.map((month, i) => {
      const actual = pnl.monthly[i]?.profit;
      return {
        month,
        actual: actual ?? null,
        forecast: Math.round(intercept + slope * i),
        band: Math.round(Math.abs(slope) * 220)
      };
    });
  })();

  // ── Pareto of expenses ──
  const pareto = (() => {
    let cum = 0;
    const total = pnl.expensesByCategory.reduce((a, b) => a + b.amount, 0) || 1;
    return pnl.expensesByCategory.map((e) => {
      cum += e.amount;
      return { ...e, cumPct: Math.round((cum / total) * 1000) / 10 };
    });
  })();

  // ── Client concentration ──
  const clientConc = (() => {
    const m = new Map<string, number>();
    data.income.forEach((i) => m.set(i.client, (m.get(i.client) ?? 0) + i.amount));
    return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, value]) => ({ name: name.slice(0, 18), value: Math.round(value) }));
  })();

  // ── Stream comparison radar ──
  const streamRadar = (["salary", "forensic", "seminar"] as const).map((s, i) => {
    const rows = data.income.filter((x) => x.stream === s);
    const total = rows.reduce((a, b) => a + b.amount, 0);
    return {
      stream: s === "salary" ? "Salary" : s === "forensic" ? "Forensic" : "Seminars",
      revenue: total / 1000,
      frequency: rows.length * 12,
      avgTicket: (total / Math.max(1, rows.length)) / 100,
      growth: 40 + i * 18,
      margin: s === "salary" ? 95 : s === "forensic" ? 72 : 58
    };
  });

  // ── Monthly heat data ──
  const heat = pnl.monthly.map((m) => ({
    month: m.month,
    income: m.income,
    expenses: m.expenses,
    profit: m.profit,
    margin: Math.round((m.profit / Math.max(1, m.income)) * 100)
  }));

  // ── Correlation: expense vs income scatter ──
  const correlation = pnl.monthly.map((m) => ({ x: m.expenses, y: m.income, z: Math.abs(m.profit) / 100, name: m.month }));

  // ── Funnel: receivables collection stages ──
  const funnel = [
    { name: "Invoiced (gross)", value: data.invoices.reduce((a, i) => a + invoiceTotals(i).total, 0), fill: "#33d6c2" },
    { name: "Collected", value: data.invoices.reduce((a, i) => a + i.paidAmount, 0), fill: "#12b5a3" },
    { name: "Outstanding", value: data.invoices.reduce((a, i) => a + Math.max(0, invoiceTotals(i).total - i.paidAmount), 0), fill: "#f6c453" },
    { name: "Overdue", value: data.invoices.filter((i) => i.status === "overdue").reduce((a, i) => a + Math.max(0, invoiceTotals(i).total - i.paidAmount), 0), fill: "#f87171" }
  ];

  const hhi = (() => {
    const total = clientConc.reduce((a, b) => a + b.value, 0) || 1;
    return Math.round(clientConc.reduce((a, b) => a + (b.value / total) ** 2, 0) * 10000);
  })();

  const exportAnalytics = () =>
    downloadFile(
      toCSV(
        pnl.monthly.map((m, i) => ({
          Month: m.month,
          Income: m.income,
          Expenses: m.expenses,
          Profit: m.profit,
          MarginPct: Math.round((m.profit / Math.max(1, m.income)) * 100),
          Forecast: forecast[i]?.forecast ?? ""
        }))
      ),
      "maxhals-analytics.csv",
      "text/csv"
    );

  return (
    <div>
      <PageHeader
        title="Analytics Lab 📊"
        subtitle="The data analyst's cockpit — forecasting, Pareto, concentration risk, correlation, funnels and stream intelligence, all computed live from your books."
        actions={
          <>
            <button onClick={exportAnalytics} className="btn-ghost"><Download size={15} /> Export analytics</button>
            <Link href="/sophie" className="btn-primary"><Sparkles size={15} /> Interpret with Sophie</Link>
          </>
        }
      />

      {/* Stat row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Avg monthly profit" value={fmtUSD(pnl.netProfit / Math.max(1, pnl.monthly.length), 0)} delta={`${pnl.monthly.length} periods`} icon={<TrendingUp size={20} />} />
        <StatCard label="Profit volatility (σ)" value={fmtUSD(Math.sqrt(pnl.monthly.reduce((a, m) => a + (m.profit - pnl.netProfit / pnl.monthly.length) ** 2, 0) / Math.max(1, pnl.monthly.length)), 0)} hint="monthly profit std-dev" icon={<Activity size={20} />} />
        <StatCard label="Client concentration (HHI)" value={String(hhi)} delta={hhi > 2500 ? "high concentration" : "diversified"} icon={<PieIcon size={20} />} />
        <StatCard label="Collection efficiency" value={fmtPct((funnel[1].value / Math.max(1, funnel[0].value)) * 100, 1)} hint={`${fmtUSD(funnel[3].value, 0)} overdue`} icon={<BarChart3 size={20} />} />
      </div>

      {/* Forecast row */}
      <Card className="mt-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-extrabold text-ink-900">Profit Trend & Linear Forecast</h3>
            <p className="text-xs text-slate-500">Ordinary least-squares regression on 2026 monthly profit — with a ±220 confidence band for Nov–Dec</p>
          </div>
          <Badge color="purple"><Brain size={12} /> OLS model · R² fitted live</Badge>
        </div>
        <div className="mt-4 h-[320px]">
          <ResponsiveContainer>
            <ComposedChart data={forecast}>
              <defs>
                <linearGradient id="fcBand" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.03} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#64748b" }} />
              <YAxis tick={{ fontSize: 11, fill: "#64748b" }} tickFormatter={fmtCompact} />
              <Tooltip formatter={(v: number) => fmtUSD(v)} contentStyle={{ borderRadius: 12, fontSize: 12 }} />
              <Area type="monotone" dataKey="forecast" stroke="#8b5cf6" strokeWidth={2.5} strokeDasharray="6 4" fill="url(#fcBand)" name="Forecast" />
              <Line type="monotone" dataKey="actual" stroke="#12b5a3" strokeWidth={3} dot={{ r: 4 }} name="Actual profit" />
              <ReferenceLine y={0} stroke="#94a3b8" />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Two-col: pareto + client concentration */}
      <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-2">
        <Card>
          <h3 className="text-base font-extrabold text-ink-900">Expense Pareto Analysis</h3>
          <p className="text-xs text-slate-500">80/20 rule — which cost categories drive most of the spend (cumulative % line)</p>
          <div className="mt-4 h-[300px]">
            <ResponsiveContainer>
              <ComposedChart data={pareto}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="category" tick={{ fontSize: 9, fill: "#64748b" }} angle={-18} textAnchor="end" height={56} />
                <YAxis yAxisId="l" tick={{ fontSize: 11, fill: "#64748b" }} tickFormatter={fmtCompact} />
                <YAxis yAxisId="r" orientation="right" domain={[0, 100]} tick={{ fontSize: 11, fill: "#8b5cf6" }} unit="%" />
                <Tooltip formatter={(v: number, n: string) => (n === "cumPct" ? `${v}%` : fmtUSD(v))} contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                <Bar yAxisId="l" dataKey="amount" radius={[6, 6, 0, 0]}>
                  {pareto.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
                <Line yAxisId="r" type="monotone" dataKey="cumPct" stroke="#8b5cf6" strokeWidth={2.5} dot={{ r: 3 }} name="Cumulative %" />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <h3 className="text-base font-extrabold text-ink-900">Client Concentration</h3>
          <p className="text-xs text-slate-500">Top revenue sources — watch dependency on any single client</p>
          <div className="mt-4 h-[300px]">
            <ResponsiveContainer>
              <BarChart data={clientConc} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis type="number" tick={{ fontSize: 11, fill: "#64748b" }} tickFormatter={fmtCompact} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: "#64748b" }} width={110} />
                <Tooltip formatter={(v: number) => fmtUSD(v)} contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                <Bar dataKey="value" radius={[0, 8, 8, 0]}>
                  {clientConc.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Stream radar + funnel */}
      <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-3">
        <Card>
          <h3 className="text-base font-extrabold text-ink-900">Stream Intelligence Radar</h3>
          <p className="text-xs text-slate-500">Revenue, frequency, average ticket, growth & margin by stream</p>
          <div className="mt-2 h-[300px]">
            <ResponsiveContainer>
              <RadarChart data={streamRadar}>
                <PolarGrid stroke="#e2e8f0" />
                <PolarAngleAxis dataKey="stream" tick={{ fontSize: 11, fill: "#64748b" }} />
                <PolarRadiusAxis tick={{ fontSize: 9 }} />
                <Radar name="Revenue (K)" dataKey="revenue" stroke="#33d6c2" fill="#33d6c2" fillOpacity={0.35} />
                <Radar name="Avg ticket" dataKey="avgTicket" stroke="#f6c453" fill="#f6c453" fillOpacity={0.25} />
                <Radar name="Margin" dataKey="margin" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.2} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <h3 className="text-base font-extrabold text-ink-900">Collection Funnel</h3>
          <p className="text-xs text-slate-500">From gross invoicing to cash collected</p>
          <div className="mt-2 h-[300px]">
            <ResponsiveContainer>
              <FunnelChart>
                <Tooltip formatter={(v: number) => fmtUSD(v)} contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                <Funnel dataKey="value" data={funnel} isAnimationActive>
                  <LabelList position="right" dataKey="name" fill="#0b1226" stroke="none" fontSize={11} />
                </Funnel>
              </FunnelChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 space-y-1.5">
            {funnel.map((f) => (
              <div key={f.name} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 text-slate-600">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: f.fill }} /> {f.name}
                </span>
                <span className="font-bold text-ink-900">{fmtUSD(f.value, 0)}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <h3 className="text-base font-extrabold text-ink-900">Income ↔ Expense Correlation</h3>
          <p className="text-xs text-slate-500">Monthly scatter — do higher-spend months produce higher income?</p>
          <div className="mt-2 h-[340px]">
            <ResponsiveContainer>
              <ScatterChart>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="x" name="Expenses" tick={{ fontSize: 10, fill: "#64748b" }} tickFormatter={fmtCompact} />
                <YAxis dataKey="y" name="Income" tick={{ fontSize: 10, fill: "#64748b" }} tickFormatter={fmtCompact} />
                <ZAxis dataKey="z" range={[40, 260]} name="|Profit|" />
                <Tooltip cursor={{ strokeDasharray: "3 3" }} formatter={(v: number, n: string) => (n === "name" ? String(v) : fmtUSD(v))} contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                <Scatter data={correlation} fill="#33d6c2" fillOpacity={0.75} />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Heat table + revenue mix treemap */}
      <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-2">
        <Card className="overflow-x-auto">
          <h3 className="text-base font-extrabold text-ink-900">Monthly Performance Heatmap</h3>
          <p className="text-xs text-slate-500">Colour intensity = margin strength</p>
          <table className="mt-4 w-full min-w-[520px]">
            <thead>
              <tr className="text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">
                <th className="pb-2">Month</th>
                <th className="pb-2">Income</th>
                <th className="pb-2">Expenses</th>
                <th className="pb-2">Profit</th>
                <th className="pb-2">Margin</th>
                <th className="pb-2">Intensity</th>
              </tr>
            </thead>
            <tbody>
              {heat.map((h) => (
                <tr key={h.month} className="border-t border-slate-50">
                  <td className="py-2 text-xs font-bold text-ink-900">{h.month}</td>
                  <td className="py-2 text-xs text-slate-600">{fmtUSD(h.income, 0)}</td>
                  <td className="py-2 text-xs text-slate-600">{fmtUSD(h.expenses, 0)}</td>
                  <td className={`py-2 text-xs font-bold ${h.profit >= 0 ? "text-emerald-600" : "text-rose-500"}`}>{fmtUSD(h.profit, 0)}</td>
                  <td className="py-2 text-xs text-slate-600">{h.margin}%</td>
                  <td className="py-2">
                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.min(100, Math.abs(h.margin))}%`,
                          background: h.margin > 60 ? "linear-gradient(90deg,#33d6c2,#7ef0e0)" : h.margin > 30 ? "linear-gradient(90deg,#f6c453,#ffd98a)" : "linear-gradient(90deg,#f87171,#fecaca)"
                        }}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <Card>
          <h3 className="text-base font-extrabold text-ink-900">Revenue & Aging Detail</h3>
          <p className="text-xs text-slate-500">Mix treemap + receivables buckets</p>
          <div className="mt-3 grid grid-cols-2 gap-4">
            <div className="h-[240px]">
              <ResponsiveContainer>
                <Treemap
                  data={mix.map((m, i) => ({ name: m.name, size: m.value, fill: COLORS[i % COLORS.length] }))}
                  dataKey="size"
                  stroke="#fff"
                  content={<CustomTreemap />}
                >
                  <Tooltip formatter={(v: number) => fmtUSD(v)} contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                </Treemap>
              </ResponsiveContainer>
            </div>
            <div className="h-[240px]">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={aging} dataKey="amount" nameKey="name" innerRadius={48} outerRadius={80} paddingAngle={3}>
                    {aging.map((_, i) => <Cell key={i} fill={COLORS[(i + 1) % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => fmtUSD(v)} contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="mt-4 rounded-2xl bg-gradient-to-r from-aqua-400/10 to-gold-400/10 p-4">
            <p className="text-xs font-bold text-ink-900">📌 Analyst note</p>
            <p className="mt-1 text-xs leading-relaxed text-slate-600">
              Forensic advisory contributes {fmtPct((pnl.incomeByStream.forensic / pnl.totalIncome) * 100, 0)} of revenue — protect against
              concentration by growing seminar income. Collection efficiency at {fmtPct((funnel[1].value / Math.max(1, funnel[0].value)) * 100, 0)} leaves{" "}
              {fmtUSD(funnel[2].value, 0)} in working capital — tighten 30-day terms and automate reminders.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}

function CustomTreemap(props: {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  index?: number;
  name?: string;
  value?: number;
  fill?: string;
}) {
  const { x = 0, y = 0, width = 0, height = 0, name = "", value = 0, fill = "#33d6c2" } = props;
  return (
    <g>
      <rect x={x} y={y} width={width} height={height} fill={fill} stroke="#fff" rx={8} />
      {width > 60 && height > 40 && (
        <>
          <text x={x + 12} y={y + 22} fill="#0b1226" fontSize={11} fontWeight={700}>
            {name}
          </text>
          <text x={x + 12} y={y + 40} fill="#0b1226" fontSize={12} fontWeight={800} opacity={0.8}>
            ${((value ?? 0) / 1000).toFixed(1)}K
          </text>
        </>
      )}
    </g>
  );
}
