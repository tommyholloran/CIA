import { timingSafeEqual } from "node:crypto";
import { revalidateTag } from "next/cache";
import { CATALOG_CACHE_TAG } from "@/config/catalog";
import { revalidateEnv } from "@/lib/env";

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

/**
 * POST /api/revalidate
 * Authorization: Bearer <REVALIDATE_SECRET>
 *
 * Marks the Printful catalog stale. The next visit to any catalog page serves
 * the cached version once while it refetches in the background; visits after
 * that see the new data.
 */
export async function POST(request: Request) {
  let secret: string;
  try {
    secret = revalidateEnv().REVALIDATE_SECRET;
  } catch (err) {
    console.error("[revalidate]", (err as Error).message);
    return Response.json({ ok: false, error: "Revalidation is not configured" }, { status: 500 });
  }

  const auth = request.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (!token || !safeEqual(token, secret)) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  revalidateTag(CATALOG_CACHE_TAG, "max");
  console.info("[revalidate] catalog tag invalidated");
  return Response.json({ ok: true, revalidated: CATALOG_CACHE_TAG });
}
