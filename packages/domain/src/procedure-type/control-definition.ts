import { DomainError } from "../shared/domain-error.js";
import {
  parseControlOccurrenceRule,
  type ControlOccurrenceRule,
} from "./control-occurrence-rule.js";

export interface ControlDefinitionAttributes {
  id: string;
  name: string;
  occurrenceRule: ControlOccurrenceRule;
}

/**
 * A control definition belongs to a `ProcedureType`'s scheme (ADR 0026).
 * It carries a physician-entered `name` and an occurrence rule (typing +
 * cardinality). For the MVP it does NOT own a subset of `CONTROL`-scoped
 * CustomFields — those stay attached to the `ProcedureType` and render on
 * every control form (design doc §2.1).
 *
 * Mirrors `CustomField`: an internal entity of the `ProcedureType`
 * aggregate, name-unique within it, with no repository of its own.
 */
export class ControlDefinition {
  private constructor(
    private readonly id_: string,
    private name_: string,
    private occurrenceRule_: ControlOccurrenceRule,
  ) {}

  static create(attributes: ControlDefinitionAttributes): ControlDefinition {
    if (!attributes.id.trim()) {
      throw new DomainError("ControlDefinition requires an id");
    }
    if (!attributes.name.trim()) {
      throw new DomainError("ControlDefinition requires a name");
    }

    return new ControlDefinition(
      attributes.id,
      attributes.name,
      parseControlOccurrenceRule(attributes.occurrenceRule),
    );
  }

  get id(): string {
    return this.id_;
  }

  get name(): string {
    return this.name_;
  }

  get occurrenceRule(): ControlOccurrenceRule {
    return this.occurrenceRule_;
  }

  /**
   * All-or-nothing edit (ADR 0027). The caller must have already verified
   * the definition has no recorded data — the freeze check lives in the
   * Application layer.
   */
  applyChanges(changes: { name?: string; occurrenceRule?: ControlOccurrenceRule }): void {
    if (changes.name !== undefined) {
      if (!changes.name.trim()) {
        throw new DomainError("ControlDefinition requires a name");
      }
      this.name_ = changes.name;
    }
    if (changes.occurrenceRule !== undefined) {
      this.occurrenceRule_ = parseControlOccurrenceRule(changes.occurrenceRule);
    }
  }

  equals(other: ControlDefinition): boolean {
    return this.id_ === other.id_;
  }
}
