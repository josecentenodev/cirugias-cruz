import { describe, expect, it } from "vitest";
import { ProcedureType } from "./procedure-type.js";

const validAttributes = {
  id: "procedure-type-1",
  physicianId: "physician-1",
  name: "Pterigión",
};

describe("ProcedureType", () => {
  it("belongs to the physician tenant that created it", () => {
    const procedureType = ProcedureType.create(validAttributes);

    expect(procedureType.physicianId).toBe("physician-1");
    expect(procedureType.name).toBe("Pterigión");
  });

  it("cannot be created without an owning physician (tenant)", () => {
    expect(() => ProcedureType.create({ ...validAttributes, physicianId: "" })).toThrow();
  });

  it("cannot be created without a name", () => {
    expect(() => ProcedureType.create({ ...validAttributes, name: "" })).toThrow();
  });

  it("accepts optional description and technique", () => {
    const procedureType = ProcedureType.create({
      ...validAttributes,
      description: "Crecimiento fibrovascular conjuntival",
      technique: "conjunctival autograft",
    });

    expect(procedureType.description).toBe("Crecimiento fibrovascular conjuntival");
    expect(procedureType.technique).toBe("conjunctival autograft");
  });

  it("can be modified by its owning physician", () => {
    const procedureType = ProcedureType.create(validAttributes);

    procedureType.modify({ technique: "conjunctival autograft + MMC" }, "physician-1");

    expect(procedureType.technique).toBe("conjunctival autograft + MMC");
  });

  it("cannot be modified by a physician from another tenant", () => {
    const procedureType = ProcedureType.create(validAttributes);

    expect(() =>
      procedureType.modify({ technique: "amniotic membrane" }, "physician-2"),
    ).toThrow();
  });

  it("has no deletion capability — a ProcedureType must never be deleted", () => {
    const procedureType = ProcedureType.create(validAttributes) as unknown as Record<
      string,
      unknown
    >;

    expect(procedureType["delete"]).toBeUndefined();
  });
});
