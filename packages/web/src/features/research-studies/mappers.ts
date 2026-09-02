import type { ResearchStudyDto, ResearchStudyStatus } from "./dtos";

export interface ResearchStudyListView {
  id: string;
  status: ResearchStudyStatus;
  statusLabel: string;
  hypothesisPreview: string;
  surgeryCount: number;
}

export interface SurgeryRefView {
  id: string;
  label: string;
}

export interface ResearchStudyDetailView {
  id: string;
  status: ResearchStudyStatus;
  statusLabel: string;
  hypothesis: string;
  results: string;
  analysis: string;
  conclusion: string;
  surgeries: SurgeryRefView[];
}

/**
 * `dto.surgeryIds` only carries ids — resolving them to a display label is
 * a presentation-layer join the caller (a Server Component page) builds
 * from `listSurgeries()`/`listPatients()`/`listProcedureTypes()`, already-
 * existing reads from their own feature slices, and passes in here. No new
 * `api` call is introduced by this file — same reasoning as
 * `features/surgeries/mappers.ts`'s `NameLookup`.
 */
export type SurgeryLookup = Map<string, string>;

const STATUS_LABELS: Record<ResearchStudyStatus, string> = {
  DRAFT: "Draft",
  IN_PROGRESS: "In progress",
  COMPLETED: "Completed",
};

function textOr(value: string | undefined): string {
  return value ?? "";
}

/** A one-line preview of the hypothesis for the list view — not a truncation rule Domain owns, purely presentational. */
function preview(value: string | undefined): string {
  if (!value || !value.trim()) {
    return "No hypothesis recorded yet.";
  }
  return value.length > 120 ? `${value.slice(0, 120)}…` : value;
}

export function toResearchStudyListView(dto: ResearchStudyDto): ResearchStudyListView {
  return {
    id: dto.id,
    status: dto.status,
    statusLabel: STATUS_LABELS[dto.status],
    hypothesisPreview: preview(dto.hypothesis),
    surgeryCount: dto.surgeryIds.length,
  };
}

export function toResearchStudyDetailView(
  dto: ResearchStudyDto,
  surgeryLabels: SurgeryLookup,
): ResearchStudyDetailView {
  return {
    id: dto.id,
    status: dto.status,
    statusLabel: STATUS_LABELS[dto.status],
    hypothesis: textOr(dto.hypothesis),
    results: textOr(dto.results),
    analysis: textOr(dto.analysis),
    conclusion: textOr(dto.conclusion),
    surgeries: dto.surgeryIds.map((surgeryId) => ({
      id: surgeryId,
      label: surgeryLabels.get(surgeryId) ?? "Unknown surgery",
    })),
  };
}
