import { describe, expect, it } from "vitest";
import { Resident } from "@cirugias-cruz/domain";
import { NotFoundError } from "../shared/not-found-error.js";
import { InMemoryResidentRepository } from "../testing/fakes.js";
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

describe("getResident", () => {
  it("returns the resident when it belongs to the acting physician", async () => {
    const residentRepository = new InMemoryResidentRepository();
    residentRepository.seed(buildResident("resident-1", PHYSICIAN_ID));

    const result = await getResident({ residentRepository })({
      physicianId: PHYSICIAN_ID,
      residentId: "resident-1",
    });

    expect(result.id).toBe("resident-1");
  });

  it("throws NotFoundError when the resident does not exist", async () => {
    const residentRepository = new InMemoryResidentRepository();

    await expect(
      getResident({ residentRepository })({
        physicianId: PHYSICIAN_ID,
        residentId: "does-not-exist",
      }),
    ).rejects.toThrow(NotFoundError);
  });

  it("throws NotFoundError, not a permission error, for another physician's resident", async () => {
    const residentRepository = new InMemoryResidentRepository();
    residentRepository.seed(buildResident("resident-1", OTHER_PHYSICIAN_ID));

    await expect(
      getResident({ residentRepository })({
        physicianId: PHYSICIAN_ID,
        residentId: "resident-1",
      }),
    ).rejects.toThrow(NotFoundError);
  });
});
