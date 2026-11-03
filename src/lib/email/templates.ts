import { brand } from "@/config/brand";
import { formatUsd } from "@/lib/money";

/**
 * Transactional email templates. Plain HTML strings with inline styles and a
 * plain-text twin — no build step, works in every client.
 *
 * Everything dynamic goes through esc(): product names and customer names are
 * user/merchant-controlled text.
 *
 * Templates must be DETERMINISTIC for the same input: Resend rejects a reused
 * idempotency key whose payload differs. No timestamps, no randomness.
 */

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

export const esc = (s: unknown) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const c = brand.colors;

function layout(preheader: string, body: string, siteUrl: string): string {
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${esc(brand.name)}</title></head>
<body style="margin:0;padding:0;background:${c.muted};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:${c.foreground};">
<span style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${c.muted};"><tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:${c.background};border-radius:8px;overflow:hidden;">
<tr><td style="background:${c.accent};padding:20px 28px;"><a href="${esc(siteUrl)}" style="color:#ffffff;font-size:20px;font-weight:800;text-decoration:none;letter-spacing:-0.3px;">${esc(brand.name)}</a></td></tr>
<tr><td style="padding:28px;font-size:15px;line-height:1.55;">${body}</td></tr>
<tr><td style="padding:20px 28px;border-top:1px solid ${c.border};font-size:12px;color:${c.mutedForeground};">
Questions? Reply to this email or write to <a href="mailto:${esc(brand.supportEmail)}" style="color:${c.mutedForeground};">${esc(brand.supportEmail)}</a>.<br>
<a href="${esc(siteUrl)}/shipping-returns" style="color:${c.mutedForeground};">Shipping &amp; returns</a> · <a href="${esc(siteUrl)}/privacy" style="color:${c.mutedForeground};">Privacy</a>
</td></tr>
</table></td></tr></table></body></html>`;
}

const button = (href: string, label: string) =>
  `<a href="${esc(href)}" style="display:inline-block;background:${c.primary};color:${c.primaryForeground};padding:12px 22px;border-radius:999px;font-weight:700;text-decoration:none;">${esc(label)}</a>`;

/** "Standard shipping" -> "Standard" so the row doesn't read "Shipping (Standard shipping)". */
const shortLabel = (label: string) => label.replace(/\s*shipping$/i, "") || label;

// ── Order confirmation ──────────────────────────────────────────────────────

export interface OrderConfirmationInput {
  ref: string;
  firstName: string | null;
  items: { description: string; quantity: number; amountCents: number }[];
  subtotalCents: number;
  shippingCents: number;
  taxCents: number;
  discountCents: number;
  totalCents: number;
  shippingLabel: string | null;
  shipTo: string | null;
}

export function orderConfirmationEmail(o: OrderConfirmationInput, siteUrl: string): RenderedEmail {
  const hi = o.firstName ? `Thanks, ${o.firstName}!` : "Thanks for your order!";
  const rows = o.items
    .map(
      (i) => `<tr><td style="padding:8px 0;border-bottom:1px solid ${c.border};">${esc(i.description)} <span style="color:${c.mutedForeground};">× ${i.quantity}</span></td><td align="right" style="padding:8px 0;border-bottom:1px solid ${c.border};white-space:nowrap;">${formatUsd(i.amountCents)}</td></tr>`,
    )
    .join("");
  const total = (label: string, cents: number, bold = false) =>
    `<tr><td style="padding:3px 0;${bold ? "font-weight:700;font-size:16px;" : `color:${c.mutedForeground};`}">${label}</td><td align="right" style="padding:3px 0;${bold ? "font-weight:700;font-size:16px;" : ""}">${formatUsd(cents)}</td></tr>`;

  const html = layout(
    `Order #${o.ref} confirmed — we're printing it now.`,
    `<h1 style="margin:0 0 8px;font-size:24px;">${esc(hi)}</h1>
<p style="margin:0 0 20px;">Your order <strong>#${esc(o.ref)}</strong> is confirmed. Every shirt is printed to order, so it usually ships within a few business days. We'll email you tracking as soon as it does.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;">${rows}</table>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;margin-top:12px;">
${total("Subtotal", o.subtotalCents)}
${o.discountCents ? `<tr><td style="padding:3px 0;color:${c.mutedForeground};">Discount</td><td align="right">−${formatUsd(o.discountCents)}</td></tr>` : ""}
${total(o.shippingLabel ? `Shipping (${esc(shortLabel(o.shippingLabel))})` : "Shipping", o.shippingCents)}
${total("Tax", o.taxCents)}
${total("Total", o.totalCents, true)}
</table>
${o.shipTo ? `<p style="margin:20px 0 0;color:${c.mutedForeground};font-size:14px;">Shipping to ${esc(o.shipTo)}.</p>` : ""}
<p style="margin:24px 0 0;">${button(`${siteUrl}/shop`, "Keep shopping")}</p>`,
    siteUrl,
  );

  const text = [
    hi,
    "",
    `Your order #${o.ref} is confirmed. Every shirt is printed to order, so it usually ships within a few business days. We'll email you tracking as soon as it does.`,
    "",
    ...o.items.map((i) => `${i.description} x ${i.quantity}  ${formatUsd(i.amountCents)}`),
    "",
    `Subtotal: ${formatUsd(o.subtotalCents)}`,
    ...(o.discountCents ? [`Discount: -${formatUsd(o.discountCents)}`] : []),
    `Shipping${o.shippingLabel ? ` (${shortLabel(o.shippingLabel)})` : ""}: ${formatUsd(o.shippingCents)}`,
    `Tax: ${formatUsd(o.taxCents)}`,
    `Total: ${formatUsd(o.totalCents)}`,
    ...(o.shipTo ? ["", `Shipping to ${o.shipTo}.`] : []),
    "",
    `Questions? Reply to this email or write to ${brand.supportEmail}.`,
  ].join("\n");

  return { subject: `Order #${o.ref} confirmed`, html, text };
}

