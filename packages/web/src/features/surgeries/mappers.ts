import type { CustomFieldDto } from "@/features/procedure-types/dtos";
import type { ControlDto, CustomFieldValueDto, SurgeryDto } from "./dtos";

/** One recorded CustomField value, resolved to its definition's name/unit for display. */
export interface CustomFieldValueView {
  definitionId: string;
  label: string;
  displayValue: string;
}

/**
 * Looks each recorded value's definition up in `definitions` (a
 * `Map<definitionId, CustomFieldDto>` the page builds from the Surgery's
 * Procedure Type — the same presentation-layer join used for
 * patient/procedure/resident names). A value whose definition is missing
 * (e.g. a field deleted after the fact — not possible today, but
 * defensive) falls back to the raw id.
 */
export function resolveCustomFieldValues(
  values: readonly CustomFieldValueDto[],
  definitions: Map<string, CustomFieldDto>,
): CustomFieldValueView[] {
  return values.map((recorded) => {
    const definition = definitions.get(recorded.definitionId);
    const unit =
      definition?.constraint.valueType === "NUMBER" && definition.constraint.unit
        ? ` ${definition.constraint.unit}`
        : "";
    return {
      definitionId: recorded.definitionId,
      label: definition?.name ?? recorded.definitionId,
      displayValue: `${recorded.value}${unit}`,
    };
  });
}

export interface ControlView {
  id: string;
  observations: string;
  recordedAtLabel: string;
  recordedAtInputValue: string;
  authorLabel: string;
  customFieldValues: CustomFieldValueView[];
}

export interface SurgeryListView {
  id: string;
  patientName: string;
  procedureTypeName: string;
  performedAtLabel: string;
  controlCount: number;
}

export interface ParticipantView {
  id: string;
  name: string;
}

export interface SurgeryDetailView {
  id: string;
  patientName: string;
  procedureTypeName: string;
  performedAtLabel: string;
  participants: ParticipantView[];
  customFieldValues: CustomFieldValueView[];
  controls: ControlView[];
}

/**
 * `SurgeryDto` only carries `patientId`/`procedureTypeId` — the ids
 * `api` itself stores (Surgery references Patient/ProcedureType by id
 * only, never embeds them; see `application-layer-discovery.md` §1.5's
 * same reasoning applied to ResearchStudy). Resolving those ids to
 * display names is a presentation-layer join, not a Domain concern —
 * the caller (a Server Component page) builds these lookup maps from
 * `listPatients()`/`listProcedureTypes()`, already-existing reads from
 * their own feature slices, and passes them in here. No new `api` call
 * is introduced by this file.
 */
export type NameLookup = Map<string, string>;

function resolveName(id: string, lookup: NameLookup, fallback: string): string {
  return lookup.get(id) ?? fallback;
}

export function toControlView(
  dto: ControlDto,
  residentNames: NameLookup,
  customFieldDefs: Map<string, CustomFieldDto> = new Map(),
): ControlView {
  return {
    id: dto.id,
    observations: dto.observations,
    recordedAtLabel: formatDateTime(dto.recordedAt),
    recordedAtInputValue: toDatetimeLocalValue(dto.recordedAt),
    authorLabel:
      dto.author.type === "physician"
        ? "You (physician)"
        : resolveName(dto.author.residentId, residentNames, "Unknown resident"),
    customFieldValues: resolveCustomFieldValues(dto.customFieldValues, customFieldDefs),
  };
}

export function toSurgeryListView(
  dto: SurgeryDto,
  patientNames: NameLookup,
  procedureTypeNames: NameLookup,
): SurgeryListView {
  return {
    id: dto.id,
    patientName: resolveName(dto.patientId, patientNames, "Unknown patient"),
    procedureTypeName: resolveName(dto.procedureTypeId, procedureTypeNames, "Unknown procedure"),
    performedAtLabel: formatDate(dto.performedAt),
    controlCount: dto.controls.length,
  };
}

export function toSurgeryDetailView(
  dto: SurgeryDto,
  patientNames: NameLookup,
  procedureTypeNames: NameLookup,
  residentNames: NameLookup,
  customFieldDefs: Map<string, CustomFieldDto> = new Map(),
): SurgeryDetailView {
  return {
    id: dto.id,
    patientName: resolveName(dto.patientId, patientNames, "Unknown patient"),
    procedureTypeName: resolveName(dto.procedureTypeId, procedureTypeNames, "Unknown procedure"),
    performedAtLabel: formatDate(dto.performedAt),
    participants: dto.participatingResidentIds.map((residentId) => ({
      id: residentId,
      name: resolveName(residentId, residentNames, "Unknown resident"),
    })),
    customFieldValues: resolveCustomFieldValues(dto.customFieldValues, customFieldDefs),
    controls: dto.controls
      .map((control) => toControlView(control, residentNames, customFieldDefs))
      // Newest first — a physician reviewing follow-up cares most about
      // the most recent observation; `api` itself doesn't sort this.
      .sort((a, b) => b.recordedAtInputValue.localeCompare(a.recordedAtInputValue)),
  };
}

/** Calendar date only (Surgery.performedAt), formatted in UTC — same reasoning as Patient.dateOfBirth (see features/patients/mappers.ts). */
function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

/**
 * A `datetime-local` `<input>`'s value carries no timezone — the browser
 * both displays and re-submits it as wall-clock time in the *viewer's*
 * own timezone, with no offset attached. Building this from
 * `date.toISOString()` (UTC) would silently shift the displayed time
 * whenever the viewer isn't in UTC, and shift it *again* on save, since
 * an unmodified round-trip re-parses the same naive string as local time
 * a second time. Building it from the `Date` object's own local
 * getters — the same timezone the browser will use to both show and
 * resubmit the value — keeps a no-op edit a true no-op.
 */
function toDatetimeLocalValue(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}

/** A Control's `recordedAt` is a real moment, not a calendar date — displayed in the viewer's own local time. */
function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
