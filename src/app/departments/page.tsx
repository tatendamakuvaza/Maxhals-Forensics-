"use client";
import React from "react";
import { Building2, Plus, CheckCircle2, Clock, Users, ShieldCheck, Banknote, Server, Megaphone, ShoppingCart, Wallet, Lock, Trash2 } from "lucide-react";
import { Card, PageHeader, Badge } from "@/components/ui";
import { useStore } from "@/lib/store";
import { fmtDate } from "@/lib/format";
import { DEPARTMENTS, Department, DeptTask } from "@/lib/types";

const DEPT_META: Record<Department, { icon: typeof Building2; color: string; mission: string; kpi: string }> = {
  Marketing: { icon: Megaphone, color: "#c084fc", mission: "Brand, seminars pipeline & client acquisition", kpi: "Campaign reach · lead conversion" },
  IT: { icon: Server, color: "#60a5fa", mission: "Systems, ML models, data security & uptime", kpi: "Model accuracy · incident MTTR" },
  HR: { icon: Users, color: "#f472b6", mission: "People, payroll governance & NSSA compliance", kpi: "Payroll accuracy · retention" },
  Accounts: { icon: Banknote, color: "#33d6c2", mission: "Reporting, VAT/PAYE filings & controls", kpi: "Close cycle days · filing punctuality" },
  Procurement: { icon: ShoppingCart, color: "#34d399", mission: "Vendor sourcing, tender compliance & savings", kpi: "Cost savings · supplier SLA" },
  "Cash Office": { icon: Wallet, color: "#fbbf24", mission: "Lodgements, petty cash & bank reconciliation", kpi: "Rec completion · cash variances" },
  Security: { icon: Lock, color: "#f87171", mission: "Physical & cyber security, compliance audits", kpi: "Audit findings closed · access reviews" }
};

