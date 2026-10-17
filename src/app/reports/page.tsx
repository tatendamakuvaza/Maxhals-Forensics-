"use client";
import React from "react";
import { Download, Upload, FileSpreadsheet, FileText, Database, MessageCircle, Printer } from "lucide-react";
import { Card, PageHeader, Badge } from "@/components/ui";
import { useStore } from "@/lib/store";
import { fmtUSD } from "@/lib/format";
import { computePnL, computeBalanceSheet, computeCashFlow, computeEquity, invoiceTotals } from "@/lib/accounting";
import { toCSV, downloadFile, parseCSV, exportPDF } from "@/lib/export";

export default function ReportsPage() {
  const data = useStore((s) => s.data);
  const update = useStore((s) => s.update);
  const [log, setLog] = React.useState<string[]>([]);
  const incFile = React.useRef<HTMLInputElement>(null);
  const expFile = React.useRef<HTMLInputElement>(null);

  const pnl = computePnL(data);
  const bs = computeBalanceSheet(data);
  const cf = computeCashFlow(data);
  const eq = computeEquity(data);

  const datasets: { id: string; label: string; rows: Record<string, unknown>[]; icon: typeof Database }[] = [
    {
      id: "income",
      label: "Income register (3 streams)",
      icon: Database,
      rows: data.income.map((r) => ({ Date: r.date, Stream: r.stream, Client: r.client, Description: r.description, Amount: r.amount, VAT: r.vatCharged, Received: r.received }))
    },
    {
      id: "expenses",
      label: "Expense register",
      icon: Database,
      rows: data.expenses.map((r) => ({ Date: r.date, Category: r.category, Description: r.description, Department: r.department, Amount: r.amount, VATClaimable: r.vatClaimable }))
    },
    {
      id: "invoices",
      label: "Invoice register",
      icon: FileSpreadsheet,
      rows: data.invoices.map((r) => {
        const t = invoiceTotals(r);
        return { Number: r.number, Client: data.clients.find((c) => c.id === r.clientId)?.name, Date: r.date, Due: r.dueDate, Status: r.status, Subtotal: t.sub, VAT: t.vat, Total: t.total, Paid: r.paidAmount };
      })
    },
    {
      id: "ledger",
      label: "General ledger / journal",
      icon: Database,
      rows: data.journal.flatMap((je) => je.lines.map((l) => ({ Date: je.date, Ref: je.ref, Narration: je.narration, Account: l.accountCode, Debit: l.debit, Credit: l.credit })))
    },
    {
      id: "taxes",
      label: "VAT · NSSA · PAYE register",
      icon: FileSpreadsheet,
      rows: data.taxes.map((t) => ({ Type: t.type, Period: t.period, Due: t.dueDate, Amount: t.amount, Paid: t.paidAmount, Status: t.paidAmount >= t.amount ? "PAID" : "DUE" }))
    },
    {
      id: "payroll",
      label: "Payroll register",
      icon: FileSpreadsheet,
      rows: data.payroll.map((p) => ({ Name: p.name, Department: p.department, Gross: p.gross, PAYE: p.paye, NSSA: p.nssaEmployee, Net: p.net }))
    },
    {
      id: "bank",
      label: "Bank transactions",
      icon: Database,
      rows: data.bankTxns.map((b) => ({ Date: b.date, Description: b.description, Amount: b.amount, Matched: b.matched, Category: b.category ?? "" }))
    },
    {
      id: "fraud",
      label: "Fraud & anomaly flags",
      icon: FileSpreadsheet,
      rows: data.fraudFlags.map((f) => ({ Date: f.date, Ref: f.ref, Description: f.description, Amount: f.amount, Score: f.score, Severity: f.severity, Reason: f.reason }))
    }
  ];

  const importGeneric = async (file: File, kind: "income" | "expenses") => {
    try {
      const rows = await parseCSV<Record<string, string>>(file);
      update((d) => {
        rows.forEach((r, i) => {
          const amount = Number(String(r.amount ?? r.Amount ?? 0).replace(/[$,]/g, ""));
          if (!amount) return;
          const date = r.date ?? r.Date ?? "2026-10-17";
          if (kind === "income") {
            d.income.push({
              id: `INC-IMP-${Date.now()}-${i}`,
              date,
              stream: (r.stream ?? r.Stream ?? "forensic") as "forensic",
              description: r.description ?? r.Description ?? "Imported income",
              client: r.client ?? r.Client ?? "Imported",
              amount,
              vatCharged: Number(String(r.vat ?? r.VAT ?? 0).replace(/[$,]/g, "")) || 0,
              accountCode: "4100",
              received: true
            });
          } else {
            d.expenses.push({
              id: `EXP-IMP-${Date.now()}-${i}`,
              date,
              category: r.category ?? r.Category ?? "Miscellaneous",
              description: r.description ?? r.Description ?? "Imported expense",
              amount,
              vatClaimable: Number(String(r.vatclaimable ?? r.VATClaimable ?? 0).replace(/[$,]/g, "")) || 0,
              department: (r.department ?? r.Department ?? "Accounts") as never,
              paidThrough: r.paidthrough ?? r.PaidThrough ?? "CBZ USD",
              recurring: false
            });
          }
        });
      });
      setLog((l) => [`✅ Imported ${rows.length} ${kind} rows from ${file.name}`, ...l]);
    } catch {
      setLog((l) => [`❌ Failed to parse ${file.name}`, ...l]);
    }
  };

  const fullPack = () =>
    exportPDF({
      title: "Complete Financial & Analytics Pack",
      subtitle: `Maxhals Forensics · ${data.settings.company.owner} · generated 17 Oct 2026`,
      filename: "maxhals-full-report-pack.pdf",
      sections: [
        { title: "Executive summary", head: [["Metric", "Value"]], body: [["Revenue YTD", fmtUSD(pnl.totalIncome)], ["Net profit", fmtUSD(pnl.netProfit)], ["Total assets", fmtUSD(bs.totalAssets)], ["Total equity", fmtUSD(eq.closing)], ["Closing cash", fmtUSD(cf.closing)]] },
        { title: "Revenue by stream", head: [["Stream", "Amount"]], body: [["Salary & employment", fmtUSD(pnl.incomeByStream.salary)], ["Forensic audit & advisory", fmtUSD(pnl.incomeByStream.forensic)], ["Big data analytics seminars", fmtUSD(pnl.incomeByStream.seminar)]] },
        { title: "Expense categories", head: [["Category", "Amount"]], body: pnl.expensesByCategory.map((e) => [e.category, fmtUSD(e.amount)]) },
        { title: "Cash flow", head: [["Movement", "Amount"]], body: [["Operating", fmtUSD(cf.operating)], ["Investing", fmtUSD(cf.investing)], ["Financing", fmtUSD(cf.financing)], ["Net change", fmtUSD(cf.net)]] },
        { title: "Statutory payables", head: [["Type", "Period", "Due", "Amount", "Status"]], body: data.taxes.filter((t) => t.paidAmount < t.amount).map((t) => [t.type, t.period, t.dueDate, fmtUSD(t.amount), "DUE"]) },
        { title: "Fraud flags (top 10)", head: [["Severity", "Score", "Description", "Amount"]], body: data.fraudFlags.slice(0, 10).map((f) => [f.severity.toUpperCase(), String(f.score), f.description.slice(0, 48), fmtUSD(f.amount)]) }
      ]
    });

  return (
    <div>
      <PageHeader
        title="Reports, Import & Export"
        subtitle="Every dataset exportable to CSV and branded PDF — and import bank or transaction files back into the Suite."
        actions={
          <>
            <button onClick={() => window.print()} className="btn-ghost"><Printer size={15} /> Print page</button>
            <button onClick={fullPack} className="btn-primary"><FileText size={15} /> Download full PDF pack</button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-400">Export datasets</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {datasets.map((d) => (
              <Card key={d.id} className="flex items-center gap-4">
                <div className="rounded-2xl bg-ink-900/5 p-3 text-ink-700"><d.icon size={20} /></div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-ink-900">{d.label}</p>
                  <p className="text-[11px] text-slate-400">{d.rows.length} rows</p>
                </div>
                <div className="flex gap-1.5">
                  <button onClick={() => downloadFile(toCSV(d.rows), `maxhals-${d.id}.csv`, "text/csv")} className="btn-ghost px-3 py-2 text-xs">
                    CSV
                  </button>
                  <button
                    onClick={() =>
                      exportPDF({
                        title: d.label,
                        subtitle: "Maxhals Forensics · 2026 YTD",
                        filename: `maxhals-${d.id}.pdf`,
                        sections: [
                          {
                            title: d.label,
                            head: [Object.keys(d.rows[0] ?? { rows: 0 }).slice(0, 6).map((k) => k.toUpperCase())],
                            body: d.rows.slice(0, 60).map((r) => Object.values(r).slice(0, 6).map((v) => String(v).slice(0, 40)))
                          }
                        ]
                      })
                    }
                    className="btn-primary px-3 py-2 text-xs"
                  >
                    PDF
                  </button>
                </div>
              </Card>
            ))}
          </div>
        </div>

        <div className="space-y-5">
          <Card>
            <h3 className="text-sm font-extrabold text-ink-900">Import files (CSV)</h3>
            <p className="mt-1 text-xs text-slate-500">
              Columns recognised (case-insensitive): <strong>date, description, amount</strong> + stream/category/client.
            </p>
            <div className="mt-4 space-y-2.5">
              <input ref={incFile} type="file" accept=".csv" className="hidden" onChange={(e) => e.target.files?.[0] && importGeneric(e.target.files[0], "income")} />
              <input ref={expFile} type="file" accept=".csv" className="hidden" onChange={(e) => e.target.files?.[0] && importGeneric(e.target.files[0], "expenses")} />
              <button onClick={() => incFile.current?.click()} className="btn-ghost w-full">
                <Upload size={15} /> Import income CSV
              </button>
              <button onClick={() => expFile.current?.click()} className="btn-ghost w-full">
                <Upload size={15} /> Import expenses CSV
              </button>
              <a
                href={`data:text/csv,${encodeURIComponent("date,description,amount,stream,client\n2026-10-16,Sample advisory engagement,1500,forensic,Sample Client\n")}`}
                download="maxhals-import-template.csv"
                className="btn-gold w-full"
              >
                <FileSpreadsheet size={15} /> Download template
              </a>
            </div>
            {log.length > 0 && (
              <div className="mt-4 space-y-1.5">
                {log.map((l, i) => (
                  <p key={i} className="rounded-lg bg-slate-50 px-3 py-2 text-[11px] text-slate-600">{l}</p>
                ))}
              </div>
            )}
          </Card>

          <Card>
            <h3 className="text-sm font-extrabold text-ink-900">Scheduled WhatsApp digest</h3>
            <p className="mt-1 text-xs text-slate-500">
              Push the weekly numbers straight to {data.settings.whatsappNumber}.
            </p>
            <a
              href={`https://wa.me/${data.settings.whatsappNumber.replace("+", "")}?text=${encodeURIComponent(
                `📊 Maxhals Weekly Digest\nRevenue YTD: ${fmtUSD(pnl.totalIncome)}\nNet profit: ${fmtUSD(pnl.netProfit)}\nCash: ${fmtUSD(bs.assets[0].amount)}\nReceivables: ${fmtUSD(bs.assets[1].amount)}\nFraud flags: ${data.fraudFlags.length}\n\n— sent by Sophie`
              )}`}
              target="_blank"
              rel="noreferrer"
              className="btn-primary mt-4 w-full"
            >
              <MessageCircle size={15} /> Send digest now
            </a>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <Badge color="green">Weekly</Badge>
              <Badge color="blue">Monthly close</Badge>
              <Badge color="amber">Tax deadlines</Badge>
              <Badge color="red">Fraud alerts</Badge>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
