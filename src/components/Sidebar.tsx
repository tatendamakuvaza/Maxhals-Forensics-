"use client";
import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, Wallet, FileText, Receipt, Landmark, Scale, Building2, LineChart,
  ShieldAlert, Bot, FileDown, Settings, LogOut, Menu, X, Banknote, Users, FolderKanban
} from "lucide-react";
import Logo from "./Logo";
import { classNames } from "@/lib/format";
import { useStore, useUser } from "@/lib/store";

const NAV = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard, group: "Overview" },
  { href: "/analytics", label: "Analytics Lab", icon: LineChart, group: "Overview" },
  { href: "/income", label: "Income Streams", icon: Wallet, group: "Money" },
  { href: "/invoices", label: "Invoicing", icon: FileText, group: "Money" },
  { href: "/expenses", label: "Expenses", icon: Receipt, group: "Money" },
  { href: "/banking", label: "Banking & Rec", icon: Landmark, group: "Money" },
  { href: "/accounting", label: "General Ledger", icon: FolderKanban, group: "Accounting" },
  { href: "/statements", label: "Financial Statements", icon: Scale, group: "Accounting" },
  { href: "/taxes", label: "VAT · NSSA · PAYE", icon: Banknote, group: "Accounting" },
  { href: "/payroll", label: "Payroll", icon: Users, group: "Accounting" },
  { href: "/departments", label: "Departments", icon: Building2, group: "Organisation" },
  { href: "/fraud", label: "Fraud Monitor", icon: ShieldAlert, group: "Organisation" },
  { href: "/sophie", label: "Ask Sophie", icon: Bot, group: "Organisation" },
  { href: "/reports", label: "Reports & I/O", icon: FileDown, group: "Organisation" },
  { href: "/settings", label: "Settings", icon: Settings, group: "Organisation" }
];

export default function Sidebar() {
  const path = usePathname();
  const router = useRouter();
  const user = useUser();
  const logout = useStore((s) => s.logout);
  const [open, setOpen] = React.useState(false);

  if (path === "/login") return null;

  const groups = [...new Set(NAV.map((n) => n.group))];

  const doLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    logout();
    router.push("/login");
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed left-4 top-4 z-50 rounded-xl bg-ink-900 p-2.5 text-white shadow-card lg:hidden"
        aria-label="Open menu"
      >
        <Menu size={20} />
      </button>

      {open && <div className="fixed inset-0 z-40 bg-ink-950/50 lg:hidden" onClick={() => setOpen(false)} />}

      <aside
        className={classNames(
          "fixed inset-y-0 left-0 z-50 flex w-[264px] flex-col bg-ink-950 text-white transition-transform duration-300 lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center gap-3 border-b border-white/10 px-5 py-5">
          <Logo size={44} />
          <div>
            <p className="text-[15px] font-extrabold leading-tight tracking-tight">Maxhals Forensics</p>
            <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-aqua-400">Suite · v2.1</p>
          </div>
          <button className="ml-auto lg:hidden" onClick={() => setOpen(false)} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {groups.map((g) => (
            <div key={g} className="mb-4">
              <p className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-white/35">{g}</p>
              {NAV.filter((n) => n.group === g).map((item) => {
                const active = item.href === "/" ? path === "/" : path.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={classNames(
                      "mb-0.5 flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-all",
                      active
                        ? "bg-gradient-to-r from-aqua-500/25 to-transparent text-white shadow-[inset_0_0_0_1px_rgba(51,214,194,.35)]"
                        : "text-white/60 hover:bg-white/5 hover:text-white"
                    )}
                  >
                    <item.icon size={17} className={active ? "text-aqua-400" : ""} />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="border-t border-white/10 p-4">
          <div className="flex items-center gap-3 rounded-xl bg-white/5 p-3">
            <div
              className="grid h-9 w-9 place-items-center rounded-full text-sm font-bold text-ink-950"
              style={{ background: user?.color ?? "#33d6c2" }}
            >
              {(user?.name ?? "T M").split(" ").map((w) => w[0]).slice(0, 2).join("")}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold">{user?.name ?? "Guest"}</p>
              <p className="truncate text-[10px] text-white/50">{user ? `${user.role} · ${user.department}` : "—"}</p>
            </div>
            <button onClick={doLogout} className="rounded-lg p-1.5 text-white/50 transition hover:bg-white/10 hover:text-rose-400" aria-label="Sign out">
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
