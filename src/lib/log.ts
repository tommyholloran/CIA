/**
 * Structured one-line JSON logs — searchable in Vercel's log viewer
 * (e.g. filter by `"scope":"stripe-webhook"` or an order ref).
 * Never log full addresses, card data or secrets.
 */
type Level = "info" | "warn" | "error";

export function log(level: Level, scope: string, msg: string, data: Record<string, unknown> = {}) {
  const line = JSON.stringify({ level, scope, msg, ...data, t: new Date().toISOString() });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.info(line);
}

export const errMessage = (err: unknown) => (err instanceof Error ? err.message : String(err));
