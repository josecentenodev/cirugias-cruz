import { describe, expect, it } from "vitest";
import { CustomField } from "../shared/custom-field.js";
import { ControlDefinition } from "./control-definition.js";
import { ProcedureType } from "./procedure-type.js";

const cappedDefinition = (overrides: { id?: string; name?: string } = {}) =>
  ControlDefinition.create({
    id: overrides.id ?? "def-1",
    name: overrides.name ?? "Pain scale",
    occurrenceRule: { mode: "capped", count: 4, period: { every: 24, unit: "hours" } },
  });

const numberField = () =>
  CustomField.create({
    id: "cf-1",
    name: "Pain (EVA)",
    scope: "CONTROL",
    constraint: { valueType: "NUMBER", unit: "0-10", min: 0, max: 10 },
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

  it("accepts an optional description", () => {
    const procedureType = ProcedureType.create({
      ...validAttributes,
      description: "Crecimiento fibrovascular conjuntival",
    });

    expect(procedureType.description).toBe("Crecimiento fibrovascular conjuntival");
  });

  it("can be modified by its owning physician", () => {
    const procedureType = ProcedureType.create(validAttributes);

    procedureType.modify({ description: "vía subconjuntival" }, "physician-1");

    expect(procedureType.description).toBe("vía subconjuntival");
  });

  it("cannot be modified by a physician from another tenant", () => {
    const procedureType = ProcedureType.create(validAttributes);

    expect(() =>
      procedureType.modify({ description: "amniotic membrane" }, "physician-2"),
    ).toThrow();
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
      scope: "SURGERY",
      constraint: { valueType: "TEXT" },
    });

    expect(() => procedureType.addCustomField(duplicate, "physician-1")).toThrow();
  });

  it("starts with no control definitions", () => {
    const procedureType = ProcedureType.create(validAttributes);

    expect(procedureType.controlDefinitions).toHaveLength(0);
  });

  it("lets its owning physician add a control definition", () => {
    const procedureType = ProcedureType.create(validAttributes);

    procedureType.addControlDefinition(cappedDefinition(), "physician-1");

    expect(procedureType.controlDefinitions).toHaveLength(1);
    expect(procedureType.controlDefinitions[0]?.name).toBe("Pain scale");
  });

  it("rejects a control definition with a name already used on this ProcedureType", () => {
    const procedureType = ProcedureType.create(validAttributes);
    procedureType.addControlDefinition(cappedDefinition(), "physician-1");

    expect(() =>
      procedureType.addControlDefinition(
        cappedDefinition({ id: "def-2", name: "Pain scale" }),
        "physician-1",
      ),
    ).toThrow();
  });

  it("rejects adding a control definition by a physician from another tenant", () => {
    const procedureType = ProcedureType.create(validAttributes);

    expect(() => procedureType.addControlDefinition(cappedDefinition(), "physician-2")).toThrow();
  });

  it("edits an unused control definition but freezes it once inUse", () => {
    const procedureType = ProcedureType.create(validAttributes);
    procedureType.addControlDefinition(cappedDefinition(), "physician-1");

    procedureType.editControlDefinition("def-1", { name: "Pain scale (EVA)" }, "physician-1", {
      inUse: false,
    });
    expect(procedureType.controlDefinitions[0]?.name).toBe("Pain scale (EVA)");

    expect(() =>
      procedureType.editControlDefinition("def-1", { name: "locked" }, "physician-1", {
        inUse: true,
      }),
    ).toThrow();
  });

  it("removes an unused control definition but freezes removal once inUse", () => {
    const procedureType = ProcedureType.create(validAttributes);
    procedureType.addControlDefinition(cappedDefinition(), "physician-1");

    expect(() =>
      procedureType.removeControlDefinition("def-1", "physician-1", { inUse: true }),
    ).toThrow();

    procedureType.removeControlDefinition("def-1", "physician-1", { inUse: false });
    expect(procedureType.controlDefinitions).toHaveLength(0);
  });

  it("edits an unused CustomField but freezes it once inUse", () => {
    const procedureType = ProcedureType.create(validAttributes);
    procedureType.addCustomField(numberField(), "physician-1");

    const renamed = CustomField.create({
      id: "cf-1",
      name: "Pain (0-10)",
      scope: "CONTROL",
      constraint: { valueType: "NUMBER", unit: "0-10", min: 0, max: 10 },
    });

    procedureType.editCustomField("cf-1", renamed, "physician-1", { inUse: false });
    expect(procedureType.customFields[0]?.name).toBe("Pain (0-10)");

    expect(() =>
      procedureType.editCustomField("cf-1", renamed, "physician-1", { inUse: true }),
    ).toThrow();
  });

  it("removes an unused CustomField but freezes removal once inUse", () => {
    const procedureType = ProcedureType.create(validAttributes);
    procedureType.addCustomField(numberField(), "physician-1");

    expect(() => procedureType.removeCustomField("cf-1", "physician-1", { inUse: true })).toThrow();

    procedureType.removeCustomField("cf-1", "physician-1", { inUse: false });
    expect(procedureType.customFields).toHaveLength(0);
  });

  it("reconstitutes with its previously saved control definitions", () => {
    const procedureType = ProcedureType.reconstitute({
      ...validAttributes,
      customFields: [],
      controlDefinitions: [
        {
          id: "def-1",
          name: "Pain scale",
          occurrenceRule: { mode: "capped", count: 4, period: { every: 24, unit: "hours" } },
        },
      ],
    });

    expect(procedureType.controlDefinitions).toHaveLength(1);
    expect(procedureType.controlDefinitions[0]?.occurrenceRule).toEqual({
      mode: "capped",
      count: 4,
      period: { every: 24, unit: "hours" },
    });
  });

  it("reconstitutes with its previously saved CustomField definitions", () => {
    const procedureType = ProcedureType.reconstitute({
      ...validAttributes,
      customFields: [
        {
          id: "cf-1",
          name: "Pain (EVA)",
          scope: "CONTROL",
          constraint: { valueType: "NUMBER", unit: "0-10", min: 0, max: 10 },
        },
      ],
    });

    expect(procedureType.customFields).toHaveLength(1);
    expect(procedureType.customFields[0]?.id).toBe("cf-1");
  });
});
