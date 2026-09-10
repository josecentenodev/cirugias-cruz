import { assertActingPhysicianOwnsResource } from "../shared/assert-tenant-owner.js";
import { CustomField, type CustomFieldAttributes } from "../shared/custom-field.js";
import { DomainError } from "../shared/domain-error.js";
import { ControlDefinition, type ControlDefinitionAttributes } from "./control-definition.js";
import type { ControlOccurrenceRule } from "./control-occurrence-rule.js";

export interface ProcedureTypeAttributes {
  id: string;
  physicianId: string;
  name: string;
  description?: string;
}

/** Raised by every scheme mutator when the target definition has recorded data (ADR 0027). */
const FROZEN_MESSAGE = "this field/control has recorded data and can no longer be changed";

/**
 * A Procedure Type is owned and managed by a single Physician/Tenant.
 * It is never deleted — no deletion method is exposed by this class
 * (ADR 0011). ADR 0027 adds mutation *within* its scheme.
 *
 * It owns its CustomField definitions and (ADR 0026) its control
 * definitions as internal collections, mirroring how Control lives inside
 * Surgery: neither has meaning or consistency outside the ProcedureType
 * that defines it (name unique within the type), so neither is a separate
 * aggregate with its own repository.
 */
export class ProcedureType {
  private readonly customFields_: CustomField[] = [];
  private readonly controlDefinitions_: ControlDefinition[] = [];

  private constructor(
    private readonly id_: string,
    private readonly physicianId_: string,
    private name_: string,
    private description_: string | undefined,
  ) {}

  static create(attributes: ProcedureTypeAttributes): ProcedureType {
    if (!attributes.id.trim()) {
      throw new DomainError("ProcedureType requires an id");
    }
    if (!attributes.physicianId.trim()) {
      throw new DomainError("ProcedureType must belong to a physician (tenant)");
    }
    if (!attributes.name.trim()) {
      throw new DomainError("ProcedureType requires a name");
    }

    return new ProcedureType(
      attributes.id,
      attributes.physicianId,
      attributes.name,
      attributes.description,
    );
  }

  /**
   * Rebuilds a ProcedureType already known to be valid — from persisted
   * state, including its CustomField and control definitions — without
   * re-running "is this a valid new ProcedureType" checks. Mirrors
   * `Surgery.reconstitute()`.
   */
  static reconstitute(
    params: ProcedureTypeAttributes & {
      customFields: CustomFieldAttributes[];
      controlDefinitions?: ControlDefinitionAttributes[];
    },
  ): ProcedureType {
    const procedureType = new ProcedureType(
      params.id,
      params.physicianId,
      params.name,
      params.description,
    );

    for (const customFieldAttributes of params.customFields) {
      procedureType.customFields_.push(CustomField.create(customFieldAttributes));
    }
    for (const controlDefinitionAttributes of params.controlDefinitions ?? []) {
      procedureType.controlDefinitions_.push(ControlDefinition.create(controlDefinitionAttributes));
    }

    return procedureType;
  }

  get id(): string {
    return this.id_;
  }

  get physicianId(): string {
    return this.physicianId_;
  }

  get name(): string {
    return this.name_;
  }

  get description(): string | undefined {
    return this.description_;
  }

  get customFields(): readonly CustomField[] {
    return [...this.customFields_];
  }

  get controlDefinitions(): readonly ControlDefinition[] {
    return [...this.controlDefinitions_];
  }

  modify(changes: { name?: string; description?: string }, actingPhysicianId: string): void {
    assertActingPhysicianOwnsResource(this.physicianId_, actingPhysicianId);

    if (changes.name !== undefined) {
      if (!changes.name.trim()) {
        throw new DomainError("ProcedureType requires a name");
      }
      this.name_ = changes.name;
    }
    if (changes.description !== undefined) {
      this.description_ = changes.description;
    }
  }

