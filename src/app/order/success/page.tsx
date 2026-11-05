import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import type Stripe from "stripe";
import { brand } from "@/config/brand";
import { orderRef } from "@/lib/checkout/order-ref";
import { formatUsd } from "@/lib/money";
import { isCheckoutSessionId, stripe } from "@/lib/stripe";
import { ClearCartOnMount } from "@/components/cart/clear-cart";

export const metadata: Metadata = {
  title: "Order confirmed",
  robots: { index: false, follow: false },
};

export default function OrderSuccessPage({ searchParams }: PageProps<"/order/success">) {
  return (
    <div className="mx-auto max-w-xl px-4 py-12 sm:py-16">
      <Suspense fallback={<p className="text-muted-foreground">Loading your order…</p>}>
        <OrderSummary searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function OrderSummary({ searchParams }: { searchParams: PageProps<"/order/success">["searchParams"] }) {
  const raw = (await searchParams).session_id;
  const sessionId = Array.isArray(raw) ? raw[0] : raw;
  if (!isCheckoutSessionId(sessionId)) return <NotFoundMessage />;

  let session: Stripe.Checkout.Session;
  try {
    session = await stripe().checkout.sessions.retrieve(sessionId, { expand: ["line_items"] });
  } catch (err) {
    console.error(`[order/success] could not retrieve ${sessionId}:`, (err as Error).message);
    return <NotFoundMessage />;
  }

  if (session.status !== "complete") {
    return (
      <div>
        <h1 className="font-display text-4xl uppercase leading-none sm:text-5xl">Payment not completed</h1>
        <p className="mt-3 text-muted-foreground">
          This checkout wasn&apos;t completed, so you haven&apos;t been charged. Your cart is still saved.
        </p>
        <Link href="/shop" className="mt-6 inline-block underline">
          Back to the shop
        </Link>
      </div>
    );
  }

  const firstName = (session.collected_information?.shipping_details?.name ?? session.customer_details?.name ?? "")
    .split(" ")[0];
  const email = session.customer_details?.email;
  const ship = session.collected_information?.shipping_details?.address;
  const lines = session.line_items?.data ?? [];
  const totals = session.total_details;

  return (
    <div>
      <ClearCartOnMount />
      <p className="text-sm font-semibold uppercase tracking-wide text-brand-primary">Order confirmed</p>
      <h1 className="mt-2 font-display text-4xl uppercase leading-none sm:text-5xl">Thank you{firstName ? `, ${firstName}` : ""}!</h1>
      <p className="mt-3 text-muted-foreground">
        Your order <strong className="text-foreground">#{orderRef(session.id)}</strong> is in.
        {email ? (
          <>
            {" "}
            We&apos;ll email <strong className="text-foreground">{email}</strong> a confirmation and tracking details when it ships.
          </>
        ) : null}
      </p>

      <h2 className="mt-10 text-sm font-semibold">Items</h2>
      <ul className="mt-3 divide-y divide-border border-y border-border">
        {lines.map((li) => (
          <li key={li.id} className="flex justify-between gap-4 py-3 text-sm">
            <span>
              {li.description} <span className="text-muted-foreground">× {li.quantity}</span>
            </span>
            <span className="shrink-0">{formatUsd(li.amount_subtotal)}</span>
          </li>
        ))}
      </ul>

      <dl className="mt-4 space-y-1 text-sm">
        <Row label="Subtotal" value={formatUsd(session.amount_subtotal ?? 0)} />
        <Row label="Shipping" value={formatUsd(totals?.amount_shipping ?? 0)} />
        <Row label="Tax" value={formatUsd(totals?.amount_tax ?? 0)} />
        {totals?.amount_discount ? <Row label="Discount" value={`−${formatUsd(totals.amount_discount)}`} /> : null}
        <div className="flex justify-between border-t border-border pt-2 text-base font-semibold">
          <dt>Total</dt>
          <dd>{formatUsd(session.amount_total ?? 0)}</dd>
        </div>
      </dl>

      {ship && (
        <p className="mt-8 text-sm text-muted-foreground">
          Shipping to {[ship.city, ship.state].filter(Boolean).join(", ")}. Most orders ship within a few business days.
        </p>
      )}

      <p className="mt-8 text-sm text-muted-foreground">
        Questions? Email <a className="underline" href={`mailto:${brand.supportEmail}`}>{brand.supportEmail}</a> with your
        order number.
      </p>
      <Link
        href="/shop"
        className="mt-8 inline-block rounded-full bg-brand-primary px-6 py-3 font-semibold text-brand-primary-foreground"
      >
        Keep shopping
      </Link>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-muted-foreground">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function NotFoundMessage() {
  return (
    <div>
      <h1 className="font-display text-4xl uppercase leading-none sm:text-5xl">We couldn&apos;t find that order</h1>
      <p className="mt-3 text-muted-foreground">
        If you just paid, check your email for a confirmation, or contact{" "}
        <a className="underline" href={`mailto:${brand.supportEmail}`}>
          {brand.supportEmail}
        </a>
        .
      </p>
    </div>
  );
}
