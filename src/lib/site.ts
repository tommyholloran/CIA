/**
 * Canonical site origin, no trailing slash. Safe to import anywhere.
 *
 * 1. NEXT_PUBLIC_SITE_URL if set (set it for Production only, e.g. https://crazyivanarmy.com)
 * 2. On Vercel preview deployments: that deployment's own URL, so Stripe
 *    redirects return to the preview you're testing, not to production
 * 3. On Vercel production without (1): the project's production domain
 * 4. Locally: http://localhost:3000
 */
export function siteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  const env = process.env.VERCEL_ENV;
  const url =
    explicit ||
    (env === "preview" && (process.env.VERCEL_BRANCH_URL || process.env.VERCEL_URL)
      ? `https://${process.env.VERCEL_BRANCH_URL || process.env.VERCEL_URL}`
      : process.env.VERCEL_PROJECT_PRODUCTION_URL
        ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
        : "http://localhost:3000");
  return url.replace(/\/$/, "");
}
