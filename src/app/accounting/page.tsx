"use client";
import React from "react";
import { Download, Plus, BookOpen, Scale, Calculator, Trash2 } from "lucide-react";
import { Card, PageHeader, StatCard, Badge } from "@/components/ui";
import { useStore } from "@/lib/store";
import { fmtUSD, fmtDate } from "@/lib/format";
import { accountBalances } from "@/lib/accounting";
import { toCSV, downloadFile } from "@/lib/export";
import { CHART_OF_ACCOUNTS, JournalLine } from "@/lib/types";

export default function AccountingPage() {
  const data = useStore((s) => s.data);
  const update = useStore((s) => s.update);
  const [tab, setTab] = React.useState<"ledger" | "trial" | "journals" | "coa">("ledger");
  const [lines, setLines] = React.useState<JournalLine[]>([
    { accountCode: "1010", debit: 0, credit: 0 },
    { accountCode: "4100", debit: 0, credit: 0 }
  ]);
  const [narration, setNarration] = React.useState("");
  const [jDate, setJDate] = React.useState("2026-10-17");

  const balances = accountBalances(data);
  const active = balances.filter((b) => b.debit !== 0 || b.credit !== 0);
  const totalDebit = active.reduce((a, b) => a + b.debit, 0);
  const totalCredit = active.reduce((a, b) => a + b.credit, 0);
  const balanced = Math.abs(totalDebit - totalCredit) < 0.5;

  const postJournal = () => {
    const debit = lines.reduce((a, b) => a + b.debit, 0);
    const credit = lines.reduce((a, b) => a + b.credit, 0);
    if (Math.abs(debit - credit) > 0.01 || debit === 0) {
      alert(`Journal must balance! Debits ${fmtUSD(debit)} vs credits ${fmtUSD(credit)}`);
      return;
    }
    update((d) => {
      d.journal.push({
        id: `JE-${Date.now()}`,
        date: jDate,
        ref: `MAN-${d.journal.length + 1}`,
        narration: narration || "Manual journal entry",
        source: "manual",
        lines: lines.filter((l) => l.debit > 0 || l.credit > 0)
      });
    });
    setNarration("");
    setLines([{ accountCode: "1010", debit: 0, credit: 0 }, { accountCode: "4100", debit: 0, credit: 0 }]);
  };

  return (
    <div>
      <PageHeader
        title="General Ledger & Journals"
        subtitle="Double-entry engine powering every module — view account balances, post manual journals and prove the trial balance."
        actions={
          <button
            onClick={() =>
              downloadFile(
                toCSV(active.map((b) => ({ Code: b.code, Account: b.name, Type: b.type, Debit: b.debit, Credit: b.credit, Balance: b.balance }))),
                "general-ledger.csv",
                "text/csv"
              )
            }
            className="btn-ghost"
          >
            <Download size={15} /> Export ledger
          </button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Total debits" value={fmtUSD(totalDebit)} icon={<BookOpen size={20} />} />
        <StatCard label="Total credits" value={fmtUSD(totalCredit)} icon={<Scale size={20} />} />
        <StatCard
          label="Trial balance"
          value={balanced ? "Balanced ✓" : "Out of balance"}
          delta={`${active.length} active accounts`}
          icon={<Calculator size={20} />}
        />
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {([
          ["ledger", "Account balances"],
          ["trial", "Trial balance"],
          ["journals", "Journal entries"],
          ["coa", "Chart of accounts"]
        ] as const).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`rounded-xl px-4 py-2.5 text-xs font-semibold ${tab === id ? "bg-ink-900 text-white" : "border border-slate-200 bg-white text-slate-500 hover:border-aqua-400"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "ledger" && (
        <Card className="mt-4 overflow-x-auto p-0">
          <table className="w-full min-w-[750px]">
            <thead>
              <tr className="table-head">
                <th className="th">Code</th>
                <th className="th">Account</th>
                <th className="th">Type</th>
                <th className="th">Debit</th>
                <th className="th">Credit</th>
                <th className="th">Balance</th>
              </tr>
            </thead>
            <tbody>
              {active.map((b) => (
                <tr key={b.code} className="border-b border-slate-100 hover:bg-slate-50/70">
                  <td className="td font-mono text-xs">{b.code}</td>
                  <td className="td font-medium text-ink-900">{b.name}</td>
                  <td className="td"><Badge color={b.type === "income" ? "green" : b.type === "expense" ? "red" : b.type === "liability" ? "amber" : "blue"}>{b.type}</Badge></td>
                  <td className="td tabular-nums">{fmtUSD(b.debit)}</td>
                  <td className="td tabular-nums">{fmtUSD(b.credit)}</td>
                  <td className="td font-bold tabular-nums text-ink-900">{fmtUSD(b.balance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {tab === "trial" && (
        <Card className="mt-4">
          <h3 className="mb-4 text-base font-extrabold text-ink-900">Trial Balance — 17 October 2026</h3>
          <div className="mx-auto max-w-2xl">
            {active.map((b) => (
              <div key={b.code} className="flex items-center justify-between border-b border-slate-50 py-2.5 text-sm">
                <span className="text-slate-600">{b.code} · {b.name}</span>
                <span className="flex gap-10 tabular-nums">
                  <span className="w-28 text-right">{b.debit ? fmtUSD(b.debit) : "—"}</span>
                  <span className="w-28 text-right">{b.credit ? fmtUSD(b.credit) : "—"}</span>
                </span>
              </div>
            ))}
            <div className="mt-3 flex items-center justify-between rounded-2xl bg-ink-950 px-5 py-4 text-white">
              <span className="text-xs font-semibold uppercase tracking-wider text-white/60">Totals</span>
              <span className="flex gap-10 font-extrabold tabular-nums">
                <span className="w-28 text-right text-gold-400">{fmtUSD(totalDebit)}</span>
                <span className="w-28 text-right text-aqua-400">{fmtUSD(totalCredit)}</span>
              </span>
            </div>
            <p className={`mt-3 text-center text-xs font-semibold ${balanced ? "text-emerald-500" : "text-rose-500"}`}>
              {balanced ? "✓ Trial balance agrees — books are in order" : `⚠ Difference: ${fmtUSD(totalDebit - totalCredit)}`}
            </p>
          </div>
        </Card>
      )}

      {tab === "journals" && (
        <div className="mt-4 grid grid-cols-1 gap-5 lg:grid-cols-3">
          <Card>
            <h3 className="mb-4 text-sm font-extrabold text-ink-900">Post manual journal</h3>
            <label className="label">Date</label>
            <input type="date" value={jDate} onChange={(e) => setJDate(e.target.value)} className="input mb-3" />
            <label className="label">Narration</label>
            <input value={narration} onChange={(e) => setNarration(e.target.value)} placeholder="e.g. Depreciation charge October" className="input mb-3" />
            {lines.map((l, idx) => (
              <div key={idx} className="mb-2 grid grid-cols-12 gap-1.5">
                <select
                  className="input col-span-6"
                  value={l.accountCode}
                  onChange={(e) => setLines(lines.map((x, i) => (i === idx ? { ...x, accountCode: e.target.value } : x)))}
                >
                  {CHART_OF_ACCOUNTS.map((a) => <option key={a.code} value={a.code}>{a.code} {a.name}</option>)}
                </select>
                <input
                  type="number"
                  placeholder="Dr"
                  className="input col-span-3"
                  value={l.debit || ""}
                  onChange={(e) => setLines(lines.map((x, i) => (i === idx ? { ...x, debit: Number(e.target.value), credit: 0 } : x)))}
                />
                <input
                  type="number"
                  placeholder="Cr"
                  className="input col-span-3"
                  value={l.credit || ""}
                  onChange={(e) => setLines(lines.map((x, i) => (i === idx ? { ...x, credit: Number(e.target.value), debit: 0 } : x)))}
                />
              </div>
            ))}
            <button onClick={() => setLines([...lines, { accountCode: "6900", debit: 0, credit: 0 }])} className="btn-ghost mt-2 w-full py-2 text-xs">
              <Plus size={13} /> Add line
            </button>
            <button onClick={postJournal} className="btn-primary mt-3 w-full">Post entry</button>
            <p className="mt-2 text-center text-[10px] text-slate-400">Debits must equal credits before posting</p>
          </Card>

          <Card className="overflow-x-auto lg:col-span-2">
            <h3 className="mb-4 text-sm font-extrabold text-ink-900">Recent journal entries</h3>
            <div className="space-y-3">
              {[...data.journal].reverse().slice(0, 12).map((je) => (
                <div key={je.id} className="rounded-xl border border-slate-100 p-3.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-xs font-bold text-ink-900">{je.ref} · {fmtDate(je.date)}</p>
                      <p className="text-xs text-slate-500">{je.narration}</p>
                    </div>
                    <Badge color={je.source === "manual" ? "purple" : "aqua"}>{je.source}</Badge>
                  </div>
                  <div className="mt-2 space-y-1">
                    {je.lines.map((l, i) => (
                      <div key={i} className="flex justify-between pl-3 text-[11px] text-slate-500">
                        <span>{l.accountCode} — {CHART_OF_ACCOUNTS.find((c) => c.code === l.accountCode)?.name ?? "?"}</span>
                        <span className="tabular-nums">
                          {l.debit ? `Dr ${fmtUSD(l.debit)}` : ""}
                          {l.credit ? `Cr ${fmtUSD(l.credit)}` : ""}
                        </span>
                      </div>
                    ))}
                  </div>
                  {je.source === "manual" && (
                    <button
                      onClick={() => update((d) => { d.journal = d.journal.filter((x) => x.id !== je.id); })}
                      className="mt-2 flex items-center gap-1 text-[10px] font-semibold text-rose-400 hover:text-rose-600"
                    >
                      <Trash2 size={11} /> Reverse entry
                    </button>
                  )}
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {tab === "coa" && (
        <Card className="mt-4 overflow-x-auto p-0">
          <table className="w-full">
            <thead>
              <tr className="table-head">
                <th className="th">Code</th>
                <th className="th">Account name</th>
                <th className="th">Type</th>
                <th className="th">Statement</th>
              </tr>
            </thead>
            <tbody>
              {CHART_OF_ACCOUNTS.map((a) => (
                <tr key={a.code} className="border-b border-slate-100 hover:bg-slate-50/70">
                  <td className="td font-mono text-xs">{a.code}</td>
                  <td className="td font-medium text-ink-900">{a.name}</td>
                  <td className="td"><Badge>{a.type}</Badge></td>
                  <td className="td text-slate-500">
                    {a.type === "income" || a.type === "expense" ? "Profit or Loss" : "Financial Position"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
