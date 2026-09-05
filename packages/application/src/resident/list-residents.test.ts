import { describe, expect, it } from "vitest";
import { Resident } from "@cirugias-cruz/domain";
import {
  InMemoryResidentCredentialRepository,
  InMemoryResidentRepository,
} from "../testing/fakes.js";
import { listResidents } from "./list-residents.js";

const PHYSICIAN_ID = "physician-1";
const OTHER_PHYSICIAN_ID = "physician-2";

function buildResident(id: string, physicianId: string): Resident {
  return Resident.create({
    id,
    physicianId,
    firstName: "Ana",
    lastName: "Gomez",
    phone: "+54 11 5555-5555",
    email: "ana@example.com",
    dateOfBirth: new Date("1990-01-01"),
  });
}

function buildDeps() {
  return {
    residentRepository: new InMemoryResidentRepository(),
    residentCredentialRepository: new InMemoryResidentCredentialRepository(),
  };
}

describe("listResidents", () => {
  it("returns only the acting physician's residents", async () => {
    const deps = buildDeps();
    deps.residentRepository.seed(buildResident("resident-1", PHYSICIAN_ID));
    deps.residentRepository.seed(buildResident("resident-2", PHYSICIAN_ID));
    deps.residentRepository.seed(buildResident("resident-3", OTHER_PHYSICIAN_ID));

    const result = await listResidents(deps)({ physicianId: PHYSICIAN_ID });

    expect(result.map((entry) => entry.resident.id).sort()).toEqual(["resident-1", "resident-2"]);
  });

  it("returns an empty array when the physician has no residents", async () => {
    const deps = buildDeps();

    const result = await listResidents(deps)({ physicianId: PHYSICIAN_ID });

    expect(result).toEqual([]);
  });

  it("reports active: false for a resident whose credential has been deactivated", async () => {
    const deps = buildDeps();
    deps.residentRepository.seed(buildResident("resident-1", PHYSICIAN_ID));
    deps.residentCredentialRepository.seed({
      residentId: "resident-1",
      physicianId: PHYSICIAN_ID,
      email: "ana@example.com",
      passwordHash: "hash",
      temporaryPassword: null,
      mustChangePassword: false,
      active: false,
    });

    const result = await listResidents(deps)({ physicianId: PHYSICIAN_ID });

    expect(result).toHaveLength(1);
    expect(result[0]?.resident.id).toBe("resident-1");
    expect(result[0]?.active).toBe(false);
  });
});
