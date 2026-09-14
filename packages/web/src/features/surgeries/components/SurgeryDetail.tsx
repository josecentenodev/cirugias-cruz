import { DetailGrid } from "@/components/DetailGrid";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Disclosure } from "@/components/ui/Disclosure";
import { EmptyState } from "@/components/ui/empty-state";
import type { CustomFieldDto } from "@/features/procedure-types/dtos";
import { messages } from "@/messages/en";
import type { SurgeryDetailView } from "../mappers";
import { AssignResidentForm } from "./AssignResidentForm";
import { ControlRow } from "./ControlRow";
import { RecordControlForm } from "./RecordControlForm";
import { RemoveResidentButton } from "./RemoveResidentButton";

/**
 * Server Component. `DetailGrid` (desktop-space-usage.md §4.2): the
 * Control history + inline "record a control" form is the primary column
 * — reviewing and adding follow-up is why a physician opens a Surgery.
 * Summary, the follow-up schedule and roster management are supporting
 * context, so they sit in the sticky aside.
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
    <DetailGrid
      primary={
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
            <Disclosure
              summary={messages.surgeries.recordControl.cardTitle}
              defaultOpen={surgery.controls.length === 0}
            >
              <RecordControlForm
                patientId={patientId}
                surgeryId={surgery.id}
                participants={surgery.participants}
                customFields={controlCustomFields}
                controlTypeOptions={controlTypeOptions}
              />
            </Disclosure>
          </CardContent>
        </Card>
      }
      aside={
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>{surgery.patientName}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
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
                      <span
                        className={entry.complete ? "text-muted-foreground" : "text-foreground"}
                      >
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
              <CardTitle>{messages.surgeries.residents.cardTitle}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {surgery.participants.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {messages.surgeries.residents.empty}
                </p>
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
              <Disclosure
                summary={messages.surgeries.residents.assignAction}
                defaultOpen={surgery.participants.length === 0}
              >
                <AssignResidentForm
                  patientId={patientId}
                  surgeryId={surgery.id}
                  residents={availableResidents}
                  totalResidentCount={totalResidentCount}
                />
              </Disclosure>
            </CardContent>
          </Card>
        </div>
      }
    />
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
