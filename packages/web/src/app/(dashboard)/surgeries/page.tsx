import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { listPatients } from "@/features/patients/queries";
import { listProcedureTypes } from "@/features/procedure-types/queries";
import { SurgeryList } from "@/features/surgeries/components/SurgeryList";
import { toSurgeryListView } from "@/features/surgeries/mappers";
import { listSurgeries } from "@/features/surgeries/queries";

export const dynamic = "force-dynamic";

export default async function SurgeriesPage() {
  // Three independent reads, fetched in parallel (no waterfall) — the
  // name lookups don't depend on the surgeries list or on each other.
  const [surgeries, patients, procedureTypes] = await Promise.all([
    listSurgeries(),
    listPatients(),
    listProcedureTypes(),
  ]);

  const patientNames = new Map(patients.map((p) => [p.id, `${p.firstName} ${p.lastName}`]));
  const procedureTypeNames = new Map(procedureTypes.map((pt) => [pt.id, pt.name]));

  const views = surgeries.map((surgery) =>
    toSurgeryListView(surgery, patientNames, procedureTypeNames),
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Surgeries</h1>
        <Link href="/surgeries/new" className={cn(buttonVariants())}>
          Register surgery
        </Link>
      </div>
      <SurgeryList surgeries={views} />
    </div>
  );
}
