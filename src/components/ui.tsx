"use client";
import React from "react";
import { classNames } from "@/lib/format";

export function Card({ className, children, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={classNames("card p-5", className)} {...rest}>
      {children}
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-ink-900 sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 max-w-2xl text-sm text-slate-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function StatCard({
  label,
  value,
  delta,
  icon,
  hint
}: {
  label: string;
  value: string;
  delta?: string;
  icon?: React.ReactNode;
  hint?: string;
}) {
  const up = delta?.startsWith("+");
  return (
    <div className="card relative overflow-hidden p-5">
      <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-br from-aqua-400/20 to-gold-400/20" />
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</p>
          <p className="mt-2 text-2xl font-extrabold text-ink-900">{value}</p>
          <div className="mt-2 flex items-center gap-2">
            {delta && <span className={up ? "stat-delta-up" : "stat-delta-down"}>{delta}</span>}
            {hint && <span className="text-xs text-slate-400">{hint}</span>}
          </div>
        </div>
        {icon && <div className="rounded-xl bg-ink-900/5 p-2.5 text-ink-700">{icon}</div>}
      </div>
    </div>
  );
}

export function Badge({ children, color = "slate" }: { children: React.ReactNode; color?: string }) {
  const map: Record<string, string> = {
    slate: "bg-slate-100 text-slate-600",
    green: "bg-emerald-50 text-emerald-600",
    red: "bg-rose-50 text-rose-600",
    amber: "bg-amber-50 text-amber-600",
    blue: "bg-blue-50 text-blue-600",
    purple: "bg-violet-50 text-violet-600",
    aqua: "bg-aqua-400/15 text-aqua-500"
  };
  return <span className={classNames("chip", map[color] ?? map.slate)}>{children}</span>;
}

export function EmptyState({ title, sub, action }: { title: string; sub?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/60 p-12 text-center">
      <div className="mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-ink-900 text-white">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M20 7l-9-4-9 4 9 4 9-4zM12 11v10M3 7v10l9 4 9-4V7" />
        </svg>
      </div>
      <h3 className="text-base font-bold text-ink-900">{title}</h3>
      {sub && <p className="mt-1 max-w-sm text-sm text-slate-500">{sub}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
