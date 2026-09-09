import { DomainError } from "../shared/domain-error.js";

export interface PatientAttributes {
  id: string;
  physicianId: string;
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  /**
   * National ID / identity document number. Optional and free-form: not
   * every patient has one (newborns, foreign patients — the same field
   * can hold a passport number), and the platform stores minimal PII by
   * design. Uniqueness-when-present is a per-tenant rule enforced in the
   * Application layer + a DB unique index (ADR 0021), not here — no
   * aggregate owns the physician's set of patients.
   */
  dni?: string;
  metadata?: Record<string, unknown>;
  observations?: string;
}

/**
 * Patient carries no contact PII (ADR 0025). It does NOT compose the
 * shared `Person` shape used by Physician/Resident — a patient is
 * identified clinically by name, date of birth and an optional `dni`,
 * never by phone or email. `firstName` / `lastName` / `dateOfBirth` are
 * inlined here with their own presence checks.
 *
 * There is no Resident ↔ Patient relationship. A Resident is assigned
 * directly to a Surgery by the Physician (see Surgery.assignResident) —
 * Patient does not track residents in any way.
 */
export class Patient {
  private constructor(
    private readonly id_: string,
    private readonly physicianId_: string,
    private readonly firstName_: string,
    private readonly lastName_: string,
    private readonly dateOfBirth_: Date,
    private readonly dni_: string | undefined,
    private readonly metadata_: Record<string, unknown> | undefined,
    private readonly observations_: string | undefined,
  ) {}

  static create(attributes: PatientAttributes): Patient {
    if (!attributes.id.trim()) {
      throw new DomainError("Patient requires an id");
    }
    if (!attributes.physicianId.trim()) {
      throw new DomainError("Patient must belong to a physician (tenant)");
    }
    if (!attributes.firstName.trim()) {
      throw new DomainError("firstName is required");
    }
    if (!attributes.lastName.trim()) {
      throw new DomainError("lastName is required");
    }
    if (!attributes.dateOfBirth) {
      throw new DomainError("dateOfBirth is required");
    }

    const dni = attributes.dni?.trim() || undefined;
    return new Patient(
      attributes.id,
      attributes.physicianId,
      attributes.firstName,
      attributes.lastName,
      attributes.dateOfBirth,
      dni,
      attributes.metadata,
      attributes.observations,
    );
  }

  get id(): string {
    return this.id_;
  }

  get physicianId(): string {
    return this.physicianId_;
  }

  get firstName(): string {
    return this.firstName_;
  }

  get lastName(): string {
    return this.lastName_;
  }

  get dateOfBirth(): Date {
    return this.dateOfBirth_;
  }

  get dni(): string | undefined {
    return this.dni_;
  }

  get metadata(): Record<string, unknown> | undefined {
    return this.metadata_;
  }

  get observations(): string | undefined {
    return this.observations_;
  }

  sameIdentityAs(other: Patient): boolean {
    return this.physicianId_ === other.physicianId_ && this.id_ === other.id_;
  }
}
