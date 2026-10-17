"use client";
import React from "react";
import { Landmark, Download, CheckCircle2, AlertTriangle, Link2, Upload, RefreshCw } from "lucide-react";
import { Card, PageHeader, StatCard, Badge } from "@/components/ui";
import { useStore } from "@/lib/store";
import { fmtUSD, fmtDate } from "@/lib/format";
import { computeCashFlow } from "@/lib/accounting";
import { toCSV, downloadFile, parseCSV } from "@/lib/export";

export default function BankingPage() {
  const data = useStore((s) => s.data);
  const update = useStore((s) => s.update);
  const cf = computeCashFlow(data);
  const [account, setAccount] = React.useState<"all" | string>("all");
  const [showUnmatched, setShowUnmatched] = React.useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);

  const balances = data.bankAccounts.map((acc) => {
    const movement = data.bankTxns.filter((t) => t.accountId === acc.id).reduce((a, b) => a + b.amount, 0);
    return { ...acc, movement, balance: acc.openingBalance + movement };
  });

  const rows = data.bankTxns
    .filter((t) => (account === "all" || t.accountId === account) && (!showUnmatched || !t.matched))
    .sort((a, b) => b.date.localeCompare(a.date));

  const unmatched = data.bankTxns.filter((t) => !t.matched).length;
  const recPct = data.bankTxns.length ? Math.round(((data.bankTxns.length - unmatched) / data.bankTxns.length) * 100) : 0;

  const autoMatch = () => {
    update((d) => {
      d.bankTxns.forEach((t) => {
        if (t.matched) return;
        const inc = d.income.find((i) => Math.abs(i.amount + i.vatCharged - Math.abs(t.amount)) < 1 && t.description.toLowerCase().includes(i.client.toLowerCase().slice(0, 5).toLowerCase()));
        const exp = d.expenses.find((e) => Math.abs(e.amount - Math.abs(t.amount)) < 1 && e.description.slice(0, 12).toLowerCase() === t.description.slice(0, 12).toLowerCase());
        if (inc) {
          t.matched = true;
          t.matchedRef = inc.invoiceId ?? inc.id;
          t.category = "Income";
        } else if (exp) {
          t.matched = true;
          t.matchedRef = exp.id;
          t.category = exp.category;
        }
      });
    });
    alert("Auto-match complete — review remaining unmatched items.");
  };

  const importCsv = async (file: File) => {
    try {
      const rows = await parseCSV<{ date: string; description: string; amount: string }>(file);
      update((d) => {
        rows.forEach((r, i) => {
          if (!r.date || !r.amount) return;
          d.bankTxns.push({
            id: `BTX-IMP-${Date.now()}-${i}`,
            accountId: typeof account === "string" && account !== "all" ? account : "ba1",
            date: r.date,
            description: r.description ?? "Imported",
            amount: Number(String(r.amount).replace(/[$,]/g, "")),
            matched: false,
            category: "Imported"
          });
        });
      });
      alert(`Imported ${rows.length} bank statement lines. Run auto-match to reconcile.`);
    } catch {
      alert("Could not parse that CSV. Expected columns: date, description, amount");
    }
  };

  return (
    <div>
      <PageHeader
        title="Banking & Reconciliation"
        subtitle="CBZ & Steward Bank accounts with one-click statement import, auto-matching and exception reporting."
        actions={
          <>
            <input
              ref={fileRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && importCsv(e.target.files[0])}
            />
            <button onClick={() => fileRef.current?.click()} className="btn-ghost"><Upload size={15} /> Import statement</button>
            <button onClick={autoMatch} className="btn-primary"><RefreshCw size={15} /> Auto-match</button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {balances.map((b) => (
          <Card key={b.id}>
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-ink-900/5 p-3 text-ink-700"><Landmark size={20} /></div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{b.bank}</p>
                <p className="text-sm font-extrabold text-ink-900">{b.name}</p>
                <p className="text-[10px] text-slate-400">{b.accountNumber} · {b.currency}</p>
              </div>
            </div>
            <p className="mt-4 text-2xl font-extrabold text-ink-900">{fmtUSD(b.balance)}</p>
            <p className="text-xs text-slate-500">Movement YTD: <span className={b.movement >= 0 ? "font-semibold text-emerald-500" : "font-semibold text-rose-500"}>{fmtUSD(b.movement)}</span></p>
          </Card>
        ))}
        <Card className="bg-gradient-to-br from-ink-900 to-ink-700 text-white">
          <p className="text-xs font-semibold uppercase tracking-wider text-white/60">Reconciliation status</p>
          <p className="mt-2 text-3xl font-extrabold text-gold-400">{recPct}%</p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-gradient-to-r from-aqua-400 to-gold-400" style={{ width: `${recPct}%` }} />
          </div>
          <p className="mt-3 text-xs text-white/70">
            {unmatched} unmatched item{unmatched === 1 ? "" : "s"} remaining · net cash movement {fmtUSD(cf.net)}
          </p>
          <button onClick={() => setShowUnmatched(!showUnmatched)} className="btn-gold mt-4 w-full py-2 text-xs">
            {showUnmatched ? "Show all transactions" : `Review ${unmatched} exceptions`}
          </button>
        </Card>
      </div>

      <Card className="mt-5 overflow-x-auto p-0">
        <div className="flex items-center justify-between px-5 pt-5">
          <div>
            <h3 className="text-base font-extrabold text-ink-900">Bank Transactions</h3>
            <p className="text-xs text-slate-500">{rows.length} lines · matched items clear automatically into the ledger</p>
          </div>
          <div className="flex items-center gap-2">
            <select value={account} onChange={(e) => setAccount(e.target.value)} className="input w-auto">
              <option value="all">All accounts</option>
              {data.bankAccounts.map((a) => <option key={a.id} value={a.id}>{a.bank} — {a.name}</option>)}
            </select>
            <button
              onClick={() => downloadFile(toCSV(rows.map((r) => ({ Date: r.date, Description: r.description, Amount: r.amount, Matched: r.matched, Ref: r.matchedRef ?? "", Category: r.category ?? "" }))), "bank-transactions.csv", "text/csv")}
              className="btn-ghost py-2 text-xs"
            >
              <Download size={13} /> CSV
            </button>
          </div>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead>
              <tr className="table-head">
                <th className="th">Date</th>
                <th className="th">Description</th>
                <th className="th">Category</th>
                <th className="th">Amount</th>
                <th className="th">Matched ref</th>
                <th className="th">Status</th>
                <th className="th text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((t) => (
                <tr key={t.id} className={`border-b border-slate-100 ${!t.matched ? "bg-amber-50/40" : "hover:bg-slate-50/70"}`}>
                  <td className="td">{fmtDate(t.date)}</td>
                  <td className="td font-medium text-ink-900">{t.description}</td>
                  <td className="td">{t.category ?? "—"}</td>
                  <td className={`td font-bold ${t.amount >= 0 ? "text-emerald-600" : "text-rose-500"}`}>{fmtUSD(t.amount)}</td>
                  <td className="td text-slate-400">{t.matchedRef ?? "—"}</td>
                  <td className="td">
                    {t.matched ? <Badge color="green"><CheckCircle2 size={11} /> matched</Badge> : <Badge color="amber"><AlertTriangle size={11} /> exception</Badge>}
                  </td>
                  <td className="td text-right">
                    {!t.matched && (
                      <button
                        onClick={() =>
                          update((d) => {
                            const tx = d.bankTxns.find((x) => x.id === t.id);
                            if (tx) {
                              tx.matched = true;
                              tx.matchedRef = "MANUAL-REC";
                            }
                          })
                        }
                        className="btn-ghost inline-flex px-2.5 py-1.5 text-[11px]"
                      >
                        <Link2 size={12} /> Match
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
