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

## Where to change things

| What | File |
| --- | --- |
| Brand name, copy, colors, logo | `src/config/brand.ts` |
| Fonts | `src/config/fonts.ts` |
| Shipping rates, allowed countries, order limits | `src/config/shipping.ts` |
| Static page copy | `src/app/(static)/*/page.tsx` |

## Testing webhooks locally with the Stripe CLI _(coming)_

## Deploying to Vercel _(coming)_

## Registering the Printful webhook _(coming)_
