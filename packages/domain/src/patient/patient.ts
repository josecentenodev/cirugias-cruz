import { DomainError } from "../shared/domain-error.js";
import { Person, type PersonAttributes } from "../shared/person.js";

export interface PatientAttributes extends PersonAttributes {
  id: string;
  physicianId: string;
  /**
   * National ID / identity document number. Optional and free-form: not
   * every patient has one (newborns, foreign patients — the same field
   * can hold a passport number), and the platform stores minimal PII by
   * design. Uniqueness-when-present is a per-tenant rule enforced in the
   * Application layer + a DB unique index (ADR 0021), not here — no
   * aggregate owns the physician's set of patients.
   */
  dni?: string;
  observations?: string;
}

/**
 * There is no Resident ↔ Patient relationship. A Resident is assigned
 * directly to a Surgery by the Physician (see Surgery.assignResident) —
 * Patient does not track residents in any way.
 */
export class Patient {
  private constructor(
    private readonly id_: string,
    private readonly physicianId_: string,
    private readonly person: Person,
    private readonly dni_: string | undefined,
    private readonly observations_: string | undefined,
  ) {}

  static create(attributes: PatientAttributes): Patient {
    if (!attributes.id.trim()) {
      throw new DomainError("Patient requires an id");
    }
    if (!attributes.physicianId.trim()) {
      throw new DomainError("Patient must belong to a physician (tenant)");
    }

    const person = Person.create(attributes);
    const dni = attributes.dni?.trim() || undefined;
    return new Patient(attributes.id, attributes.physicianId, person, dni, attributes.observations);
  }

  get id(): string {
    return this.id_;
  }

  get physicianId(): string {
    return this.physicianId_;
  }

  get firstName(): string {
    return this.person.firstName;
  }

  get lastName(): string {
    return this.person.lastName;
  }

  get phone(): string {
    return this.person.phone;
  }

  get email(): string {
    return this.person.email;
  }

  get dateOfBirth(): Date {
    return this.person.dateOfBirth;
  }

  get dni(): string | undefined {
    return this.dni_;
  }

  get metadata(): Record<string, unknown> | undefined {
    return this.person.metadata;
  }

  get observations(): string | undefined {
    return this.observations_;
  }

  sameIdentityAs(other: Patient): boolean {
    return this.physicianId_ === other.physicianId_ && this.id_ === other.id_;
  }
}
