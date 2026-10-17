"use client";
import React from "react";
import { Download, Users, Banknote, ShieldCheck, Calculator } from "lucide-react";
import { Card, PageHeader, StatCard, Badge } from "@/components/ui";
import { useStore } from "@/lib/store";
import { fmtUSD, fmtDate } from "@/lib/format";
import { calcPaye, calcNssa, calcAidsLevy, PAYE_BANDS } from "@/lib/tax";
import { toCSV, downloadFile, exportPDF } from "@/lib/export";
import { BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, Cell } from "recharts";

export default function PayrollPage() {
  const data = useStore((s) => s.data);
  const update = useStore((s) => s.update);
  const [employee, setEmployee] = React.useState({ name: "", position: "", department: "Accounts" as (typeof data.payroll)[number]["department"], gross: 0 });
  const nssaCalc = calcNssa(employee.gross, data.settings.nssaEmployeeRate, data.settings.nssaEmployerRate, data.settings.nssaCeiling);
  const payeCalc = calcPaye(employee.gross);
  const aidsCalc = calcAidsLevy(payeCalc);
  const gross = data.payroll.reduce((a, b) => a + b.gross, 0);
  const paye = data.payroll.reduce((a, b) => a + b.paye, 0);
  const nssaE = data.payroll.reduce((a, b) => a + b.nssaEmployee, 0);
  const nssaR = data.payroll.reduce((a, b) => a + b.nssaEmployer, 0);
  const net = data.payroll.reduce((a, b) => a + b.net, 0);

  const chartData = data.payroll.map((p) => ({ name: p.name.split(" ")[0], gross: p.gross, net: p.net, paye: p.paye, nssa: p.nssaEmployee }));

  return (
    <div>
      <PageHeader
        title="Payroll & Statutory Deductions"
        subtitle="Monthly payroll with automatic PAYE bands, NSSA (3.5% / 4.5%) and AIDS levy — powered by the built-in tax engine."
        actions={
          <>
            <button
              onClick={() =>
                downloadFile(
                  toCSV(data.payroll.map((p) => ({ Name: p.name, Position: p.position, Department: p.department, Gross: p.gross, Allowances: p.allowances, PAYE: p.paye, NSSA_Employee: p.nssaEmployee, AIDS_Levy: p.aidsLevy, Net: p.net, NSSA_Employer: p.nssaEmployer }))),
                  "maxhals-payroll.csv",
                  "text/csv"
                )
              }
              className="btn-ghost"
            >
              <Download size={15} /> Export payroll
            </button>
            <button
              onClick={() =>
                exportPDF({
                  title: "Payroll Register — October 2026",
                  subtitle: "Maxhals Forensics · confidential",
                  filename: "payroll-oct-2026.pdf",
                  sections: [
                    {
                      title: "Employee schedule",
                      head: [["Employee", "Position", "Gross", "PAYE", "NSSA", "AIDS", "Net pay"]],
                      body: data.payroll.map((p) => [p.name, p.position, fmtUSD(p.gross), fmtUSD(p.paye), fmtUSD(p.nssaEmployee), fmtUSD(p.aidsLevy), fmtUSD(p.net)]),
                      foot: [["TOTAL", "", fmtUSD(gross), fmtUSD(paye), fmtUSD(nssaE), fmtUSD(data.payroll.reduce((a, b) => a + b.aidsLevy, 0)), fmtUSD(net)]]
                    }
                  ]
                })
              }
              className="btn-primary"
            >
              <Download size={15} /> Payslips PDF
            </button>
          </>
        }
      />

      <Card className="my-5"><h3 className="mb-3 text-sm font-bold">Add employee · live statutory calculation</h3><div className="grid gap-3 sm:grid-cols-5"><input className="input" placeholder="Name" value={employee.name} onChange={e=>setEmployee({...employee,name:e.target.value})}/><input className="input" placeholder="Position" value={employee.position} onChange={e=>setEmployee({...employee,position:e.target.value})}/><select className="input" value={employee.department} onChange={e=>setEmployee({...employee,department:e.target.value as typeof employee.department})}>{["Marketing","IT","HR","Accounts","Procurement","Cash Office","Security"].map(x=><option key={x}>{x}</option>)}</select><input className="input" type="number" min="0" placeholder="Monthly gross USD" value={employee.gross || ""} onChange={e=>setEmployee({...employee,gross:Number(e.target.value)})}/><button className="btn-primary" disabled={!employee.name || employee.gross<=0} onClick={()=>{update(d=>{d.payroll.push({id:`EMP-${Date.now()}`,name:employee.name,position:employee.position,department:employee.department,gross:employee.gross,allowances:0,nssaEmployee:nssaCalc.employee,paye:payeCalc,aidsLevy:aidsCalc,net:employee.gross-nssaCalc.employee-payeCalc-aidsCalc,nssaEmployer:nssaCalc.employer});});setEmployee({...employee,name:"",position:"",gross:0});}}>Add employee</button></div><p className="mt-3 text-xs text-slate-600">Preview: PAYE {fmtUSD(payeCalc)} · NSSA employee {fmtUSD(nssaCalc.employee)} / employer {fmtUSD(nssaCalc.employer)} · AIDS levy {fmtUSD(aidsCalc)} · net {fmtUSD(employee.gross-nssaCalc.employee-payeCalc-aidsCalc)}</p></Card>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Gross payroll (monthly)" value={fmtUSD(gross, 0)} delta={`${data.payroll.length} employees`} icon={<Users size={20} />} />
        <StatCard label="PAYE withheld" value={fmtUSD(paye, 0)} hint="remit by the 15th" icon={<Calculator size={20} />} />
        <StatCard label="NSSA (employee + employer)" value={fmtUSD(nssaE + nssaR, 0)} hint={`employee ${fmtUSD(nssaE, 0)} · employer ${fmtUSD(nssaR, 0)}`} icon={<ShieldCheck size={20} />} />
        <StatCard label="Net pay to employees" value={fmtUSD(net, 0)} hint="after all deductions" icon={<Banknote size={20} />} />
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2 overflow-x-auto p-0">
          <div className="px-5 pt-5">
            <h3 className="text-base font-extrabold text-ink-900">Payroll Register — October 2026</h3>
            <p className="text-xs text-slate-500">Payment date {fmtDate("2026-10-25")} · CBZ USD payroll account</p>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="table-head">
                  <th className="th">Employee</th>
                  <th className="th">Dept</th>
                  <th className="th">Gross</th>
                  <th className="th">Allow.</th>
                  <th className="th">PAYE</th>
                  <th className="th">NSSA 3.5%</th>
                  <th className="th">AIDS 3%</th>
                  <th className="th">Net pay</th>
                  <th className="th">NSSA 4.5% (er)</th>
                </tr>
              </thead>
              <tbody>
                {data.payroll.map((p) => (
                  <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50/70">
                    <td className="td">
                      <p className="font-bold text-ink-900">{p.name}</p>
                      <p className="text-[10px] text-slate-400">{p.position}</p>
                    </td>
                    <td className="td"><Badge color="blue">{p.department}</Badge></td>
                    <td className="td font-semibold">{fmtUSD(p.gross)}</td>
                    <td className="td">{fmtUSD(p.allowances)}</td>
                    <td className="td text-rose-500">({fmtUSD(p.paye)})</td>
                    <td className="td text-amber-600">({fmtUSD(p.nssaEmployee)})</td>
                    <td className="td text-slate-500">({fmtUSD(p.aidsLevy)})</td>
                    <td className="td font-bold text-emerald-600">{fmtUSD(p.net)}</td>
                    <td className="td text-violet-500">{fmtUSD(p.nssaEmployer)}</td>
                  </tr>
                ))}
                <tr className="bg-ink-950 text-white">
                  <td className="td font-extrabold">TOTAL</td>
                  <td className="td"></td>
                  <td className="td font-bold">{fmtUSD(gross)}</td>
                  <td className="td"></td>
                  <td className="td font-bold text-gold-400">{fmtUSD(paye)}</td>
                  <td className="td font-bold text-gold-400">{fmtUSD(nssaE)}</td>
                  <td className="td"></td>
                  <td className="td font-bold text-aqua-400">{fmtUSD(net)}</td>
                  <td className="td font-bold text-aqua-400">{fmtUSD(nssaR)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>

        <div className="space-y-5">
          <Card>
            <h3 className="text-sm font-extrabold text-ink-900">Net vs Gross by Employee</h3>
            <div className="mt-3 h-[220px]">
              <ResponsiveContainer>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#64748b" }} />
                  <YAxis tick={{ fontSize: 10, fill: "#64748b" }} tickFormatter={(v) => `$${v / 1000}K`} />
                  <Tooltip formatter={(v: number) => fmtUSD(v)} contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                  <Bar dataKey="gross" fill="#c7d2fe" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="net" fill="#33d6c2" radius={[6, 6, 0, 0]} />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card>
            <h3 className="text-sm font-extrabold text-ink-900">PAYE bands (monthly USD)</h3>
            <div className="mt-3 space-y-2">
              {PAYE_BANDS.map((b, i) => (
                <div key={i} className="flex items-center justify-between rounded-xl border border-slate-100 px-3.5 py-2.5 text-xs">
                  <span className="font-medium text-slate-600">
                    {i === 0 ? `Up to ${fmtUSD(b.upTo, 0)}` : `${fmtUSD(PAYE_BANDS[i - 1].upTo, 0)} – ${b.upTo === Infinity ? "above" : fmtUSD(b.upTo, 0)}`}
                  </span>
                  <span className="font-bold text-ink-900">{b.rate}%</span>
                </div>
              ))}
            </div>
            <div className="mt-3 rounded-xl bg-aqua-400/10 p-3 text-[11px] text-ink-700">
              🔍 <strong>Sophie tip:</strong> NSSA insurable earnings are capped at {fmtUSD(data.settings.nssaCeiling, 0)} — the engine applies the ceiling automatically.
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
