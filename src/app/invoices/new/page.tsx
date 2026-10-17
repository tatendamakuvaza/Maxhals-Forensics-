"use client";
import React from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Save, FileText } from "lucide-react";
import { Card, PageHeader } from "@/components/ui";
import { useStore } from "@/lib/store";
import { fmtUSD } from "@/lib/format";
import { IncomeStream, InvoiceItem } from "@/lib/types";

export default function NewInvoicePage() {
  const router = useRouter();
  const data = useStore((s) => s.data);
  const update = useStore((s) => s.update);

  const [clientId, setClientId] = React.useState(data.clients[0]?.id ?? "");
  const [stream, setStream] = React.useState<IncomeStream>("forensic");
  const [date, setDate] = React.useState("2026-10-17");
  const [dueDate, setDueDate] = React.useState("2026-11-16");
  const [notes, setNotes] = React.useState(
    "Payment due within 30 days. RTGS/USD to Maxhals Forensics accounts. VAT charged at 15% where applicable."
  );
  const [items, setItems] = React.useState<InvoiceItem[]>([
    { description: "Forensic audit & advisory services — professional fees", qty: 1, rate: 2500, vatRate: 15 }
  ]);

  const sub = items.reduce((a, b) => a + b.qty * b.rate, 0);
  const vat = items.reduce((a, b) => a + (b.qty * b.rate * b.vatRate) / 100, 0);
  const total = sub + vat;

  const save = (status: "draft" | "sent") => {
    const number = `${data.settings.invoicePrefix}${String(data.settings.nextInvoiceNo).padStart(2, "0")}`;
    update((d) => {
      d.invoices.push({
        id: `INV-${Date.now()}`,
        number,
        clientId,
        date,
        dueDate,
        items,
        status,
        paidAmount: 0,
        notes,
        stream
      });
      d.settings.nextInvoiceNo += 1;
      d.income.push({
        id: `INC-${Date.now()}`,
        date,
        stream,
        description: items[0]?.description ?? "Professional services",
        client: d.clients.find((c) => c.id === clientId)?.name ?? "",
        amount: Math.round(sub * 100) / 100,
        vatCharged: Math.round(vat * 100) / 100,
        accountCode: stream === "salary" ? "4000" : stream === "forensic" ? "4100" : "4200",
        invoiceId: number,
        received: false
      });
    });
    router.push("/invoices");
  };

  return (
    <div>
      <PageHeader
        title="Create Invoice"
        subtitle="VAT is calculated per line. The invoice PDF is branded with your Maxhals Forensics logo."
        actions={
          <>
            <button onClick={() => save("draft")} className="btn-ghost"><Save size={15} /> Save draft</button>
            <button onClick={() => save("sent")} className="btn-primary"><FileText size={15} /> Finalise & send</button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Client</label>
              <select value={clientId} onChange={(e) => setClientId(e.target.value)} className="input">
                {data.clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Income stream</label>
              <select value={stream} onChange={(e) => setStream(e.target.value as IncomeStream)} className="input">
                <option value="forensic">Forensic Audit & Advisory</option>
                <option value="seminar">Big Data Analytics Seminars</option>
                <option value="salary">Salary & Employment</option>
              </select>
            </div>
            <div>
              <label className="label">Issue date</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input" />
            </div>
            <div>
              <label className="label">Due date</label>
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="input" />
            </div>
          </div>

          <div className="mt-6">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-ink-900">Line items</h3>
              <button
                onClick={() => setItems([...items, { description: "", qty: 1, rate: 0, vatRate: 15 }])}
                className="btn-ghost py-1.5 text-xs"
              >
                <Plus size={13} /> Add line
              </button>
            </div>
            <div className="space-y-2.5">
              <div className="hidden grid-cols-12 gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 sm:grid">
                <div className="col-span-6">Description</div>
                <div className="col-span-2">Qty</div>
                <div className="col-span-2">Rate (USD)</div>
                <div className="col-span-2">VAT %</div>
              </div>
              {items.map((it, idx) => (
                <div key={idx} className="grid grid-cols-12 items-center gap-2">
                  <input
                    className="input col-span-6"
                    placeholder="Service description"
                    value={it.description}
                    onChange={(e) => setItems(items.map((x, i) => (i === idx ? { ...x, description: e.target.value } : x)))}
                  />
                  <input
                    type="number"
                    className="input col-span-2"
                    value={it.qty}
                    min={1}
                    onChange={(e) => setItems(items.map((x, i) => (i === idx ? { ...x, qty: Number(e.target.value) } : x)))}
                  />
                  <input
                    type="number"
                    className="input col-span-2"
                    value={it.rate}
                    min={0}
                    onChange={(e) => setItems(items.map((x, i) => (i === idx ? { ...x, rate: Number(e.target.value) } : x)))}
                  />
                  <div className="col-span-2 flex items-center gap-1">
                    <input
                      type="number"
                      className="input"
                      value={it.vatRate}
                      min={0}
                      max={100}
                      onChange={(e) => setItems(items.map((x, i) => (i === idx ? { ...x, vatRate: Number(e.target.value) } : x)))}
                    />
                    <button
                      onClick={() => setItems(items.filter((_, i) => i !== idx))}
                      className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-500"
                      aria-label="Remove line"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6">
            <label className="label">Notes / payment terms</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="input" />
          </div>
        </Card>

        <div className="space-y-5">
          <Card>
            <h3 className="text-sm font-extrabold text-ink-900">Totals</h3>
            <div className="mt-4 space-y-2.5 text-sm">
              <div className="flex justify-between text-slate-500">
                <span>Subtotal</span>
                <span className="font-semibold text-ink-900">{fmtUSD(sub)}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>VAT</span>
                <span className="font-semibold text-ink-900">{fmtUSD(vat)}</span>
              </div>
              <div className="mt-2 flex justify-between border-t border-dashed border-slate-200 pt-3">
                <span className="font-extrabold text-ink-900">Total due</span>
                <span className="text-xl font-extrabold text-aqua-500">{fmtUSD(total)}</span>
              </div>
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-ink-900 to-ink-700 text-white">
            <h3 className="text-sm font-extrabold">Invoice preview</h3>
            <p className="mt-2 text-xs leading-relaxed text-white/70">
              Number: <strong>{data.settings.invoicePrefix}{String(data.settings.nextInvoiceNo).padStart(2, "0")}</strong>
              <br />
              Client: <strong>{data.clients.find((c) => c.id === clientId)?.name}</strong>
              <br />
              VAT: <strong>{fmtUSD(vat)}</strong> @ {items[0]?.vatRate ?? 15}%
            </p>
            <p className="mt-3 rounded-xl bg-white/10 p-3 text-[11px] text-white/80">
              💡 After saving, open the invoice to print the branded PDF or send a WhatsApp reminder to the client.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
