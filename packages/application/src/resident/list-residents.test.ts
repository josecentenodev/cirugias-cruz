import { describe, expect, it } from "vitest";
import { Resident } from "@cirugias-cruz/domain";
import { InMemoryResidentRepository } from "../testing/fakes.js";
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

describe("listResidents", () => {
  it("returns only the acting physician's residents", async () => {
    const residentRepository = new InMemoryResidentRepository();
    residentRepository.seed(buildResident("resident-1", PHYSICIAN_ID));
    residentRepository.seed(buildResident("resident-2", PHYSICIAN_ID));
    residentRepository.seed(buildResident("resident-3", OTHER_PHYSICIAN_ID));

    const result = await listResidents({ residentRepository })({ physicianId: PHYSICIAN_ID });

    expect(result.map((resident) => resident.id).sort()).toEqual(["resident-1", "resident-2"]);
  });

  it("returns an empty array when the physician has no residents", async () => {
    const residentRepository = new InMemoryResidentRepository();

    const result = await listResidents({ residentRepository })({ physicianId: PHYSICIAN_ID });

    expect(result).toEqual([]);
  });
});
