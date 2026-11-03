#!/usr/bin/env node
/**
 * Register (or show) this store's Printful webhook.
 *
 *   PRINTFUL_API_TOKEN=… PRINTFUL_WEBHOOK_SECRET=… node scripts/register-printful-webhook.mjs https://yourdomain.com
 *   PRINTFUL_API_TOKEN=… node scripts/register-printful-webhook.mjs --show
 *
 * Printful v1 allows ONE webhook URL per store: registering REPLACES any
 * existing configuration. Run --show first if something else might be using it.
 * Add PRINTFUL_STORE_ID=… if your token can access more than one store.
 */
const token = process.env.PRINTFUL_API_TOKEN;
const secret = process.env.PRINTFUL_WEBHOOK_SECRET;
const storeId = process.env.PRINTFUL_STORE_ID;
const arg = process.argv[2];

// Keep in sync with SUBSCRIBED_EVENTS in src/lib/fulfillment/printful-events.ts
const TYPES = ["package_shipped", "order_failed", "order_canceled", "order_put_hold", "package_returned", "product_synced", "stock_updated"];

if (!token) {
  console.error("Set PRINTFUL_API_TOKEN.");
  process.exit(1);
}
const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...(storeId ? { "X-PF-Store-Id": storeId } : {}) };
const redact = (s) => String(s ?? "").replace(/secret=[^&\s"]+/g, "secret=***");

async function call(method, body) {
  const res = await fetch("https://api.printful.com/webhooks", { method, headers, body: body ? JSON.stringify(body) : undefined });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error(`Printful ${res.status}:`, json?.error?.message ?? json?.result ?? res.statusText);
    process.exit(1);
  }
  return json.result;
}

if (!arg || arg === "--show") {
  const current = await call("GET");
  console.log("Current webhook config:", redact(JSON.stringify(current, null, 2)));
  process.exit(0);
}

if (!secret || secret.length < 32) {
  console.error("Set PRINTFUL_WEBHOOK_SECRET (at least 32 characters; generate with: openssl rand -hex 32).");
  process.exit(1);
}
let base;
try {
  base = new URL(arg);
} catch {
  console.error(`Not a URL: ${arg}`);
  process.exit(1);
}
if (base.protocol !== "https:") {
  console.error("Use an https:// URL (Printful must reach it from the internet).");
  process.exit(1);
}

const url = `${base.origin}/api/webhooks/printful?secret=${encodeURIComponent(secret)}`;
const result = await call("POST", { url, types: TYPES });
console.log("Registered:", redact(JSON.stringify(result, null, 2)));
