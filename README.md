# T-shirt store

Direct-to-consumer storefront: Next.js 16 (App Router), Stripe Checkout + Stripe Tax, Printful (catalog and fulfilment), Resend (email). Deploys to Vercel. No database: Stripe Checkout Session metadata and the Printful order `external_id` link each order across systems.

> This README grows with each build step. Sections marked _(coming)_ are filled in when that step lands.

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
| Brand name, copy, colors, logo | `src/config/brand.ts` |
| Fonts | `src/config/fonts.ts` |
| Featured products on the home page | `src/config/catalog.ts` |
| Shipping rates, allowed countries, order limits | `src/config/shipping.ts` |
| Static page copy | `src/app/(static)/*/page.tsx` |

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

## Testing webhooks locally with the Stripe CLI _(coming)_

## Deploying to Vercel _(coming)_

## Registering the Printful webhook _(coming)_
