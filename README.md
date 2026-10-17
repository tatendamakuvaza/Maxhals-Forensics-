# Maxhals Forensics Suite

> **The complete financial command centre for Tatenda Makuvaza** — forensic accounting, three income streams, invoicing, VAT/NSSA/PAYE, bank reconciliation, full IFRS-style financial statements, machine-learning fraud detection, Sophie AI assistant and WhatsApp alerts. Built with Next.js 14, TypeScript, Tailwind CSS and Recharts. Deploys on Vercel in one click.

---

## ✨ What's inside

| Area | Capabilities |
| --- | --- |
| **Executive Dashboard** | Live KPIs, income vs expenses vs profit, revenue mix (3 streams), cash-flow waterfall, receivables aging, financial health score, fraud radar, department strip |
| **Analytics Lab** | Deep-dive charts: profitability trends, stream comparison, expense heat, forecasting-style views — built for a data analyst |
| **3 Income Streams** | Salary & employment · Forensic audit & advisory · Big data analytics seminars — tracked separately with share-of-revenue analytics |
| **Invoicing** | Branded tax invoices with the Maxhals logo, per-line VAT, print-ready document, mark-paid, WhatsApp payment reminders, CSV export |
| **Expenses** | Categorised, department-tagged, input-VAT tracking, spend pies & trends |
| **Banking & Reconciliation** | CBZ + Steward accounts, CSV statement import, auto-match engine, exception queue, manual matching |
| **General Ledger** | Chart of accounts, auto-generated journals from every module, manual journal posting with balance validation, trial balance proof |
| **Financial Statements** | Profit or Loss · Statement of Financial Position · Cash Flows · Changes in Equity · 10 disclosure Notes — exportable as a branded PDF pack |
| **VAT · NSSA · PAYE** | Zimbabwe statutory engines: VAT @ 15%, NSSA 3.5%/4.5% (with insurable ceiling), PAYE monthly USD bands, AIDS levy 3% — payable register with due dates and settle actions |
| **Payroll** | Payroll register with automatic PAYE/NSSA/AIDS computation, payslip PDF export |
| **Departments** | Marketing · IT · HR · Accounts · Procurement · Cash Office · Security — missions, KPIs, staff, task boards, workload charts |
| **Fraud Monitor (ML)** | Isolation-forest ensemble (24 trees, 7 features) + z-score outliers + forensic heuristics (round amounts, weekend postings, duplicates, unmatched bank items) — live rescoring, severity ranking, disposition workflow |
| **Sophie AI** | Finance-aware chat assistant grounded in your live books — P&L, cash, equity, tax, receivables, fraud, quick maths. Optional GPT upgrade via `OPENAI_API_KEY` |
| **WhatsApp** | One-click messages to **+263 782 514 255** — invoices, reminders, weekly digest, tax alerts. Fully automated delivery via Twilio when credentials are added |
| **Reports & I/O** | Every dataset → CSV & branded PDF; CSV import for income/expenses/bank statements; JSON backup/restore |
| **Auth & Users** | Beautiful login page, role-based users (admin/manager/staff) across all departments, HMAC-signed httpOnly sessions |

---

## 🔐 Demo login credentials

| Role | Email | Password |
| --- | --- | --- |
| **Admin — Tatenda Makuvaza** | `tatenda@maxhals.co.zw` | `Admin@2026` |
| Finance Manager | `rumbi@maxhals.co.zw` | `Finance@26` |
| Marketing | `tapiwa@maxhals.co.zw` | `Marketing@26` |
| IT | `farai@maxhals.co.zw` | `Tech@2026` |
| HR | `grace@maxhals.co.zw` | `People@26` |
| Procurement | `simba@maxhals.co.zw` | `Supply@26` |
| Cash Office | `nyasha@maxhals.co.zw` | `Cash@2026` |
| Security | `bonnie@maxhals.co.zw` | `Secure@26` |

---

