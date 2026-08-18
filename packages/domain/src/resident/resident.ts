import { DomainError } from "../shared/domain-error.js";
import { Person, type PersonAttributes } from "../shared/person.js";

export interface ResidentAttributes extends PersonAttributes {
  id: string;
  physicianId: string;
}

/**
 * A Resident belongs exclusively to one Physician/Tenant.
 *
 * Assignment to a Patient and clinical participation in a Surgery are
 * different relationships and are NOT tracked here:
 * - assignment lives on Patient (see Patient.assignResident)
 * - participation lives on Surgery (see Surgery.recordControl /
 *   Surgery.hasResidentParticipated)
 */
export class Resident {
  private constructor(
    private readonly id_: string,
    private readonly physicianId_: string,
    private readonly person: Person,
  ) {}

  static create(attributes: ResidentAttributes): Resident {
    if (!attributes.id.trim()) {
      throw new DomainError("Resident requires an id");
    }
    if (!attributes.physicianId.trim()) {
      throw new DomainError("Resident must belong to a physician (tenant)");
    }

    const person = Person.create(attributes);
    return new Resident(attributes.id, attributes.physicianId, person);
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

  get metadata(): Record<string, unknown> | undefined {
    return this.person.metadata;
  }

  belongsToTenant(physicianId: string): boolean {
    return this.physicianId_ === physicianId;
  }
}
