import { describe, expect, it } from "vitest";
import { InMemoryResidentRepository } from "../testing/fakes.js";
import { registerResident } from "./register-resident.js";

const PHYSICIAN_ID = "physician-1";

function buildDeps() {
  return { residentRepository: new InMemoryResidentRepository() };
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

    expect(output).toEqual({ residentId: "resident-1" });
    const persisted = await deps.residentRepository.findById("resident-1");
    expect(persisted?.physicianId).toBe(PHYSICIAN_ID);
    expect(persisted?.firstName).toBe("Laura");
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
});
