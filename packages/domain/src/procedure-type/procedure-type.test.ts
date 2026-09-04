import { describe, expect, it } from "vitest";
import { CustomField } from "../shared/custom-field.js";
import { ProcedureType } from "./procedure-type.js";

const numberField = () =>
  CustomField.create({
    id: "cf-1",
    name: "Pain (EVA)",
    unit: "0-10",
    magnitude: "pain",
    scope: "CONTROL",
    constraint: { valueType: "NUMBER", min: 0, max: 10 },
  });

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

    expect(() => procedureType.modify({ technique: "amniotic membrane" }, "physician-2")).toThrow();
  });

  it("has no deletion capability — a ProcedureType must never be deleted", () => {
    const procedureType = ProcedureType.create(validAttributes) as unknown as Record<
      string,
      unknown
    >;

    expect(procedureType["delete"]).toBeUndefined();
  });

  it("starts with no CustomField definitions", () => {
    const procedureType = ProcedureType.create(validAttributes);

    expect(procedureType.customFields).toHaveLength(0);
  });

  it("lets its owning physician add a CustomField definition", () => {
    const procedureType = ProcedureType.create(validAttributes);

    procedureType.addCustomField(numberField(), "physician-1");

    expect(procedureType.customFields).toHaveLength(1);
    expect(procedureType.customFields[0]?.name).toBe("Pain (EVA)");
  });

  it("rejects adding a CustomField by a physician from another tenant", () => {
    const procedureType = ProcedureType.create(validAttributes);

    expect(() => procedureType.addCustomField(numberField(), "physician-2")).toThrow();
  });

  it("rejects a second CustomField with a name already used on this ProcedureType", () => {
    const procedureType = ProcedureType.create(validAttributes);
    procedureType.addCustomField(numberField(), "physician-1");

    const duplicate = CustomField.create({
      id: "cf-2",
      name: "Pain (EVA)",
      unit: "0-10",
      magnitude: "pain",
      scope: "SURGERY",
      constraint: { valueType: "TEXT" },
    });

    expect(() => procedureType.addCustomField(duplicate, "physician-1")).toThrow();
  });

  it("reconstitutes with its previously saved CustomField definitions", () => {
    const procedureType = ProcedureType.reconstitute({
      ...validAttributes,
      customFields: [
        {
          id: "cf-1",
          name: "Pain (EVA)",
          unit: "0-10",
          magnitude: "pain",
          scope: "CONTROL",
          constraint: { valueType: "NUMBER", min: 0, max: 10 },
        },
      ],
    });

    expect(procedureType.customFields).toHaveLength(1);
    expect(procedureType.customFields[0]?.id).toBe("cf-1");
  });
});
