import Link from "next/link";
import { PatientDetail } from "@/features/patients/components/PatientDetail";
import { toPatientView } from "@/features/patients/mappers";
import { getPatient } from "@/features/patients/queries";

export const dynamic = "force-dynamic";

export default async function PatientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const patient = await getPatient(id);
  const view = toPatientView(patient);

  return (
    <div className="flex flex-col gap-4">
      <Link href="/patients" className="text-sm text-muted-foreground hover:text-foreground">
        ← Back to patients
      </Link>
      <PatientDetail patient={view} />
    </div>
  );
}
