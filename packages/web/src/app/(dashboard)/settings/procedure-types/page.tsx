import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { ProcedureTypeList } from "@/features/procedure-types/components/ProcedureTypeList";
import { toProcedureTypeView } from "@/features/procedure-types/mappers";
import { listProcedureTypes } from "@/features/procedure-types/queries";

export const dynamic = "force-dynamic";

export default async function ProcedureTypesPage() {
  const procedureTypes = await listProcedureTypes();
  const views = procedureTypes.map(toProcedureTypeView);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Procedure types</h1>
        <Link href="/settings/procedure-types/new" className={cn(buttonVariants())}>
          Register procedure type
        </Link>
      </div>
      <ProcedureTypeList procedureTypes={views} />
    </div>
  );
}