// ── Shipping notification (step 7) ──────────────────────────────────────────

export interface ShipmentInput {
  ref: string;
  firstName: string | null;
  carrier: string | null;
  service: string | null;
  trackingNumber: string | null;
  trackingUrl: string | null;
  items: string[];
  /** True when Printful splits an order and this isn't the last package. */
  partial: boolean;
}

export function shipmentEmail(s: ShipmentInput, siteUrl: string): RenderedEmail {
  const hi = s.firstName ? `Good news, ${s.firstName}!` : "Good news!";
  const what = s.partial ? "Part of your order" : "Your order";
  const carrier = [s.carrier, s.service].filter(Boolean).join(" ");
  const html = layout(
    `${what} #${s.ref} has shipped.`,
    `<h1 style="margin:0 0 8px;font-size:24px;">${esc(hi)}</h1>
<p style="margin:0 0 16px;">${what} <strong>#${esc(s.ref)}</strong> is on its way${carrier ? ` with ${esc(carrier)}` : ""}.</p>
${s.trackingNumber ? `<p style="margin:0 0 16px;">Tracking number: <strong>${esc(s.trackingNumber)}</strong></p>` : ""}
${s.trackingUrl ? `<p style="margin:0 0 20px;">${button(s.trackingUrl, "Track your package")}</p>` : ""}
${s.items.length ? `<p style="margin:0 0 6px;font-weight:700;font-size:14px;">In this package</p><ul style="margin:0;padding-left:18px;font-size:14px;">${s.items.map((i) => `<li>${esc(i)}</li>`).join("")}</ul>` : ""}
${s.partial ? `<p style="margin:16px 0 0;font-size:14px;color:${c.mutedForeground};">The rest of your order will ship separately — we'll email you again.</p>` : ""}`,
    siteUrl,
  );
  const text = [
    hi,
    "",
    `${what} #${s.ref} is on its way${carrier ? ` with ${carrier}` : ""}.`,
    ...(s.trackingNumber ? [`Tracking number: ${s.trackingNumber}`] : []),
    ...(s.trackingUrl ? [`Track it: ${s.trackingUrl}`] : []),
    ...(s.items.length ? ["", "In this package:", ...s.items.map((i) => `- ${i}`)] : []),
    ...(s.partial ? ["", "The rest of your order will ship separately — we'll email you again."] : []),
    "",
    `Questions? Reply to this email or write to ${brand.supportEmail}.`,
  ].join("\n");
  return { subject: `${what} #${s.ref} has shipped`, html, text };
}

// ── Admin alerts ─────────────────────────────────────────────────────────────

export function adminEmail(subject: string, ref: string, details: Record<string, unknown>): RenderedEmail {
  const rows = Object.entries(details)
    .map(([k, v]) => {
      const value = Array.isArray(v) ? v.join("\n") : typeof v === "object" && v !== null ? JSON.stringify(v, null, 2) : String(v);
      return [k, value] as const;
    })
    .sort(([a], [b]) => (a === "action" ? -1 : b === "action" ? 1 : 0)); // action first
  const html = `<!DOCTYPE html><html><body style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;font-size:14px;color:#111;">
<h2 style="margin:0 0 12px;">${esc(subject)}</h2>
<p style="margin:0 0 12px;">Order ref: <strong>${esc(ref)}</strong></p>
<table cellpadding="6" cellspacing="0" style="border-collapse:collapse;">${rows
    .map(([k, v]) => `<tr><td style="vertical-align:top;font-weight:700;border-bottom:1px solid #eee;">${esc(k)}</td><td style="border-bottom:1px solid #eee;white-space:pre-wrap;">${esc(v)}</td></tr>`)
    .join("")}</table>
<p style="color:#666;margin-top:16px;">Find it in Stripe: search <code>metadata['order_ref']:'${esc(ref)}'</code>. In Printful: order external ID ${esc(ref)}.</p>
</body></html>`;
  const text = [subject, "", `Order ref: ${ref}`, "", ...rows.map(([k, v]) => `${k}: ${v}`), "", `Stripe search: metadata['order_ref']:'${ref}'`].join("\n");
  return { subject: `[${brand.name}] ${subject}`, html, text };
}
