import { describe, expect, it } from "vitest";
import { Surgery } from "@cirugias-cruz/domain";
import { NotFoundError } from "../shared/not-found-error.js";
import { InMemorySurgeryRepository } from "../testing/fakes.js";
import { getSurgery } from "./get-surgery.js";

const PHYSICIAN_ID = "physician-1";
const OTHER_PHYSICIAN_ID = "physician-2";

function buildSurgery(id: string, physicianId: string): Surgery {
  return Surgery.create({
    id,
    physicianId,
    patientId: "patient-1",
    procedureTypeId: "procedure-type-1",
    performedAt: new Date("2026-01-10"),
  });
}

describe("getSurgery", () => {
  it("returns the surgery when it belongs to the acting physician", async () => {
    const surgeryRepository = new InMemorySurgeryRepository();
    surgeryRepository.seed(buildSurgery("surgery-1", PHYSICIAN_ID));

    const result = await getSurgery({ surgeryRepository })({
      physicianId: PHYSICIAN_ID,
      surgeryId: "surgery-1",
    });

    expect(result.id).toBe("surgery-1");
  });

  it("throws NotFoundError when the surgery does not exist", async () => {
    const surgeryRepository = new InMemorySurgeryRepository();

    await expect(
      getSurgery({ surgeryRepository })({ physicianId: PHYSICIAN_ID, surgeryId: "does-not-exist" }),
    ).rejects.toThrow(NotFoundError);
  });

  it("throws NotFoundError for another physician's surgery", async () => {
    const surgeryRepository = new InMemorySurgeryRepository();
    surgeryRepository.seed(buildSurgery("surgery-1", OTHER_PHYSICIAN_ID));

    await expect(
      getSurgery({ surgeryRepository })({ physicianId: PHYSICIAN_ID, surgeryId: "surgery-1" }),
    ).rejects.toThrow(NotFoundError);
  });
});
