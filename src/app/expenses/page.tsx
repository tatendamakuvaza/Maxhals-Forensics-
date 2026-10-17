"use client";
import React from "react";
import { Plus, Download, Trash2, Receipt, TrendingDown } from "lucide-react";
import { Card, PageHeader, StatCard, Badge } from "@/components/ui";
import { useStore } from "@/lib/store";
import { fmtUSD, fmtDate, fmtPct, pct } from "@/lib/format";
import { computePnL } from "@/lib/accounting";
import { toCSV, downloadFile } from "@/lib/export";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, CartesianGrid, XAxis, YAxis, Legend } from "recharts";
import { DEPARTMENTS, Department } from "@/lib/types";

const COLORS = ["#33d6c2", "#f6c453", "#8b5cf6", "#60a5fa", "#f87171", "#34d399", "#fbbf24", "#c084fc", "#fb7185", "#38bdf8", "#a3e635"];

export default function ExpensesPage() {
  const data = useStore((s) => s.data);
  const update = useStore((s) => s.update);
  const pnl = computePnL(data);
  const [dept, setDept] = React.useState<"all" | Department>("all");
  const [showForm, setShowForm] = React.useState(false);
  const [form, setForm] = React.useState({
    date: "2026-10-17",
    category: "Travel & Fuel",
    description: "",
    amount: 0,
    department: "Accounts" as Department,
    paidThrough: "CBZ USD",
    recurring: false
  });

  const rows = data.expenses.filter((e) => dept === "all" || e.department === dept).sort((a, b) => b.date.localeCompare(a.date));
  const totalVat = data.expenses.reduce((a, b) => a + b.vatClaimable, 0);

  const monthly = (() => {
    const m = new Map<string, number>();
    data.expenses.forEach((e) => m.set(e.date.slice(0, 7), (m.get(e.date.slice(0, 7)) ?? 0) + e.amount));
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([k, v]) => ({
      month: new Date(k + "-01T00:00:00").toLocaleDateString("en-US", { month: "short" }),
      amount: Math.round(v)
    }));
  })();

  const add = () => {
    if (!form.description || form.amount <= 0) return;
    update((d) => {
      d.expenses.push({
        id: `EXP-${Date.now()}`,
        date: form.date,
        category: form.category,
        description: form.description,
        amount: form.amount,
        vatClaimable: Math.round(form.amount * 0.15 * 100) / 100,
        department: form.department,
        paidThrough: form.paidThrough,
        recurring: form.recurring
      });
    });
    setShowForm(false);
  };

  return (
    <div>
      <PageHeader
        title="Expense Manager"
        subtitle="Every cost categorised, VAT-tracked and mapped to a department — input VAT is claimable where receipts exist."
        actions={
          <>
            <button
              onClick={() =>
                downloadFile(toCSV(rows.map((r) => ({ Date: r.date, Category: r.category, Description: r.description, Department: r.department, Amount: r.amount, "VAT Claimable": r.vatClaimable, PaidThrough: r.paidThrough }))), "maxhals-expenses.csv", "text/csv")
              }
              className="btn-ghost"
            >
              <Download size={15} /> Export CSV
            </button>
            <button onClick={() => setShowForm(!showForm)} className="btn-primary"><Plus size={15} /> Add expense</button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Total expenses YTD" value={fmtUSD(pnl.totalExpenses, 0)} delta={`${fmtPct(pct(pnl.totalExpenses, pnl.totalIncome), 0)} of income`} icon={<TrendingDown size={20} />} />
        <StatCard label="Input VAT claimable" value={fmtUSD(totalVat, 0)} delta="recoverable from ZIMRA" icon={<Receipt size={20} />} />
        <StatCard label="Largest category" value={pnl.expensesByCategory[0]?.category ?? "—"} delta={fmtUSD(pnl.expensesByCategory[0]?.amount ?? 0, 0)} icon={<Receipt size={20} />} />
      </div>

      {showForm && (
        <Card className="mt-5 border-aqua-400/40">
          <h3 className="mb-4 text-sm font-extrabold text-ink-900">Add expense</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-6">
            <input type="date" className="input" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            <select className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {["Rent & Utilities", "Salaries & Wages", "Software & Subscriptions", "Travel & Fuel", "Marketing & Branding", "Professional Fees", "Bank Charges", "Security & Compliance", "Training & Development", "Direct Seminar Costs", "Equipment & Fixtures", "Miscellaneous"].map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
            <input className="input sm:col-span-2" placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            <input type="number" className="input" placeholder="Amount USD" value={form.amount || ""} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} />
            <select className="input" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value as Department })}>
              {DEPARTMENTS.map((d) => <option key={d}>{d}</option>)}
            </select>
          </div>
          <button onClick={add} className="btn-primary mt-4">Save expense</button>
        </Card>
      )}

      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card>
          <h3 className="mb-1 text-base font-extrabold text-ink-900">Spend by Category</h3>
          <p className="mb-3 text-xs text-slate-500">Where the money goes</p>
          <div className="h-[280px]">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={pnl.expensesByCategory} dataKey="amount" nameKey="category" innerRadius={60} outerRadius={100} paddingAngle={3}>
                  {pnl.expensesByCategory.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: number) => fmtUSD(v)} contentStyle={{ borderRadius: 12, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card>
          <h3 className="mb-1 text-base font-extrabold text-ink-900">Monthly Expense Trend</h3>
          <p className="mb-3 text-xs text-slate-500">Operating cost discipline</p>
          <div className="h-[280px]">
            <ResponsiveContainer>
              <BarChart data={monthly}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#64748b" }} />
                <YAxis tick={{ fontSize: 11, fill: "#64748b" }} tickFormatter={(v) => `$${v / 1000}K`} />
                <Tooltip formatter={(v: number) => fmtUSD(v)} contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                <Bar dataKey="amount" fill="#f87171" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {(["all", ...DEPARTMENTS] as const).map((d) => (
          <button
            key={d}
            onClick={() => setDept(d as "all" | Department)}
            className={`rounded-xl px-3.5 py-2 text-xs font-semibold ${dept === d ? "bg-ink-900 text-white" : "border border-slate-200 bg-white text-slate-500 hover:border-aqua-400"}`}
          >
            {d === "all" ? "All departments" : d}
          </button>
        ))}
      </div>

      <Card className="mt-4 overflow-x-auto p-0">
        <table className="w-full min-w-[850px]">
          <thead>
            <tr className="table-head">
              <th className="th">Date</th>
              <th className="th">Category</th>
              <th className="th">Description</th>
              <th className="th">Department</th>
              <th className="th">Paid via</th>
              <th className="th">VAT claim</th>
              <th className="th">Amount</th>
              <th className="th text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50/70">
                <td className="td">{fmtDate(r.date)}</td>
                <td className="td"><Badge color="purple">{r.category}</Badge></td>
                <td className="td font-medium text-ink-900">{r.description}</td>
                <td className="td">{r.department}</td>
                <td className="td">{r.paidThrough}</td>
                <td className="td text-emerald-600">{fmtUSD(r.vatClaimable)}</td>
                <td className="td font-bold text-ink-900">{fmtUSD(r.amount)}</td>
                <td className="td text-right">
                  <button
                    onClick={() => update((d) => { d.expenses = d.expenses.filter((x) => x.id !== r.id); })}
                    className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-500"
                  >
                    <Trash2 size={15} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