  /**
   * Adds a new CustomField definition. A field's name must be unique
   * within this ProcedureType — the invariant that justifies keeping
   * CustomField definitions inside this aggregate.
   */
  addCustomField(field: CustomField, actingPhysicianId: string): void {
    assertActingPhysicianOwnsResource(this.physicianId_, actingPhysicianId);

    if (this.customFields_.some((existing) => existing.name === field.name)) {
      throw new DomainError(`ProcedureType already has a CustomField named "${field.name}"`);
    }

    this.customFields_.push(field);
  }

  /**
   * Replaces an existing CustomField definition wholesale (all-or-nothing,
   * ADR 0027). `inUse` is the freeze flag resolved upstream in the
   * Application layer; when true, the edit is rejected.
   */
  editCustomField(
    fieldId: string,
    replacement: CustomField,
    actingPhysicianId: string,
    context: { inUse: boolean },
  ): void {
    assertActingPhysicianOwnsResource(this.physicianId_, actingPhysicianId);

    const index = this.customFields_.findIndex((existing) => existing.id === fieldId);
    if (index === -1) {
      throw new DomainError("CustomField not found on this ProcedureType");
    }
    if (context.inUse) {
      throw new DomainError(FROZEN_MESSAGE);
    }
    if (
      this.customFields_.some(
        (existing) => existing.id !== fieldId && existing.name === replacement.name,
      )
    ) {
      throw new DomainError(`ProcedureType already has a CustomField named "${replacement.name}"`);
    }

    this.customFields_.splice(index, 1, replacement);
  }

  removeCustomField(fieldId: string, actingPhysicianId: string, context: { inUse: boolean }): void {
    assertActingPhysicianOwnsResource(this.physicianId_, actingPhysicianId);

    const index = this.customFields_.findIndex((existing) => existing.id === fieldId);
    if (index === -1) {
      throw new DomainError("CustomField not found on this ProcedureType");
    }
    if (context.inUse) {
      throw new DomainError(FROZEN_MESSAGE);
    }

    this.customFields_.splice(index, 1);
  }

  /**
   * Adds a new control definition (ADR 0026). Name unique within the
   * ProcedureType, mirroring `addCustomField`.
   */
  addControlDefinition(definition: ControlDefinition, actingPhysicianId: string): void {
    assertActingPhysicianOwnsResource(this.physicianId_, actingPhysicianId);

    if (this.controlDefinitions_.some((existing) => existing.name === definition.name)) {
      throw new DomainError(
        `ProcedureType already has a control definition named "${definition.name}"`,
      );
    }

    this.controlDefinitions_.push(definition);
  }

  editControlDefinition(
    definitionId: string,
    changes: { name?: string; occurrenceRule?: ControlOccurrenceRule },
    actingPhysicianId: string,
    context: { inUse: boolean },
  ): void {
    assertActingPhysicianOwnsResource(this.physicianId_, actingPhysicianId);

    const definition = this.controlDefinitions_.find((existing) => existing.id === definitionId);
    if (!definition) {
      throw new DomainError("Control definition not found on this ProcedureType");
    }
    if (context.inUse) {
      throw new DomainError(FROZEN_MESSAGE);
    }
    if (
      changes.name !== undefined &&
      this.controlDefinitions_.some(
        (existing) => existing.id !== definitionId && existing.name === changes.name,
      )
    ) {
      throw new DomainError(
        `ProcedureType already has a control definition named "${changes.name}"`,
      );
    }

    definition.applyChanges(changes);
  }

  removeControlDefinition(
    definitionId: string,
    actingPhysicianId: string,
    context: { inUse: boolean },
  ): void {
    assertActingPhysicianOwnsResource(this.physicianId_, actingPhysicianId);

    const index = this.controlDefinitions_.findIndex((existing) => existing.id === definitionId);
    if (index === -1) {
      throw new DomainError("Control definition not found on this ProcedureType");
    }
    if (context.inUse) {
      throw new DomainError(FROZEN_MESSAGE);
    }

    this.controlDefinitions_.splice(index, 1);
  }
}
