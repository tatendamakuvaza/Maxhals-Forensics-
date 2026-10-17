const finite = (n: number) => (Number.isFinite(n) ? (n === 0 ? 0 : n) : 0);

export const fmtUSD = (n: number, decimals = 2) =>
  `$${finite(n).toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;

export const fmtCompact = (n: number) => {
  const safe = finite(n);
  const abs = Math.abs(safe);
  const sign = safe < 0 ? "-" : "";
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(1)}K`;
  return `${sign}$${abs.toFixed(0)}`;
};

export const fmtPct = (n: number, d = 1) => `${finite(n).toFixed(d)}%`;

/** Percentage of a whole, safely returning 0 when the denominator is zero. */
export const pct = (part: number, whole: number) => (whole === 0 || !Number.isFinite(whole) ? 0 : (part / whole) * 100);

export const fmtDate = (iso: string) =>
  new Date(iso + "T00:00:00").toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

export const monthLabel = (iso: string) =>
  new Date(iso + "T00:00:00").toLocaleDateString("en-US", { month: "short", year: "2-digit" });

export const classNames = (...c: (string | false | undefined | null)[]) => c.filter(Boolean).join(" ");
