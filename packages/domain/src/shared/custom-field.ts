import { DomainError } from "./domain-error.js";

export type CustomFieldScope = "SURGERY" | "CONTROL";

export type CustomFieldConstraint =
  | { valueType: "NUMBER"; unit?: string; min?: number; max?: number }
  | { valueType: "ENUM"; options: string[] }
  | { valueType: "TEXT"; maxLength?: number }
  | { valueType: "DATE"; min?: Date; max?: Date };

export interface CustomFieldAttributes {
  id: string;
  name: string;
  description?: string;
  scope: CustomFieldScope;
  constraint: CustomFieldConstraint;
}

/**
 * A CustomField is a physician-defined data point, generic across
 * specialties on purpose (ADR 0018): the platform never hard-codes
 * clinical content, only this mechanism. Its constraint must always be
 * coherent with its own `valueType` (e.g. a TEXT field can never carry a
 * numeric min/max) — this is the one invariant `create()` enforces
 * beyond required-field presence.
 *
 * `unit` is metadata of a numeric measurement only, so it lives inside
 * the `NUMBER` constraint and nowhere else (ADR 0020, amending 0018): a
 * fixed-option, free-text or date field has no unit. There is no
 * separate `magnitude` attribute — the clinical dimension a field
 * measures is what its `name` already expresses.
 */
export class CustomField {
  private constructor(private readonly attributes: CustomFieldAttributes) {}

  static create(attributes: CustomFieldAttributes): CustomField {
    if (!attributes.id.trim()) {
      throw new DomainError("CustomField requires an id");
    }
    if (!attributes.name.trim()) {
      throw new DomainError("CustomField requires a name");
    }
    if (attributes.constraint.valueType === "ENUM" && attributes.constraint.options.length === 0) {
      throw new DomainError("An ENUM CustomField requires at least one option");
    }

    return new CustomField({ ...attributes });
  }

  get id(): string {
    return this.attributes.id;
  }

  get name(): string {
    return this.attributes.name;
  }

  get description(): string | undefined {
    return this.attributes.description;
  }

  /** The unit of measurement — only a `NUMBER` field can carry one (ADR 0020). */
  get unit(): string | undefined {
    return this.attributes.constraint.valueType === "NUMBER"
      ? this.attributes.constraint.unit
      : undefined;
  }

  get scope(): CustomFieldScope {
    return this.attributes.scope;
  }

  get valueType(): CustomFieldConstraint["valueType"] {
    return this.attributes.constraint.valueType;
  }

  get constraint(): CustomFieldConstraint {
    return this.attributes.constraint;
  }

  equals(other: CustomField): boolean {
    return this.attributes.id === other.attributes.id;
  }
}
