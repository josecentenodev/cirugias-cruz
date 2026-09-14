import { describe, expect, it } from "vitest";
import {
  InMemoryResidentCredentialRepository,
  InMemoryResidentInvitationTokenRepository,
  InMemorySessionRepository,
} from "../testing/fakes.js";
import { setResidentActive } from "./set-resident-active.js";

const PHYSICIAN_ID = "physician-1";

function buildDeps() {
  return {
    residentCredentialRepository: new InMemoryResidentCredentialRepository(),
    sessionRepository: new InMemorySessionRepository(),
    residentInvitationTokenRepository: new InMemoryResidentInvitationTokenRepository(),
  };
}

function seed(deps: ReturnType<typeof buildDeps>) {
  deps.residentCredentialRepository.seed({
    residentId: "resident-1",
    physicianId: PHYSICIAN_ID,
    email: "resident@example.com",
    passwordHash: "hash",
    invitedAt: new Date(),
    acceptedAt: new Date(),
    active: true,
  });
}

describe("setResidentActive", () => {
  it("deactivates a resident and forces the immediate closure of any session they currently hold", async () => {
    const deps = buildDeps();
    seed(deps);
    const session = await deps.sessionRepository.create({
      userType: "resident",
      physicianId: PHYSICIAN_ID,
      residentId: "resident-1",
    });

    await setResidentActive(deps)({
      physicianId: PHYSICIAN_ID,
      residentId: "resident-1",
      active: false,
    });

    const credential = await deps.residentCredentialRepository.findByResidentId("resident-1");
    expect(credential?.active).toBe(false);
    expect(await deps.sessionRepository.findById(session.id)).toBeNull();
  });

  it("invalidates any outstanding invitation token when deactivating (ADR 0029)", async () => {
    const deps = buildDeps();
    seed(deps);
    const token = await deps.residentInvitationTokenRepository.create("resident-1");

    await setResidentActive(deps)({
      physicianId: PHYSICIAN_ID,
      residentId: "resident-1",
      active: false,
    });

    expect(await deps.residentInvitationTokenRepository.findById(token.id)).toBeNull();
  });

  it("reactivates a resident without touching sessions (there shouldn't be any live ones anyway)", async () => {
    const deps = buildDeps();
    seed(deps);

    await setResidentActive(deps)({
      physicianId: PHYSICIAN_ID,
      residentId: "resident-1",
      active: true,
    });

    const credential = await deps.residentCredentialRepository.findByResidentId("resident-1");
    expect(credential?.active).toBe(true);
  });

  it("rejects a resident outside the acting physician's tenant with not-found", async () => {
    const deps = buildDeps();
    seed(deps);

    await expect(
      setResidentActive(deps)({
        physicianId: "physician-other",
        residentId: "resident-1",
        active: false,
      }),
    ).rejects.toThrow(/was not found/);
  });
});
