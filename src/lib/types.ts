// ─── Core domain types for Maxhals Forensics Suite ────────────────────────────

export type IncomeStream = "salary" | "forensic" | "seminar";

export type Department =
  | "Marketing"
  | "IT"
  | "HR"
  | "Accounts"
  | "Procurement"
  | "Cash Office"
  | "Security";

export type Role = "admin" | "manager" | "staff";

export interface User {
  id: string;
  name: string;
  email: string;
  password: string; // demo credentials stored client-side (see README for production hardening)
  role: Role;
  department: Department;
  color: string;
}

export interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  vatNumber?: string;
  stream: IncomeStream;
}

export interface Income {
  id: string;
  date: string; // ISO yyyy-mm-dd
  stream: IncomeStream;
  description: string;
  client: string;
  amount: number; // USD
  vatCharged: number;
  accountCode: string;
  invoiceId?: string;
  received: boolean;
}

export interface Expense {
  id: string;
  date: string;
  category: string;
  description: string;
  amount: number;
  vatClaimable: number;
  department: Department;
  paidThrough: string;
  recurring: boolean;
}

export interface InvoiceItem {
  description: string;
  qty: number;
  rate: number;
  vatRate: number; // percent
}

export type InvoiceStatus = "draft" | "sent" | "paid" | "partial" | "overdue" | "cancelled";

export interface Invoice {
  id: string;
  number: string;
  clientId: string;
  date: string;
  dueDate: string;
  items: InvoiceItem[];
  status: InvoiceStatus;
  paidAmount: number;
  notes: string;
  stream: IncomeStream;
  quoteRef?: string;
}

export interface BankAccount {
  id: string;
  name: string;
  bank: string;
  accountNumber: string;
  currency: string;
  openingBalance: number;
}

export interface BankTxn {
  id: string;
  accountId: string;
  date: string;
  description: string;
  amount: number; // + credit / - debit
  matched: boolean;
  matchedRef?: string;
  category?: string;
}

export interface JournalLine {
  accountCode: string;
  debit: number;
  credit: number;
}

export interface JournalEntry {
  id: string;
  date: string;
  ref: string;
  narration: string;
  lines: JournalLine[];
  source: "system" | "manual";
}

export type TaxType = "VAT" | "NSSA" | "PAYE";

export interface TaxPayable {
  id: string;
  type: TaxType;
  period: string; // e.g. "2026-09"
  dueDate: string;
  amount: number;
  paidAmount: number;
  paidDate?: string;
  notes: string;
}

export interface PayrollEmployee {
  id: string;
  name: string;
  position: string;
  department: Department;
  gross: number;
  allowances: number;
  nssaEmployee: number;
  paye: number;
  aidsLevy: number;
  net: number;
  nssaEmployer: number;
}

export interface EquityMovement {
  id: string;
  date: string;
  label: string;
  amount: number; // + capital in / - drawings
  type: "capital" | "drawing" | "adjustment" | "profit";
}

export interface FraudFlag {
  id: string;
  date: string;
  ref: string;
  description: string;
  amount: number;
  score: number; // 0..100 anomaly score
  severity: "low" | "medium" | "high";
  reason: string;
  status: "open" | "reviewed" | "dismissed";
}

export interface DeptTask {
  id: string;
  department: Department;
  title: string;
  assignee: string;
  due: string;
  status: "todo" | "in-progress" | "done";
  priority: "low" | "medium" | "high";
}

export interface SophieMessage {
  id: string;
  role: "user" | "sophie";
  text: string;
  ts: number;
}

export type SophieTone = "warm" | "formal" | "casual" | "concise";

export interface SophieFact {
  id: string;
  key?: string;
  text: string;
  createdAt: number;
}

export interface SophieMemory {
  preferredName?: string;
  tone?: SophieTone;
  facts: SophieFact[];
}

export interface Settings {
  company: {
    name: string;
    owner: string;
    tagline: string;
    email: string;
    phone: string;
    whatsapp: string;
    address: string;
    vatNumber: string;
    nssaNumber: string;
    taxNumber: string;
    currency: string;
  };
  vatRate: number;
  nssaEmployeeRate: number;
  nssaEmployerRate: number;
  nssaCeiling: number;
  whatsappNumber: string;
  invoicePrefix: string;
  nextInvoiceNo: number;
  fiscalYearStart: string;
}

export interface AppData {
  users: User[];
  clients: Client[];
  income: Income[];
  expenses: Expense[];
  invoices: Invoice[];
  bankAccounts: BankAccount[];
  bankTxns: BankTxn[];
  journal: JournalEntry[];
  taxes: TaxPayable[];
  payroll: PayrollEmployee[];
  equity: EquityMovement[];
  fraudFlags: FraudFlag[];
  tasks: DeptTask[];
  chat: SophieMessage[];
  sophieMemory?: SophieMemory;
  settings: Settings;
}

export const STREAM_LABELS: Record<IncomeStream, string> = {
  salary: "Salary & Employment",
  forensic: "Forensic Audit & Advisory",
  seminar: "Big Data Analytics Seminars"
};

export const DEPARTMENTS: Department[] = [
  "Marketing",
  "IT",
  "HR",
  "Accounts",
  "Procurement",
  "Cash Office",
  "Security"
];

export const CHART_OF_ACCOUNTS: { code: string; name: string; type: "asset" | "liability" | "equity" | "income" | "expense" }[] = [
  { code: "1000", name: "Petty Cash", type: "asset" },
  { code: "1010", name: "Bank — CBZ USD", type: "asset" },
  { code: "1020", name: "Bank — Steward Bank", type: "asset" },
  { code: "1100", name: "Accounts Receivable", type: "asset" },
  { code: "1200", name: "Equipment & Laptops", type: "asset" },
  { code: "1300", name: "Input VAT", type: "asset" },
  { code: "2000", name: "Accounts Payable", type: "liability" },
  { code: "2100", name: "Output VAT Control", type: "liability" },
  { code: "2200", name: "NSSA Payable", type: "liability" },
  { code: "2300", name: "PAYE / ZIMRA Payable", type: "liability" },
  { code: "2400", name: "AIDS Levy Payable", type: "liability" },
  { code: "3000", name: "Owner's Capital", type: "equity" },
  { code: "3100", name: "Retained Earnings", type: "equity" },
  { code: "3200", name: "Owner's Drawings", type: "equity" },
  { code: "4000", name: "Salary Income", type: "income" },
  { code: "4100", name: "Forensic Audit & Advisory Fees", type: "income" },
  { code: "4200", name: "Seminar & Training Fees", type: "income" },
  { code: "4300", name: "Other Income", type: "income" },
  { code: "5000", name: "Direct Seminar Costs", type: "expense" },
  { code: "6000", name: "Salaries & Wages", type: "expense" },
  { code: "6100", name: "Rent & Utilities", type: "expense" },
  { code: "6200", name: "Software & Subscriptions", type: "expense" },
  { code: "6300", name: "Travel & Fuel", type: "expense" },
  { code: "6400", name: "Marketing & Branding", type: "expense" },
  { code: "6500", name: "Professional Fees", type: "expense" },
  { code: "6600", name: "Bank Charges", type: "expense" },
  { code: "6700", name: "Security & Compliance", type: "expense" },
  { code: "6800", name: "Training & Development", type: "expense" },
  { code: "6900", name: "Miscellaneous", type: "expense" }
];
