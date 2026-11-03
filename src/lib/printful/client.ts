import "server-only";
import { printfulToken } from "@/lib/env";
import type { PrintfulEnvelope } from "./types";

/** Overridable only for local testing against a mock server. */
const BASE_URL = process.env.PRINTFUL_API_BASE_URL?.trim() || "https://api.printful.com";
const TIMEOUT_MS = 15_000;
const MAX_RETRIES = 3;

export class PrintfulError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly path: string,
    readonly body?: unknown,
  ) {
    super(`Printful ${status} on ${path}: ${message}`);
    this.name = "PrintfulError";
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function retryDelayMs(attempt: number, res?: Response): number {
  const retryAfter = Number(res?.headers.get("retry-after"));
  if (Number.isFinite(retryAfter) && retryAfter > 0) return Math.min(retryAfter, 60) * 1000;
  return 500 * 2 ** attempt;
}

export interface PrintfulRequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  query?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
  /**
   * Retry on 429/5xx/network errors. Defaults to true for GET only.
   * NEVER enable for order creation: a retry after a timeout can create (and
   * print, and ship) a duplicate order. Order creation has its own idempotency.
   */
  retry?: boolean;
}

/** Low-level Printful v1 call. Returns the envelope so callers can read `paging`. */
export async function printfulRequest<T>(
  path: string,
  opts: PrintfulRequestOptions = {},
): Promise<PrintfulEnvelope<T>> {
  const { token, storeId } = printfulToken();
  const method = opts.method ?? "GET";
  const retry = opts.retry ?? method === "GET";

  const url = new URL(BASE_URL.replace(/\/$/, "") + path.replace(/^\/?/, "/"));
  for (const [k, v] of Object.entries(opts.query ?? {})) {
    if (v !== undefined) url.searchParams.set(k, String(v));
  }

  const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
  if (storeId) headers["X-PF-Store-Id"] = storeId;
  if (opts.body !== undefined) headers["Content-Type"] = "application/json";

  for (let attempt = 0; ; attempt++) {
    let res: Response | undefined;
    try {
      res = await fetch(url, {
        method,
        headers,
        body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
        signal: AbortSignal.timeout(TIMEOUT_MS),
        cache: "no-store", // caching is done one level up with 'use cache'
      });
    } catch (err) {
      if (retry && attempt < MAX_RETRIES) {
        await sleep(retryDelayMs(attempt));
        continue;
      }
      throw new PrintfulError(err instanceof Error ? err.message : String(err), 0, path);
    }

    if (retry && attempt < MAX_RETRIES && (res.status === 429 || res.status >= 500)) {
      console.warn(`[printful] ${res.status} on ${method} ${path}, retry ${attempt + 1}/${MAX_RETRIES}`);
      await sleep(retryDelayMs(attempt, res));
      continue;
    }

    let json: PrintfulEnvelope<T> | undefined;
    try {
      json = (await res.json()) as PrintfulEnvelope<T>;
    } catch {
      // fall through with json undefined
    }

    if (!res.ok || !json || json.code < 200 || json.code >= 300) {
      const msg =
        json?.error?.message ??
        (typeof json?.result === "string" ? (json.result as string) : undefined) ??
        res.statusText;
      throw new PrintfulError(msg || "Unknown error", json?.code ?? res.status, path, json);
    }
    return json;
  }
}

/** Run async work over items with bounded concurrency (Printful rate-limits per minute). */
export async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out = new Array<R>(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i]);
    }
  });
  await Promise.all(workers);
  return out;
}
