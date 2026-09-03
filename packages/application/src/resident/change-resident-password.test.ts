import { describe, expect, it } from "vitest";
import { FakePasswordHasher, InMemoryResidentCredentialRepository } from "../testing/fakes.js";
import { changeResidentPassword } from "./change-resident-password.js";

function buildDeps() {
  return {
    residentCredentialRepository: new InMemoryResidentCredentialRepository(),
    passwordHasher: new FakePasswordHasher(),
  };
}

function seed(deps: ReturnType<typeof buildDeps>) {
  deps.residentCredentialRepository.seed({
    residentId: "resident-1",
    physicianId: "physician-1",
    email: "resident@example.com",
    passwordHash: "fake-hash:Temp1234",
    temporaryPassword: "Temp1234",
    mustChangePassword: true,
    active: true,
  });
}

describe("changeResidentPassword", () => {
  it("hashes and stores the new password, clears the temporary one, and un-arms the must-change flag", async () => {
    const deps = buildDeps();
    seed(deps);

    await changeResidentPassword(deps)({ residentId: "resident-1", newPassword: "MyNewPass1" });

    const credential = await deps.residentCredentialRepository.findByResidentId("resident-1");
    expect(credential?.passwordHash).toBe("fake-hash:MyNewPass1");
    expect(credential?.temporaryPassword).toBeNull();
    expect(credential?.mustChangePassword).toBe(false);
  });

  it("rejects an empty password", async () => {
    const deps = buildDeps();
    seed(deps);

    await expect(
      changeResidentPassword(deps)({ residentId: "resident-1", newPassword: "  " }),
    ).rejects.toThrow(/Password is required/);
  });
});
