import "server-only";
import { z } from "zod";

/**
 * Server env, validated lazily per integration so the site can build and render
 * pages without every secret present. Each getter throws a clear error if the
 * variables it needs are missing.
 */

function read<T extends z.ZodRawShape>(name: string, shape: T): z.infer<z.ZodObject<T>> {
  const parsed = z.object(shape).safeParse(process.env);
  if (!parsed.success) {
    const missing = parsed.error.issues.map((i) => i.path.join(".")).join(", ");
    throw new Error(`[env] ${name} misconfigured: ${missing}`);
  }
  return parsed.data;
}

const nonEmpty = z.string().trim().min(1);

/** Enough to read the catalog. */
export const printfulToken = () => {
  const e = read("Printful", {
    PRINTFUL_API_TOKEN: nonEmpty,
    PRINTFUL_STORE_ID: z.string().trim().optional(),
  });
  return { token: e.PRINTFUL_API_TOKEN, storeId: e.PRINTFUL_STORE_ID || undefined };
};

export const hasPrintfulToken = () => Boolean(process.env.PRINTFUL_API_TOKEN?.trim());

/** Order creation + webhook handling. */
export const printfulEnv = () =>
  read("Printful", {
    PRINTFUL_API_TOKEN: nonEmpty,
    PRINTFUL_STORE_ID: z.string().trim().optional(),
    PRINTFUL_AUTO_CONFIRM: z
      .enum(["true", "false"])
      .default("false")
      .transform((v) => v === "true"),
    PRINTFUL_WEBHOOK_SECRET: z.string().min(32),
  });

/** Enough to create Checkout Sessions and read them back. */
export const stripeSecretKey = () => read("Stripe", { STRIPE_SECRET_KEY: nonEmpty.startsWith("sk_") }).STRIPE_SECRET_KEY;

/** Webhook verification (step 5). */
export const stripeEnv = () =>
  read("Stripe", {
    STRIPE_SECRET_KEY: nonEmpty.startsWith("sk_"),
    STRIPE_WEBHOOK_SECRET: nonEmpty.startsWith("whsec_"),
  });

export const resendEnv = () =>
  read("Resend", {
    RESEND_API_KEY: nonEmpty.startsWith("re_"),
    EMAIL_FROM: nonEmpty,
    ADMIN_ALERT_EMAIL: z.email(),
  });

export const revalidateEnv = () => read("Revalidate", { REVALIDATE_SECRET: z.string().min(16) });