## 🚀 Run locally

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # production build
npm start          # serve the production build
```

## ☁️ Deploy to Vercel (recommended)

The repo is Vercel-ready (`vercel.json` included, Next.js framework preset).

### Option A — Vercel dashboard (2 minutes, no CLI)
1. Push this repo to GitHub (already done — `arena/4feb02cc-maxhals-forensics` branch).
2. Go to [vercel.com/new](https://vercel.com/new) → **Import Git Repository** → pick `Maxhals-Forensics-`.
3. Vercel auto-detects Next.js — click **Deploy**.
4. Done. Your Suite is live on `*.vercel.app`.

### Option B — Vercel CLI
```bash
npm i -g vercel
vercel login
vercel --prod
```

### Option C — Deploy button
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/tatendamakuvaza/Maxhals-Forensics-)

### Environment variables (all optional — the app works without them)

| Variable | Purpose |
| --- | --- |
| `AUTH_SECRET` | HMAC secret for session cookies (set to a random string in production) |
| `OPENAI_API_KEY` | Upgrades Sophie to GPT-quality conversation (falls back to the local finance engine) |
| `OPENAI_MODEL` | Model name (default `gpt-4o-mini`) |
| `TWILIO_ACCOUNT_SID` | Enables automated WhatsApp delivery |
| `TWILIO_AUTH_TOKEN` | Twilio auth token |
| `TWILIO_WHATSAPP_FROM` | Your Twilio WhatsApp sender (`whatsapp:+1415…`) |

Without Twilio, every WhatsApp button opens `wa.me/263782514255` with the message pre-filled — one tap to send.

---

## 📱 WhatsApp on +263 782 514 255

- Invoice reminders, weekly financial digests, tax-deadline alerts and fraud warnings all target your number.
- `POST /api/whatsapp` with `{ "to": "+263782514255", "message": "..." }` — returns a `wa.me` link or delivers via Twilio when configured.

## 🤖 The ML fraud engine (MHF-IF v2.1)

1. **Isolation-forest ensemble** — 24 trees over 7 engineered features (amount, z-score, round-number, weekend, type, match status, log-amount).
2. **Statistical outlier detection** — amount z-scores vs the live distribution.
3. **Forensic heuristics** — large round numbers, weekend postings, duplicate descriptions, unmatched bank items, value spikes.

Scores recompute automatically whenever the books change. High-risk flags surface on the dashboard and in Sophie.

## 🧠 Sophie

Ask anything: *"How is my profit this year?" · "What do I owe ZIMRA?" · "Show overdue invoices" · "Any fraud alerts?" · "15% VAT on 4500"*. Sophie reads your live ledger, statements, tax register and fraud flags. Add `OPENAI_API_KEY` for free-form GPT conversation on top.

## 🧾 Zimbabwe statutory engines

- **VAT** 15% standard rate — output/input tracking, quarterly return wizard, net payable to ZIMRA.
- **NSSA** 3.5% employee / 4.5% employer on insurable earnings (configurable ceiling).
- **PAYE** monthly USD tax bands + **AIDS levy** 3% of PAYE — computed per payslip automatically.

## 🗂️ Project structure

```
src/
├── app/                  # App Router pages + API routes
│   ├── login/            # Auth UI
│   ├── (dashboard etc.)  # 15 modules
│   └── api/              # auth · sophie · fraud · whatsapp
├── components/           # Sidebar, Topbar, UI kit, Logo
└── lib/
    ├── types.ts          # Domain model
    ├── seed.ts           # 2026 demo books (10 months)
    ├── store.ts          # Zustand + localStorage persistence
    ├── accounting.ts     # P&L, balance sheet, cash flow, equity
    ├── tax.ts            # VAT · NSSA · PAYE · AIDS
    ├── ml/fraud.ts       # Isolation-forest + rules engine
    ├── sophie.ts         # AI assistant brain
    └── export.ts         # CSV/PDF export (jsPDF + PapaParse)
```

## ⚠️ Production notes

- Demo credentials live client-side for a smooth demo. Before handling real books, connect an identity provider (Clerk/Auth0/Supabase Auth) and a real database (Vercel Postgres/Neon) — the data layer is isolated in `src/lib/store.ts` for a clean swap.
- Data persists per-browser via `localStorage`; use Settings → Download backup for JSON snapshots.

---

**© 2026 Maxhals Forensics — Tatenda Makuvaza · Harare, Zimbabwe · +263 782 514 255**
*Forensic Audit • Advisory • Big Data Analytics*
