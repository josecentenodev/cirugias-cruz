import { assertActingPhysicianOwnsResource } from "../shared/assert-tenant-owner.js";
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
 */
export class ProcedureType {
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
}
