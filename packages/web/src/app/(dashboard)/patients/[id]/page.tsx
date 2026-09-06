import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { PatientDetail } from "@/features/patients/components/PatientDetail";
import { toPatientView } from "@/features/patients/mappers";
import { getPatient } from "@/features/patients/queries";
import { listProcedureTypes } from "@/features/procedure-types/queries";
import { SurgeryList } from "@/features/surgeries/components/SurgeryList";
import { toSurgeryListView } from "@/features/surgeries/mappers";
import { listSurgeries } from "@/features/surgeries/queries";

export const dynamic = "force-dynamic";

export default async function PatientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // getPatient calls notFound() itself on a missing/foreign patient.
  const patient = await getPatient(id);
  const view = toPatientView(patient);

  // The MVP has no `?patientId=` filter on `api` — the tenant-wide list
  // is filtered here (see ROADMAP Milestone 10). `listProcedureTypes` is
  // only for the name lookup `toSurgeryListView` needs.
  const [allSurgeries, procedureTypes] = await Promise.all([listSurgeries(), listProcedureTypes()]);
  const procedureTypeNames = new Map(procedureTypes.map((pt) => [pt.id, pt.name]));
  const surgeries = allSurgeries
    .filter((surgery) => surgery.patientId === id)
    .map((surgery) => toSurgeryListView(surgery, new Map(), procedureTypeNames));

  return (
    <div className="flex flex-col gap-4">
      <Link href="/patients" className="text-sm text-muted-foreground hover:text-foreground">
        ← Back to patients
      </Link>
      <PatientDetail patient={view} />

      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">Surgeries</h2>
        <Link href={`/patients/${id}/surgeries/new`} className={cn(buttonVariants({ size: "sm" }))}>
          Register surgery
        </Link>
      </div>
      <SurgeryList patientId={id} surgeries={surgeries} />
    </div>
  );
}
