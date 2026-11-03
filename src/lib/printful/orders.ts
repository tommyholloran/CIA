import "server-only";
import { PrintfulError, printfulRequest } from "./client";

/** POST /orders body (sync-product orders). Field names per Printful's official SDK. */
export interface PrintfulOrderRequest {
  external_id: string;
  shipping: string;
  recipient: {
    name: string;
    address1: string;
    address2?: string;
    city: string;
    state_code: string;
    country_code: string;
    zip: string;
    phone?: string;
    email?: string;
  };
  items: { sync_variant_id: number; quantity: number; retail_price: string; name?: string }[];
  retail_costs?: { currency: string; discount: string; shipping: string; tax: string };
}

export interface PrintfulShipment {
  id: number;
  carrier: string | null;
  service: string | null;
  tracking_number: string | null;
  tracking_url: string | null;
  ship_date?: string | null;
  reshipment?: boolean;
  items: { item_id: number; quantity: number }[];
}

export interface PrintfulOrder {
  id: number;
  external_id: string | null;
  /** draft | pending | failed | canceled | inprocess | onhold | partial | fulfilled */
  status: string;
  shipping?: string;
  recipient?: { name?: string; email?: string | null };
  items?: { id: number; name?: string | null; quantity: number }[];
  shipments?: PrintfulShipment[];
  created?: number;
}

/** null when the order doesn't exist (or isn't in this store). */
export async function getOrderById(id: number): Promise<PrintfulOrder | null> {
  try {
    return (await printfulRequest<PrintfulOrder>(`/orders/${id}`)).result;
  } catch (err) {
    if (err instanceof PrintfulError && err.status === 404) return null;
    throw err;
  }
}

/** null when Printful has no order with this external_id. */
export async function getOrderByExternalId(externalId: string): Promise<PrintfulOrder | null> {
  try {
    const res = await printfulRequest<PrintfulOrder>(`/orders/@${encodeURIComponent(externalId)}`);
    return res.result;
  } catch (err) {
    if (err instanceof PrintfulError && err.status === 404) return null;
    throw err;
  }
}

/**
 * Create an order. NEVER retried here: a timed-out create may have landed, and
 * the caller recovers by looking the order up by external_id instead.
 * confirm=false leaves it as a draft for manual review in the Printful dashboard.
 */
export async function createOrder(body: PrintfulOrderRequest, confirm: boolean): Promise<PrintfulOrder> {
  const res = await printfulRequest<PrintfulOrder>("/orders", {
    method: "POST",
    query: confirm ? { confirm: 1 } : undefined,
    body,
    retry: false,
  });
  return res.result;
}
