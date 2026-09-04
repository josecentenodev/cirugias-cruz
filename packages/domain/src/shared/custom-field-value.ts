import { DomainError } from "./domain-error.js";

export type CustomFieldValueData = string | number | Date;

export interface CustomFieldValueAttributes {
  definitionId: string;
  value: CustomFieldValueData;
}

/**
 * A recorded value for one CustomField definition. It only carries the
 * shape `{ definitionId, value }` — it deliberately does not validate the
 * value against its definition's `valueType`/constraint, because Surgery
 * and Control (which hold these) never reach across the aggregate
 * boundary to fetch a ProcedureType's CustomField definitions (Surgery
 * references ProcedureType only by id). That coherence check happens in
 * the Application layer, which already loads both sides to perform
 * cross-aggregate tenant checks today.
 */
export class CustomFieldValue {
  private constructor(private readonly attributes: CustomFieldValueAttributes) {}

  static create(attributes: CustomFieldValueAttributes): CustomFieldValue {
    if (!attributes.definitionId.trim()) {
      throw new DomainError("CustomFieldValue requires a definitionId");
    }
    if (attributes.value === undefined || attributes.value === null) {
      throw new DomainError("CustomFieldValue requires a value");
    }

    return new CustomFieldValue({ ...attributes });
  }

  get definitionId(): string {
    return this.attributes.definitionId;
  }

  get value(): CustomFieldValueData {
    return this.attributes.value;
  }
}
