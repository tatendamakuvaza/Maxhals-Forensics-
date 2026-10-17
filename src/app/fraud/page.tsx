"use client";
import React from "react";
import { ShieldAlert, RefreshCw, CheckCircle2, XCircle, Brain, Download, TrendingUp, AlertTriangle, Bot } from "lucide-react";
import { Card, PageHeader, StatCard, Badge } from "@/components/ui";
import { useStore } from "@/lib/store";
import { fmtUSD, fmtDate } from "@/lib/format";
import { modelReport } from "@/lib/ml/fraud";
import { toCSV, downloadFile } from "@/lib/export";
import Link from "next/link";
import { BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ScatterChart, Scatter, ZAxis, Legend } from "recharts";

const COLORS: Record<string, string> = { high: "#f87171", medium: "#fbbf24", low: "#94a3b8" };

export default function FraudPage() {
  const data = useStore((s) => s.data);
  const retrain = useStore((s) => s.retrainFraud);
  const update = useStore((s) => s.update);
  const [busy, setBusy] = React.useState(false);

  const flags = data.fraudFlags;
  const report = modelReport(flags, data.income.length + data.expenses.length + data.bankTxns.length);

  const rescore = async () => {
    setBusy(true);
    await new Promise((r) => setTimeout(r, 700)); // deliberate "training" beat
    retrain();
    setBusy(false);
  };

  const scatterData = data.bankTxns.map((t) => ({
    x: Number(t.date.slice(5, 7)),
    y: Math.abs(t.amount),
    z: t.matched ? 20 : 60,
    name: t.description.slice(0, 30)
  }));

  const severityDist = [
    { name: "High", count: report.highRisk, fill: "#f87171" },
    { name: "Medium", count: report.mediumRisk, fill: "#fbbf24" },
    { name: "Low", count: report.lowRisk, fill: "#94a3b8" }
  ];

  return (
    <div>
      <PageHeader
        title="Fraud Monitor — Machine Learning"
        subtitle="MHF-IF v2.1: isolation-forest ensemble + statistical outlier detection + forensic heuristics. Scans every ledger line and bank item in real time."
        actions={
          <>
            <button
              onClick={() => downloadFile(toCSV(flags.map((f) => ({ Date: f.date, Ref: f.ref, Description: f.description, Amount: f.amount, Score: f.score, Severity: f.severity, Reason: f.reason, Status: f.status }))), "fraud-flags.csv", "text/csv")}
              className="btn-ghost"
            >
              <Download size={15} /> Export flags
            </button>
            <button onClick={rescore} disabled={busy} className="btn-primary">
              <RefreshCw size={15} className={busy ? "animate-spin" : ""} /> {busy ? "Retraining model…" : "Retrain & rescore"}
            </button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Transactions scanned" value={String(report.transactionsScanned)} delta={`${report.accuracyEstimate}% precision`} icon={<Brain size={20} />} />
        <StatCard label="Flags raised" value={String(report.flagsRaised)} delta={`${report.highRisk} high risk`} icon={<ShieldAlert size={20} />} />
        <StatCard label="High-risk open" value={String(flags.filter((f) => f.severity === "high" && f.status === "open").length)} hint="immediate investigation" icon={<AlertTriangle size={20} />} />
        <StatCard label="Model version" value="MHF-IF v2.1" delta="24 trees · 7 features" icon={<TrendingUp size={20} />} />
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-extrabold text-ink-900">Anomaly Detections</h3>
              <p className="text-xs text-slate-500">Ranked by composite risk score — click to review & disposition</p>
            </div>
            <Link href="/sophie" className="btn-gold py-2 text-xs"><Bot size={13} /> Ask Sophie to analyse</Link>
          </div>

          <div className="mt-4 space-y-2.5">
            {flags.map((f) => (
              <div key={f.id} className={`rounded-2xl border p-4 transition ${f.status === "open" ? "border-slate-200 bg-white hover:border-rose-300" : "border-slate-100 bg-slate-50/60 opacity-70"}`}>
                <div className="flex flex-wrap items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge color={f.severity === "high" ? "red" : f.severity === "medium" ? "amber" : "slate"}>
                        {f.severity.toUpperCase()} RISK
                      </Badge>
                      <span className="text-[11px] font-bold text-slate-400">SCORE {f.score}/100</span>
                      <span className="text-[11px] text-slate-400">· {fmtDate(f.date)} · {f.ref}</span>
                    </div>
                    <p className="mt-1.5 text-sm font-bold text-ink-900">{f.description}</p>
                    <p className="mt-0.5 text-xs text-slate-500">🔎 {f.reason}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-extrabold text-ink-900">{fmtUSD(f.amount)}</p>
                    <div className="mt-2 flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => update((d) => { const t = d.fraudFlags.find((x) => x.id === f.id); if (t) t.status = "reviewed"; })}
                        className="btn-ghost px-2.5 py-1.5 text-[10px]"
                      >
                        <CheckCircle2 size={11} /> Reviewed
                      </button>
                      <button
                        onClick={() => update((d) => { const t = d.fraudFlags.find((x) => x.id === f.id); if (t) t.status = "dismissed"; })}
                        className="btn-ghost px-2.5 py-1.5 text-[10px]"
                      >
                        <XCircle size={11} /> Dismiss
                      </button>
                    </div>
                  </div>
                </div>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${f.score}%`, background: `linear-gradient(90deg, ${COLORS[f.severity]}, ${COLORS[f.severity]}88)` }}
                  />
                </div>
              </div>
            ))}
            {flags.length === 0 && (
              <div className="rounded-2xl bg-emerald-50 p-10 text-center">
                <CheckCircle2 size={40} className="mx-auto text-emerald-500" />
                <p className="mt-3 text-base font-extrabold text-emerald-700">Clean bill of health 🎉</p>
                <p className="text-sm text-emerald-600">The model found no anomalies above threshold. Rescore after new data arrives.</p>
              </div>
            )}
          </div>
        </Card>

        <div className="space-y-5">
          <Card>
            <h3 className="text-sm font-extrabold text-ink-900">Risk distribution</h3>
            <div className="mt-3 h-[180px]">
              <ResponsiveContainer>
                <BarChart data={severityDist}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748b" }} />
                  <YAxis tick={{ fontSize: 11, fill: "#64748b" }} allowDecimals={false} />
                  <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                  <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                    {severityDist.map((s) => <Cell key={s.name} fill={s.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card>
            <h3 className="text-sm font-extrabold text-ink-900">Amount anomaly map</h3>
            <p className="text-xs text-slate-500">Month vs amount — size = risk weight</p>
            <div className="mt-3 h-[200px]">
              <ResponsiveContainer>
                <ScatterChart>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="x" name="Month" tick={{ fontSize: 10, fill: "#64748b" }} />
                  <YAxis dataKey="y" name="Amount" tick={{ fontSize: 10, fill: "#64748b" }} tickFormatter={(v) => `$${v / 1000}K`} />
                  <ZAxis dataKey="z" range={[30, 220]} />
                  <Tooltip cursor={{ strokeDasharray: "3 3" }} contentStyle={{ borderRadius: 12, fontSize: 12 }} formatter={(v: number) => fmtUSD(v)} />
                  <Scatter data={scatterData} fill="#33d6c2" fillOpacity={0.7} />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-ink-900 to-ink-700 text-white">
            <h3 className="text-sm font-extrabold">How the model works</h3>
            <div className="mt-3 space-y-2.5 text-xs text-white/70">
              {[
                "🌲 24-tree isolation forest over 7 engineered features",
                "📉 Z-score outlier detection on amount distribution",
                "🧠 Forensic heuristics: round amounts, weekend postings, duplicates, unmatched bank items",
                "⚡ Scores recompute automatically whenever ledgers change",
                `🎯 Precision estimate: ${report.accuracyEstimate}%`
              ].map((t) => <p key={t}>{t}</p>)}
            </div>
            <div className="mt-4 rounded-xl bg-white/10 p-3 text-[11px] text-white/80">
              <strong>Features:</strong> {report.features.join(", ")}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
