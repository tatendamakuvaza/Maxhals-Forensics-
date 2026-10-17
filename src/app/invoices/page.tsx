"use client";
import React from "react";
import Link from "next/link";
import { FileText, Plus, Download, Printer, MessageCircle, Search, Trash2 } from "lucide-react";
import { Card, PageHeader, Badge, EmptyState } from "@/components/ui";
import { useStore } from "@/lib/store";
import { fmtUSD, fmtDate } from "@/lib/format";
import { invoiceTotals } from "@/lib/accounting";
import { toCSV, downloadFile } from "@/lib/export";

export default function InvoicesPage() {
  const data = useStore((s) => s.data);
  const update = useStore((s) => s.update);
  const [q, setQ] = React.useState("");
  const [filter, setFilter] = React.useState("all");

  const rows = data.invoices
    .map((inv) => {
      const client = data.clients.find((c) => c.id === inv.clientId);
      const totals = invoiceTotals(inv);
      return { inv, client, totals };
    })
    .filter(({ inv, client }) => {
      const s = `${inv.number} ${client?.name ?? ""}`.toLowerCase();
      return s.includes(q.toLowerCase()) && (filter === "all" || inv.status === filter);
    })
    .sort((a, b) => b.inv.date.localeCompare(a.inv.date));

  const exportCsv = () =>
    downloadFile(
      toCSV(
        rows.map(({ inv, client, totals }) => ({
          Invoice: inv.number,
          Client: client?.name ?? "",
          Date: inv.date,
          Due: inv.dueDate,
          Status: inv.status,
          Subtotal: totals.sub,
          VAT: totals.vat,
          Total: totals.total,
          Paid: inv.paidAmount,
          Balance: totals.total - inv.paidAmount
        }))
      ),
      "maxhals-invoices.csv",
      "text/csv"
    );

  return (
    <div>
      <PageHeader
        title="Invoicing Centre"
        subtitle="Create branded invoices, track payments, remind clients on WhatsApp and export the full register."
        actions={
          <>
            <button onClick={exportCsv} className="btn-ghost"><Download size={15} /> Export CSV</button>
            <Link href="/invoices/new" className="btn-primary"><Plus size={15} /> New Invoice</Link>
          </>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search invoice or client…" className="input pl-10" />
        </div>
        {["all", "draft", "sent", "paid", "partial", "overdue"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-xl px-3.5 py-2 text-xs font-semibold capitalize transition ${
              filter === f ? "bg-ink-900 text-white" : "border border-slate-200 bg-white text-slate-500 hover:border-aqua-400"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <EmptyState title="No invoices found" sub="Create your first branded invoice — it calculates VAT automatically." action={<Link href="/invoices/new" className="btn-primary">Create invoice</Link>} />
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-[900px]">
            <thead>
              <tr className="table-head">
                <th className="th">Invoice</th>
                <th className="th">Client</th>
                <th className="th">Date</th>
                <th className="th">Due</th>
                <th className="th">Total (incl VAT)</th>
                <th className="th">Paid</th>
                <th className="th">Balance</th>
                <th className="th">Status</th>
                <th className="th text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ inv, client, totals }) => (
                <tr key={inv.id} className="border-b border-slate-100 transition hover:bg-slate-50/70">
                  <td className="td">
                    <Link href={`/invoices/${inv.id}`} className="font-bold text-ink-900 hover:text-aqua-500">{inv.number}</Link>
                  </td>
                  <td className="td font-medium">{client?.name ?? "—"}</td>
                  <td className="td">{fmtDate(inv.date)}</td>
                  <td className="td">{fmtDate(inv.dueDate)}</td>
                  <td className="td font-bold text-ink-900">{fmtUSD(totals.total)}</td>
                  <td className="td text-emerald-600">{fmtUSD(inv.paidAmount)}</td>
                  <td className={`td font-semibold ${totals.total - inv.paidAmount > 0 ? "text-rose-500" : "text-slate-400"}`}>
                    {fmtUSD(Math.max(0, totals.total - inv.paidAmount))}
                  </td>
                  <td className="td">
                    <Badge
                      color={
                        inv.status === "paid" ? "green" : inv.status === "overdue" ? "red" : inv.status === "sent" ? "blue" : inv.status === "partial" ? "amber" : "slate"
                      }
                    >
                      {inv.status}
                    </Badge>
                  </td>
                  <td className="td">
                    <div className="flex items-center justify-end gap-1.5">
                      <Link href={`/invoices/${inv.id}`} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-ink-700" title="View">
                        <FileText size={15} />
                      </Link>
                      <a
                        href={`https://wa.me/${data.settings.whatsappNumber.replace("+", "")}?text=${encodeURIComponent(
                          `Dear ${client?.name ?? "Client"}, invoice ${inv.number} of ${fmtUSD(totals.total)} is ${inv.status}. Balance: ${fmtUSD(Math.max(0, totals.total - inv.paidAmount))}. Thank you — Maxhals Forensics (+263 782 514 255)`
                        )}`}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-lg p-2 text-emerald-500 hover:bg-emerald-50"
                        title="Remind via WhatsApp"
                      >
                        <MessageCircle size={15} />
                      </a>
                      <button
                        onClick={() => {
                          if (confirm(`Delete ${inv.number}?`))
                            update((d) => {
                              d.invoices = d.invoices.filter((x) => x.id !== inv.id);
                            });
                        }}
                        className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-500"
                        title="Delete"
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
      )}
    </div>
  );
}
