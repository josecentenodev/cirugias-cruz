export interface PatientAttributes {
  id: string;
  physicianId: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  dateOfBirth: Date;
  metadata?: Record<string, unknown>;
  observations?: string;
}

export class Patient {
  private constructor(private readonly attributes: PatientAttributes) {}

  static create(attributes: PatientAttributes): Patient {
    if (!attributes.id.trim()) {
      throw new Error("Patient requires an id");
    }
    if (!attributes.physicianId.trim()) {
      throw new Error("Patient must belong to a physician (tenant)");
    }

    return new Patient({ ...attributes });
  }

  get id(): string {
    return this.attributes.id;
  }

  get physicianId(): string {
    return this.attributes.physicianId;
  }

  sameIdentityAs(other: Patient): boolean {
    return this.physicianId === other.physicianId && this.id === other.id;
  }
}
