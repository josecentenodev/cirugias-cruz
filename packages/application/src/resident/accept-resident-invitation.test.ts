import { describe, expect, it } from "vitest";
import {
  FakePasswordHasher,
  InMemoryResidentCredentialRepository,
  InMemoryResidentInvitationTokenRepository,
} from "../testing/fakes.js";
import { acceptResidentInvitation } from "./accept-resident-invitation.js";

const PHYSICIAN_ID = "physician-1";

function buildDeps() {
  return {
    residentInvitationTokenRepository: new InMemoryResidentInvitationTokenRepository(),
    residentCredentialRepository: new InMemoryResidentCredentialRepository(),
    passwordHasher: new FakePasswordHasher(),
  };
}

function seedCredential(deps: ReturnType<typeof buildDeps>) {
  deps.residentCredentialRepository.seed({
    residentId: "resident-1",
    physicianId: PHYSICIAN_ID,
    email: "laura@example.com",
    passwordHash: null,
    invitedAt: new Date(),
    acceptedAt: null,
    active: true,
  });
}

describe("acceptResidentInvitation", () => {
  it("sets the resident's own password and marks the invitation accepted", async () => {
    const deps = buildDeps();
    seedCredential(deps);
    const token = await deps.residentInvitationTokenRepository.create("resident-1");

    const output = await acceptResidentInvitation(deps)({
      token: token.id,
      password: "my-own-password",
    });

    expect(output).toEqual({ residentId: "resident-1" });
    const credential = await deps.residentCredentialRepository.findByResidentId("resident-1");
    expect(credential?.passwordHash).toBe("fake-hash:my-own-password");
    expect(credential?.acceptedAt).toBeInstanceOf(Date);
  });

  it("invalidates the token once redeemed", async () => {
    const deps = buildDeps();
    seedCredential(deps);
    const token = await deps.residentInvitationTokenRepository.create("resident-1");

    await acceptResidentInvitation(deps)({ token: token.id, password: "my-own-password" });

    await expect(
      acceptResidentInvitation(deps)({ token: token.id, password: "another-password" }),
    ).rejects.toThrow(/invalid or has expired/);
  });

  it("rejects an unknown token", async () => {
    const deps = buildDeps();

    await expect(
      acceptResidentInvitation(deps)({ token: "does-not-exist", password: "whatever" }),
    ).rejects.toThrow(/invalid or has expired/);
  });

  it("rejects an empty password", async () => {
    const deps = buildDeps();
    seedCredential(deps);
    const token = await deps.residentInvitationTokenRepository.create("resident-1");

    await expect(
      acceptResidentInvitation(deps)({ token: token.id, password: "  " }),
    ).rejects.toThrow(/Password is required/);
  });
});
