import { DomainError } from "../shared/domain-error.js";
import { Person, type PersonAttributes } from "../shared/person.js";

export interface PhysicianAttributes extends PersonAttributes {
  id: string;
}

/**
 * The Physician IS the Tenant — there is no separate Tenant concept.
 * Other entities reference a Physician only by id (physicianId).
 */
export class Physician {
  private constructor(
    private readonly id_: string,
    private readonly person: Person,
  ) {}

  static create(attributes: PhysicianAttributes): Physician {
    if (!attributes.id.trim()) {
      throw new DomainError("Physician requires an id");
    }

    const person = Person.create(attributes);
    return new Physician(attributes.id, person);
  }

  get id(): string {
    return this.id_;
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
}
