import "server-only";
import { Resend } from "resend";
import { brand } from "@/config/brand";
import { resendEnv } from "@/lib/env";
import { log } from "@/lib/log";
import type { RenderedEmail } from "./templates";

let client: Resend | null = null;
const resend = () => (client ??= new Resend(resendEnv().RESEND_API_KEY));

export class EmailError extends Error {
  name = "EmailError";
}

/**
 * Send one email. `idempotencyKey` makes retries safe: Resend sends at most
 * once per key within 24h. The key must always come with the SAME payload,
 * which is why templates are deterministic.
 *
 * Throws EmailError on failure so callers can decide whether to retry.
 */
export async function sendEmail(opts: {
  to: string | string[];
  email: RenderedEmail;
  idempotencyKey: string;
  replyTo?: string;
  tag: string;
}): Promise<void> {
  const { EMAIL_FROM } = resendEnv();
  const { data, error } = await resend().emails.send(
    {
      from: EMAIL_FROM,
      to: opts.to,
      subject: opts.email.subject,
      html: opts.email.html,
      text: opts.email.text,
      replyTo: opts.replyTo ?? brand.supportEmail,
      tags: [{ name: "type", value: opts.tag }],
    },
    { idempotencyKey: opts.idempotencyKey.slice(0, 256) },
  );

  if (error) {
    // Already sent (or being sent) under this key: that's success for us.
    if (error.name === "concurrent_idempotent_requests" || error.name === "invalid_idempotent_request") {
      log("warn", "email", "idempotent duplicate; treating as sent", { key: opts.idempotencyKey, reason: error.name });
      return;
    }
    log("error", "email", "send failed", { key: opts.idempotencyKey, tag: opts.tag, error: error.message, code: error.name, status: error.statusCode });
    throw new EmailError(`${error.name}: ${error.message}`);
  }
  log("info", "email", "sent", { key: opts.idempotencyKey, tag: opts.tag, id: data?.id });
}
