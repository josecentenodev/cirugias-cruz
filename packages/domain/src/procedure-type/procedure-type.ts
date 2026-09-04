import { assertActingPhysicianOwnsResource } from "../shared/assert-tenant-owner.js";
import { CustomField, type CustomFieldAttributes } from "../shared/custom-field.js";
import { DomainError } from "../shared/domain-error.js";

export interface ProcedureTypeAttributes {
  id: string;
  physicianId: string;
  name: string;
  description?: string;
  /**
   * Surgical technique. Kept as free text on purpose: the final
   * ProcedureType model is intentionally extensible and not closed to a
   * fixed set (DOMAIN.md §8). For Pterygium the currently known options
   * are documented in DOMAIN.md, not enforced here as a fixed enum.
   */
  technique?: string;
}

/**
 * A Procedure Type is owned and managed by a single Physician/Tenant.
 * It is never deleted — no deletion method is exposed by this class.
 *
 * It owns its CustomField definitions as an internal collection (ADR
 * 0018), mirroring how Control lives inside Surgery: a CustomField
 * definition has no meaning or consistency outside the ProcedureType
 * that defines it (its name must be unique within that ProcedureType),
 * so it is not a separate aggregate with its own repository.
 */
export class ProcedureType {
  private readonly customFields_: CustomField[] = [];

  private constructor(
    private readonly id_: string,
    private readonly physicianId_: string,
    private name_: string,
    private description_: string | undefined,
    private technique_: string | undefined,
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
      attributes.technique,
    );
  }

  /**
   * Rebuilds a ProcedureType already known to be valid — from persisted
   * state, including its CustomField definitions — without re-running
   * "is this a valid new ProcedureType" checks. Mirrors
   * `Surgery.reconstitute()`.
   */
  static reconstitute(
    params: ProcedureTypeAttributes & { customFields: CustomFieldAttributes[] },
  ): ProcedureType {
    const procedureType = new ProcedureType(
      params.id,
      params.physicianId,
      params.name,
      params.description,
      params.technique,
    );

    for (const customFieldAttributes of params.customFields) {
      procedureType.customFields_.push(CustomField.create(customFieldAttributes));
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

  get technique(): string | undefined {
    return this.technique_;
  }

  get customFields(): readonly CustomField[] {
    return [...this.customFields_];
  }

  modify(
    changes: { name?: string; description?: string; technique?: string },
    actingPhysicianId: string,
  ): void {
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
    if (changes.technique !== undefined) {
      this.technique_ = changes.technique;
    }
  }

  /**
   * Adds a new CustomField definition. A field's name must be unique
   * within this ProcedureType — this is the actual invariant that
   * justifies keeping CustomField definitions inside this aggregate
   * rather than as a standalone, independently-persisted concept: it
   * could not be enforced correctly if definitions were loaded/saved
   * independently of the ProcedureType they belong to.
   */
  addCustomField(field: CustomField, actingPhysicianId: string): void {
    assertActingPhysicianOwnsResource(this.physicianId_, actingPhysicianId);

    if (this.customFields_.some((existing) => existing.name === field.name)) {
      throw new DomainError(`ProcedureType already has a CustomField named "${field.name}"`);
    }

    this.customFields_.push(field);
  }
}
