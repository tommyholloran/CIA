#!/usr/bin/env node
/**
 * Tiny mock of the Printful v1 endpoints this app reads, for local testing
 * without a Printful account.
 *
 *   node scripts/mock-printful.mjs            # listens on :4010
 *   PRINTFUL_API_BASE_URL=http://localhost:4010 PRINTFUL_API_TOKEN=mock npm run dev
 *
 * Fixture shapes follow Printful's official PHP SDK structures. The first
 * request to /store/products returns 429 once, to exercise the retry path.
 *
 * Orders (in memory, reset on restart):
 *   GET  /orders/@{external_id}    404 if unknown
 *   POST /orders[?confirm=1]       rejects a duplicate external_id with 400, like Printful
 *   GET  /__orders                 debug: list everything created
 * Set MOCK_ORDER_FAIL=400|500 to make the next POST /orders fail once.
 */
import { createServer } from "node:http";

const PORT = Number(process.env.PORT || 4010);
const IMG = "https://files.cdn.printful.com/o/upload/product-catalog-img";

const colors = [
  { name: "Black", hex: "#0b0b0b" },
  { name: "Navy", hex: "#212642" },
  { name: "White", hex: "#ffffff" },
];
const sizes = ["S", "M", "L", "XL", "2XL"];

function syncVariant(spId, spName, i, color, size, price, extra = {}) {
  const id = spId * 100 + i;
  const catalogId = 4000 + i;
  return {
    id,
    external_id: `ext-${id}`,
    sync_product_id: spId,
    name: `${spName} / ${color} / ${size}`,
    synced: true,
    variant_id: catalogId,
    retail_price: price,
    currency: "USD",
    is_ignored: false,
    sku: `SKU-${id}`,
    size,
    color,
    availability_status: "active",
    product: { variant_id: catalogId, product_id: 71, image: `${IMG}/blank-${color}.jpg`, name: `Bella + Canvas 3001 (${color} / ${size})` },
    files: [
      { id: 1, type: "default", url: "https://example.com/print.png", visible: true },
      { id: 2, type: "preview", preview_url: `${IMG}/mock-${spId}-${color}.png`, thumbnail_url: `${IMG}/thumb-${spId}-${color}.png`, visible: true },
    ],
    ...extra,
  };
}

function buildProduct(id, name, variantFn) {
  const variants = [];
  let i = 0;
  for (const c of colors) for (const s of sizes) variants.push(variantFn(i++, c.name, s));
  return {
    sync_product: { id, external_id: `sp-${id}`, name, variants: variants.length, synced: variants.length, thumbnail_url: `${IMG}/thumb-${id}.png`, is_ignored: false },
    sync_variants: variants,
  };
}

const products = [
  buildProduct(11, "Crazy Ivan Logo Tee", (i, c, s) =>
    syncVariant(11, "Crazy Ivan Logo Tee", i, c, s, s === "2XL" ? "31.00" : "28.00"),
  ),
  buildProduct(12, "Army Crest Tee", (i, c, s) =>
    syncVariant(12, "Army Crest Tee", i, c, s, "30.00", c === "White" && s === "M" ? { availability_status: "out_of_stock" } : {}),
  ),
  // Ignored in Printful: must not appear in the store.
  { ...buildProduct(13, "Hidden Test Tee", (i, c, s) => syncVariant(13, "Hidden Test Tee", i, c, s, "25.00")), ignored: true },
];
products[2].sync_product.is_ignored = true;

let served429 = false;
const orders = new Map();
let nextOrderId = 5000;
let failNextOrder = process.env.MOCK_ORDER_FAIL ? Number(process.env.MOCK_ORDER_FAIL) : 0;

const send = (res, status, body) => {
  res.writeHead(status, { "content-type": "application/json", ...(status === 429 ? { "retry-after": "1" } : {}) });
  res.end(JSON.stringify(body));
};

