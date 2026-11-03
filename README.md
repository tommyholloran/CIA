# T-shirt store

Direct-to-consumer storefront: Next.js 16 (App Router), Stripe Checkout + Stripe Tax, Printful (catalog and fulfilment), Resend (email). Deploys to Vercel. No database: Stripe Checkout Session metadata and the Printful order `external_id` link each order across systems.

**Before launch, work through the [launch checklist](#launch-checklist) at the bottom.**

## Local setup

Requirements: Node 20.9+ (22 LTS recommended), npm.

```bash
npm install
cp .env.example .env.local   # fill in values; see comments in the file
npm run dev                  # http://localhost:3000
```

The site renders without any secrets. Each integration only checks its own env vars when it is first used, and fails with a clear `[env] … misconfigured` error if they're missing.

Useful scripts:

```bash
npm test            # unit tests (vitest)
npm run typecheck   # generates Next route types, then runs tsc
npm run lint
```

## Where to change things

| What | File |
| --- | --- |
| Brand name, copy, colors, logo | `src/config/brand.ts`. Put the logo file in `public/` and set `brand.logo`; light-on-dark, because the header is navy |
| Favicon / home-screen icon / social share image | `src/app/icon.svg`, `src/app/apple-icon.tsx`, `src/app/opengraph-image.tsx`. Placeholder star mark until there's a logo |
| Fonts | `src/config/fonts.ts` |
| Featured products on the home page | `src/config/catalog.ts` |
| Shipping rates, allowed countries, order limits | `src/config/shipping.ts` |
| Static page copy | `src/app/(static)/*/page.tsx` |

## Brand & trademark

- **Display font:** [Alfa Slab One](https://fonts.google.com/specimen/Alfa+Slab+One), a free heavy athletic slab (SIL Open Font License; license in `src/assets/fonts/`). Used for the wordmark and all headings. **Body font:** Figtree, standing in for Proxima Nova (see `src/config/fonts.ts`).
- **Wordmark:** `src/components/wordmark.tsx` sets "CRAZY IVAN ARMY" in the display font, with the red star. It's set **straight, solid-filled, with no contrasting outline**, on purpose.
- **Keep it that way.** The colors are the University of Arizona's official Arizona Red and Arizona Blue. Combining those exact colors with Arizona-style jersey lettering (arched, red letters with navy outline) on apparel is the kind of resemblance university licensing offices act on. If "Crazy Ivan" refers to a real athlete, selling merch with it also needs that athlete's NIL agreement. Get a trademark attorney's sign-off before launch.

## Catalog (Printful)

Products come from your Printful store's **sync products** (`GET /store/products` → `GET /store/products/{id}`), plus one catalog lookup per blank and color for swatch hex codes and the fabric description.

- **What shows up:** sync products that aren't ignored, and only their variants that are synced, not ignored, priced in USD and have a retail price. A product with no such variants is hidden. Variants Printful reports as `out_of_stock`, `temporary_out_of_stock` or `discontinued` show as sold out; any status the code doesn't recognize counts as available.
- **Price** is each sync variant's **retail price** in Printful. Change prices in Printful, not here.
- **URLs** look like `/shop/{name}-{printful-id}`. The id is what's matched, so renaming a product in Printful sends the old URL to the new one with a 308 redirect.
- **Caching:** the whole catalog is one cached entry: `'use cache'` with `cacheLife('hours')` (refreshes in the background after 1 hour, expires after 1 day without traffic) and tag `catalog`. Every product page is prerendered at build time; products added later render on first visit and are then cached.
- **Without `PRINTFUL_API_TOKEN`** the catalog is empty and the site still builds. **With a token, any Printful API error fails the build** rather than deploying an empty store.

### Refresh the catalog now

After editing products or prices in Printful:

```bash
curl -X POST https://yourdomain.com/api/revalidate \
  -H "Authorization: Bearer $REVALIDATE_SECRET"
```

The next visitor still gets the cached page while it refetches in the background; everyone after that sees the update.

### Developing without a Printful account

A mock of the endpoints above, with three products (one is ignored, one has an out-of-stock size), lives in `scripts/mock-printful.mjs`:

```bash
node scripts/mock-printful.mjs
```

```bash
PRINTFUL_API_BASE_URL=http://localhost:4010 PRINTFUL_API_TOKEN=mock npm run dev
```

Mock image URLs don't resolve, so images show as broken. Never set `PRINTFUL_API_BASE_URL` in Vercel.

## Cart

- Stored in the browser's `localStorage` under `cia-cart`; tabs stay in sync. Corrupt or old-format data resets to an empty cart rather than crashing. If storage is blocked (some private modes), the cart works until the tab closes.
- Each line stores the variant id and quantity, plus a display snapshot (name, color, size, image, price) so the drawer opens instantly.
- **Prices are never trusted from the browser.** When the drawer opens, it sends only `{ variantId, quantity }` to `POST /api/cart`, which re-prices each line from the cached catalog. Removed products, sold-out variants, price changes and quantity limits come back as messages shown in the drawer. Checkout (step 4) runs the same validation (`src/lib/cart/validate.ts`).
- Limits: `MAX_QTY_PER_LINE` and `MAX_LINES_PER_ORDER` in `src/config/shipping.ts`, enforced in the browser and again on the server.

## Checkout (Stripe)

The drawer's **Checkout** button calls `POST /api/checkout` with `{ variantId, quantity }` only. The server:

1. Re-prices the cart from the catalog. If anything changed (item removed, sold out, quantity over the limit), it returns **409** with the corrected cart, and the drawer asks the customer to review before trying again. A different order is never charged silently.
2. Creates a hosted Stripe Checkout Session with:
   - one line item per variant at the catalog price, in USD, tax-exclusive, with tax code `PRODUCT_TAX_CODE`
   - shipping address collection for the US only, and an optional phone number (`COLLECT_PHONE`)
   - the flat rates from `SHIPPING_OPTIONS`. Delivery estimates shown to the customer are **print time + transit** (`PRODUCTION_DAYS` + `transitBusinessDays`).
   - `automatic_tax: { enabled: true }`
   - metadata linking the order to Printful: `metadata.cart = "1100x2,1104x1"`, each product's `variant_id`, and each shipping rate's `option_id`
3. Redirects to Stripe. Success returns to `/order/success?session_id=…`. Cancel returns to `/shop?checkout=canceled`, which reopens the cart.

The success page reads the session from Stripe on the server, shows the order number (`#` + the last 10 characters of the session id), items and totals, and then clears the cart. It shows only the city and state, not the full address, because the URL ends up in browser history. It is `noindex`.

### One-time Stripe setup

1. **Turn on Stripe Tax:** Dashboard → Tax → set up. Add your head-office address. **Without this, every checkout fails.**
2. **Add tax registrations** for each state where you're registered to collect sales tax. **Stripe Tax collects nothing in states with no registration**, so tax shows as $0 there. Use Stripe's threshold monitoring to see when you need to register in a new state.
3. **Check the product tax code.** `PRODUCT_TAX_CODE` (`txcd_30011000`, general clothing) in `src/config/shipping.ts` couldn't be verified while building. Confirm it under Dashboard → Tax → Product tax codes.
4. Settings → Branding: set your logo and colors so the hosted checkout page matches the site.
5. Put `STRIPE_SECRET_KEY` (`sk_test_…`) in `.env.local`.

### Test a purchase

Use test card `4242 4242 4242 4242`, any future expiry, any CVC, and a real US address so tax is calculated. Try both shipping options, then check the success page and the payment under Dashboard → Payments (test mode). The metadata on the payment should show `cart`.

## Fulfilment: Stripe webhook → Printful order

`POST /api/webhooks/stripe` handles:

| Event | Action |
| --- | --- |
| `checkout.session.completed` | Fulfil if `payment_status` is `paid` (card payments) |
| `checkout.session.async_payment_succeeded` | Fulfil (delayed payment methods) |
| `checkout.session.async_payment_failed` | Log only |
| anything else | 200, ignored |

What happens for a paid session:

1. **Verify the signature** against the raw body using `STRIPE_WEBHOOK_SECRET`. Failure → 400.
2. **Fetch the session fresh from Stripe**, with all line items (paged, not the 10-item expansion) and the chosen shipping rate.
3. **Build the Printful order** from what was actually paid for: `sync_variant_id` from each line item's product metadata, cross-checked against `metadata.cart`. Shipping method comes from the rate's `option_id` mapped to `printfulShipping`, and the recipient from the collected shipping address, email and phone.
4. **One order, no matter how many deliveries.** `external_id` is the order ref: a 12-character hash of the session id. (Printful caps `external_id` at 32 characters, `[A-Za-z0-9_-]`; a Stripe session id is ~66 characters and doesn't fit.) The webhook looks the order up by `external_id` first and creates it only if it's missing. Creates are **never retried blindly**. After any failed create it looks the order up again, so a timeout that actually landed, or a concurrent delivery that won the race, is treated as success.
5. `PRINTFUL_AUTO_CONFIRM=false` creates a **draft** (nothing prints until you confirm it in Printful), and you get a "New DRAFT order" notice. **Test-mode payments always create drafts**, even with `PRINTFUL_AUTO_CONFIRM=true`.
6. Write `order_ref` and `printful_order_id` to the Stripe PaymentIntent metadata. Search Stripe for the ref a customer quotes with `metadata['order_ref']:'N3TMA3S6F3YV'`.
7. Send the customer confirmation email (step 6).

Errors:

| Situation | Response | Result |
| --- | --- | --- |
| Stripe or Printful temporarily unreachable, 5xx, timeout with no order | **500** | Stripe redelivers with backoff for up to 3 days; safe because of step 4 |
| Printful rejects the order (bad address, invalid shipping method…) | 200 | Admin alert with the reason; the customer still gets a receipt. Fix it and create the order manually, or refund |
| Session can't be mapped (missing metadata, non-US address…) | 200 | Admin alert, as above |
| Event mode (test/live) doesn't match the `STRIPE_SECRET_KEY` mode | 200 | Ignored and logged as an error. It should never happen; it means misconfigured endpoints |

Logs are one-line JSON with `scope` (`stripe-webhook`, `fulfill`, `notify`) and the order `ref`. In Vercel → Logs, search for the ref.

### Check Printful's shipping method ids before launch

`printfulShipping` in `src/config/shipping.ts` must be ids Printful accepts. `STANDARD` is confirmed. **`EXPRESS` for expedited was not verifiable** while building. List what Printful offers for a real address and one of your variants:

```bash
curl -s https://api.printful.com/shipping/rates \
  -H "Authorization: Bearer $PRINTFUL_API_TOKEN" -H "Content-Type: application/json" \
  -d '{"recipient":{"country_code":"US","state_code":"AZ","zip":"85701"},"items":[{"variant_id":4012,"quantity":1}]}'
```

`variant_id` here is the **catalog** variant id (`catalog_variant_id` in Stripe metadata). Use the `id` values from the response. If the expedited id is wrong, Printful rejects those orders and you get an admin alert for each.

## Testing webhooks locally with the Stripe CLI

1. Install the CLI (https://docs.stripe.com/stripe-cli) and log in:
   ```bash
   stripe login
   ```
2. Forward events to your dev server. It prints a signing secret (`whsec_…`); put that in `.env.local` as `STRIPE_WEBHOOK_SECRET` and restart `npm run dev`:
   ```bash
   stripe listen --events checkout.session.completed,checkout.session.async_payment_succeeded,checkout.session.async_payment_failed --forward-to localhost:3000/api/webhooks/stripe
   ```
3. Make a test purchase through the site (card `4242 4242 4242 4242`). Don't use `stripe trigger checkout.session.completed`: triggered sessions have no `cart` metadata or line-item `variant_id`, so they correctly fail with an "order_build_failed" alert.
4. Check:
   - the `stripe listen` terminal shows `200`
   - the dev server log shows `"msg":"Printful order created"` with a `ref`
   - Printful → Orders shows a **draft** with that external id
   - the payment in the Stripe Dashboard has `order_ref` metadata
5. Test idempotency: in the Stripe Dashboard, open the event (Developers → Events) and click **Resend**. The log should say `already exists; not creating again`, and Printful should still show one order.

Without a Printful account, run `node scripts/mock-printful.mjs` and add `PRINTFUL_API_BASE_URL=http://localhost:4010 PRINTFUL_API_TOKEN=mock`. The mock implements orders too; see what was created at `http://localhost:4010/__orders` (send any `Authorization: Bearer …` header).

## Emails (Resend)

| Email | To | When | Idempotency key |
| --- | --- | --- | --- |
| Order confirmed | customer | Stripe webhook, after the Printful order exists | `order-confirmation/{ref}` |
| Your order has shipped (tracking) | customer | Printful `package_shipped`; one per package | `shipment/{ref}/{shipmentId}` |
| New DRAFT order — confirm it | you | each Stripe delivery while the order is still a draft | `admin/draft_created/{ref}` |
| Paid but NOT sent to Printful | you | order couldn't be built or Printful rejected it | `admin/order_build_failed/{ref}`, `admin/printful_rejected/{ref}` |
| Order FAILED / CANCELED / ON HOLD / package RETURNED | you | Printful webhook | `admin/printful_order_*/{ref}` |

- Templates are in `src/lib/email/templates.ts`: branded HTML plus a plain-text version, with every dynamic value escaped.
- Every send goes through `sendEmail()` with an idempotency key. Resend sends at most once per key in 24 hours, so webhook retries never double-email. Templates are deterministic because Resend rejects a reused key whose content differs.
- **Every email is required.** If any send fails, the webhook answers 500 and Stripe or Printful retries. Admin alerts are also logged at error level before sending, so they show up in Vercel logs even if email is down.
- Replies go to `brand.supportEmail`.

### Resend setup

1. Add and **verify your sending domain** in Resend (DNS records: SPF, DKIM, optionally DMARC). Verification can take hours, so start early. Until a domain is verified, Resend only delivers to your own account address.
2. Create an API key with sending access and set `RESEND_API_KEY`.
3. Set `EMAIL_FROM` to an address on the verified domain, e.g. `Crazy Ivan Army <orders@crazyivanarmy.com>`.
4. Set `ADMIN_ALERT_EMAIL` to an inbox someone actually reads.

## Printful webhook: shipping emails and alerts

`POST /api/webhooks/printful?secret=…` handles:

| Event | Action |
| --- | --- |
| `package_shipped` | email the customer carrier and tracking. Split orders get one email per package, worded "Part of your order…" |
| `order_failed`, `order_canceled`, `order_put_hold`, `package_returned` | alert you, with Printful's reason and what to do |
| `product_synced`, `stock_updated` | refresh the cached catalog, so edits in Printful show up without calling `/api/revalidate` |

**Security:** Printful's v1 webhooks are not signed. The handler therefore:
1. requires the secret in the URL (constant-time compare; 401 otherwise)
2. **treats the payload only as a pointer.** It re-fetches the order from Printful's API and acts on that. A forged `package_shipped` for an order or shipment that doesn't exist does nothing.

Responses: 401 bad secret · 400 malformed body · 200 handled or ignored · 500 temporary failure (Printful retries).

### Registering the Printful webhook

Printful allows **one** webhook URL per store, so registering replaces any existing configuration. Check first:

```bash
PRINTFUL_API_TOKEN=… node scripts/register-printful-webhook.mjs --show
```

Then register, using your **production** URL and the same `PRINTFUL_WEBHOOK_SECRET` that's set in Vercel:

```bash
PRINTFUL_API_TOKEN=… PRINTFUL_WEBHOOK_SECRET=… node scripts/register-printful-webhook.mjs https://yourdomain.com
```

It subscribes to the seven events above and prints the result with the secret redacted. Add `PRINTFUL_STORE_ID=…` if your token covers more than one store.

Printful must be able to reach the URL, so it can't be `localhost`. Use a Vercel deployment. To test locally, use a tunnel (e.g. `cloudflared tunnel --url http://localhost:3000`) and register the tunnel URL, then re-register the production URL afterwards. Or skip Printful entirely: with the mock, `POST http://localhost:4010/__ship/{ref}` adds a shipment and returns the exact `package_shipped` payload to POST to your local webhook.

## SEO

- Per-page titles and descriptions. Product pages get their mockup as the share image and a canonical URL.
- `/sitemap.xml` lists the static pages and every product (refreshed with the catalog). `/robots.txt` blocks `/api/` and `/order/`, and blocks **everything** on Vercel preview deployments so previews never get indexed.
- Product pages include schema.org `ProductGroup` data (price, availability, color and size per variant), which search results can use for price and stock display.
- Default social share image: `src/app/opengraph-image.tsx`.

## Deploying to Vercel

1. **Import the repo:** vercel.com → Add New → Project → import `tommyholloran/CIA`. The defaults are right (framework Next.js, `npm run build`).
2. **Environment variables:** Project → Settings → Environment Variables. Add everything from `.env.example`, **scoped per environment**:

   | Variable | Production | Preview |
   | --- | --- | --- |
   | `NEXT_PUBLIC_SITE_URL` | `https://yourdomain.com` | *leave unset*: previews use their own URL automatically |
   | `STRIPE_SECRET_KEY` | `sk_live_…` | `sk_test_…` |
   | `STRIPE_WEBHOOK_SECRET` | from the live endpoint (step 5) | from the test endpoint |
   | `PRINTFUL_AUTO_CONFIRM` | `false` until you trust it, then `true` | `false` |
   | `PRINTFUL_API_TOKEN`, `PRINTFUL_STORE_ID`, `PRINTFUL_WEBHOOK_SECRET`, `RESEND_API_KEY`, `EMAIL_FROM`, `ADMIN_ALERT_EMAIL`, `REVALIDATE_SECRET` | ✓ | ✓ |

   **Never set** `PRINTFUL_API_BASE_URL`, `STRIPE_API_BASE_URL` or `RESEND_BASE_URL`; they exist only for local mocks. Preview and production share one Printful store, so test-mode orders land there as **drafts**; delete them in Printful after testing.
3. **Deploy.** The build fetches the catalog from Printful. If Printful is down, the build fails rather than shipping an empty store; redeploy once it's back.
4. **Domain:** Project → Settings → Domains. Add yours, set `NEXT_PUBLIC_SITE_URL` to match, then redeploy, because `NEXT_PUBLIC_*` values are baked in at build time.
5. **Stripe webhook:** Stripe Dashboard → Developers → Webhooks → Add endpoint.
   - URL: `https://yourdomain.com/api/webhooks/stripe`
   - Events: `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`
   - Copy the signing secret into `STRIPE_WEBHOOK_SECRET` (Production) and redeploy.
   - Do the same in **test mode** against a preview URL, saving that secret as the Preview `STRIPE_WEBHOOK_SECRET`.
   - **Vercel Deployment Protection blocks Stripe and Printful from reaching preview URLs.** Either turn protection off for previews (Settings → Deployment Protection), or use "Protection Bypass for Automation" and add `?x-vercel-protection-bypass=<secret>` to the webhook URL.
6. **Printful webhook:** run `scripts/register-printful-webhook.mjs` against your production URL (see above).
7. **Smoke test production** with a real card and a cheap product. Set `PRINTFUL_AUTO_CONFIRM=false` first so the order stays a draft, then refund yourself in Stripe and delete the draft.

## Launch checklist

**Accounts and settings (yours)**
- [ ] Stripe: business details, Stripe Tax set up with head-office address, **state registrations added** (Stripe collects $0 tax where you aren't registered), payouts bank account, Checkout branding (logo, colors)
- [ ] Stripe: confirm `PRODUCT_TAX_CODE` (`txcd_30011000`) is the right code for your shirts
- [ ] Printful: products synced with **retail prices**, billing method added, packing slip and return address set
- [ ] Printful: confirm the expedited shipping id (`EXPRESS` is unverified; see "Check Printful's shipping method ids") and replace the placeholder print and transit days in `src/config/shipping.ts` with Printful's real times
- [ ] Printful: consider a resale certificate so Printful doesn't charge **you** sales tax on wholesale costs
- [ ] Resend: sending domain verified (SPF/DKIM), `EMAIL_FROM` on that domain
- [ ] Margins: check flat-rate shipping against Printful's real cost for large and expedited orders

**Content (yours)**
- [ ] `src/config/brand.ts`: tagline, description, story, `supportEmail`, social links
- [ ] Logo in `public/` + `brand.logo`; replace the star in `icon.svg`, `apple-icon.tsx`, `opengraph-image.tsx`
- [ ] Privacy, Terms, and Shipping & Returns: **replace the placeholder text with reviewed policies** (they're marked `TODO(owner)`)
- [ ] Featured products in `src/config/catalog.ts` (defaults to the first four)
- [ ] Brand colors and designs: keep away from University of Arizona marks (see step 1 notes)

**Go-live (together)**
- [ ] Production env vars set; domain live; `NEXT_PUBLIC_SITE_URL` matches
- [ ] Stripe live webhook endpoint added; Printful webhook registered to the production URL
- [ ] One real purchase end to end: confirmation email → draft in Printful → confirm → shipping email
- [ ] Then set `PRINTFUL_AUTO_CONFIRM=true` if you no longer want to review orders manually
