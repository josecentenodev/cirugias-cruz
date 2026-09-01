import { describe, expect, it } from "vitest";
import { Patient } from "@cirugias-cruz/domain";
import { NotFoundError } from "../shared/not-found-error.js";
import { InMemoryPatientRepository } from "../testing/fakes.js";
import { getPatient } from "./get-patient.js";

const PHYSICIAN_ID = "physician-1";
const OTHER_PHYSICIAN_ID = "physician-2";

function buildPatient(id: string, physicianId: string): Patient {
  return Patient.create({
    id,
    physicianId,
    firstName: "Ana",
    lastName: "Gomez",
    phone: "+54 11 5555-5555",
    email: "ana@example.com",
    dateOfBirth: new Date("1990-01-01"),
  });
}

describe("getPatient", () => {
  it("returns the patient when it belongs to the acting physician", async () => {
    const patientRepository = new InMemoryPatientRepository();
    patientRepository.seed(buildPatient("patient-1", PHYSICIAN_ID));

    const result = await getPatient({ patientRepository })({
      physicianId: PHYSICIAN_ID,
      patientId: "patient-1",
    });

    expect(result.id).toBe("patient-1");
  });

  it("throws NotFoundError when the patient does not exist", async () => {
    const patientRepository = new InMemoryPatientRepository();

    await expect(
      getPatient({ patientRepository })({ physicianId: PHYSICIAN_ID, patientId: "does-not-exist" }),
    ).rejects.toThrow(NotFoundError);
  });

  it("throws NotFoundError, not a permission error, for another physician's patient", async () => {
    const patientRepository = new InMemoryPatientRepository();
    patientRepository.seed(buildPatient("patient-1", OTHER_PHYSICIAN_ID));

    await expect(
      getPatient({ patientRepository })({ physicianId: PHYSICIAN_ID, patientId: "patient-1" }),
    ).rejects.toThrow(NotFoundError);
  });
});
