const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

/** Format integer cents as "$12.34". */
export const formatUsd = (cents: number) => usd.format(cents / 100);

/**
 * Parse a decimal string like "24.95" into integer cents without float drift.
 * Returns null for anything that isn't a non-negative decimal with ≤2 places.
 */
export function toCents(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  const s = String(value).trim();
  const m = /^(\d+)(?:\.(\d{1,2}))?$/.exec(s);
  if (!m) return null;
  return Number(m[1]) * 100 + Number((m[2] ?? "").padEnd(2, "0"));
}
