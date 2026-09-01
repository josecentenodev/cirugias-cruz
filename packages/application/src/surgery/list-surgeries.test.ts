import { describe, expect, it } from "vitest";
import { Surgery } from "@cirugias-cruz/domain";
import { InMemorySurgeryRepository } from "../testing/fakes.js";
import { listSurgeries } from "./list-surgeries.js";

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

describe("listSurgeries", () => {
  it("returns only the acting physician's surgeries", async () => {
    const surgeryRepository = new InMemorySurgeryRepository();
    surgeryRepository.seed(buildSurgery("surgery-1", PHYSICIAN_ID));
    surgeryRepository.seed(buildSurgery("surgery-2", OTHER_PHYSICIAN_ID));

    const result = await listSurgeries({ surgeryRepository })({ physicianId: PHYSICIAN_ID });

    expect(result.map((surgery) => surgery.id)).toEqual(["surgery-1"]);
  });

  it("returns an empty array when the physician has no surgeries", async () => {
    const surgeryRepository = new InMemorySurgeryRepository();

    const result = await listSurgeries({ surgeryRepository })({ physicianId: PHYSICIAN_ID });

    expect(result).toEqual([]);
  });
});
