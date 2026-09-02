import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { SurgeryDetailView } from "../mappers";
import { ControlRow } from "./ControlRow";
import { RecordControlForm } from "./RecordControlForm";

/**
 * Server Component — reads are rendered directly, no client-side fetch.
 * `ControlRow` (per-control edit toggle) and `RecordControlForm` (the
 * record form) are the only Client Components nested inside; everything
 * else here — headings, layout, the surgery's own fields — needs no
 * interactivity.
 */
export function SurgeryDetail({ surgery }: { surgery: SurgeryDetailView }) {
  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>{surgery.patientName}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Procedure type" value={surgery.procedureTypeName} />
          <Field label="Performed" value={surgery.performedAtLabel} />
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
            participatingResidentIds={surgery.participatingResidentIds}
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
