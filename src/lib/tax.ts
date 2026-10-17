// Zimbabwe statutory tax engines: VAT (15%), NSSA (3.5% employee / 4.5% employer),
// PAYE (monthly USD tax bands), AIDS Levy (3% of PAYE).

export interface PayeBand {
  upTo: number; // upper bound of band (monthly USD)
  rate: number; // percent
  deduction: number; // cumulative fixed deduction to simplify bands
}

// Simplified ZIMRA monthly PAYE bands (USD)
export const PAYE_BANDS: PayeBand[] = [
  { upTo: 350, rate: 0, deduction: 0 },
  { upTo: 800, rate: 20, deduction: 70 },
  { upTo: 2400, rate: 25, deduction: 110 },
  { upTo: 5000, rate: 30, deduction: 230 },
  { upTo: 10000, rate: 35, deduction: 480 },
  { upTo: Infinity, rate: 40, deduction: 980 }
];

export function calcPaye(taxableIncome: number): number {
  if (taxableIncome <= 0) return 0;
  const band = PAYE_BANDS.find((b) => taxableIncome <= b.upTo) ?? PAYE_BANDS[PAYE_BANDS.length - 1];
  const tax = (taxableIncome * band.rate) / 100 - band.deduction;
  return Math.max(0, Math.round(tax * 100) / 100);
}

export function calcAidsLevy(paye: number): number {
  return Math.round(paye * 0.03 * 100) / 100;
}

export function calcNssa(gross: number, employeeRate = 3.5, employerRate = 4.5, ceiling = 1400) {
  const insurable = Math.min(gross, ceiling);
  return {
    employee: Math.round(insurable * employeeRate) / 100,
    employer: Math.round(insurable * employerRate) / 100
  };
}

export function calcVat(amount: number, rate = 15) {
  return Math.round(amount * rate) / 100;
}

export interface VatReturn {
  outputVat: number; // on sales
  inputVat: number; // on purchases
  netPayable: number;
}

export function computeVatReturn(
  salesNet: number,
  purchasesNet: number,
  rate = 15
): VatReturn {
  const outputVat = Math.round(salesNet * rate) / 100;
  const inputVat = Math.round(purchasesNet * rate) / 100;
  return { outputVat, inputVat, netPayable: Math.round((outputVat - inputVat) * 100) / 100 };
}

export function quarterOf(isoDate: string): string {
  const m = Number(isoDate.slice(5, 7));
  const q = Math.ceil(m / 3);
  return `${isoDate.slice(0, 4)}-Q${q}`;
}
