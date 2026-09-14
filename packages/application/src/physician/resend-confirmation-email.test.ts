import { describe, expect, it } from "vitest";
import {
  FakeEmailSender,
  InMemoryEmailConfirmationTokenRepository,
  InMemoryPhysicianCredentialRepository,
} from "../testing/fakes.js";
import { resendConfirmationEmail } from "./resend-confirmation-email.js";

function buildDeps() {
  return {
    physicianCredentialRepository: new InMemoryPhysicianCredentialRepository(),
    emailConfirmationTokenRepository: new InMemoryEmailConfirmationTokenRepository(),
    emailSender: new FakeEmailSender(),
  };
}

describe("resendConfirmationEmail", () => {
  it("issues a fresh token and sends a confirmation email for an unconfirmed physician", async () => {
    const deps = buildDeps();
    deps.physicianCredentialRepository.seed({
      physicianId: "physician-1",
      email: "ana@example.com",
      passwordHash: "hash",
      confirmedAt: null,
    });

    await resendConfirmationEmail(deps)({
      email: "ana@example.com",
      firstName: "Ana",
      webBaseUrl: "https://web.example.com",
    });

    expect(deps.emailSender.sent).toHaveLength(1);
    expect(deps.emailSender.sent[0]?.to).toBe("ana@example.com");
    expect(deps.emailSender.sent[0]?.html).toContain(
      "https://web.example.com/confirm-email?token=",
    );
  });

  it("does nothing observable for an unknown email — no leak of which emails are registered", async () => {
    const deps = buildDeps();

    await resendConfirmationEmail(deps)({
      email: "unknown@example.com",
      firstName: "Nobody",
      webBaseUrl: "https://web.example.com",
    });

    expect(deps.emailSender.sent).toHaveLength(0);
  });

  it("does nothing for an already-confirmed physician", async () => {
    const deps = buildDeps();
    deps.physicianCredentialRepository.seed({
      physicianId: "physician-1",
      email: "ana@example.com",
      passwordHash: "hash",
      confirmedAt: new Date(),
    });

    await resendConfirmationEmail(deps)({
      email: "ana@example.com",
      firstName: "Ana",
      webBaseUrl: "https://web.example.com",
    });

    expect(deps.emailSender.sent).toHaveLength(0);
  });
});
