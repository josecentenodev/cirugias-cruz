import { describe, expect, it } from "vitest";
import { Patient } from "@cirugias-cruz/domain";
import { InMemoryPatientRepository } from "../testing/fakes.js";
import { listPatients } from "./list-patients.js";

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

describe("listPatients", () => {
  it("returns only the acting physician's patients", async () => {
    const patientRepository = new InMemoryPatientRepository();
    patientRepository.seed(buildPatient("patient-1", PHYSICIAN_ID));
    patientRepository.seed(buildPatient("patient-2", PHYSICIAN_ID));
    patientRepository.seed(buildPatient("patient-3", OTHER_PHYSICIAN_ID));

    const result = await listPatients({ patientRepository })({ physicianId: PHYSICIAN_ID });

    expect(result.map((patient) => patient.id).sort()).toEqual(["patient-1", "patient-2"]);
  });

  it("returns an empty array when the physician has no patients", async () => {
    const patientRepository = new InMemoryPatientRepository();

    const result = await listPatients({ patientRepository })({ physicianId: PHYSICIAN_ID });

    expect(result).toEqual([]);
  });
});
