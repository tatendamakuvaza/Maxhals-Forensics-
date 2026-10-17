"use client";
import React from "react";
import { Bot, Send, Sparkles, MessageCircle, Trash2, Download, Brain, Wallet, Receipt, ShieldAlert, Calculator, FileSpreadsheet } from "lucide-react";
import { Card, PageHeader } from "@/components/ui";
import Logo from "@/components/Logo";
import { useStore } from "@/lib/store";
import { sophieReply } from "@/lib/sophie";
import { SophieMessage } from "@/lib/types";

const QUICK = [
  { icon: Wallet, label: "How is my profit?", q: "How is my profit this year?" },
  { icon: Receipt, label: "Cash position", q: "What is my cash position?" },
  { icon: ShieldAlert, label: "Fraud alerts", q: "Any fraud alerts?" },
  { icon: Calculator, label: "VAT & NSSA due?", q: "What do I owe ZIMRA and NSSA?" },
  { icon: FileSpreadsheet, label: "Overdue invoices", q: "Show overdue invoices" },
  { icon: Brain, label: "Revenue streams", q: "Summarise my revenue streams" }
];

export default function SophiePage() {
  const data = useStore((s) => s.data);
  const addChat = useStore((s) => s.addChat);
  const update = useStore((s) => s.update);
  const [input, setInput] = React.useState("");
  const [thinking, setThinking] = React.useState(false);
  const endRef = React.useRef<HTMLDivElement>(null);
  const chat = data.chat;

  React.useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat.length, thinking]);

  const send = async (text: string) => {
    const msg = text.trim();
    if (!msg || thinking) return;
    setInput("");
    const userMsg: SophieMessage = { id: `M-${Date.now()}`, role: "user", text: msg, ts: Date.now() };
    addChat(userMsg);
    setThinking(true);

    // try the server engine first (LLM-augmented when OPENAI_API_KEY is set)
    let reply = "";
    try {
      const r = await fetch("/api/sophie", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg, data: useStore.getState().data })
      });
      const j = await r.json();
      reply = j.reply ?? "";
    } catch {
      /* offline fallback */
    }
    if (!reply) reply = sophieReply(msg, useStore.getState().data);

    await new Promise((res) => setTimeout(res, 450));
    addChat({ id: `M-${Date.now() + 1}`, role: "sophie", text: reply, ts: Date.now() });
    setThinking(false);
  };

  return (
    <div className="flex h-[calc(100vh-140px)] flex-col">
      <PageHeader
        title="Sophie — Your AI Financial Assistant"
        subtitle="Trained on your live books. Ask anything about profit, cash, invoices, VAT/NSSA/PAYE, fraud flags or analytics — Sophie answers instantly."
        actions={
          <>
            <button
              onClick={() => {
                const blob = new Blob([chat.map((m) => `${m.role === "user" ? "You" : "Sophie"}: ${m.text}`).join("\n\n")], { type: "text/plain" });
                const a = document.createElement("a");
                a.href = URL.createObjectURL(blob);
                a.download = "sophie-chat.txt";
                a.click();
              }}
              className="btn-ghost"
            >
              <Download size={15} /> Export chat
            </button>
            <a
              href={`https://wa.me/${data.settings.whatsappNumber.replace("+", "")}?text=${encodeURIComponent("Hello Sophie! Send me my daily Maxhals Forensics briefing.")}`}
              target="_blank"
              rel="noreferrer"
              className="btn-primary"
            >
              <MessageCircle size={15} /> WhatsApp briefing
            </a>
          </>
        }
      />

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-5 lg:grid-cols-4">
        {/* Side panel */}
        <div className="hidden space-y-5 lg:col-span-1 lg:block">
          <Card className="bg-gradient-to-br from-ink-950 via-ink-900 to-ink-800 text-white">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-aqua-400 to-gold-400 text-ink-950">
                  <Bot size={26} />
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-ink-900 bg-emerald-400" />
              </div>
              <div>
                <p className="text-base font-extrabold">Sophie</p>
                <p className="text-[11px] text-aqua-400">Online · MHF-Brain v2.1</p>
              </div>
            </div>
            <p className="mt-4 text-xs leading-relaxed text-white/70">
              I connect to your general ledger, invoices, payroll, tax register and the fraud model. I can compute, explain and remind — 24/7.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {[
                ["P&L", "✓"], ["Cash flow", "✓"], ["VAT/NSSA", "✓"], ["Fraud ML", "✓"]
              ].map(([k, v]) => (
                <div key={k} className="rounded-xl bg-white/10 px-3 py-2 text-center">
                  <p className="text-[10px] text-white/50">{k}</p>
                  <p className="text-xs font-bold text-aqua-400">{v}</p>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <h3 className="text-sm font-extrabold text-ink-900">Quick asks</h3>
            <div className="mt-3 space-y-2">
              {QUICK.map((q) => (
                <button
                  key={q.q}
                  onClick={() => send(q.q)}
                  className="flex w-full items-center gap-2.5 rounded-xl border border-slate-100 px-3.5 py-2.5 text-left text-xs font-semibold text-slate-600 transition hover:border-aqua-400 hover:bg-aqua-400/5"
                >
                  <q.icon size={14} className="text-aqua-500" /> {q.label}
                </button>
              ))}
            </div>
          </Card>
        </div>

        {/* Chat */}
        <Card className="flex min-h-0 flex-col p-0 lg:col-span-3">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div className="flex items-center gap-3">
              <Logo size={36} />
              <div>
                <p className="text-sm font-extrabold text-ink-900">Sophie · Maxhals Forensics</p>
                <p className="text-[11px] text-emerald-500">● Online — responses grounded in your live data</p>
              </div>
            </div>
            <button
              onClick={() => update((d) => { d.chat = []; })}
              className="rounded-xl border border-slate-200 p-2 text-slate-400 hover:text-rose-500"
              title="Clear chat"
            >
              <Trash2 size={15} />
            </button>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
            {chat.length === 0 && (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <div className="grid h-16 w-16 place-items-center rounded-3xl bg-gradient-to-br from-aqua-400 to-gold-400 text-ink-950">
                  <Sparkles size={28} />
                </div>
                <h3 className="mt-4 text-lg font-extrabold text-ink-900">Hello Tatenda! 👋</h3>
                <p className="mt-1.5 max-w-sm text-sm text-slate-500">
                  I&apos;m Sophie — ask me anything about your three income streams, profits, cash flow, tax payables or fraud risks. Try one of the quick asks to the left.
                </p>
              </div>
            )}

            {chat.map((m) => (
              <div key={m.id} className={`flex gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
                <div
                  className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-xs font-bold ${
                    m.role === "user" ? "bg-ink-900 text-white" : "bg-gradient-to-br from-aqua-400 to-gold-400 text-ink-950"
                  }`}
                >
                  {m.role === "user" ? "TM" : <Bot size={16} />}
                </div>
                <div
                  className={`max-w-[78%] whitespace-pre-line rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    m.role === "user" ? "bg-ink-900 text-white" : "border border-slate-100 bg-slate-50 text-slate-700"
                  }`}
                >
                  {m.text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
                    part.startsWith("**") && part.endsWith("**") ? (
                      <strong key={i} className="font-bold text-ink-900">{part.slice(2, -2)}</strong>
                    ) : (
                      <React.Fragment key={i}>{part}</React.Fragment>
                    )
                  )}
                  <p className={`mt-1.5 text-[10px] ${m.role === "user" ? "text-white/40" : "text-slate-400"}`}>
                    {new Date(m.ts).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
            ))}

            {thinking && (
              <div className="flex gap-3">
                <div className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-aqua-400 to-gold-400 text-ink-950">
                  <Bot size={16} />
                </div>
                <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                  <div className="flex gap-1.5">
                    {[0, 1, 2].map((i) => (
                      <span key={i} className="h-2 w-2 animate-bounce rounded-full bg-aqua-500" style={{ animationDelay: `${i * 0.15}s` }} />
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          <div className="border-t border-slate-100 p-4">
            <div className="mb-3 flex gap-2 overflow-x-auto pb-1 lg:hidden">
              {QUICK.slice(0, 4).map((q) => (
                <button key={q.q} onClick={() => send(q.q)} className="chip shrink-0 border border-slate-200 bg-white text-slate-600">
                  {q.label}
                </button>
              ))}
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                send(input);
              }}
              className="flex gap-2.5"
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask Sophie anything… e.g. 'What is my net profit margin?'"
                className="input flex-1 py-3"
              />
              <button type="submit" disabled={thinking || !input.trim()} className="btn-primary px-5">
                <Send size={17} />
              </button>
            </form>
          </div>
        </Card>
      </div>
    </div>
  );
}
