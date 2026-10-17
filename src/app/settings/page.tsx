"use client";
import React from "react";
import { Save, MessageCircle, Building2, Shield, Bot, RotateCcw, KeyRound, Users } from "lucide-react";
import { Card, PageHeader, Badge } from "@/components/ui";
import { useStore } from "@/lib/store";
import { DEPARTMENTS, Settings } from "@/lib/types";

export default function SettingsPage() {
  const data = useStore((s) => s.data);
  const update = useStore((s) => s.update);
  const resetData = useStore((s) => s.resetData);
  const eraseTransactions = useStore((s) => s.eraseTransactions);
  const [eraseText, setEraseText] = React.useState("");
  const [form, setForm] = React.useState<Settings>(JSON.parse(JSON.stringify(data.settings)));
  const [saved, setSaved] = React.useState(false);

  const save = () => {
    update((d) => {
      d.settings = form;
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const set = (patch: Partial<Settings>) => setForm({ ...form, ...patch });
  const setCompany = (patch: Partial<Settings["company"]>) => setForm({ ...form, company: { ...form.company, ...patch } });

  return (
    <div>
      <PageHeader
        title="Settings"
        subtitle="Company profile, statutory rates, WhatsApp gateway, Sophie AI and user access — all in one place."
        actions={
          <>
            {saved && <Badge color="green">✓ Saved</Badge>}
            <button onClick={save} className="btn-primary"><Save size={15} /> Save changes</button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card>
          <div className="mb-4 flex items-center gap-3">
            <div className="rounded-2xl bg-ink-900/5 p-2.5 text-ink-700"><Building2 size={19} /></div>
            <h3 className="text-sm font-extrabold text-ink-900">Company profile</h3>
          </div>
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            {([
              ["name", "Company name"],
              ["owner", "Owner / principal"],
              ["tagline", "Tagline"],
              ["email", "Email"],
              ["phone", "Phone"],
              ["whatsapp", "WhatsApp number"],
              ["address", "Registered address"],
              ["vatNumber", "VAT number"],
              ["nssaNumber", "NSSA number"],
              ["taxNumber", "Tax number"]
            ] as const).map(([k, label]) => (
              <div key={k}>
                <label className="label">{label}</label>
                <input
                  className="input"
                  value={form.company[k]}
                  onChange={(e) => setCompany({ [k]: e.target.value } as Partial<Settings["company"]>)}
                />
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <div className="mb-4 flex items-center gap-3">
            <div className="rounded-2xl bg-aqua-400/15 p-2.5 text-aqua-500"><Shield size={19} /></div>
            <h3 className="text-sm font-extrabold text-ink-900">Statutory rates & invoicing</h3>
          </div>
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            <div>
              <label className="label">VAT rate % (ZIM standard 15%)</label>
              <input type="number" className="input" value={form.vatRate} onChange={(e) => set({ vatRate: Number(e.target.value) })} />
            </div>
            <div>
              <label className="label">NSSA employee %</label>
              <input type="number" step="0.1" className="input" value={form.nssaEmployeeRate} onChange={(e) => set({ nssaEmployeeRate: Number(e.target.value) })} />
            </div>
            <div>
              <label className="label">NSSA employer %</label>
              <input type="number" step="0.1" className="input" value={form.nssaEmployerRate} onChange={(e) => set({ nssaEmployerRate: Number(e.target.value) })} />
            </div>
            <div>
              <label className="label">NSSA insurable ceiling (USD)</label>
              <input type="number" className="input" value={form.nssaCeiling} onChange={(e) => set({ nssaCeiling: Number(e.target.value) })} />
            </div>
            <div>
              <label className="label">Invoice prefix</label>
              <input className="input" value={form.invoicePrefix} onChange={(e) => set({ invoicePrefix: e.target.value })} />
            </div>
            <div>
              <label className="label">Next invoice number</label>
              <input type="number" className="input" value={form.nextInvoiceNo} onChange={(e) => set({ nextInvoiceNo: Number(e.target.value) })} />
            </div>
          </div>
          <div className="mt-4 rounded-xl bg-slate-50 p-3.5 text-[11px] text-slate-500">
            💡 Rates feed the payroll engine, VAT return wizard and invoice calculations. Zimbabwe VAT is 15%; NSSA is 3.5% employee / 4.5% employer on insurable earnings.
          </div>
        </Card>

        <Card>
          <div className="mb-4 flex items-center gap-3">
            <div className="rounded-2xl bg-emerald-400/15 p-2.5 text-emerald-500"><MessageCircle size={19} /></div>
            <h3 className="text-sm font-extrabold text-ink-900">WhatsApp gateway</h3>
          </div>
          <div>
            <label className="label">Default WhatsApp number (alerts & reminders)</label>
            <input className="input" value={form.whatsappNumber} onChange={(e) => set({ whatsappNumber: e.target.value })} />
          </div>
          <div className="mt-3 rounded-xl border border-emerald-100 bg-emerald-50/60 p-3.5 text-[11px] text-emerald-700">
            <strong>How delivery works:</strong> click-to-send buttons open WhatsApp with pre-filled messages to {form.whatsappNumber}.
            For fully automated delivery, add <strong>TWILIO_ACCOUNT_SID</strong>, <strong>TWILIO_AUTH_TOKEN</strong> and
            <strong>TWILIO_WHATSAPP_FROM</strong> in Vercel → Settings → Environment Variables — the <code>/api/whatsapp</code> route
            then delivers messages without clicking.
          </div>
          <a
            href={`https://wa.me/${form.whatsappNumber.replace("+", "")}?text=${encodeURIComponent("Test message from Maxhals Forensics Suite ✅")}`}
            target="_blank"
            rel="noreferrer"
            className="btn-primary mt-4 w-full"
          >
            <MessageCircle size={15} /> Send test message
          </a>
        </Card>

        <Card>
          <div className="mb-4 flex items-center gap-3">
            <div className="rounded-2xl bg-violet-400/15 p-2.5 text-violet-500"><Bot size={19} /></div>
            <h3 className="text-sm font-extrabold text-ink-900">Sophie AI & Voice configuration</h3>
          </div>
          <div className="space-y-3">
            <div className="rounded-xl border border-slate-100 p-3.5">
              <p className="text-xs font-bold text-ink-900">Conversational & Voice Engine</p>
              <p className="mt-1 text-[11px] text-slate-500">
                MHF-Brain v2.2 — finance-aware local engine with persistent memory, browser voice calls, and live mic dictation.
                Add <strong>OPENAI_API_KEY</strong> in Vercel env vars for GPT conversation and Whisper audio-note transcription at{" "}
                <code>/api/transcribe</code> (optional: <strong>OPENAI_MODEL</strong>, <strong>OPENAI_TRANSCRIBE_MODEL</strong>).
              </p>
            </div>
            <div className="rounded-xl border border-slate-100 p-3.5">
              <p className="text-xs font-bold text-ink-900">Twilio Phone Calls & Memory</p>
              <p className="mt-1 text-[11px] text-slate-500">
                Point your Twilio Voice number webhook at <code>/api/sophie/voice</code> (responds at <code>/api/sophie/voice/respond</code>;
                optional <strong>PUBLIC_BASE_URL</strong>). Learned memory currently holds{" "}
                <strong>{data.sophieMemory?.facts?.length ?? 0}</strong> saved notes (preferred name:{" "}
                <strong>{data.sophieMemory?.preferredName || form.company.owner.split(" ")[0]}</strong>).
              </p>
            </div>
            <div className="rounded-xl border border-slate-100 p-3.5">
              <p className="text-xs font-bold text-ink-900">Knowledge scope</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {["General ledger", "Invoices", "Cash flow", "VAT/NSSA/PAYE", "Payroll", "Fraud ML", "Departments", "Learned Memory", "Voice & TwiML"].map((k) => (
                  <Badge key={k} color="aqua">{k}</Badge>
                ))}
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <div className="mb-4 flex items-center gap-3">
            <div className="rounded-2xl bg-gold-400/15 p-2.5 text-gold-500"><Users size={19} /></div>
            <h3 className="text-sm font-extrabold text-ink-900">Users & access</h3>
          </div>
          <div className="space-y-2">
            {data.users.map((u) => (
              <div key={u.id} className="flex items-center gap-3 rounded-xl border border-slate-100 p-3">
                <div className="grid h-9 w-9 place-items-center rounded-full text-xs font-bold text-white" style={{ background: u.color }}>
                  {u.name.split(" ").map((w) => w[0]).slice(0, 2).join("")}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-ink-900">{u.name}</p>
                  <p className="text-[10px] text-slate-400">{u.email} · {u.department}</p>
                </div>
                <Badge color={u.role === "admin" ? "red" : u.role === "manager" ? "amber" : "slate"}>{u.role}</Badge>
                <KeyRound size={13} className="text-slate-300" />
              </div>
            ))}
          </div>
          <p className="mt-3 text-[10px] text-slate-400">
            Role-based accounts are managed by the suite administrator. For production deployments, connect an identity provider (e.g. Clerk/Auth0).
          </p>
        </Card>

        <Card>
          <div className="mb-4 flex items-center gap-3">
            <div className="rounded-2xl bg-rose-400/15 p-2.5 text-rose-500"><RotateCcw size={19} /></div>
            <h3 className="text-sm font-extrabold text-ink-900">Data management</h3>
          </div>
          <p className="text-xs text-slate-500">
            All data lives encrypted-in-place in your browser store (no server database required — deploys cleanly on Vercel free tier).
            Reset restores the full demo dataset. Erase removes all sample business records while preserving logins and your company profile.
          </p>
          <div className="mt-4 flex gap-2.5">
            <button
              onClick={() => {
                if (confirm("Reset all data to the demo dataset?")) resetData();
              }}
              className="btn-ghost"
            >
              <RotateCcw size={15} /> Reset demo data
            </button>
            <button onClick={() => { if (eraseText === "ERASE" && confirm("Permanently erase all business records? Logins and company profile will remain.")) { eraseTransactions(); setEraseText(""); } }} disabled={eraseText !== "ERASE"} className="btn-ghost text-rose-600 disabled:opacity-40">Erase ALL data — start clean books</button>
            <input aria-label="Type ERASE to confirm" placeholder="Type ERASE to enable" value={eraseText} onChange={(e) => setEraseText(e.target.value)} className="input max-w-48" />
            <button
              onClick={() => {
                downloadJSON(data, "maxhals-backup.json");
              }}
              className="btn-dark"
            >
              Download full backup
            </button>
          </div>
          <div className="mt-4 rounded-xl bg-ink-950 p-3.5 text-[11px] text-white/70">
            <strong className="text-aqua-400">Department coverage:</strong> {DEPARTMENTS.join(" · ")} — each with task boards, KPIs and user roles in the Suite.
          </div>
        </Card>
      </div>
    </div>
  );
}

function downloadJSON(data: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
