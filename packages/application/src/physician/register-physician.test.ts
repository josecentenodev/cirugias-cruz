import { describe, expect, it } from "vitest";
import {
  FakePasswordHasher,
  InMemoryPhysicianCredentialRepository,
  InMemoryPhysicianRepository,
} from "../testing/fakes.js";
import { registerPhysician } from "./register-physician.js";

function buildDeps() {
  return {
    physicianRepository: new InMemoryPhysicianRepository(),
    physicianCredentialRepository: new InMemoryPhysicianCredentialRepository(),
    passwordHasher: new FakePasswordHasher(),
  };
}

const validInput = {
  id: "physician-1",
  firstName: "Ana",
  lastName: "García",
  phone: "555-0101",
  email: "ana@example.com",
  dateOfBirth: new Date("1980-01-01"),
  password: "s3cret-password",
};

describe("registerPhysician", () => {
  it("registers a physician and persists it via PhysicianRepository", async () => {
    const deps = buildDeps();

    const output = await registerPhysician(deps)(validInput);

    expect(output).toEqual({ physicianId: "physician-1" });
    const physician = await deps.physicianRepository.findById("physician-1");
    expect(physician?.email).toBe("ana@example.com");
  });

  it("never persists the plaintext password anywhere the Physician aggregate can see", async () => {
    const deps = buildDeps();

    await registerPhysician(deps)(validInput);

    const credential = await deps.physicianCredentialRepository.findByEmail("ana@example.com");
    expect(credential?.passwordHash).not.toBe(validInput.password);
    expect(credential?.physicianId).toBe("physician-1");
  });

  it("rejects a second registration with the same email", async () => {
    const deps = buildDeps();
    await registerPhysician(deps)(validInput);

    await expect(registerPhysician(deps)({ ...validInput, id: "physician-2" })).rejects.toThrow(
      /already registered/,
    );
  });

  it("rejects a second registration with the same email in a different case", async () => {
    const deps = buildDeps();
    await registerPhysician(deps)(validInput);

    await expect(
      registerPhysician(deps)({ ...validInput, id: "physician-2", email: "ANA@example.com" }),
    ).rejects.toThrow(/already registered/);
  });
});
