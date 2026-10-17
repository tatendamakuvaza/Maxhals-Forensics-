"use client";
import React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Printer, MessageCircle, Download, CheckCircle2 } from "lucide-react";
import { Card, PageHeader, Badge } from "@/components/ui";
import Logo from "@/components/Logo";
import { useStore } from "@/lib/store";
import { fmtUSD, fmtDate } from "@/lib/format";
import { invoiceTotals } from "@/lib/accounting";
import { exportPDF } from "@/lib/export";

export default function InvoiceViewPage() {
  const { id } = useParams<{ id: string }>();
  const data = useStore((s) => s.data);
  const update = useStore((s) => s.update);
  const inv = data.invoices.find((i) => i.id === id);
  const client = data.clients.find((c) => c.id === inv?.clientId);

  if (!inv || !client)
    return (
      <Card>
        <p className="text-sm text-slate-500">Invoice not found.</p>
        <Link href="/invoices" className="btn-primary mt-4 inline-flex"><ArrowLeft size={15} /> Back</Link>
      </Card>
    );

  const totals = invoiceTotals(inv);
  const balance = totals.total - inv.paidAmount;

  const waText = `Dear ${client.name}, greetings from Maxhals Forensics.%0A%0AInvoice ${inv.number} (${fmtUSD(totals.total)}) — status: ${inv.status}.%0ABalance outstanding: ${fmtUSD(Math.max(0, balance))}.%0ADue: ${fmtDate(inv.dueDate)}.%0A%0AKindly process payment to our CBZ USD account.%0A— Tatenda Makuvaza, +263 782 514 255`;

  const pdf = () =>
    exportPDF({
      title: `Invoice ${inv.number}`,
      subtitle: `${client.name} · Issued ${fmtDate(inv.date)} · Due ${fmtDate(inv.dueDate)}`,
      filename: `${inv.number}.pdf`,
      sections: [
        {
          title: "Line items",
          head: [["Description", "Qty", "Rate", "VAT %", "Amount"]],
          body: inv.items.map((it) => [it.description, String(it.qty), fmtUSD(it.rate), `${it.vatRate}%`, fmtUSD(it.qty * it.rate)]),
          foot: [["", "", "", "Subtotal", fmtUSD(totals.sub)], ["", "", "", "VAT", fmtUSD(totals.vat)], ["", "", "", "Total", fmtUSD(totals.total)]]
        },
        {
          title: "Summary",
          head: [["Invoice", "Client", "Status", "Paid", "Balance"]],
          body: [[inv.number, client.name, inv.status, fmtUSD(inv.paidAmount), fmtUSD(balance)]]
        },
        {
          title: "Terms",
          head: [["Notes"]],
          body: [[inv.notes]]
        }
      ]
    });

  return (
    <div>
      <PageHeader
        title={`Invoice ${inv.number}`}
        subtitle={`${client.name} · issued ${fmtDate(inv.date)} · due ${fmtDate(inv.dueDate)}`}
        actions={
          <>
            <Link href="/invoices" className="btn-ghost"><ArrowLeft size={15} /> All invoices</Link>
            <button onClick={() => window.print()} className="btn-ghost"><Printer size={15} /> Print</button>
            <button onClick={pdf} className="btn-ghost"><Download size={15} /> PDF</button>
            <a href={`https://wa.me/${data.settings.whatsappNumber.replace("+", "")}?text=${waText}`} target="_blank" rel="noreferrer" className="btn-primary">
              <MessageCircle size={15} /> WhatsApp client
            </a>
            {balance > 0 && (
              <button
                onClick={() =>
                  update((d) => {
                    const t = d.invoices.find((x) => x.id === inv.id);
                    if (t) {
                      t.paidAmount = totals.total;
                      t.status = "paid";
                    }
                  })
                }
                className="btn-gold"
              >
                <CheckCircle2 size={15} /> Mark paid
              </button>
            )}
          </>
        }
      />

      {/* Branded invoice document */}
      <Card className="mx-auto max-w-4xl overflow-hidden p-0">
        <div className="bg-ink-950 px-8 py-7 text-white">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="flex items-center gap-4">
              <Logo size={64} />
              <div>
                <h2 className="text-xl font-extrabold">{data.settings.company.name}</h2>
                <p className="text-xs tracking-[0.22em] text-aqua-400">{data.settings.company.tagline}</p>
                <p className="mt-2 text-xs text-white/60">
                  {data.settings.company.address}
                  <br />
                  {data.settings.company.phone} · {data.settings.company.email}
                  <br />
                  VAT: {data.settings.company.vatNumber} · Tax: {data.settings.company.taxNumber}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gold-400">Tax Invoice</p>
              <p className="mt-1 text-2xl font-extrabold">{inv.number}</p>
              <div className="mt-3 inline-block">
                <Badge color={inv.status === "paid" ? "green" : inv.status === "overdue" ? "red" : "blue"}>{inv.status.toUpperCase()}</Badge>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 px-8 py-7 sm:grid-cols-3">
          <div>
            <p className="label">Bill to</p>
            <p className="text-sm font-extrabold text-ink-900">{client.name}</p>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">
              {client.address}
              <br />
              {client.email}
              <br />
              {client.phone}
              {client.vatNumber && <><br />VAT: {client.vatNumber}</>}
            </p>
          </div>
          <div>
            <p className="label">Invoice date</p>
            <p className="text-sm font-bold text-ink-900">{fmtDate(inv.date)}</p>
            <p className="label mt-4">Due date</p>
            <p className="text-sm font-bold text-ink-900">{fmtDate(inv.dueDate)}</p>
          </div>
          <div>
            <p className="label">Amount due</p>
            <p className="text-3xl font-extrabold text-aqua-500">{fmtUSD(Math.max(0, balance))}</p>
            <p className="mt-1 text-xs text-slate-400">of {fmtUSD(totals.total)} total · {fmtUSD(inv.paidAmount)} paid</p>
          </div>
        </div>

        <div className="px-8 pb-2">
          <table className="w-full">
            <thead>
              <tr className="table-head">
                <th className="th rounded-l-xl">Description</th>
                <th className="th text-right">Qty</th>
                <th className="th text-right">Rate</th>
                <th className="th text-right">VAT</th>
                <th className="th rounded-r-xl text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {inv.items.map((it, i) => (
                <tr key={i} className="border-b border-slate-100">
                  <td className="td font-medium text-ink-900">{it.description}</td>
                  <td className="td text-right">{it.qty}</td>
                  <td className="td text-right">{fmtUSD(it.rate)}</td>
                  <td className="td text-right">{it.vatRate}%</td>
                  <td className="td text-right font-bold text-ink-900">{fmtUSD(it.qty * it.rate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap justify-between gap-6 px-8 pb-8 pt-4">
          <div className="max-w-md">
            <p className="label">Terms & notes</p>
            <p className="text-xs leading-relaxed text-slate-500">{inv.notes}</p>
            <div className="mt-4 rounded-xl border border-aqua-400/30 bg-aqua-400/5 p-3.5">
              <p className="text-xs font-bold text-ink-900">Banking details</p>
              <p className="mt-1 text-xs text-slate-500">
                CBZ Bank — Business Current · 0012 3456 7890 (USD)
                <br />
                Steward Bank — Seminar Account · 1023 4455 6677 (USD)
                <br />
                Reference: <strong>{inv.number}</strong>
              </p>
            </div>
          </div>
          <div className="min-w-[260px]">
            {[
              ["Subtotal", fmtUSD(totals.sub)],
              [`VAT @ ${inv.items[0]?.vatRate ?? 15}%`, fmtUSD(totals.vat)]
            ].map(([l, v]) => (
              <div key={l} className="flex justify-between border-b border-slate-100 py-2.5 text-sm">
                <span className="text-slate-500">{l}</span>
                <span className="font-semibold text-ink-900">{v}</span>
              </div>
            ))}
            <div className="mt-3 flex items-center justify-between rounded-2xl bg-ink-950 px-5 py-4 text-white">
              <span className="text-xs font-semibold uppercase tracking-wider">Total due</span>
              <span className="text-xl font-extrabold text-gold-400">{fmtUSD(totals.total)}</span>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-100 bg-slate-50 px-8 py-5 text-center">
          <p className="text-[11px] text-slate-400">
            Thank you for your business · Maxhals Forensics · Forensic Audit • Advisory • Big Data Analytics ·
            WhatsApp +263 782 514 255 · This is a computer-generated invoice from Maxhals Forensics Suite.
          </p>
        </div>
      </Card>
    </div>
  );
}
