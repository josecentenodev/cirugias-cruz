import { Resident } from "@cirugias-cruz/domain";
import { describe, expect, it } from "vitest";
import {
  FakeEmailSender,
  InMemoryResidentCredentialRepository,
  InMemoryResidentInvitationTokenRepository,
  InMemoryResidentRepository,
} from "../testing/fakes.js";
import { resendResidentInvitation } from "./resend-resident-invitation.js";

const PHYSICIAN_ID = "physician-1";

function buildDeps() {
  return {
    residentRepository: new InMemoryResidentRepository(),
    residentCredentialRepository: new InMemoryResidentCredentialRepository(),
    residentInvitationTokenRepository: new InMemoryResidentInvitationTokenRepository(),
    emailSender: new FakeEmailSender(),
  };
}

function seed(
  deps: ReturnType<typeof buildDeps>,
  overrides: { passwordHash?: string | null } = {},
) {
  deps.residentRepository.seed(
    Resident.create({
      id: "resident-1",
      physicianId: PHYSICIAN_ID,
      firstName: "Laura",
      lastName: "Diaz",
      phone: "+54 11 3333-3333",
      email: "laura@example.com",
      dateOfBirth: new Date("1995-02-02"),
    }),
  );
  deps.residentCredentialRepository.seed({
    residentId: "resident-1",
    physicianId: PHYSICIAN_ID,
    email: "laura@example.com",
    passwordHash: overrides.passwordHash ?? null,
    invitedAt: new Date("2020-01-01"),
    acceptedAt: overrides.passwordHash ? new Date("2020-01-01") : null,
    active: true,
  });
}

describe("resendResidentInvitation", () => {
  it("clears any existing password, invalidates outstanding tokens, and sends a fresh invitation", async () => {
    const deps = buildDeps();
    seed(deps, { passwordHash: "old-hash" });
    const oldToken = await deps.residentInvitationTokenRepository.create("resident-1");

    await resendResidentInvitation(deps)({
      physicianId: PHYSICIAN_ID,
      residentId: "resident-1",
      webBaseUrl: "https://web.example.com",
    });

    const credential = await deps.residentCredentialRepository.findByResidentId("resident-1");
    expect(credential?.passwordHash).toBeNull();
    expect(credential?.acceptedAt).toBeNull();
    expect(await deps.residentInvitationTokenRepository.findById(oldToken.id)).toBeNull();
    expect(deps.emailSender.sent).toHaveLength(1);
  });

  it("works for a still-pending (never accepted) invitation too", async () => {
    const deps = buildDeps();
    seed(deps);

    await resendResidentInvitation(deps)({
      physicianId: PHYSICIAN_ID,
      residentId: "resident-1",
      webBaseUrl: "https://web.example.com",
    });

    expect(deps.emailSender.sent).toHaveLength(1);
  });

  it("rejects a resident outside the acting physician's tenant with not-found", async () => {
    const deps = buildDeps();
    seed(deps);

    await expect(
      resendResidentInvitation(deps)({
        physicianId: "physician-other",
        residentId: "resident-1",
        webBaseUrl: "https://web.example.com",
      }),
    ).rejects.toThrow(/was not found/);
  });
});
