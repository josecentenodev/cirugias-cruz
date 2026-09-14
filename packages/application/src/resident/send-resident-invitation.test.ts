import { describe, expect, it } from "vitest";
import { FakeEmailSender, InMemoryResidentInvitationTokenRepository } from "../testing/fakes.js";
import { sendResidentInvitation } from "./send-resident-invitation.js";

function buildDeps() {
  return {
    residentInvitationTokenRepository: new InMemoryResidentInvitationTokenRepository(),
    emailSender: new FakeEmailSender(),
  };
}

describe("sendResidentInvitation", () => {
  it("issues an invitation token and emails the acceptance link", async () => {
    const deps = buildDeps();

    await sendResidentInvitation(deps)({
      residentId: "resident-1",
      email: "laura@example.com",
      firstName: "Laura",
      webBaseUrl: "https://web.example.com",
    });

    expect(deps.emailSender.sent).toHaveLength(1);
    expect(deps.emailSender.sent[0]?.to).toBe("laura@example.com");
    expect(deps.emailSender.sent[0]?.html).toContain(
      "https://web.example.com/accept-invitation?token=",
    );
  });
});
