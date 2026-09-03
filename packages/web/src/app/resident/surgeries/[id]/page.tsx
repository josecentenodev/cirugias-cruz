import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { OwnControlRow } from "@/features/resident-session/components/OwnControlRow";
import { RecordOwnControlForm } from "@/features/resident-session/components/RecordOwnControlForm";
import { toOwnSurgeryDetailView } from "@/features/resident-session/mappers";
import { getOwnResidentId, getOwnSurgery } from "@/features/resident-session/queries";

export const dynamic = "force-dynamic";

/**
 * A Resident's read of one Surgery they participate in — full Control
 * history (not only their own), record a new one, edit only their own
 * (ADR 0017). `getOwnSurgery` 404s (via `error.tsx`, matching the
 * Physician's own `getSurgery` behavior) for a Surgery this Resident
 * doesn't participate in.
 */
export default async function ResidentSurgeryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [surgery, ownResidentId] = await Promise.all([getOwnSurgery(id), getOwnResidentId()]);
  const view = toOwnSurgeryDetailView(surgery, ownResidentId);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-lg font-semibold">Surgery</h1>
        <p className="text-sm text-muted-foreground">
          Patient {view.patientId} · Procedure {view.procedureTypeId} · {view.performedAtLabel}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Controls</CardTitle>
        </CardHeader>
        <CardContent>
          {view.controls.length === 0 ? (
            <p className="text-sm text-muted-foreground">No controls recorded yet.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {view.controls.map((control) => (
                <OwnControlRow key={control.id} surgeryId={view.id} control={control} />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Record a control</CardTitle>
        </CardHeader>
        <CardContent>
          <RecordOwnControlForm surgeryId={view.id} />
        </CardContent>
      </Card>
    </div>
  );
}
