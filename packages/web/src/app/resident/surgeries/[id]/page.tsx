import { Breadcrumbs } from "@/components/Breadcrumbs";
import { DetailGrid } from "@/components/DetailGrid";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Disclosure } from "@/components/ui/Disclosure";
import { EmptyState } from "@/components/ui/empty-state";
import { messages } from "@/messages/en";
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
    <div className="flex flex-col gap-4">
      <Breadcrumbs
        items={[
          { label: messages.resident.surgeriesTitle, href: "/resident/surgeries" },
          { label: `${view.procedureTypeName} · ${view.performedAtLabel}` },
        ]}
      />
      <PageHeader title={messages.resident.surgeryTitle} />

      <DetailGrid
        primary={
          <div className="flex flex-col gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{messages.resident.controls.cardTitle}</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                {view.controls.length === 0 ? (
                  <EmptyState title={messages.resident.controls.empty} />
                ) : (
                  <ul className="flex flex-col gap-2">
                    {view.controls.map((control) => (
                      <OwnControlRow key={control.id} surgeryId={view.id} control={control} />
                    ))}
                  </ul>
                )}
                <Disclosure
                  summary={messages.resident.recordControl.cardTitle}
                  defaultOpen={view.controls.length === 0}
                >
                  <RecordOwnControlForm
                    surgeryId={view.id}
                    customFields={view.controlCustomFields}
                    controlTypeOptions={view.controlTypeOptions}
                  />
                </Disclosure>
              </CardContent>
            </Card>
          </div>
        }
        aside={
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{view.patientName}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              <MetaField
                label={messages.resident.columns.procedureType}
                value={view.procedureTypeName}
              />
              <MetaField
                label={messages.resident.columns.performed}
                value={view.performedAtLabel}
              />
            </CardContent>
          </Card>
        }
      />
    </div>
  );
}

function MetaField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm">{value}</dd>
    </div>
  );
}
