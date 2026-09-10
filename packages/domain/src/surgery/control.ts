import { CustomFieldValue, type CustomFieldValueAttributes } from "../shared/custom-field-value.js";
import { DomainError } from "../shared/domain-error.js";

export type ControlAuthor =
  { type: "physician"; physicianId: string } | { type: "resident"; residentId: string };

export interface ControlAttributes {
  id: string;
  /**
   * Free-text observations. Optional (A4/F-08): a Control may carry only a
   * datetime + author + CustomField values. Empty/whitespace is stored as
   * `undefined`.
   */
  observations?: string;
  recordedAt: Date;
  author: ControlAuthor;
  /** The control definition (ADR 0026) this recording is an occurrence of, or none for an ad-hoc control. */
  definitionId?: string;
  /** CONTROL-scoped CustomField values recorded on this Control (ADR 0018). */
  customFieldValues?: CustomFieldValueAttributes[];
}

function normaliseObservations(observations: string | undefined): string | undefined {
  if (observations === undefined) {
    return undefined;
  }
  const trimmed = observations.trim();
  return trimmed.length === 0 ? undefined : observations;
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
    private observations_: string | undefined,
    private recordedAt_: Date,
    private readonly author_: ControlAuthor,
    private readonly definitionId_: string | undefined,
  ) {}

  static create(attributes: ControlAttributes): Control {
    if (!attributes.id.trim()) {
      throw new DomainError("Control requires an id");
    }
    if (!attributes.recordedAt) {
      throw new DomainError("Control requires a date/time");
    }
    if (!attributes.author) {
      throw new DomainError("Control requires an author");
    }

    const control = new Control(
      attributes.id,
      normaliseObservations(attributes.observations),
      attributes.recordedAt,
      attributes.author,
      attributes.definitionId,
    );

    for (const valueAttributes of attributes.customFieldValues ?? []) {
      control.customFieldValues_.push(CustomFieldValue.create(valueAttributes));
    }

    return control;
  }

  get id(): string {
    return this.id_;
  }

  get observations(): string | undefined {
    return this.observations_;
  }

  get recordedAt(): Date {
    return this.recordedAt_;
  }

  get author(): ControlAuthor {
    return this.author_;
  }

  get definitionId(): string | undefined {
    return this.definitionId_;
  }

  get customFieldValues(): readonly CustomFieldValue[] {
    return [...this.customFieldValues_];
  }

  updateObservations(observations: string | undefined): void {
    this.observations_ = normaliseObservations(observations);
  }

  updateRecordedAt(recordedAt: Date): void {
    if (!recordedAt) {
      throw new DomainError("Control requires a date/time");
    }
    this.recordedAt_ = recordedAt;
  }
}