export default function DepartmentsPage() {
  const data = useStore((s) => s.data);
  const update = useStore((s) => s.update);
  const [dept, setDept] = React.useState<Department>("Accounts");
  const [showForm, setShowForm] = React.useState(false);
  const [form, setForm] = React.useState({ title: "", assignee: "", due: "2026-11-01", priority: "medium" as DeptTask["priority"] });

  const tasks = data.tasks.filter((t) => t.department === dept);
  const meta = DEPT_META[dept];

  const addTask = () => {
    if (!form.title) return;
    update((d) => {
      d.tasks.push({
        id: `TSK-${Date.now()}`,
        department: dept,
        title: form.title,
        assignee: form.assignee || (data.users.find((u) => u.department === dept)?.name ?? "Team"),
        due: form.due,
        status: "todo",
        priority: form.priority
      });
    });
    setShowForm(false);
    setForm({ title: "", assignee: "", due: "2026-11-01", priority: "medium" });
  };

  const cycle = (id: string) =>
    update((d) => {
      const t = d.tasks.find((x) => x.id === id);
      if (t) t.status = t.status === "todo" ? "in-progress" : t.status === "in-progress" ? "done" : "todo";
    });

  return (
    <div>
      <PageHeader
        title="Departments"
        subtitle="Marketing · IT · HR · Accounts · Procurement · Cash Office · Security — every unit with its mission, KPIs and task board."
        actions={<button onClick={() => setShowForm(!showForm)} className="btn-primary"><Plus size={15} /> New task</button>}
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        {DEPARTMENTS.map((d) => {
          const m = DEPT_META[d];
          const count = data.tasks.filter((t) => t.department === d).length;
          return (
            <button
              key={d}
              onClick={() => setDept(d)}
              className={`rounded-2xl border p-4 text-left transition-all ${
                dept === d ? "border-transparent bg-ink-950 text-white shadow-card" : "border-slate-200 bg-white hover:border-aqua-400"
              }`}
            >
              <m.icon size={20} style={{ color: dept === d ? "#33d6c2" : m.color }} />
              <p className="mt-2 text-xs font-extrabold">{d}</p>
              <p className={`mt-0.5 text-[10px] ${dept === d ? "text-white/50" : "text-slate-400"}`}>{count} task{count === 1 ? "" : "s"}</p>
            </button>
          );
        })}
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl p-3" style={{ background: `${meta.color}22` }}>
                <meta.icon size={24} style={{ color: meta.color }} />
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-ink-900">{dept}</h3>
                <p className="text-xs text-slate-500">{meta.mission}</p>
              </div>
            </div>
            <Badge color="aqua">KPI · {meta.kpi}</Badge>
          </div>

          {showForm && (
            <div className="mt-5 rounded-2xl border border-aqua-400/40 bg-aqua-400/5 p-4">
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-4">
                <input className="input sm:col-span-2" placeholder="Task title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                <input className="input" placeholder="Assignee" value={form.assignee} onChange={(e) => setForm({ ...form, assignee: e.target.value })} />
                <input type="date" className="input" value={form.due} onChange={(e) => setForm({ ...form, due: e.target.value })} />
              </div>
              <div className="mt-2.5 flex gap-2">
                {(["low", "medium", "high"] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => setForm({ ...form, priority: p })}
                    className={`rounded-lg px-3 py-1.5 text-[11px] font-semibold capitalize ${form.priority === p ? "bg-ink-900 text-white" : "border border-slate-200 text-slate-500"}`}
                  >
                    {p}
                  </button>
                ))}
                <button onClick={addTask} className="btn-primary ml-auto py-1.5 text-xs">Add task</button>
              </div>
            </div>
          )}

          <div className="mt-5 space-y-2.5">
            {tasks.map((t) => (
              <div
                key={t.id}
                className={`group flex items-center gap-3 rounded-2xl border p-4 transition ${
                  t.status === "done" ? "border-emerald-100 bg-emerald-50/40" : t.status === "in-progress" ? "border-blue-100 bg-blue-50/30" : "border-slate-100 bg-white"
                }`}
              >
                <button
                  onClick={() => cycle(t.id)}
                  className={`grid h-8 w-8 shrink-0 place-items-center rounded-xl transition ${
                    t.status === "done" ? "bg-emerald-500 text-white" : "border-2 border-slate-200 text-slate-300 hover:border-aqua-400"
                  }`}
                  title="Click to advance status"
                >
                  {t.status === "done" ? <CheckCircle2 size={16} /> : <Clock size={14} />}
                </button>
                <div className="min-w-0 flex-1">
                  <p className={`text-sm font-bold ${t.status === "done" ? "text-slate-400 line-through" : "text-ink-900"}`}>{t.title}</p>
                  <p className="text-[11px] text-slate-400">{t.assignee} · due {fmtDate(t.due)}</p>
                </div>
                <Badge color={t.priority === "high" ? "red" : t.priority === "medium" ? "amber" : "slate"}>{t.priority}</Badge>
                <Badge color={t.status === "done" ? "green" : t.status === "in-progress" ? "blue" : "slate"}>{t.status}</Badge>
                <button
                  onClick={() => update((d) => { d.tasks = d.tasks.filter((x) => x.id !== t.id); })}
                  className="opacity-0 transition group-hover:opacity-100"
                >
                  <Trash2 size={14} className="text-slate-300 hover:text-rose-500" />
                </button>
              </div>
            ))}
            {tasks.length === 0 && <p className="py-8 text-center text-sm text-slate-400">No tasks for {dept} yet — add the first one.</p>}
          </div>
        </Card>

        <div className="space-y-5">
          <Card>
            <h3 className="text-sm font-extrabold text-ink-900">Department staff</h3>
            <div className="mt-3 space-y-2.5">
              {data.users.filter((u) => u.department === dept).map((u) => (
                <div key={u.id} className="flex items-center gap-3 rounded-xl border border-slate-100 p-3">
                  <div className="grid h-9 w-9 place-items-center rounded-full text-xs font-bold text-white" style={{ background: u.color }}>
                    {u.name.split(" ").map((w) => w[0]).slice(0, 2).join("")}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-ink-900">{u.name}</p>
                    <p className="text-[10px] text-slate-400">{u.role} · {u.department}</p>
                  </div>
                </div>
              ))}
              {data.users.filter((u) => u.department === dept).length === 0 && (
                <p className="py-4 text-center text-xs text-slate-400">Cross-functional support only</p>
              )}
            </div>
          </Card>

          <Card>
            <h3 className="text-sm font-extrabold text-ink-900">Workload overview</h3>
            <div className="mt-3 space-y-2.5">
              {DEPARTMENTS.map((d) => {
                const ts = data.tasks.filter((t) => t.department === d);
                const done = ts.filter((t) => t.status === "done").length;
                return (
                  <div key={d} className="flex items-center gap-2.5">
                    <span className="w-24 text-[11px] font-medium text-slate-500">{d}</span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${ts.length ? ((ts.length - done) / ts.length) * 100 : 0}%`, background: DEPT_META[d].color }}
                      />
                    </div>
                    <span className="w-10 text-right text-[10px] font-bold text-slate-500">{ts.length - done}/{ts.length}</span>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
