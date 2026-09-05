import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { CustomFieldDto } from "@/features/procedure-types/dtos";
import type { SurgeryDetailView } from "../mappers";
import { AssignResidentForm } from "./AssignResidentForm";
import { ControlRow } from "./ControlRow";
import { RecordControlForm } from "./RecordControlForm";
import { RemoveResidentButton } from "./RemoveResidentButton";

/**
 * Server Component — reads are rendered directly, no client-side fetch.
 * `ControlRow`, `RecordControlForm`, `AssignResidentForm`, and
 * `RemoveResidentButton` are the only Client Components nested inside;
 * everything else here — headings, layout, the surgery's own fields —
 * needs no interactivity. Assigning/removing a Resident lives on this
 * page, not on a Resident-owned one, mirroring `api` itself
 * (`assignResidentToSurgery`/`removeResidentFromSurgery` are Surgery's
 * own operations — see `features/surgeries/actions.ts`).
 */
export function SurgeryDetail({
  surgery,
  availableResidents,
  totalResidentCount,
  controlCustomFields,
}: {
  surgery: SurgeryDetailView;
  availableResidents: { id: string; label: string }[];
  /** Total Residents registered in the tenant — lets `AssignResidentForm` tell "no Residents exist" apart from "all are already assigned" (see that component). */
  totalResidentCount: number;
  /** The Procedure Type's `CONTROL`-scoped CustomField definitions, rendered as inputs by `RecordControlForm`. */
  controlCustomFields: CustomFieldDto[];
}) {
  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>{surgery.patientName}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Procedure type" value={surgery.procedureTypeName} />
          <Field label="Performed" value={surgery.performedAtLabel} />
          {surgery.customFieldValues.map((value) => (
            <Field key={value.definitionId} label={value.label} value={value.displayValue} />
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Residents</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {surgery.participants.length === 0 ? (
            <p className="text-sm text-muted-foreground">No residents assigned yet.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {surgery.participants.map((participant) => (
                <li
                  key={participant.id}
                  className="flex items-center justify-between rounded-md border border-border p-2"
                >
                  <span className="text-sm">{participant.name}</span>
                  <RemoveResidentButton surgeryId={surgery.id} residentId={participant.id} />
                </li>
              ))}
            </ul>
          )}
          <AssignResidentForm
            surgeryId={surgery.id}
            residents={availableResidents}
            totalResidentCount={totalResidentCount}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Control history</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {surgery.controls.length === 0 ? (
            <p className="text-sm text-muted-foreground">No controls recorded yet.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {surgery.controls.map((control) => (
                <ControlRow key={control.id} surgeryId={surgery.id} control={control} />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Record a control</CardTitle>
        </CardHeader>
        <CardContent>
          <RecordControlForm
            surgeryId={surgery.id}
            participants={surgery.participants}
            customFields={controlCustomFields}
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