createServer(async (req, res) => {
  let raw = "";
  for await (const chunk of req) raw += chunk;
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const auth = req.headers.authorization ?? "";
  console.log(req.method, url.pathname + url.search);
  if (!auth.startsWith("Bearer ")) return send(res, 401, { code: 401, result: "Unauthorized", error: { reason: "Unauthorized", message: "Missing token" } });

  if (url.pathname === "/store/products") {
    if (!served429) {
      served429 = true;
      return send(res, 429, { code: 429, result: "Too many requests", error: { reason: "TooManyRequests", message: "Rate limited" } });
    }
    const list = products.map((p) => p.sync_product);
    const offset = Number(url.searchParams.get("offset") || 0);
    const limit = Number(url.searchParams.get("limit") || 20);
    return send(res, 200, { code: 200, result: list.slice(offset, offset + limit), paging: { total: list.length, offset, limit } });
  }

  let m = /^\/store\/products\/(\d+)$/.exec(url.pathname);
  if (m) {
    const p = products.find((x) => x.sync_product.id === Number(m[1]));
    return p
      ? send(res, 200, { code: 200, result: { sync_product: p.sync_product, sync_variants: p.sync_variants } })
      : send(res, 404, { code: 404, result: "Not found", error: { reason: "NotFound", message: "Not found" } });
  }

  m = /^\/products\/variant\/(\d+)$/.exec(url.pathname);
  if (m) {
    const i = Number(m[1]) - 4000;
    const color = colors[Math.floor(i / sizes.length)];
    if (!color) return send(res, 404, { code: 404, result: "Not found", error: { reason: "NotFound", message: "Not found" } });
    return send(res, 200, {
      code: 200,
      result: {
        variant: { id: Number(m[1]), product_id: 71, size: sizes[i % sizes.length], color: color.name, color_code: color.hex, image: `${IMG}/blank-${color.name}.jpg` },
        product: { id: 71, title: "Bella + Canvas 3001", brand: "Bella + Canvas", model: "3001", description: "Soft, lightweight 100% combed ring-spun cotton.\n• Retail fit\n• Side-seamed" },
      },
    });
  }

  if (url.pathname === "/__orders") return send(res, 200, { code: 200, result: [...orders.values()] });

  m = /^\/orders\/@(.+)$/.exec(url.pathname);
  if (m && req.method === "GET") {
    const o = orders.get(decodeURIComponent(m[1]));
    return o ? send(res, 200, { code: 200, result: o }) : send(res, 404, { code: 404, result: "Not found", error: { reason: "NotFound", message: "Order not found" } });
  }

  if (url.pathname === "/orders" && req.method === "POST") {
    if (failNextOrder) {
      const status = failNextOrder;
      failNextOrder = 0;
      return send(res, status, { code: status, result: "Mock failure", error: { reason: "Mock", message: `Mock failure ${status}` } });
    }
    const body = JSON.parse(raw || "{}");
    if (!body.external_id || !/^[A-Za-z0-9_-]{1,32}$/.test(body.external_id)) {
      return send(res, 400, { code: 400, result: "Invalid external_id", error: { reason: "BadRequest", message: "external_id must be 1-32 chars [A-Za-z0-9_-]" } });
    }
    if (orders.has(body.external_id)) {
      return send(res, 400, { code: 400, result: "Duplicate", error: { reason: "BadRequest", message: `Order with External ID ${body.external_id} already exists` } });
    }
    const known = new Set(products.flatMap((p) => p.sync_variants.map((v) => v.id)));
    const bad = (body.items || []).find((i) => !known.has(i.sync_variant_id));
    if (bad) return send(res, 400, { code: 400, result: "Bad item", error: { reason: "BadRequest", message: `Unknown sync_variant_id ${bad.sync_variant_id}` } });
    const order = { id: nextOrderId++, external_id: body.external_id, status: url.searchParams.get("confirm") === "1" ? "pending" : "draft", shipping: body.shipping, recipient: body.recipient, items: body.items, retail_costs: body.retail_costs, created: Math.floor(Date.now() / 1000) };
    orders.set(body.external_id, order);
    return send(res, 200, { code: 200, result: order });
  }

  send(res, 404, { code: 404, result: "Not found", error: { reason: "NotFound", message: `No mock for ${url.pathname}` } });
}).listen(PORT, () => console.log(`mock Printful on http://localhost:${PORT}`));
