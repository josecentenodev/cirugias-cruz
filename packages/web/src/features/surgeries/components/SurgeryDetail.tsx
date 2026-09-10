import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import type { CustomFieldDto } from "@/features/procedure-types/dtos";
import { messages } from "@/messages/en";
import type { SurgeryDetailView } from "../mappers";
import { AssignResidentForm } from "./AssignResidentForm";
import { ControlRow } from "./ControlRow";
import { RecordControlForm } from "./RecordControlForm";
import { RemoveResidentButton } from "./RemoveResidentButton";

/**
 * Server Component. Card order (B5, Milestone 11): Summary → Control
 * history (with the inline "record a control" form) → Residents — a
 * physician opening a Surgery is here to review and add follow-up, so
 * that work comes first; roster management is secondary.
 */
export function SurgeryDetail({
  patientId,
  surgery,
  availableResidents,
  totalResidentCount,
  controlCustomFields,
  controlTypeOptions,
}: {
  patientId: string;
  surgery: SurgeryDetailView;
  availableResidents: { id: string; label: string }[];
  totalResidentCount: number;
  /** The Procedure Type's `CONTROL`-scoped CustomField definitions, rendered as inputs by `RecordControlForm`. */
  controlCustomFields: CustomFieldDto[];
  /** The Procedure Type's control definitions (ADR 0026), `atLimit` set when a capped one is already complete on this Surgery. */
  controlTypeOptions: { id: string; name: string; atLimit: boolean }[];
}) {
  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>{surgery.patientName}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label={messages.surgeries.procedureType} value={surgery.procedureTypeName} />
          <Field label={messages.surgeries.performed} value={surgery.performedAtLabel} />
          {surgery.customFieldValues.map((value) => (
            <Field key={value.definitionId} label={value.label} value={value.displayValue} />
          ))}
        </CardContent>
      </Card>

      {surgery.followUp.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>{messages.surgeries.followUp.cardTitle}</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col gap-2">
              {surgery.followUp.map((entry) => (
                <li
                  key={entry.definitionId}
                  className="flex items-center justify-between rounded-md border border-border p-2 text-sm"
                >
                  <span className="font-medium">{entry.name}</span>
                  <span className={entry.complete ? "text-muted-foreground" : "text-foreground"}>
                    {entry.summary}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>{messages.surgeries.controlHistory.cardTitle}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {surgery.controls.length === 0 ? (
            <EmptyState title={messages.surgeries.controlHistory.empty} />
          ) : (
            <ul className="flex flex-col gap-2">
              {surgery.controls.map((control) => (
                <ControlRow
                  key={control.id}
                  patientId={patientId}
                  surgeryId={surgery.id}
                  control={control}
                />
              ))}
            </ul>
          )}
          <div className="rounded-md border border-border p-3">
            <p className="mb-3 text-sm font-medium">{messages.surgeries.recordControl.cardTitle}</p>
            <RecordControlForm
              patientId={patientId}
              surgeryId={surgery.id}
              participants={surgery.participants}
              customFields={controlCustomFields}
              controlTypeOptions={controlTypeOptions}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{messages.surgeries.residents.cardTitle}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {surgery.participants.length === 0 ? (
            <p className="text-sm text-muted-foreground">{messages.surgeries.residents.empty}</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {surgery.participants.map((participant) => (
                <li
                  key={participant.id}
                  className="flex items-center justify-between rounded-md border border-border p-2"
                >
                  <span className="text-sm">{participant.name}</span>
                  <RemoveResidentButton
                    patientId={patientId}
                    surgeryId={surgery.id}
                    residentId={participant.id}
                    residentName={participant.name}
                  />
                </li>
              ))}
            </ul>
          )}
          <AssignResidentForm
            patientId={patientId}
            surgeryId={surgery.id}
            residents={availableResidents}
            totalResidentCount={totalResidentCount}
          />
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm">{value}</dd>
    </div>
  );
}
