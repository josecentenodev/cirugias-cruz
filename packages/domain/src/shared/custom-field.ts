export interface CustomFieldAttributes {
  name: string;
  description?: string;
  unit: string;
  magnitude: string;
}

export class CustomField {
  private constructor(private readonly attributes: CustomFieldAttributes) {}

  static create(attributes: CustomFieldAttributes): CustomField {
    if (!attributes.name.trim()) {
      throw new Error("CustomField requires a name");
    }
    if (!attributes.unit.trim()) {
      throw new Error("CustomField requires a unit");
    }
    if (!attributes.magnitude.trim()) {
      throw new Error("CustomField requires a magnitude");
    }

    return new CustomField({ ...attributes });
  }

  get name(): string {
    return this.attributes.name;
  }

  get description(): string | undefined {
    return this.attributes.description;
  }

  get unit(): string {
    return this.attributes.unit;
  }

  get magnitude(): string {
    return this.attributes.magnitude;
  }

  equals(other: CustomField): boolean {
    return (
      this.attributes.name === other.attributes.name &&
      this.attributes.description === other.attributes.description &&
      this.attributes.unit === other.attributes.unit &&
      this.attributes.magnitude === other.attributes.magnitude
    );
  }
}
