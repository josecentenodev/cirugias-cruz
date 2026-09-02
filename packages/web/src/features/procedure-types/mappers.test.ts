import { describe, expect, it } from "vitest";
import { toProcedureTypeView } from "./mappers";
import type { ProcedureTypeDto } from "./dtos";

function buildDto(overrides: Partial<ProcedureTypeDto> = {}): ProcedureTypeDto {
  return {
    id: "procedure-type-1",
    physicianId: "physician-1",
    name: "Pterigión",
    ...overrides,
  };
}

describe("toProcedureTypeView", () => {
  it("passes the name through unchanged", () => {
    expect(toProcedureTypeView(buildDto()).name).toBe("Pterigión");
  });

  it("shows a placeholder when description is absent", () => {
    expect(toProcedureTypeView(buildDto()).description).toBe("—");
  });

  it("shows a placeholder when technique is absent", () => {
    expect(toProcedureTypeView(buildDto()).technique).toBe("—");
  });

  it("passes description and technique through when present", () => {
    const view = toProcedureTypeView(
      buildDto({ description: "Removal of pterygium", technique: "Conjunctival autograft" }),
    );
    expect(view.description).toBe("Removal of pterygium");
    expect(view.technique).toBe("Conjunctival autograft");
  });
});
