import { describe, expect, it } from "vitest";
import { Resident } from "@cirugias-cruz/domain";
import { NotFoundError } from "../shared/not-found-error.js";
import {
  InMemoryResidentCredentialRepository,
  InMemoryResidentRepository,
} from "../testing/fakes.js";
import { getResident } from "./get-resident.js";

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

describe("getResident", () => {
  it("returns the resident, active by default when no credential exists, when it belongs to the acting physician", async () => {
    const deps = buildDeps();
    deps.residentRepository.seed(buildResident("resident-1", PHYSICIAN_ID));

    const result = await getResident(deps)({
      physicianId: PHYSICIAN_ID,
      residentId: "resident-1",
    });

    expect(result.resident.id).toBe("resident-1");
    expect(result.active).toBe(true);
  });

  it("reports active: false once the credential has been deactivated", async () => {
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

    const result = await getResident(deps)({
      physicianId: PHYSICIAN_ID,
      residentId: "resident-1",
    });

    expect(result.active).toBe(false);
  });

  it("throws NotFoundError when the resident does not exist", async () => {
    const deps = buildDeps();

    await expect(
      getResident(deps)({
        physicianId: PHYSICIAN_ID,
        residentId: "does-not-exist",
      }),
    ).rejects.toThrow(NotFoundError);
  });

  it("throws NotFoundError, not a permission error, for another physician's resident", async () => {
    const deps = buildDeps();
    deps.residentRepository.seed(buildResident("resident-1", OTHER_PHYSICIAN_ID));

    await expect(
      getResident(deps)({
        physicianId: PHYSICIAN_ID,
        residentId: "resident-1",
      }),
    ).rejects.toThrow(NotFoundError);
  });
});
