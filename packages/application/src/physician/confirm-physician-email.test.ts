import { describe, expect, it } from "vitest";
import {
  InMemoryEmailConfirmationTokenRepository,
  InMemoryPhysicianCredentialRepository,
} from "../testing/fakes.js";
import { confirmPhysicianEmail } from "./confirm-physician-email.js";

function buildDeps() {
  return {
    emailConfirmationTokenRepository: new InMemoryEmailConfirmationTokenRepository(),
    physicianCredentialRepository: new InMemoryPhysicianCredentialRepository(),
  };
}

describe("confirmPhysicianEmail", () => {
  it("marks the credential confirmed and returns the physicianId", async () => {
    const deps = buildDeps();
    deps.physicianCredentialRepository.seed({
      physicianId: "physician-1",
      email: "ana@example.com",
      passwordHash: "hash",
      confirmedAt: null,
    });
    const token = await deps.emailConfirmationTokenRepository.create("physician-1");

    const output = await confirmPhysicianEmail(deps)({ token: token.id });

    expect(output).toEqual({ physicianId: "physician-1" });
    const credential = await deps.physicianCredentialRepository.findByEmail("ana@example.com");
    expect(credential?.confirmedAt).toBeInstanceOf(Date);
  });

  it("invalidates the token — redeeming it twice fails the second time", async () => {
    const deps = buildDeps();
    deps.physicianCredentialRepository.seed({
      physicianId: "physician-1",
      email: "ana@example.com",
      passwordHash: "hash",
      confirmedAt: null,
    });
    const token = await deps.emailConfirmationTokenRepository.create("physician-1");

    await confirmPhysicianEmail(deps)({ token: token.id });

    await expect(confirmPhysicianEmail(deps)({ token: token.id })).rejects.toThrow(
      /invalid or has expired/,
    );
  });

  it("rejects an unknown token", async () => {
    const deps = buildDeps();

    await expect(confirmPhysicianEmail(deps)({ token: "does-not-exist" })).rejects.toThrow(
      /invalid or has expired/,
    );
  });
});
