import { CustomFieldValue, type CustomFieldValueAttributes } from "../shared/custom-field-value.js";
import { DomainError } from "../shared/domain-error.js";

export type ControlAuthor =
  { type: "physician"; physicianId: string } | { type: "resident"; residentId: string };

export interface ControlAttributes {
  id: string;
  observations: string;
  recordedAt: Date;
  author: ControlAuthor;
  /** CONTROL-scoped CustomField values recorded on this Control (ADR 0018). */
  customFieldValues?: CustomFieldValueAttributes[];
}

/**
 * A Control has no lifecycle or meaning outside its owning Surgery.
 * It is an internal entity of the Surgery aggregate — it must only be
 * created/modified/removed through Surgery, never constructed directly
 * by outside code with mutation intent.
 */
export class Control {
  private readonly customFieldValues_: CustomFieldValue[] = [];

  private constructor(
    private readonly id_: string,
    private observations_: string,
    private recordedAt_: Date,
    private readonly author_: ControlAuthor,
  ) {}

  static create(attributes: ControlAttributes): Control {
    if (!attributes.id.trim()) {
      throw new DomainError("Control requires an id");
    }
    if (!attributes.observations.trim()) {
      throw new DomainError("Control requires observations");
    }
    if (!attributes.recordedAt) {
      throw new DomainError("Control requires a date/time");
    }
    if (!attributes.author) {
      throw new DomainError("Control requires an author");
    }

    const control = new Control(
      attributes.id,
      attributes.observations,
      attributes.recordedAt,
      attributes.author,
    );

    for (const valueAttributes of attributes.customFieldValues ?? []) {
      control.customFieldValues_.push(CustomFieldValue.create(valueAttributes));
    }

    return control;
  }

  get id(): string {
    return this.id_;
  }

  get observations(): string {
    return this.observations_;
  }

  get recordedAt(): Date {
    return this.recordedAt_;
  }

  get author(): ControlAuthor {
    return this.author_;
  }

  get customFieldValues(): readonly CustomFieldValue[] {
    return [...this.customFieldValues_];
  }

  updateObservations(observations: string): void {
    if (!observations.trim()) {
      throw new DomainError("Control requires observations");
    }
    this.observations_ = observations;
  }

  updateRecordedAt(recordedAt: Date): void {
    if (!recordedAt) {
      throw new DomainError("Control requires a date/time");
    }
    this.recordedAt_ = recordedAt;
  }
}
