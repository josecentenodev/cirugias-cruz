import {
  expectedRecordings,
  timepointOffsetMilliseconds,
  type ProcedureType,
  type Surgery,
} from "@cirugias-cruz/domain";

export interface FollowUpItem {
  definitionId: string;
  name: string;
  recorded: number;
  expected: number;
  /** When the next expected recording is due (its timepoint from performedAt) — only while `recorded < expected`. */
  nextDueAt: Date | null;
}

/**
 * The per-Surgery, per-capped-definition completeness / next-due
 * projection (ADR 0026, §2.3 "computed on read, never stored"). One entry
 * per bounded (capped or scheduled — ADR 0031) control definition of the
 * Surgery's ProcedureType.
 */
export function computeFollowUp(procedureType: ProcedureType, surgery: Surgery): FollowUpItem[] {
  return procedureType.controlDefinitions.flatMap((definition) => {
    const expected = expectedRecordings(definition.occurrenceRule);
    if (expected === null) {
      return [];
    }

    const recorded = surgery.controls.filter(
      (control) => control.definitionId === definition.id,
    ).length;

    const nextOffset = timepointOffsetMilliseconds(definition.occurrenceRule, recorded + 1);
    const nextDueAt =
      nextOffset === null ? null : new Date(surgery.performedAt.getTime() + nextOffset);

    return [{ definitionId: definition.id, name: definition.name, recorded, expected, nextDueAt }];
  });
}
