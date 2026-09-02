import Link from "next/link";
import { listPatients } from "@/features/patients/queries";
import { listProcedureTypes } from "@/features/procedure-types/queries";
import { SurgeryDetail } from "@/features/surgeries/components/SurgeryDetail";
import { toSurgeryDetailView } from "@/features/surgeries/mappers";
import { getSurgery } from "@/features/surgeries/queries";

export const dynamic = "force-dynamic";

export default async function SurgeryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // getSurgery calls notFound() itself on a missing/foreign surgery
  // (see queries.ts) — resolved before the name-lookup reads below run.
  const surgery = await getSurgery(id);
  const [patients, procedureTypes] = await Promise.all([listPatients(), listProcedureTypes()]);

  const patientNames = new Map(patients.map((p) => [p.id, `${p.firstName} ${p.lastName}`]));
  const procedureTypeNames = new Map(procedureTypes.map((pt) => [pt.id, pt.name]));

  const view = toSurgeryDetailView(surgery, patientNames, procedureTypeNames);

  return (
    <div className="flex flex-col gap-4">
      <Link href="/surgeries" className="text-sm text-muted-foreground hover:text-foreground">
        ← Back to surgeries
      </Link>
      <SurgeryDetail surgery={view} />
    </div>
  );
}
