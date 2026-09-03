import type { ControlDto, SurgeryDto } from "@/features/surgeries/dtos";

/**
 * A Resident's session cannot call the Physician-only Patient/
 * ProcedureType read routes (`requirePhysicianAuth`), unlike
 * `features/surgeries/mappers.ts`'s `toSurgeryListView`/
 * `toSurgeryDetailView`, which resolve `patientId`/`procedureTypeId` to
 * display names via those exact reads. Known, deliberate simplification
 * for this iteration: shown by id here, not by name. Resolving them for
 * a Resident would need its own dedicated `api` read (e.g. embedding a
 * name in `serializeSurgery`'s response, or a `/me`-scoped lookup) —
 * not built by this ADR.
 */
export interface OwnSurgeryListView {
  id: string;
  patientId: string;
  procedureTypeId: string;
  performedAtLabel: string;
  controlCount: number;
}

export interface OwnControlView {
  id: string;
  observations: string;
  recordedAtLabel: string;
  recordedAtInputValue: string;
  authorLabel: string;
  isMine: boolean;
}

export interface OwnSurgeryDetailView {
  id: string;
  patientId: string;
  procedureTypeId: string;
  performedAtLabel: string;
  controls: OwnControlView[];
}

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

export function toOwnSurgeryListView(dto: SurgeryDto): OwnSurgeryListView {
  return {
    id: dto.id,
    patientId: dto.patientId,
    procedureTypeId: dto.procedureTypeId,
    performedAtLabel: formatDate(dto.performedAt),
    controlCount: dto.controls.length,
  };
}

function toOwnControlView(dto: ControlDto, ownResidentId: string): OwnControlView {
  return {
    id: dto.id,
    observations: dto.observations,
    recordedAtLabel: formatDateTime(dto.recordedAt),
    recordedAtInputValue: toDatetimeLocalValue(dto.recordedAt),
    authorLabel:
      dto.author.type === "physician"
        ? "Physician"
        : dto.author.residentId === ownResidentId
          ? "You"
          : "Another resident",
    isMine: dto.author.type === "resident" && dto.author.residentId === ownResidentId,
  };
}

/**
 * `ownResidentId` — see the note on `ControlRow`/`OwnControlRow`: `web`
 * has no way to know its own residentId without a dedicated read (it
 * only relays an opaque session id, per the BFF design). Pass `null`
 * when unavailable — every control then shows as "not mine", which is
 * the safe default (the Edit button becomes a no-op attempt `api`
 * would reject anyway, never a false "yes you can edit this").
 */
export function toOwnSurgeryDetailView(
  dto: SurgeryDto,
  ownResidentId: string | null,
): OwnSurgeryDetailView {
  return {
    id: dto.id,
    patientId: dto.patientId,
    procedureTypeId: dto.procedureTypeId,
    performedAtLabel: formatDate(dto.performedAt),
    controls: dto.controls
      .map((control) => toOwnControlView(control, ownResidentId ?? "__none__"))
      .sort((a, b) => b.recordedAtInputValue.localeCompare(a.recordedAtInputValue)),
  };
}
