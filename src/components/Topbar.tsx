"use client";
import React from "react";
import { usePathname, useRouter } from "next/navigation";
import { Bell, MessageCircle, Search, Sparkles } from "lucide-react";
import { useStore, useUser } from "@/lib/store";
import { fmtUSD } from "@/lib/format";
import { computePnL } from "@/lib/accounting";

const TITLES: Record<string, string> = {
  "/": "Executive Dashboard",
  "/analytics": "Analytics Lab",
  "/income": "Income Streams",
  "/invoices": "Invoicing Centre",
  "/expenses": "Expense Manager",
  "/banking": "Banking & Reconciliation",
  "/accounting": "General Ledger & Journals",
  "/statements": "Financial Statements",
  "/taxes": "Statutory Payables",
  "/payroll": "Payroll & HR Finance",
  "/departments": "Departments",
  "/fraud": "Fraud Monitor (ML)",
  "/sophie": "Sophie — AI Assistant",
  "/reports": "Reports, Import & Export",
  "/settings": "Settings"
};

export default function Topbar() {
  const path = usePathname();
  const router = useRouter();
  const user = useUser();
  const data = useStore((s) => s.data);
  const [time, setTime] = React.useState("");

  React.useEffect(() => {
    const t = () =>
      setTime(new Date().toLocaleString("en-GB", { weekday: "short", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }));
    t();
    const i = setInterval(t, 30_000);
    return () => clearInterval(i);
  }, []);

  if (path === "/login") return null;

  const pnl = computePnL(data);

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/80 backdrop-blur-xl">
      <div className="flex items-center gap-4 px-5 py-3.5 lg:px-8">
        <div className="hidden lg:block">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Maxhals Forensics Suite</p>
          <h2 className="text-base font-extrabold text-ink-900">{TITLES[path] ?? "Workspace"}</h2>
        </div>

        <div className="ml-auto flex items-center gap-2.5">
          <div className="hidden items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-400 xl:flex">
            <Search size={14} />
            <span>{time} · Harare</span>
          </div>

          <button
            onClick={() => router.push("/sophie")}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-ink-900 to-ink-700 px-3.5 py-2.5 text-xs font-semibold text-white shadow-card transition hover:brightness-110"
          >
            <Sparkles size={14} className="text-gold-400" />
            <span className="hidden sm:inline">Ask Sophie</span>
          </button>

          <button
            onClick={() => router.push("/fraud")}
            className="relative rounded-xl border border-slate-200 bg-white p-2.5 text-slate-500 transition hover:text-rose-500"
            aria-label="Alerts"
          >
            <Bell size={17} />
            {data.fraudFlags.filter((f) => f.status === "open" && f.severity === "high").length > 0 && (
              <span className="absolute -right-1 -top-1 grid h-4.5 w-4.5 place-items-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white">
                {data.fraudFlags.filter((f) => f.status === "open" && f.severity === "high").length}
              </span>
            )}
          </button>

          <a
            href={`https://wa.me/${data.settings.whatsappNumber.replace("+", "")}?text=${encodeURIComponent(
              `Maxhals Forensics update for ${user?.name ?? "team"}: YTD revenue ${fmtUSD(pnl.totalIncome)}, net profit ${fmtUSD(pnl.netProfit)}. Sent from the Suite.`
            )}`}
            target="_blank"
            rel="noreferrer"
            className="rounded-xl border border-slate-200 bg-white p-2.5 text-emerald-600 transition hover:bg-emerald-50"
            aria-label="WhatsApp"
          >
            <MessageCircle size={17} />
          </a>

          <div className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5">
            <div
              className="grid h-8 w-8 place-items-center rounded-full text-[11px] font-bold text-white"
              style={{ background: user?.color ?? "#0b1226" }}
            >
              {(user?.name ?? "TM").split(" ").map((w) => w[0]).slice(0, 2).join("")}
            </div>
            <div className="hidden sm:block">
              <p className="text-xs font-bold leading-none text-ink-900">{user?.name?.split(" ")[0] ?? "User"}</p>
              <p className="text-[10px] text-slate-400">{user?.role ?? ""}</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
