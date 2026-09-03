import { describe, expect, it } from "vitest";
import {
  FakePasswordHasher,
  FakeTemporaryPasswordGenerator,
  InMemoryResidentCredentialRepository,
} from "../testing/fakes.js";
import { resetResidentPassword } from "./reset-resident-password.js";

const PHYSICIAN_ID = "physician-1";

function buildDeps() {
  return {
    residentCredentialRepository: new InMemoryResidentCredentialRepository(),
    passwordHasher: new FakePasswordHasher(),
    temporaryPasswordGenerator: new FakeTemporaryPasswordGenerator("NewTemp99"),
  };
}

function seed(deps: ReturnType<typeof buildDeps>, overrides: { physicianId?: string } = {}) {
  deps.residentCredentialRepository.seed({
    residentId: "resident-1",
    physicianId: overrides.physicianId ?? PHYSICIAN_ID,
    email: "resident@example.com",
    passwordHash: "fake-hash:OldPass1",
    temporaryPassword: null,
    mustChangePassword: false,
    active: true,
  });
}

describe("resetResidentPassword", () => {
  it("issues a fresh temporary password and re-arms the must-change flag", async () => {
    const deps = buildDeps();
    seed(deps);

    const output = await resetResidentPassword(deps)({
      physicianId: PHYSICIAN_ID,
      residentId: "resident-1",
    });

    expect(output).toEqual({ temporaryPassword: "NewTemp99" });
    const credential = await deps.residentCredentialRepository.findByResidentId("resident-1");
    expect(credential?.temporaryPassword).toBe("NewTemp99");
    expect(credential?.mustChangePassword).toBe(true);
    expect(credential?.passwordHash).toBe("fake-hash:NewTemp99");
  });

  it("rejects a resident outside the acting physician's tenant with not-found", async () => {
    const deps = buildDeps();
    seed(deps, { physicianId: "physician-other" });

    await expect(
      resetResidentPassword(deps)({ physicianId: PHYSICIAN_ID, residentId: "resident-1" }),
    ).rejects.toThrow(/was not found/);
  });

  it("rejects an unknown resident with not-found", async () => {
    const deps = buildDeps();

    await expect(
      resetResidentPassword(deps)({ physicianId: PHYSICIAN_ID, residentId: "unknown" }),
    ).rejects.toThrow(/was not found/);
  });
});
