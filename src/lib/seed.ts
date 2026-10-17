import { AppData, IncomeStream, Department } from "./types";

// ─── Seed dataset: 2026 fiscal year to date (Oct 2026) ────────────────────────
// Functional currency: USD (widely used alongside ZWL in Zimbabwean practice).

const iso = (m: number, d: number) => `2026-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
let uid = 0;
const id = (p: string) => `${p}-${(++uid).toString().padStart(4, "0")}`;

const INCOME_SEED: {
  date: string;
  stream: IncomeStream;
  description: string;
  client: string;
  amount: number;
  received: boolean;
  invoiceId?: string;
}[] = [
  // Salary — consultancy retainer with Maxhals group + part-time lecturing stipend
  ...([1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((m) => ({
    date: iso(m, 25),
    stream: "salary" as IncomeStream,
    description: "Monthly employment package — Group Financial Controller",
    client: "Maxhals Group of Companies",
    amount: 4200,
    received: true
  }))),
  // Forensic auditing & advisory
  { date: iso(1, 18), stream: "forensic", description: "Forensic investigation — procurement fraud review", client: "City of Harare", amount: 6800, received: true, invoiceId: "INV-2601" },
  { date: iso(2, 9), stream: "forensic", description: "Advisory — internal controls redesign", client: "ZB Bank", amount: 4500, received: true, invoiceId: "INV-2602" },
  { date: iso(3, 22), stream: "forensic", description: "Forensic audit — payroll ghost workers", client: "Ministry of Public Service", amount: 8200, received: true, invoiceId: "INV-2603" },
  { date: iso(4, 14), stream: "forensic", description: "Litigation support & expert witness", client: "Scanlen & Holderness", amount: 3900, received: true, invoiceId: "INV-2604" },
  { date: iso(5, 6), stream: "forensic", description: "Fraud risk assessment — microfinance portfolio", client: "EcoCash Holdings", amount: 7300, received: true, invoiceId: "INV-2605" },
  { date: iso(6, 17), stream: "forensic", description: "Asset tracing & recovery advisory", client: "NRZ Pension Fund", amount: 5600, received: true, invoiceId: "INV-2606" },
  { date: iso(7, 8), stream: "forensic", description: "Forensic review — grant utilisation (UNDP)", client: "UNDP Zimbabwe", amount: 9100, received: true, invoiceId: "INV-2607" },
  { date: iso(8, 12), stream: "forensic", description: "Anti-money laundering compliance review", client: "Steward Bank", amount: 6200, received: true, invoiceId: "INV-2608" },
  { date: iso(9, 3), stream: "forensic", description: "Investigation — tender irregularities", client: "ZINARA", amount: 7800, received: false, invoiceId: "INV-2612" },
  { date: iso(9, 27), stream: "forensic", description: "Forensic data analytics engagement", client: "Old Mutual Zimbabwe", amount: 8600, received: false, invoiceId: "INV-2614" },
  { date: iso(10, 10), stream: "forensic", description: "Whistleblower hotline investigation", client: "Delta Corporation", amount: 5200, received: false, invoiceId: "INV-2616" },
  // Big data analytics seminars
  { date: iso(1, 30), stream: "seminar", description: "Corporate seminar — Fraud Analytics with Big Data (2 days)", client: "Econet Wireless", amount: 5400, received: true, invoiceId: "INV-2609" },
  { date: iso(3, 5), stream: "seminar", description: "Public bootcamp — Data Analytics for Auditors (Harare)", client: "Open enrolment", amount: 3800, received: true, invoiceId: "INV-2610" },
  { date: iso(4, 25), stream: "seminar", description: "University guest lecture series — Machine Learning in Audit", client: "University of Zimbabwe", amount: 2600, received: true },
  { date: iso(6, 2), stream: "seminar", description: "Executive masterclass — Big Data Strategy", client: "CBZ Holdings", amount: 6100, received: true, invoiceId: "INV-2611" },
  { date: iso(7, 21), stream: "seminar", description: "Regional webinar series — Analytics for Finance Leaders", client: "IAA Zimbabwe", amount: 3200, received: true, invoiceId: "INV-2613" },
  { date: iso(8, 18), stream: "seminar", description: "Corporate seminar — Predictive Analytics for Risk", client: "ZB Financial Holdings", amount: 4700, received: true, invoiceId: "INV-2615" },
  { date: iso(10, 5), stream: "seminar", description: "Bootcamp — Python & R for Forensic Analytics (Bulawayo)", client: "Open enrolment", amount: 4100, received: false, invoiceId: "INV-2617" }
];

const EXPENSES_SEED = [
  ...[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((m) => ({ date: iso(m, 1), category: "Rent & Utilities", description: "Office rent — Harare CBD + utilities", amount: 1350, vatClaimable: 202.5, department: "Accounts" as Department, paidThrough: "CBZ USD", recurring: true })),
  ...[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((m) => ({ date: iso(m, 27), category: "Salaries & Wages", description: "Team salaries — 3 staff (analyst, admin, driver)", amount: 2850, vatClaimable: 0, department: "HR" as Department, paidThrough: "CBZ USD", recurring: true })),
  { date: iso(1, 9), category: "Software & Subscriptions", description: "ACL Analytics + IDEA forensic licences (annual)", amount: 2400, vatClaimable: 360, department: "IT", paidThrough: "Steward Bank", recurring: false },
  { date: iso(1, 15), category: "Travel & Fuel", description: "Fuel & tolls — Harare/Masvingo fieldwork", amount: 640, vatClaimable: 96, department: "Accounts", paidThrough: "CBZ USD", recurring: false },
  { date: iso(2, 3), category: "Marketing & Branding", description: "Website refresh, branding & LinkedIn campaigns", amount: 1150, vatClaimable: 172.5, department: "Marketing", paidThrough: "Steward Bank", recurring: false },
  { date: iso(2, 20), category: "Professional Fees", description: "Legal retainer — Scanlen & Holderness", amount: 900, vatClaimable: 135, department: "Accounts", paidThrough: "CBZ USD", recurring: true },
  { date: iso(3, 2), category: "Software & Subscriptions", description: "Microsoft 365 + Power BI Pro (12 seats)", amount: 780, vatClaimable: 117, department: "IT", paidThrough: "Steward Bank", recurring: true },
  { date: iso(3, 18), category: "Direct Seminar Costs", description: "Venue hire & catering — UZ bootcamp", amount: 1260, vatClaimable: 189, department: "Procurement", paidThrough: "CBZ USD", recurring: false },
  { date: iso(4, 7), category: "Security & Compliance", description: "CCTV, access control & data-centre security audit", amount: 1420, vatClaimable: 213, department: "Security", paidThrough: "CBZ USD", recurring: false },
  { date: iso(4, 22), category: "Travel & Fuel", description: "Air travel — Bulawayo seminar circuit", amount: 890, vatClaimable: 133.5, department: "Accounts", paidThrough: "Steward Bank", recurring: false },
  { date: iso(5, 11), category: "Training & Development", description: "CFE exam sponsorship & data science course (HR)", amount: 1600, vatClaimable: 240, department: "HR", paidThrough: "CBZ USD", recurring: false },
  { date: iso(5, 29), category: "Bank Charges", description: "Bank charges & RTGS fees (Q2)", amount: 185, vatClaimable: 27.75, department: "Cash Office", paidThrough: "CBZ USD", recurring: true },
  { date: iso(6, 6), category: "Marketing & Branding", description: "Maxhals conference booth & printed materials", amount: 970, vatClaimable: 145.5, department: "Marketing", paidThrough: "Steward Bank", recurring: false },
  { date: iso(6, 24), category: "Software & Subscriptions", description: "Cloud GPU credits — ML fraud model training", amount: 1100, vatClaimable: 165, department: "IT", paidThrough: "Steward Bank", recurring: true },
  { date: iso(7, 3), category: "Direct Seminar Costs", description: "Venue & logistics — Econet corporate seminar", amount: 1480, vatClaimable: 222, department: "Procurement", paidThrough: "CBZ USD", recurring: false },
  { date: iso(7, 19), category: "Professional Fees", description: "Tax advisory — ZIMRA engagement support", amount: 750, vatClaimable: 112.5, department: "Accounts", paidThrough: "CBZ USD", recurring: false },
  { date: iso(8, 8), category: "Travel & Fuel", description: "Fieldwork travel — ZINARA investigation", amount: 720, vatClaimable: 108, department: "Accounts", paidThrough: "CBZ USD", recurring: false },
  { date: iso(8, 21), category: "Security & Compliance", description: "Cyber insurance premium (12 months)", amount: 1250, vatClaimable: 0, department: "Security", paidThrough: "CBZ USD", recurring: true },
  { date: iso(9, 4), category: "Equipment & Fixtures", description: "2× forensic workstations + encrypted drives", amount: 3200, vatClaimable: 480, department: "IT", paidThrough: "Steward Bank", recurring: false },
  { date: iso(9, 16), category: "Marketing & Branding", description: "Q4 digital campaign — analytics seminars", amount: 860, vatClaimable: 129, department: "Marketing", paidThrough: "Steward Bank", recurring: false },
  { date: iso(10, 2), category: "Professional Fees", description: "External audit review fee (interim)", amount: 1350, vatClaimable: 202.5, department: "Accounts", paidThrough: "CBZ USD", recurring: false },
  { date: iso(10, 12), category: "Miscellaneous", description: "Office supplies & printer consumables", amount: 340, vatClaimable: 51, department: "Procurement", paidThrough: "CBZ USD", recurring: false }
].map((e) => ({ ...e, id: id("EXP") })) as AppData["expenses"];

const INVOICE_SEED = [
  { id: "INV-2601", number: "MHF-2601", clientId: "c01", date: iso(1, 18), dueDate: iso(2, 17), stream: "forensic" as IncomeStream, paidAmount: 7820, status: "paid" as const },
  { id: "INV-2602", number: "MHF-2602", clientId: "c02", date: iso(2, 9), dueDate: iso(3, 11), stream: "forensic" as IncomeStream, paidAmount: 5175, status: "paid" as const },
  { id: "INV-2603", number: "MHF-2603", clientId: "c03", date: iso(3, 22), dueDate: iso(4, 21), stream: "forensic" as IncomeStream, paidAmount: 9430, status: "paid" as const },
  { id: "INV-2604", number: "MHF-2604", clientId: "c04", date: iso(4, 14), dueDate: iso(5, 14), stream: "forensic" as IncomeStream, paidAmount: 4485, status: "paid" as const },
  { id: "INV-2605", number: "MHF-2605", clientId: "c05", date: iso(5, 6), dueDate: iso(6, 5), stream: "forensic" as IncomeStream, paidAmount: 8395, status: "paid" as const },
  { id: "INV-2606", number: "MHF-2606", clientId: "c06", date: iso(6, 17), dueDate: iso(7, 17), stream: "forensic" as IncomeStream, paidAmount: 6440, status: "paid" as const },
  { id: "INV-2607", number: "MHF-2607", clientId: "c07", date: iso(7, 8), dueDate: iso(8, 7), stream: "forensic" as IncomeStream, paidAmount: 10465, status: "paid" as const },
  { id: "INV-2608", number: "MHF-2608", clientId: "c08", date: iso(8, 12), dueDate: iso(9, 11), stream: "forensic" as IncomeStream, paidAmount: 7130, status: "paid" as const },
  { id: "INV-2609", number: "MHF-2609", clientId: "c09", date: iso(1, 30), dueDate: iso(3, 1), stream: "seminar" as IncomeStream, paidAmount: 6210, status: "paid" as const },
  { id: "INV-2610", number: "MHF-2610", clientId: "c10", date: iso(3, 5), dueDate: iso(4, 4), stream: "seminar" as IncomeStream, paidAmount: 4370, status: "paid" as const },
  { id: "INV-2611", number: "MHF-2611", clientId: "c11", date: iso(6, 2), dueDate: iso(7, 2), stream: "seminar" as IncomeStream, paidAmount: 7015, status: "paid" as const },
  { id: "INV-2612", number: "MHF-2612", clientId: "c12", date: iso(9, 3), dueDate: iso(10, 3), stream: "forensic" as IncomeStream, paidAmount: 2000, status: "overdue" as const },
  { id: "INV-2613", number: "MHF-2613", clientId: "c13", date: iso(7, 21), dueDate: iso(8, 20), stream: "seminar" as IncomeStream, paidAmount: 3680, status: "paid" as const },
  { id: "INV-2614", number: "MHF-2614", clientId: "c14", date: iso(9, 27), dueDate: iso(10, 27), stream: "forensic" as IncomeStream, paidAmount: 0, status: "sent" as const },
  { id: "INV-2615", number: "MHF-2615", clientId: "c15", date: iso(8, 18), dueDate: iso(9, 17), stream: "seminar" as IncomeStream, paidAmount: 5405, status: "paid" as const },
  { id: "INV-2616", number: "MHF-2616", clientId: "c16", date: iso(10, 10), dueDate: iso(11, 9), stream: "forensic" as IncomeStream, paidAmount: 0, status: "sent" as const },
  { id: "INV-2617", number: "MHF-2617", clientId: "c10", date: iso(10, 5), dueDate: iso(11, 4), stream: "seminar" as IncomeStream, paidAmount: 0, status: "sent" as const }
].map((inv) => ({
  ...inv,
  items: [
    {
      description:
        inv.stream === "forensic"
          ? "Forensic audit & advisory services — professional fees"
          : "Big data analytics seminar & training services",
      qty: 1,
      rate: Math.round(inv.paidAmount > 0 ? inv.paidAmount / 1.15 : inv.stream === "forensic" ? 6000 : 4000),
      vatRate: 15
    }
  ],
  notes: "Payment due within 30 days. RTGS/USD to Maxhals Forensics accounts. VAT charged at 15% where applicable."
}));

function invoiceAmount(items: { qty: number; rate: number; vatRate: number }[]) {
  const sub = items.reduce((a, b) => a + b.qty * b.rate, 0);
  const vat = items.reduce((a, b) => a + (b.qty * b.rate * b.vatRate) / 100, 0);
  return { sub, vat, total: sub + vat };
}

export function buildSeedData(): AppData {
  const expenses = EXPENSES_SEED;
  const invoices = INVOICE_SEED;

  // Income records derived from invoices + salary
  const income = INCOME_SEED.map((r) => {
    const inv = invoices.find((i) => i.id === r.invoiceId);
    const amt = r.amount;
    return {
      id: id("INC"),
      date: r.date,
      stream: r.stream,
      description: r.description,
      client: r.client,
      amount: amt,
      vatCharged: inv ? Math.round(amt * 0.15 * 100) / 100 : r.stream === "salary" ? 0 : Math.round(amt * 0.15 * 100) / 100,
      accountCode: r.stream === "salary" ? "4000" : r.stream === "forensic" ? "4100" : "4200",
      invoiceId: inv?.number,
      received: r.received
    };
  });

  // Bank transactions — salaries, receipts, expenses, tax payments
  const bankTxns = [
    ...INCOME_SEED.filter((r) => r.received).map((r) => ({
      id: id("BTX"),
      accountId: r.stream === "seminar" ? "ba2" : "ba1",
      date: r.date,
      description: `Receipt — ${r.client}`,
      amount: Math.round(r.amount * (r.stream === "salary" ? 1 : 1.15) * 100) / 100,
      matched: true,
      matchedRef: r.invoiceId ? invoices.find((i) => i.id === r.invoiceId)?.number : undefined,
      category: "Income"
    })),
    ...expenses.map((e) => ({
      id: id("BTX"),
      accountId: e.paidThrough.includes("Steward") ? "ba2" : "ba1",
      date: e.date,
      description: e.description,
      amount: -Math.round(e.amount * (e.vatClaimable > 0 ? 1.15 : 1) * 100) / 100,
      matched: true,
      matchedRef: e.id,
      category: e.category
    })),
    { id: id("BTX"), accountId: "ba1", date: iso(4, 15), description: "ZIMRA — PAYE payment March 2026", amount: -1284.5, matched: true, matchedRef: "TAX-03", category: "Tax" },
    { id: id("BTX"), accountId: "ba1", date: iso(5, 15), description: "ZIMRA — PAYE payment April 2026", amount: -1284.5, matched: true, matchedRef: "TAX-04", category: "Tax" },
    { id: id("BTX"), accountId: "ba1", date: iso(6, 15), description: "NSSA contribution May 2026", amount: -254.25, matched: true, matchedRef: "TAX-05", category: "Tax" },
    { id: id("BTX"), accountId: "ba1", date: iso(7, 15), description: "ZIMRA — VAT return Q2 2026", amount: -2146.75, matched: true, matchedRef: "TAX-Q2", category: "Tax" },
    { id: id("BTX"), accountId: "ba2", date: iso(8, 2), description: "Unmatched deposit — suspense", amount: 1500, matched: false, category: "Unknown" },
    { id: id("BTX"), accountId: "ba1", date: iso(9, 10), description: "Unexplained cash withdrawal", amount: -2200, matched: false, category: "Unknown" },
    { id: id("BTX"), accountId: "ba2", date: iso(10, 8), description: "Bank charges — monthly fee", amount: -45, matched: false, category: "Bank Charges" }
  ];

  const journal = buildJournal(income, expenses, invoices);

  return {
    users: [
      { id: "u1", name: "Tatenda Makuvaza", email: "tatenda@maxhals.co.zw", password: "Admin@2026", role: "admin", department: "Accounts", color: "#33d6c2" },
      { id: "u2", name: "Rumbidzai Chikafu", email: "rumbi@maxhals.co.zw", password: "Finance@26", role: "manager", department: "Accounts", color: "#f6c453" },
      { id: "u3", name: "Tapiwa Moyo", email: "tapiwa@maxhals.co.zw", password: "Marketing@26", role: "staff", department: "Marketing", color: "#c084fc" },
      { id: "u4", name: "Farai Ncube", email: "farai@maxhals.co.zw", password: "Tech@2026", role: "staff", department: "IT", color: "#60a5fa" },
      { id: "u5", name: "Grace Mutasa", email: "grace@maxhals.co.zw", password: "People@26", role: "staff", department: "HR", color: "#f472b6" },
      { id: "u6", name: "Simba Dube", email: "simba@maxhals.co.zw", password: "Supply@26", role: "staff", department: "Procurement", color: "#34d399" },
      { id: "u7", name: "Nyasha Sibanda", email: "nyasha@maxhals.co.zw", password: "Cash@2026", role: "staff", department: "Cash Office", color: "#fbbf24" },
      { id: "u8", name: "Bonnie Marimo", email: "bonnie@maxhals.co.zw", password: "Secure@26", role: "staff", department: "Security", color: "#f87171" }
    ],
    clients: [
      { id: "c01", name: "City of Harare", email: "finance@hararecity.co.zw", phone: "+263 242 705 911", address: "Civic Centre, Harare", vatNumber: "100234567", stream: "forensic" },
      { id: "c02", name: "ZB Bank", email: "procurement@zb.co.zw", phone: "+263 242 707 000", address: "ZB Centre, Harare", vatNumber: "100298841", stream: "forensic" },
      { id: "c03", name: "Ministry of Public Service", email: "accounts@mps.gov.zw", phone: "+263 242 703 661", address: "Munhumutapa Building, Harare", stream: "forensic" },
      { id: "c04", name: "Scanlen & Holderness", email: "billing@scanh.co.zw", phone: "+263 242 700 555", address: "6th Floor, Batanai House, Harare", stream: "forensic" },
      { id: "c05", name: "EcoCash Holdings", email: "audit@ecocash.co.zw", phone: "+263 867 700 000", address: "Econet Park, Msasa, Harare", vatNumber: "100122384", stream: "forensic" },
      { id: "c06", name: "NRZ Pension Fund", email: "trustees@nrzpf.co.zw", phone: "+263 29 263 611", address: "NRZ HQ, Bulawayo", stream: "forensic" },
      { id: "c07", name: "UNDP Zimbabwe", email: "procurement.zw@undp.org", phone: "+263 242 251 811", address: "Pax House, 6th Floor, Harare", stream: "forensic" },
      { id: "c08", name: "Steward Bank", email: "compliance@stewardbank.co.zw", phone: "+263 242 774 100", address: "120 Sam Nujoma Ave, Harare", vatNumber: "100312298", stream: "forensic" },
      { id: "c09", name: "Econet Wireless", email: "learning@econet.co.zw", phone: "+263 867 700 000", address: "Econet Park, Msasa, Harare", vatNumber: "100045112", stream: "seminar" },
      { id: "c10", name: "Open Enrolment", email: "seminars@maxhals.co.zw", phone: "+263 782 514 255", address: "Harare", stream: "seminar" },
      { id: "c11", name: "CBZ Holdings", email: "l&d@cbz.co.zw", phone: "+263 242 707 800", address: "Corner Kwame Nkrumah / 1st Street, Harare", vatNumber: "100078223", stream: "seminar" },
      { id: "c12", name: "ZINARA", email: "finance@zinara.co.zw", phone: "+263 242 785 240", address: "ZINARA House, Harare", vatNumber: "100334871", stream: "forensic" },
      { id: "c13", name: "IAA Zimbabwe", email: "events@iaazim.co.zw", phone: "+263 772 334 119", address: "Harare", stream: "seminar" },
      { id: "c14", name: "Old Mutual Zimbabwe", email: "risk@oldmutual.co.zw", phone: "+263 242 707 000", address: "Old Mutual Centre, Harare", vatNumber: "100011942", stream: "forensic" },
      { id: "c15", name: "ZB Financial Holdings", email: "academy@zb.co.zw", phone: "+263 242 707 000", address: "ZB Centre, Harare", stream: "seminar" },
      { id: "c16", name: "Delta Corporation", email: "audit@delta.co.zw", phone: "+263 242 748 811", address: "Quarry Road, Southerton, Harare", vatNumber: "100012233", stream: "forensic" },
      { id: "c17", name: "University of Zimbabwe", email: "commerce@uz.ac.zw", phone: "+263 242 222 282", address: "Mount Pleasant, Harare", stream: "seminar" },
      { id: "c18", name: "Maxhals Group of Companies", email: "payroll@maxhals.co.zw", phone: "+263 782 514 255", address: "Harare", stream: "salary" }
    ],
    income,
    expenses,
    invoices,
    bankAccounts: [
      { id: "ba1", name: "Business Current", bank: "CBZ Bank", accountNumber: "0012 3456 7890", currency: "USD", openingBalance: 8200 },
      { id: "ba2", name: "Seminar & Training Account", bank: "Steward Bank", accountNumber: "1023 4455 6677", currency: "USD", openingBalance: 3100 }
    ],
    bankTxns,
    journal,
    taxes: buildTaxes(),
    payroll: buildPayroll(),
    equity: [
      { id: id("EQ"), date: "2026-01-01", label: "Opening capital introduced", amount: 15000, type: "capital" },
      { id: id("EQ"), date: "2026-03-15", label: "Additional capital — equipment funding", amount: 5000, type: "capital" },
      { id: id("EQ"), date: "2026-02-28", label: "Owner's drawings — living expenses", amount: -2500, type: "drawing" },
      { id: id("EQ"), date: "2026-05-31", label: "Owner's drawings — vehicle", amount: -4200, type: "drawing" },
      { id: id("EQ"), date: "2026-08-29", label: "Owner's drawings — living expenses", amount: -3000, type: "drawing" },
      { id: id("EQ"), date: "2026-09-30", label: "Prior-period adjustment — asset revaluation", amount: 1800, type: "adjustment" }
    ],
    fraudFlags: [],
    tasks: [
      { id: id("TSK"), department: "Marketing", title: "Q4 seminar campaign — 3-channel rollout", assignee: "Tapiwa Moyo", due: iso(10, 30), status: "in-progress", priority: "high" },
      { id: id("TSK"), department: "Marketing", title: "Refresh invoice & proposal brand pack", assignee: "Tapiwa Moyo", due: iso(11, 6), status: "todo", priority: "medium" },
      { id: id("TSK"), department: "IT", title: "Deploy fraud-detection model v2 to production", assignee: "Farai Ncube", due: iso(10, 24), status: "in-progress", priority: "high" },
      { id: id("TSK"), department: "IT", title: "Enforce 2FA on all finance accounts", assignee: "Farai Ncube", due: iso(11, 12), status: "todo", priority: "high" },
      { id: id("TSK"), department: "HR", title: "Complete NSSA returns for September", assignee: "Grace Mutasa", due: iso(10, 21), status: "todo", priority: "high" },
      { id: id("TSK"), department: "HR", title: "Recruit part-time seminar facilitators (2)", assignee: "Grace Mutasa", due: iso(11, 20), status: "in-progress", priority: "medium" },
      { id: id("TSK"), department: "Accounts", title: "File VAT return Q3 2026 (ZIMRA)", assignee: "Rumbidzai Chikafu", due: iso(10, 25), status: "in-progress", priority: "high" },
      { id: id("TSK"), department: "Accounts", title: "Bank reconciliation — Steward Bank September", assignee: "Rumbidzai Chikafu", due: iso(10, 19), status: "todo", priority: "high" },
      { id: id("TSK"), department: "Accounts", title: "Chase INV-2612 (ZINARA) overdue balance", assignee: "Rumbidzai Chikafu", due: iso(10, 18), status: "todo", priority: "high" },
      { id: id("TSK"), department: "Procurement", title: "Source venue for Bulawayo bootcamp", assignee: "Simba Dube", due: iso(10, 22), status: "done", priority: "medium" },
      { id: id("TSK"), department: "Procurement", title: "Renew ACL Analytics licences (quote)", assignee: "Simba Dube", due: iso(11, 3), status: "todo", priority: "low" },
      { id: id("TSK"), department: "Cash Office", title: "Daily cash count & lodgement (ongoing)", assignee: "Nyasha Sibanda", due: iso(10, 17), status: "in-progress", priority: "high" },
      { id: id("TSK"), department: "Cash Office", title: "Reconcile petty cash float", assignee: "Nyasha Sibanda", due: iso(10, 20), status: "todo", priority: "medium" },
      { id: id("TSK"), department: "Security", title: "Quarterly access-control audit", assignee: "Bonnie Marimo", due: iso(11, 1), status: "in-progress", priority: "medium" },
      { id: id("TSK"), department: "Security", title: "Review CCTV retention policy", assignee: "Bonnie Marimo", due: iso(11, 15), status: "todo", priority: "low" }
    ],
    chat: [],
    settings: {
      company: {
        name: "Maxhals Forensics",
        owner: "Tatenda Makuvaza",
        tagline: "Forensic Audit • Advisory • Big Data Analytics",
        email: "tatenda@maxhals.co.zw",
        phone: "+263 782 514 255",
        whatsapp: "+263782514255",
        address: "4th Floor, Pearl House, Speke Avenue, Harare, Zimbabwe",
        vatNumber: "100245781-Z",
        nssaNumber: "NSSA-0412-77",
        taxNumber: "5800123456",
        currency: "USD"
      },
      vatRate: 15,
      nssaEmployeeRate: 3.5,
      nssaEmployerRate: 4.5,
      nssaCeiling: 1400,
      whatsappNumber: "+263782514255",
      invoicePrefix: "MHF-26",
      nextInvoiceNo: 18,
      fiscalYearStart: "2026-01-01"
    }
  };
}

function buildTaxes() {
  const mk = (type: "VAT" | "NSSA" | "PAYE", period: string, dueDate: string, amount: number, paidAmount: number, notes: string, paidDate?: string) => ({
    id: id("TAX"),
    type,
    period,
    dueDate,
    amount,
    paidAmount,
    paidDate,
    notes
  });
  return [
    mk("VAT", "2026-Q1", "2026-04-25", 4380.25, 4380.25, "VAT return Q1 — net output VAT", "2026-04-22"),
    mk("VAT", "2026-Q2", "2026-07-25", 2146.75, 2146.75, "VAT return Q2 — net output VAT", "2026-07-15"),
    mk("VAT", "2026-Q3", "2026-10-25", 3925.5, 0, "VAT return Q3 — net output VAT. Due soon!"),
    mk("NSSA", "2026-03", "2026-04-15", 254.25, 254.25, "NSSA monthly contribution (employee + employer)", "2026-04-12"),
    mk("NSSA", "2026-04", "2026-05-15", 254.25, 254.25, "NSSA monthly contribution (employee + employer)", "2026-05-13"),
    mk("NSSA", "2026-05", "2026-06-15", 254.25, 254.25, "NSSA monthly contribution (employee + employer)", "2026-06-12"),
    mk("NSSA", "2026-06", "2026-07-15", 254.25, 254.25, "NSSA monthly contribution (employee + employer)", "2026-07-14"),
    mk("NSSA", "2026-07", "2026-08-15", 254.25, 254.25, "NSSA monthly contribution (employee + employer)", "2026-08-13"),
    mk("NSSA", "2026-08", "2026-09-15", 254.25, 254.25, "NSSA monthly contribution (employee + employer)", "2026-09-12"),
    mk("NSSA", "2026-09", "2026-10-15", 254.25, 0, "NSSA September contribution — due"),
    mk("PAYE", "2026-03", "2026-04-15", 1284.5, 1284.5, "PAYE on payroll — March 2026", "2026-04-12"),
    mk("PAYE", "2026-04", "2026-05-15", 1284.5, 1284.5, "PAYE on payroll — April 2026", "2026-05-13"),
    mk("PAYE", "2026-05", "2026-06-15", 1284.5, 1284.5, "PAYE on payroll — May 2026", "2026-06-12"),
    mk("PAYE", "2026-06", "2026-07-15", 1284.5, 1284.5, "PAYE on payroll — June 2026", "2026-07-14"),
    mk("PAYE", "2026-07", "2026-08-15", 1284.5, 1284.5, "PAYE on payroll — July 2026", "2026-08-13"),
    mk("PAYE", "2026-08", "2026-09-15", 1284.5, 1284.5, "PAYE on payroll — August 2026", "2026-09-12"),
    mk("PAYE", "2026-09", "2026-10-15", 1284.5, 0, "PAYE September — due"),
    mk("PAYE", "2026-10", "2026-11-15", 1284.5, 0, "PAYE October — upcoming")
  ];
}

function buildPayroll() {
  return [
    { id: id("PR"), name: "Tatenda Makuvaza", position: "Principal Consultant", department: "Accounts" as Department, gross: 4200, allowances: 600, nssaEmployee: 147, paye: 783.5, aidsLevy: 21, net: 3848.5, nssaEmployer: 189 },
    { id: id("PR"), name: "Rumbidzai Chikafu", position: "Forensic Analyst", department: "Accounts" as Department, gross: 1450, allowances: 180, nssaEmployee: 50.75, paye: 172.25, aidsLevy: 7.25, net: 1399.75, nssaEmployer: 65.25 },
    { id: id("PR"), name: "Tapiwa Moyo", position: "Marketing & Events Officer", department: "Marketing" as Department, gross: 980, allowances: 120, nssaEmployee: 34.3, paye: 88.6, aidsLevy: 4.9, net: 972.2, nssaEmployer: 44.1 },
    { id: id("PR"), name: "Farai Ncube", position: "Data Engineer", department: "IT" as Department, gross: 1250, allowances: 150, nssaEmployee: 43.75, paye: 132.5, aidsLevy: 6.25, net: 1217.5, nssaEmployer: 56.25 }
  ];
}

function buildJournal(
  income: { date: string; amount: number; vatCharged: number; accountCode: string; description: string; received: boolean }[],
  expenses: { id: string; date: string; category: string; description: string; amount: number; vatClaimable: number }[],
  invoices: { number: string; date: string; stream: IncomeStream; paidAmount: number }[]
) {
  const entries: AppData["journal"] = [];
  const catToCode: Record<string, string> = {
    "Rent & Utilities": "6100",
    "Salaries & Wages": "6000",
    "Software & Subscriptions": "6200",
    "Travel & Fuel": "6300",
    "Marketing & Branding": "6400",
    "Professional Fees": "6500",
    "Bank Charges": "6600",
    "Security & Compliance": "6700",
    "Training & Development": "6800",
    "Direct Seminar Costs": "5000",
    Miscellaneous: "6900",
    "Equipment & Fixtures": "1200"
  };
  income.forEach((r, i) => {
    const cashCode = r.received ? "1010" : "1100";
    entries.push({
      id: id("JE"),
      date: r.date,
      ref: `INC-${String(i + 1).padStart(3, "0")}`,
      narration: r.description,
      source: "system",
      lines: [
        { accountCode: cashCode, debit: r.amount + r.vatCharged, credit: 0 },
        { accountCode: r.accountCode, debit: 0, credit: r.amount },
        { accountCode: "2100", debit: 0, credit: r.vatCharged }
      ].filter((l) => l.debit > 0 || l.credit > 0)
    });
  });
  expenses.forEach((e) => {
    entries.push({
      id: id("JE"),
      date: e.date,
      ref: e.id,
      narration: e.description,
      source: "system",
      lines: [
        { accountCode: catToCode[e.category] || "6900", debit: e.amount, credit: 0 },
        { accountCode: "1300", debit: e.vatClaimable, credit: 0 },
        { accountCode: "1010", debit: 0, credit: e.amount + e.vatClaimable }
      ].filter((l) => l.debit > 0 || l.credit > 0)
    });
  });
  // Tax payments
  entries.push({ id: id("JE"), date: "2026-07-15", ref: "TAX-Q2", narration: "VAT payment Q2 2026 to ZIMRA", source: "system", lines: [
    { accountCode: "2100", debit: 2146.75, credit: 0 },
    { accountCode: "1010", debit: 0, credit: 2146.75 }
  ]});
  entries.push({ id: id("JE"), date: "2026-06-15", ref: "TAX-05", narration: "NSSA remittance May 2026", source: "system", lines: [
    { accountCode: "2200", debit: 254.25, credit: 0 },
    { accountCode: "1010", debit: 0, credit: 254.25 }
  ]});
  entries.push({ id: id("JE"), date: "2026-05-15", ref: "TAX-04", narration: "PAYE remittance April 2026", source: "system", lines: [
    { accountCode: "2300", debit: 1284.5, credit: 0 },
    { accountCode: "1010", debit: 0, credit: 1284.5 }
  ]});
  return entries;
}
