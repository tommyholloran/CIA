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

## Testing webhooks locally with the Stripe CLI _(coming)_

## Deploying to Vercel _(coming)_

## Registering the Printful webhook _(coming)_
