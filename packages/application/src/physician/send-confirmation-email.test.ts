import { describe, expect, it } from "vitest";
import { FakeEmailSender, InMemoryEmailConfirmationTokenRepository } from "../testing/fakes.js";
import { sendConfirmationEmail } from "./send-confirmation-email.js";

function buildDeps() {
  return {
    emailConfirmationTokenRepository: new InMemoryEmailConfirmationTokenRepository(),
    emailSender: new FakeEmailSender(),
  };
}

describe("sendConfirmationEmail", () => {
  it("issues a token and emails a confirmation link pointing at web, embedding it", async () => {
    const deps = buildDeps();

    await sendConfirmationEmail(deps)({
      physicianId: "physician-1",
      email: "ana@example.com",
      firstName: "Ana",
      webBaseUrl: "https://web-production-example.up.railway.app",
    });

    expect(deps.emailSender.sent).toHaveLength(1);
    const message = deps.emailSender.sent[0];
    expect(message?.to).toBe("ana@example.com");
    expect(message?.html).toContain(
      "https://web-production-example.up.railway.app/confirm-email?token=",
    );
    expect(message?.text).toContain(
      "https://web-production-example.up.railway.app/confirm-email?token=",
    );
  });

  it("persists a token findable by the same id embedded in the link", async () => {
    const deps = buildDeps();

    await sendConfirmationEmail(deps)({
      physicianId: "physician-1",
      email: "ana@example.com",
      firstName: "Ana",
      webBaseUrl: "https://web.example.com",
    });

    const link = deps.emailSender.sent[0]?.html ?? "";
    const tokenId = new URL(/https:\/\/[^"]+/.exec(link)?.[0] ?? "").searchParams.get("token");
    expect(tokenId).toBeTruthy();

    const token = await deps.emailConfirmationTokenRepository.findById(tokenId ?? "");
    expect(token?.physicianId).toBe("physician-1");
  });
});
