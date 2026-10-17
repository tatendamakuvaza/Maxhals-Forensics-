"use client";
import React from "react";
import { useRouter } from "next/navigation";
import { motion } from "@/lib/motion";
import { Eye, EyeOff, Lock, Mail, ShieldCheck, Sparkles, BarChart3, FileSpreadsheet, Bot } from "lucide-react";
import Logo from "@/components/Logo";
import { useStore } from "@/lib/store";

const DEMO = [
  { label: "Admin — Tatenda Makuvaza", email: "tatenda@maxhals.co.zw", pass: "Admin@2026" },
  { label: "Finance Manager", email: "rumbi@maxhals.co.zw", pass: "Finance@26" },
  { label: "Marketing", email: "tapiwa@maxhals.co.zw", pass: "Marketing@26" },
  { label: "IT", email: "farai@maxhals.co.zw", pass: "Tech@2026" },
  { label: "HR", email: "grace@maxhals.co.zw", pass: "People@26" },
  { label: "Procurement", email: "simba@maxhals.co.zw", pass: "Supply@26" },
  { label: "Cash Office", email: "nyasha@maxhals.co.zw", pass: "Cash@2026" },
  { label: "Security", email: "bonnie@maxhals.co.zw", pass: "Secure@26" }
];

export default function LoginPage() {
  const router = useRouter();
  const login = useStore((s) => s.login);
  const [email, setEmail] = React.useState("tatenda@maxhals.co.zw");
  const [password, setPassword] = React.useState("Admin@2026");
  const [show, setShow] = React.useState(false);
  const [err, setErr] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (useStore.getState().sessionUser) router.replace("/");
  }, [router]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr("");
    // server-side session cookie (middleware)
    await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    }).catch(() => {});
    // client store session
    const ok = login(email, password);
    setBusy(false);
    if (ok) router.replace("/");
    else setErr("Invalid email or password. Use one of the demo accounts listed.");
  };

  return (
    <div className="flex min-h-screen">
      {/* Left brand panel */}
      <div className="relative hidden w-1/2 overflow-hidden bg-ink-950 lg:block">
        <div className="absolute inset-0 bg-hero-grid" />
        <div className="absolute -left-20 top-1/3 h-96 w-96 rounded-full bg-aqua-500/10 blur-3xl" />
        <div className="absolute right-0 top-0 h-96 w-96 rounded-full bg-gold-500/10 blur-3xl" />
        <div className="relative z-10 flex h-full flex-col justify-between p-12 text-white">
          <div className="flex items-center gap-4">
            <Logo size={64} />
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight">Maxhals Forensics</h1>
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-aqua-400">Command Suite</p>
            </div>
          </div>

          <div>
            <h2 className="max-w-lg text-4xl font-extrabold leading-tight tracking-tight">
              Forensic precision.
              <br />
              <span className="bg-gradient-to-r from-aqua-400 to-gold-400 bg-clip-text text-transparent">
                Analytics intelligence.
              </span>
            </h2>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-white/60">
              The complete financial operating system for Tatenda Makuvaza — accounting, invoicing, VAT/NSSA/PAYE,
              bank reconciliation, machine-learning fraud detection and Sophie, your always-on AI analyst.
            </p>

            <div className="mt-8 grid grid-cols-2 gap-3">
              {[
                { icon: BarChart3, t: "Live P&L, cash flow & equity" },
                { icon: FileSpreadsheet, t: "Invoices, CSV & PDF reports" },
                { icon: ShieldCheck, t: "ML fraud flagging engine" },
                { icon: Bot, t: "Sophie AI + WhatsApp alerts" }
              ].map((f, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 * i }}
                  className="flex items-center gap-2.5 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs font-medium text-white/80"
                >
                  <f.icon size={16} className="text-aqua-400" />
                  {f.t}
                </motion.div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs text-white/40">
            <Sparkles size={14} className="text-gold-400" />
            Trusted by auditors, analysts & finance leaders across Zimbabwe
          </div>
        </div>
        <svg className="absolute bottom-0 left-0 w-full opacity-20" height="120" viewBox="0 0 800 120" fill="none">
          <path d="M0 90 C150 30 300 110 450 60 C600 10 700 80 800 40 V120 H0 Z" fill="url(#wave)" />
          <defs>
            <linearGradient id="wave" x1="0" y1="0" x2="800" y2="0">
              <stop stopColor="#33d6c2" />
              <stop offset="1" stopColor="#f6c453" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Right form panel */}
      <div className="flex w-full items-center justify-center bg-[#f3f5fb] px-6 py-12 lg:w-1/2">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
          <div className="mb-8 text-center lg:text-left">
            <div className="mb-4 flex items-center gap-3 lg:hidden">
              <Logo size={48} />
              <h1 className="text-xl font-extrabold text-ink-900">Maxhals Forensics</h1>
            </div>
            <h2 className="text-2xl font-extrabold tracking-tight text-ink-900">Welcome back 👋</h2>
            <p className="mt-1.5 text-sm text-slate-500">Sign in to your command suite — secured with role-based access.</p>
          </div>

          <form onSubmit={submit} className="card space-y-4 p-7">
            <div>
              <label className="label">Email address</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input pl-10"
                  placeholder="you@maxhals.co.zw"
                />
              </div>
            </div>

            <div>
              <label className="label">Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type={show ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input pl-10 pr-10"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShow(!show)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-ink-700"
                  aria-label="Toggle password"
                >
                  {show ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {err && (
              <motion.p initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} className="rounded-xl bg-rose-50 px-3.5 py-2.5 text-xs font-medium text-rose-600">
                {err}
              </motion.p>
            )}

            <button type="submit" disabled={busy} className="btn-primary w-full py-3 text-[15px]">
              {busy ? "Signing you in…" : "Sign in to Suite"}
            </button>

            <div className="flex items-center justify-between pt-1 text-xs">
              <label className="flex cursor-pointer items-center gap-2 text-slate-500">
                <input type="checkbox" defaultChecked className="rounded border-slate-300 text-aqua-500 focus:ring-aqua-400" />
                Keep me signed in
              </label>
              <span className="font-semibold text-aqua-500">Forgot password?</span>
            </div>
          </form>

          <div className="card mt-5 p-5">
            <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">Demo logins (click to fill)</p>
            <div className="grid grid-cols-2 gap-2">
              {DEMO.map((d) => (
                <button
                  key={d.email}
                  type="button"
                  onClick={() => {
                    setEmail(d.email);
                    setPassword(d.pass);
                  }}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-left text-[11px] font-medium text-slate-600 transition hover:border-aqua-400 hover:bg-aqua-400/5"
                >
                  <span className="block font-bold text-ink-800">{d.label}</span>
                  {d.email}
                </button>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
