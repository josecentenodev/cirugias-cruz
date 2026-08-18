import { DomainError } from "./domain-error.js";

export interface PersonAttributes {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  dateOfBirth: Date;
  metadata?: Record<string, unknown>;
}

/**
 * Shared personal-information shape for Physician, Resident and Patient.
 * Composition, not inheritance: each entity holds a Person rather than
 * extending a common base class.
 */
export class Person {
  private constructor(private readonly attributes: PersonAttributes) {}

  static create(attributes: PersonAttributes): Person {
    if (!attributes.firstName.trim()) {
      throw new DomainError("firstName is required");
    }
    if (!attributes.lastName.trim()) {
      throw new DomainError("lastName is required");
    }
    if (!attributes.phone.trim()) {
      throw new DomainError("phone is required");
    }
    if (!attributes.email.trim()) {
      throw new DomainError("email is required");
    }
    if (!attributes.dateOfBirth) {
      throw new DomainError("dateOfBirth is required");
    }

    return new Person({ ...attributes });
  }

  get firstName(): string {
    return this.attributes.firstName;
  }

  get lastName(): string {
    return this.attributes.lastName;
  }

  get phone(): string {
    return this.attributes.phone;
  }

  get email(): string {
    return this.attributes.email;
  }

  get dateOfBirth(): Date {
    return this.attributes.dateOfBirth;
  }

  get metadata(): Record<string, unknown> | undefined {
    return this.attributes.metadata;
  }

  equals(other: Person): boolean {
    return (
      this.firstName === other.firstName &&
      this.lastName === other.lastName &&
      this.phone === other.phone &&
      this.email === other.email &&
      this.dateOfBirth.getTime() === other.dateOfBirth.getTime()
    );
  }
}
