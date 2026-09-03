import { Resend } from "resend";
import type { EmailSender, SendEmailInput } from "@cirugias-cruz/application";

/**
 * Sends transactional email via Resend (ADR 0015). `apiKey`/`fromEmail`
 * are constructor-injected, not read from `process.env` here — mirrors
 * every other Infrastructure adapter in this package (a `PrismaClient`
 * passed to each `Prisma*Repository`, never constructed internally);
 * `packages/http/src/index.ts`'s `buildDeps()` is the one place env vars
 * are actually read.
 */
export class ResendEmailSender implements EmailSender {
  constructor(
    private readonly apiKey: string,
    private readonly fromEmail: string,
  ) {}

  async send(input: SendEmailInput): Promise<void> {
    // Constructed lazily, on the first actual send — not in the
    // constructor — so a process that never sends an email (most test
    // runs, local dev without RESEND_API_KEY configured) never pays for
    // Resend's own constructor validation, which throws immediately on
    // an empty key. Keeps "fail at use, not at boot" true in practice,
    // not just in the comment on `buildDeps()`.
    const resend = new Resend(this.apiKey);
    const result = await resend.emails.send({
      from: this.fromEmail,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
    });

    if (result.error) {
      throw new Error(`Failed to send email via Resend: ${result.error.message}`);
    }
  }
}
