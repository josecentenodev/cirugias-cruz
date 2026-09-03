import { describe, expect, it } from "vitest";
import { InMemoryResidentCredentialRepository } from "../testing/fakes.js";
import { viewResidentTemporaryPassword } from "./view-resident-temporary-password.js";

const PHYSICIAN_ID = "physician-1";

function buildDeps() {
  return { residentCredentialRepository: new InMemoryResidentCredentialRepository() };
}

describe("viewResidentTemporaryPassword", () => {
  it("returns the temporary password while it hasn't been changed", async () => {
    const deps = buildDeps();
    deps.residentCredentialRepository.seed({
      residentId: "resident-1",
      physicianId: PHYSICIAN_ID,
      email: "resident@example.com",
      passwordHash: "hash",
      temporaryPassword: "Temp1234",
      mustChangePassword: true,
      active: true,
    });

    const output = await viewResidentTemporaryPassword(deps)({
      physicianId: PHYSICIAN_ID,
      residentId: "resident-1",
    });

    expect(output).toEqual({ temporaryPassword: "Temp1234" });
  });

  it("returns null once the resident has changed their password", async () => {
    const deps = buildDeps();
    deps.residentCredentialRepository.seed({
      residentId: "resident-1",
      physicianId: PHYSICIAN_ID,
      email: "resident@example.com",
      passwordHash: "hash",
      temporaryPassword: null,
      mustChangePassword: false,
      active: true,
    });

    const output = await viewResidentTemporaryPassword(deps)({
      physicianId: PHYSICIAN_ID,
      residentId: "resident-1",
    });

    expect(output).toEqual({ temporaryPassword: null });
  });

  it("rejects a resident outside the acting physician's tenant with not-found", async () => {
    const deps = buildDeps();
    deps.residentCredentialRepository.seed({
      residentId: "resident-1",
      physicianId: "physician-other",
      email: "resident@example.com",
      passwordHash: "hash",
      temporaryPassword: "Temp1234",
      mustChangePassword: true,
      active: true,
    });

    await expect(
      viewResidentTemporaryPassword(deps)({ physicianId: PHYSICIAN_ID, residentId: "resident-1" }),
    ).rejects.toThrow(/was not found/);
  });
});
