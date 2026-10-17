"use client";
import React from "react";
import { Plus, Download, Wallet, Briefcase, GraduationCap, Banknote, Trash2, CheckCircle2 } from "lucide-react";
import { Card, PageHeader, StatCard, Badge } from "@/components/ui";
import { useStore } from "@/lib/store";
import { fmtUSD, fmtDate, fmtPct } from "@/lib/format";
import { computePnL } from "@/lib/accounting";
import { toCSV, downloadFile } from "@/lib/export";
import { IncomeStream, STREAM_LABELS } from "@/lib/types";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend, Line, ComposedChart, Area } from "recharts";

const ICONS: Record<IncomeStream, typeof Wallet> = { salary: Banknote, forensic: Briefcase, seminar: GraduationCap };
const COLORS: Record<IncomeStream, string> = { salary: "#33d6c2", forensic: "#f6c453", seminar: "#8b5cf6" };

export default function IncomePage() {
  const data = useStore((s) => s.data);
  const update = useStore((s) => s.update);
  const pnl = computePnL(data);
  const [stream, setStream] = React.useState<"all" | IncomeStream>("all");
  const [showForm, setShowForm] = React.useState(false);
  const [form, setForm] = React.useState({ date: "2026-10-17", stream: "forensic" as IncomeStream, description: "", client: "", amount: 0 });

  const rows = data.income.filter((i) => stream === "all" || i.stream === stream).sort((a, b) => b.date.localeCompare(a.date));

  const monthlyByStream = (() => {
    const m = new Map<string, Record<string, number>>();
    data.income.forEach((i) => {
      const k = i.date.slice(0, 7);
      const cur = m.get(k) ?? { salary: 0, forensic: 0, seminar: 0 };
      cur[i.stream] += i.amount;
      m.set(k, cur);
    });
    return [...m.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([k, v]) => ({
        month: new Date(k + "-01T00:00:00").toLocaleDateString("en-US", { month: "short" }),
        ...v,
        total: v.salary + v.forensic + v.seminar
      }));
  })();

  const add = () => {
    if (!form.description || form.amount <= 0) return;
    update((d) => {
      d.income.push({
        id: `INC-${Date.now()}`,
        date: form.date,
        stream: form.stream,
        description: form.description,
        client: form.client || "Direct",
        amount: form.amount,
        vatCharged: form.stream === "salary" ? 0 : Math.round(form.amount * 0.15 * 100) / 100,
        accountCode: form.stream === "salary" ? "4000" : form.stream === "forensic" ? "4100" : "4200",
        received: true
      });
    });
    setShowForm(false);
    setForm({ date: "2026-10-17", stream: "forensic", description: "", client: "", amount: 0 });
  };

  return (
    <div>
      <PageHeader
        title="Income Streams"
        subtitle="Salary & employment, forensic audit & advisory, and big data analytics seminars — tracked separately with live profitability."
        actions={
          <>
            <button
              onClick={() =>
                downloadFile(
                  toCSV(rows.map((r) => ({ Date: r.date, Stream: STREAM_LABELS[r.stream], Client: r.client, Description: r.description, Amount: r.amount, VAT: r.vatCharged, Received: r.received }))),
                  "maxhals-income.csv",
                  "text/csv"
                )
              }
              className="btn-ghost"
            >
              <Download size={15} /> Export CSV
            </button>
            <button onClick={() => setShowForm(!showForm)} className="btn-primary"><Plus size={15} /> Record income</button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {(["salary", "forensic", "seminar"] as IncomeStream[]).map((s) => {
          const Icon = ICONS[s];
          const v = pnl.incomeByStream[s];
          return (
            <Card key={s} className="relative overflow-hidden">
              <div className="absolute right-0 top-0 h-24 w-24 rounded-full opacity-10" style={{ background: COLORS[s] }} />
              <div className="flex items-center gap-3">
                <div className="rounded-2xl p-3" style={{ background: `${COLORS[s]}22`, color: COLORS[s] }}>
                  <Icon size={22} />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{STREAM_LABELS[s]}</p>
                  <p className="text-2xl font-extrabold text-ink-900">{fmtUSD(v, 0)}</p>
                </div>
              </div>
              <div className="mt-4">
                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full" style={{ width: `${(v / pnl.totalIncome) * 100}%`, background: COLORS[s] }} />
                </div>
                <p className="mt-1.5 text-xs font-medium text-slate-500">{fmtPct((v / pnl.totalIncome) * 100)} of total revenue</p>
              </div>
            </Card>
          );
        })}
      </div>

      {showForm && (
        <Card className="mt-5 border-aqua-400/40">
          <h3 className="mb-4 text-sm font-extrabold text-ink-900">Record new income</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-5">
            <input type="date" className="input" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            <select className="input" value={form.stream} onChange={(e) => setForm({ ...form, stream: e.target.value as IncomeStream })}>
              <option value="salary">Salary</option>
              <option value="forensic">Forensic & Advisory</option>
              <option value="seminar">Seminars</option>
            </select>
            <input className="input" placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            <input className="input" placeholder="Client / source" value={form.client} onChange={(e) => setForm({ ...form, client: e.target.value })} />
            <input type="number" className="input" placeholder="Amount USD" value={form.amount || ""} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} />
          </div>
          <button onClick={add} className="btn-primary mt-4">Save income</button>
        </Card>
      )}

      <Card className="mt-5">
        <h3 className="mb-1 text-base font-extrabold text-ink-900">Stream Performance by Month</h3>
        <p className="mb-4 text-xs text-slate-500">Stacked revenue with net trend line — your three engines side by side</p>
        <div className="h-[320px]">
          <ResponsiveContainer>
            <ComposedChart data={monthlyByStream}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#64748b" }} />
              <YAxis tick={{ fontSize: 11, fill: "#64748b" }} tickFormatter={(v) => `$${v / 1000}K`} />
              <Tooltip formatter={(v: number) => fmtUSD(v)} contentStyle={{ borderRadius: 12, fontSize: 12 }} />
              <Bar dataKey="salary" stackId="a" fill="#33d6c2" radius={[0, 0, 0, 0]} />
              <Bar dataKey="forensic" stackId="a" fill="#f6c453" />
              <Bar dataKey="seminar" stackId="a" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
              <Line type="monotone" dataKey="total" stroke="#0b1226" strokeWidth={2} dot={{ r: 3 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div className="mt-5 flex flex-wrap gap-2">
        {(["all", "salary", "forensic", "seminar"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setStream(f)}
            className={`rounded-xl px-4 py-2 text-xs font-semibold capitalize ${stream === f ? "bg-ink-900 text-white" : "border border-slate-200 bg-white text-slate-500 hover:border-aqua-400"}`}
          >
            {f === "all" ? "All streams" : STREAM_LABELS[f]}
          </button>
        ))}
      </div>

      <Card className="mt-4 overflow-x-auto p-0">
        <table className="w-full min-w-[800px]">
          <thead>
            <tr className="table-head">
              <th className="th">Date</th>
              <th className="th">Stream</th>
              <th className="th">Description</th>
              <th className="th">Client / Source</th>
              <th className="th">VAT</th>
              <th className="th">Amount</th>
              <th className="th">Status</th>
              <th className="th text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50/70">
                <td className="td">{fmtDate(r.date)}</td>
                <td className="td">
                  <span className="chip" style={{ background: `${COLORS[r.stream]}22`, color: COLORS[r.stream] }}>
                    {STREAM_LABELS[r.stream].split(" ")[0]}
                  </span>
                </td>
                <td className="td font-medium text-ink-900">{r.description}</td>
                <td className="td">{r.client}</td>
                <td className="td">{fmtUSD(r.vatCharged)}</td>
                <td className="td font-bold text-ink-900">{fmtUSD(r.amount)}</td>
                <td className="td">
                  <Badge color={r.received ? "green" : "amber"}>{r.received ? "received" : "receivable"}</Badge>
                </td>
                <td className="td">
                  <div className="flex justify-end gap-1">
                    {!r.received && (
                      <button
                        onClick={() => update((d) => { const t = d.income.find((x) => x.id === r.id); if (t) t.received = true; })}
                        className="rounded-lg p-2 text-emerald-500 hover:bg-emerald-50"
                        title="Mark received"
                      >
                        <CheckCircle2 size={15} />
                      </button>
                    )}
                    <button
                      onClick={() => update((d) => { d.income = d.income.filter((x) => x.id !== r.id); })}
                      className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-500"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
