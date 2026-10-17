"use client";
import React from "react";
import { Download, CheckCircle2, AlertTriangle, Banknote, ShieldCheck, Landmark, MessageCircle, Calculator } from "lucide-react";
import { Card, PageHeader, StatCard, Badge } from "@/components/ui";
import { useStore } from "@/lib/store";
import { fmtUSD, fmtDate } from "@/lib/format";
import { computeVatReturn, computePnLHelpers, quarterOf } from "@/lib/tax-helpers";
import { toCSV, downloadFile, exportPDF } from "@/lib/export";
import { TaxType } from "@/lib/types";

const TABS: { id: TaxType; label: string; icon: typeof Banknote; color: string }[] = [
  { id: "VAT", label: "VAT (ZIMRA)", icon: Banknote, color: "#33d6c2" },
  { id: "NSSA", label: "NSSA Social Security", icon: ShieldCheck, color: "#f6c453" },
  { id: "PAYE", label: "PAYE & AIDS Levy", icon: Landmark, color: "#8b5cf6" }
];

export default function TaxesPage() {
  const data = useStore((s) => s.data);
  const update = useStore((s) => s.update);
  const [tab, setTab] = React.useState<TaxType>("VAT");

  const salesNet = data.income.reduce((a, b) => a + b.amount, 0);
  const purchasesNet = data.expenses.reduce((a, b) => a + b.amount, 0);
  const vatCalc = computeVatReturn(salesNet, purchasesNet, data.settings.vatRate);

  const rows = data.taxes.filter((t) => t.type === tab).sort((a, b) => b.period.localeCompare(a.period));
  const due = data.taxes.filter((t) => t.paidAmount < t.amount);
  const totalDue = due.reduce((a, b) => a + b.amount - b.paidAmount, 0);

  const settle = (id: string) =>
    update((d) => {
      const t = d.taxes.find((x) => x.id === id);
      if (t) {
        t.paidAmount = t.amount;
        t.paidDate = "2026-10-17";
      }
    });

  return (
    <div>
      <PageHeader
        title="Statutory Payables — VAT · NSSA · PAYE"
        subtitle="Every kwasi/USD owed to ZIMRA and NSSA is tracked, dated and remitted. Deadlines surface on the dashboard automatically."
        actions={
          <>
            <button
              onClick={() =>
                downloadFile(
                  toCSV(data.taxes.map((t) => ({ Type: t.type, Period: t.period, Due: t.dueDate, Amount: t.amount, Paid: t.paidAmount, Balance: t.amount - t.paidAmount, Status: t.paidAmount >= t.amount ? "PAID" : "DUE", Notes: t.notes }))),
                  "statutory-payables.csv",
                  "text/csv"
                )
              }
              className="btn-ghost"
            >
              <Download size={15} /> Export CSV
            </button>
            <button
              onClick={() =>
                exportPDF({
                  title: "Statutory Payables Report",
                  subtitle: "VAT, NSSA & PAYE positions — Maxhals Forensics",
                  filename: "statutory-payables.pdf",
                  sections: [
                    { title: "VAT position (YTD)", head: [["Output VAT", "Input VAT", "Net payable"]], body: [[fmtUSD(vatCalc.outputVat), fmtUSD(vatCalc.inputVat), fmtUSD(vatCalc.netPayable)]] },
                    { title: "All obligations", head: [["Type", "Period", "Due", "Amount", "Paid", "Status"]], body: data.taxes.map((t) => [t.type, t.period, t.dueDate, fmtUSD(t.amount), fmtUSD(t.paidAmount), t.paidAmount >= t.amount ? "PAID" : "DUE"]) }
                  ]
                })
              }
              className="btn-ghost"
            >
              <Download size={15} /> PDF report
            </button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total statutory payable" value={fmtUSD(totalDue, 0)} delta={`${due.length} open items`} icon={<AlertTriangle size={20} />} />
        <StatCard label="Output VAT (YTD)" value={fmtUSD(vatCalc.outputVat, 0)} hint="on all standard-rated sales" icon={<Banknote size={20} />} />
        <StatCard label="Input VAT recoverable" value={fmtUSD(vatCalc.inputVat, 0)} hint="claim on valid tax invoices" icon={<ShieldCheck size={20} />} />
        <StatCard
          label="Net VAT position"
          value={fmtUSD(vatCalc.netPayable, 0)}
          delta={vatCalc.netPayable >= 0 ? "payable to ZIMRA" : "refund due"}
          icon={<Calculator size={20} />}
        />
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <div className="mb-4 flex flex-wrap gap-2">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold transition ${
                  tab === t.id ? "bg-ink-900 text-white" : "border border-slate-200 bg-white text-slate-500 hover:border-aqua-400"
                }`}
              >
                <t.icon size={14} style={{ color: tab === t.id ? t.color : undefined }} /> {t.label}
              </button>
            ))}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead>
                <tr className="table-head">
                  <th className="th">Period</th>
                  <th className="th">Due date</th>
                  <th className="th">Amount</th>
                  <th className="th">Paid</th>
                  <th className="th">Balance</th>
                  <th className="th">Status</th>
                  <th className="th text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((t) => {
                  const outstanding = t.amount - t.paidAmount;
                  const overdue = outstanding > 0 && new Date(t.dueDate) < new Date("2026-10-17");
                  return (
                    <tr key={t.id} className={`border-b border-slate-100 ${outstanding > 0 && overdue ? "bg-rose-50/40" : "hover:bg-slate-50/70"}`}>
                      <td className="td font-bold text-ink-900">{t.period}</td>
                      <td className="td">{fmtDate(t.dueDate)}</td>
                      <td className="td font-semibold">{fmtUSD(t.amount)}</td>
                      <td className="td text-emerald-600">{fmtUSD(t.paidAmount)}</td>
                      <td className={`td font-bold ${outstanding > 0 ? "text-rose-500" : "text-slate-400"}`}>{fmtUSD(outstanding)}</td>
                      <td className="td">
                        {outstanding <= 0 ? <Badge color="green">paid</Badge> : overdue ? <Badge color="red">overdue</Badge> : <Badge color="amber">due</Badge>}
                      </td>
                      <td className="td text-right">
                        {outstanding > 0 ? (
                          <button onClick={() => settle(t.id)} className="btn-primary inline-flex px-3 py-1.5 text-[11px]">
                            <CheckCircle2 size={12} /> Mark paid
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-400">settled {t.paidDate ? fmtDate(t.paidDate) : ""}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>

        <div className="space-y-5">
          <Card className="bg-gradient-to-br from-ink-900 to-ink-700 text-white">
            <h3 className="text-sm font-extrabold">VAT return wizard</h3>
            <p className="mt-1 text-xs text-white/60">Q4 2026 draft · rate {data.settings.vatRate}%</p>
            <div className="mt-4 space-y-2.5 text-xs">
              <div className="flex justify-between border-b border-white/10 pb-2">
                <span className="text-white/60">Output VAT (sales)</span>
                <span className="font-bold">{fmtUSD(vatCalc.outputVat)}</span>
              </div>
              <div className="flex justify-between border-b border-white/10 pb-2">
                <span className="text-white/60">Less: input VAT (purchases)</span>
                <span className="font-bold text-aqua-400">({fmtUSD(vatCalc.inputVat)})</span>
              </div>
              <div className="flex justify-between pt-1">
                <span className="font-semibold">Net VAT payable to ZIMRA</span>
                <span className="text-lg font-extrabold text-gold-400">{fmtUSD(Math.max(0, vatCalc.netPayable))}</span>
              </div>
            </div>
            <a
              href={`https://wa.me/${data.settings.whatsappNumber.replace("+", "")}?text=${encodeURIComponent(
                `ZIMRA VAT reminder (Maxhals Forensics): Q3 2026 return due 25 Oct 2026. Estimated net VAT payable ${fmtUSD(Math.max(0, vatCalc.netPayable))}. Ensure input VAT claims are on valid tax invoices. — Sophie 📊`
              )}`}
              target="_blank"
              rel="noreferrer"
              className="btn-gold mt-5 w-full"
            >
              <MessageCircle size={15} /> WhatsApp me the reminder
            </a>
          </Card>

          <Card>
            <h3 className="text-sm font-extrabold text-ink-900">Compliance calendar</h3>
            <div className="mt-3 space-y-3">
              {[
                { t: "NSSA monthly return", d: "15th of each month", s: "next: 15 Nov 2026", c: "amber" },
                { t: "PAYE remittance", d: "15th of each month", s: "next: 15 Nov 2026", c: "amber" },
                { t: "VAT return Q3 2026", d: "25 Oct 2026", s: "due in 8 days", c: "red" },
                { t: "Annual income tax return", d: "31 Dec 2026", s: "upcoming", c: "blue" }
              ].map((r) => (
                <div key={r.t} className="flex items-start gap-3 rounded-xl border border-slate-100 p-3">
                  <Badge color={r.c}>{r.s}</Badge>
                  <div>
                    <p className="text-xs font-bold text-ink-900">{r.t}</p>
                    <p className="text-[10px] text-slate-400">{r.d}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
