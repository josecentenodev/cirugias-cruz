import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { messages } from "@/messages/en";
import { ProcedureTypeList } from "@/features/procedure-types/components/ProcedureTypeList";
import { toProcedureTypeView } from "@/features/procedure-types/mappers";
import { listProcedureTypes } from "@/features/procedure-types/queries";

export const dynamic = "force-dynamic";

export default async function ProcedureTypesPage() {
  const procedureTypes = await listProcedureTypes();
  const views = procedureTypes.map(toProcedureTypeView);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={messages.procedureTypes.listTitle}
        action={
          <Link href="/settings/procedure-types/new" className={cn(buttonVariants())}>
            {messages.procedureTypes.register}
          </Link>
        }
      />
      <ProcedureTypeList procedureTypes={views} />
    </div>
  );
}
