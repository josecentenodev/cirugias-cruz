import Link from "next/link";
import { listPatients } from "@/features/patients/queries";
import { listProcedureTypes } from "@/features/procedure-types/queries";
import { listResidents } from "@/features/residents/queries";
import { SurgeryDetail } from "@/features/surgeries/components/SurgeryDetail";
import { toSurgeryDetailView } from "@/features/surgeries/mappers";
import { getSurgery } from "@/features/surgeries/queries";

export const dynamic = "force-dynamic";

export default async function SurgeryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // getSurgery calls notFound() itself on a missing/foreign surgery
  // (see queries.ts) — resolved before the name-lookup reads below run.
  const surgery = await getSurgery(id);
  const [patients, procedureTypes, residents] = await Promise.all([
    listPatients(),
    listProcedureTypes(),
    listResidents(),
  ]);

  const patientNames = new Map(patients.map((p) => [p.id, `${p.firstName} ${p.lastName}`]));
  const procedureTypeNames = new Map(procedureTypes.map((pt) => [pt.id, pt.name]));
  const residentNames = new Map(residents.map((r) => [r.id, `${r.firstName} ${r.lastName}`]));

  const procedureType = procedureTypes.find((pt) => pt.id === surgery.procedureTypeId);
  const customFieldDefs = new Map(
    (procedureType?.customFields ?? []).map((field) => [field.id, field]),
  );
  const controlScopedFields = (procedureType?.customFields ?? []).filter(
    (field) => field.scope === "CONTROL",
  );

  const view = toSurgeryDetailView(
    surgery,
    patientNames,
    procedureTypeNames,
    residentNames,
    customFieldDefs,
  );

  const participatingIds = new Set(view.participants.map((p) => p.id));
  const availableResidents = residents
    .filter((r) => !participatingIds.has(r.id))
    .map((r) => ({ id: r.id, label: `${r.firstName} ${r.lastName}` }));

  return (
    <div className="flex flex-col gap-4">
      <Link href="/surgeries" className="text-sm text-muted-foreground hover:text-foreground">
        ← Back to surgeries
      </Link>
      <SurgeryDetail
        surgery={view}
        availableResidents={availableResidents}
        totalResidentCount={residents.length}
        controlCustomFields={controlScopedFields}
      />
    </div>
  );
}
