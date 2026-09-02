import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { PatientList } from "@/features/patients/components/PatientList";
import { toPatientView } from "@/features/patients/mappers";
import { listPatients } from "@/features/patients/queries";

export const dynamic = "force-dynamic";

export default async function PatientsPage() {
  const patients = await listPatients();
  const views = patients.map(toPatientView);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Patients</h1>
        <Link href="/patients/new" className={cn(buttonVariants())}>
          Register patient
        </Link>
      </div>
      <PatientList patients={views} />
    </div>
  );
}
