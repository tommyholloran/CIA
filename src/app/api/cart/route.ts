import { getCatalog } from "@/lib/catalog";
import { cartRequestSchema, validateCart } from "@/lib/cart/validate";

/**
 * POST /api/cart  { items: [{ variantId, quantity }] }
 * Returns authoritative prices/availability for the drawer. Read-only, no side effects.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = cartRequestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid cart", details: parsed.error.issues.slice(0, 5) }, { status: 400 });
  }

  try {
    const result = validateCart(parsed.data.items, await getCatalog());
    return Response.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("[api/cart] catalog unavailable:", err);
    return Response.json({ error: "Catalog temporarily unavailable" }, { status: 503 });
  }
}
