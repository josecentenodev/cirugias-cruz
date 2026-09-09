import type { CustomFieldDto } from "@/features/procedure-types/dtos";
import type { ControlDto } from "@/features/surgeries/dtos";
import { resolveCustomFieldValues, type CustomFieldValueView } from "@/features/surgeries/mappers";
import type { OwnSurgeryDto } from "./queries";

export interface OwnSurgeryListView {
  id: string;
  patientName: string;
  procedureTypeName: string;
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
  customFieldValues: CustomFieldValueView[];
}

export interface OwnSurgeryDetailView {
  id: string;
  patientName: string;
  procedureTypeName: string;
  performedAtLabel: string;
  /** The owning Procedure Type's `CONTROL`-scoped CustomField definitions — rendered as inputs by `RecordOwnControlForm`. */
  controlCustomFields: CustomFieldDto[];
  /** The owning Procedure Type's control definitions (ADR 0026); `atLimit` set when a capped one is already complete on this Surgery. */
  controlTypeOptions: { id: string; name: string; atLimit: boolean }[];
  controls: OwnControlView[];
  followUp: { definitionId: string; name: string; summary: string; complete: boolean }[];
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

export function toOwnSurgeryListView(dto: OwnSurgeryDto): OwnSurgeryListView {
  return {
    id: dto.id,
    patientName: dto.patientName,
    procedureTypeName: dto.procedureTypeName,
    performedAtLabel: formatDate(dto.performedAt),
    controlCount: dto.controls.length,
  };
}

function toOwnControlView(
  dto: ControlDto,
  ownResidentId: string,
  customFieldDefs: Map<string, CustomFieldDto>,
): OwnControlView {
  return {
    id: dto.id,
    observations: dto.observations ?? "",
    recordedAtLabel: formatDateTime(dto.recordedAt),
    recordedAtInputValue: toDatetimeLocalValue(dto.recordedAt),
    authorLabel:
      dto.author.type === "physician"
        ? "Physician"
        : dto.author.residentId === ownResidentId
          ? "You"
          : "Another resident",
    isMine: dto.author.type === "resident" && dto.author.residentId === ownResidentId,
    customFieldValues: resolveCustomFieldValues(dto.customFieldValues, customFieldDefs),
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
  dto: OwnSurgeryDto,
  ownResidentId: string | null,
): OwnSurgeryDetailView {
  const customFieldDefs = new Map((dto.customFields ?? []).map((field) => [field.id, field]));
  const followUp = (dto.followUp ?? []).map((entry) => {
    const complete = entry.recorded >= entry.expected;
    return {
      definitionId: entry.definitionId,
      name: entry.name,
      complete,
      summary: `${entry.recorded} of ${entry.expected} recorded${complete ? " · complete" : ""}`,
    };
  });
  const completeIds = new Set(
    followUp.filter((entry) => entry.complete).map((e) => e.definitionId),
  );
  return {
    id: dto.id,
    patientName: dto.patientName,
    procedureTypeName: dto.procedureTypeName,
    performedAtLabel: formatDate(dto.performedAt),
    controlCustomFields: (dto.customFields ?? []).filter((field) => field.scope === "CONTROL"),
    controlTypeOptions: (dto.controlDefinitions ?? []).map((definition) => ({
      id: definition.id,
      name: definition.name,
      atLimit: completeIds.has(definition.id),
    })),
    controls: dto.controls
      .map((control) => toOwnControlView(control, ownResidentId ?? "__none__", customFieldDefs))
      .sort((a, b) => b.recordedAtInputValue.localeCompare(a.recordedAtInputValue)),
    followUp,
  };
}
