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
| **Sophie AI & Voice** | Conversational finance assistant grounded in your live books — monthly earnings/spending, top debtors, affordability checks, PAYE/NSSA calculators, persistent memory (`call me T`, `remember that ...`), live mic dictation, Whisper audio notes (`/api/transcribe`), hands-free browser calls, and Twilio Voice phone webhooks (`/api/sophie/voice`) |
| **WhatsApp** | One-click messages to **+263 782 514 255** — invoices, reminders, weekly digest, tax alerts. Fully automated delivery via Twilio when credentials are added |
| **Reports & I/O** | Every dataset → CSV & branded PDF; CSV import for income/expenses/bank statements; JSON backup/restore |
| **Auth & Users** | Beautiful login page, role-based users (admin/manager/staff) across all departments, HMAC-signed httpOnly sessions |

---

## 🔐 Authentication & Access

Access is restricted to authorised Maxhals Forensics accounts (`admin`, `manager` and `staff` roles across all seven departments). Sign in at `/login` using your assigned `@maxhals.co.zw` credentials, or manage users from **Settings → Users & access**.

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
| `OPENAI_API_KEY` | Upgrades Sophie to GPT-quality conversation and enables Whisper audio transcription at `/api/transcribe` |
| `OPENAI_MODEL` | Chat model name (default `gpt-4o-mini`) |
| `OPENAI_TRANSCRIBE_MODEL` | Audio transcription model name (default `whisper-1`) |
| `PUBLIC_BASE_URL` | Optional canonical base URL for Twilio Voice webhook callbacks (`/api/sophie/voice`) |
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

## 🧠 Sophie — Conversation, Learning & Voice Calls

- **Natural conversation & multi-turn context**: handles greetings, acknowledgements, thanks, apologies, goodbyes, mood check-ins (*"I'm tired"*, *"I'm worried about money"*), identity questions (*"What is my name?"*, *"What are you doing?"*), and follow-ups (*"tell me more"*, *"why?"*).
- **Persistent learning & memory**: teach Sophie your preferences (`call me T`, `be more formal`, `remember that I bank with CBZ`, `learn: credit policy = 30-day terms`). Ask **"What do you remember?"** or reset with **"Forget everything"**. Memory persists in the browser store and survives *"Erase ALL data — start clean books"*.
- **Finance intelligence**: monthly earnings/spending (*"What did I earn last month?"*, *"What did I spend in September?"*), top debtor ranking (*"Which client owes me the most?"*), liabilities (*"How much do I owe?"*), affordability (*"Can I afford a laptop for 2500?"*), PAYE/NSSA calculators, net worth, and arithmetic anywhere.
- **Audio input & voice calls**:
  - Live microphone dictation in the composer + audio note uploads transcribed via Whisper at `POST /api/transcribe`.
  - **Call Sophie** (hands-free browser voice loop) and **Sophie, call me** (simulated incoming call with ringtone, Answer/Decline, mute, speaker toggle, live captions and typed fallback).
  - **Twilio Voice webhooks**: point your Twilio number's Voice webhook at `https://<your-app>/api/sophie/voice` (follow-up turns handled at `/api/sophie/voice/respond`).

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
