import { describe, expect, it } from "vitest";
import {
  FakePasswordHasher,
  FakeTemporaryPasswordGenerator,
  InMemoryPhysicianCredentialRepository,
  InMemoryResidentCredentialRepository,
  InMemoryResidentRepository,
} from "../testing/fakes.js";
import { registerResident } from "./register-resident.js";

const PHYSICIAN_ID = "physician-1";

function buildDeps() {
  return {
    residentRepository: new InMemoryResidentRepository(),
    residentCredentialRepository: new InMemoryResidentCredentialRepository(),
    physicianCredentialRepository: new InMemoryPhysicianCredentialRepository(),
    passwordHasher: new FakePasswordHasher(),
    temporaryPasswordGenerator: new FakeTemporaryPasswordGenerator("Temp1234"),
  };
}

const validInput = {
  physicianId: PHYSICIAN_ID,
  id: "resident-1",
  firstName: "Laura",
  lastName: "Diaz",
  phone: "+54 11 3333-3333",
  email: "laura@example.com",
  dateOfBirth: new Date("1995-02-02"),
};

describe("registerResident", () => {
  it("registers the resident in the acting physician's tenant and persists it", async () => {
    const deps = buildDeps();

    const output = await registerResident(deps)(validInput);

    expect(output).toEqual({ residentId: "resident-1", temporaryPassword: "Temp1234" });
    const persisted = await deps.residentRepository.findById("resident-1");
    expect(persisted?.physicianId).toBe(PHYSICIAN_ID);
    expect(persisted?.firstName).toBe("Laura");
  });

  it("creates a login credential with a system-generated temporary password, requiring a change on first login (ADR 0017)", async () => {
    const deps = buildDeps();

    await registerResident(deps)(validInput);

    const credential = await deps.residentCredentialRepository.findByResidentId("resident-1");
    expect(credential?.temporaryPassword).toBe("Temp1234");
    expect(credential?.mustChangePassword).toBe(true);
    expect(credential?.active).toBe(true);
    expect(credential?.passwordHash).not.toBe("Temp1234");
  });

  it("accepts optional metadata", async () => {
    const deps = buildDeps();

    await registerResident(deps)({ ...validInput, metadata: { program: "cardio" } });

    const persisted = await deps.residentRepository.findById("resident-1");
    expect(persisted?.metadata).toEqual({ program: "cardio" });
  });

  it("lets the domain reject registration when required personal information is missing", async () => {
    const deps = buildDeps();

    await expect(registerResident(deps)({ ...validInput, lastName: "" })).rejects.toThrow();
  });

  it("rejects an email already registered to a Physician", async () => {
    const deps = buildDeps();
    await deps.physicianCredentialRepository.save({
      physicianId: "physician-other",
      email: validInput.email,
      passwordHash: "hash",
      confirmedAt: new Date(),
    });

    await expect(registerResident(deps)(validInput)).rejects.toThrow(/already registered/);
  });

  it("rejects an email already registered to another Resident", async () => {
    const deps = buildDeps();
    deps.residentCredentialRepository.seed({
      residentId: "resident-other",
      physicianId: PHYSICIAN_ID,
      email: validInput.email,
      passwordHash: "hash",
      temporaryPassword: null,
      mustChangePassword: false,
      active: true,
    });

    await expect(registerResident(deps)(validInput)).rejects.toThrow(/already registered/);
  });
});
