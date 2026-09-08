import { Breadcrumbs } from "@/components/Breadcrumbs";
import { messages } from "@/messages/en";
import { ProcedureTypeDetail } from "@/features/procedure-types/components/ProcedureTypeDetail";
import { toProcedureTypeDetailView } from "@/features/procedure-types/mappers";
import { getProcedureType } from "@/features/procedure-types/queries";

export const dynamic = "force-dynamic";

export default async function ProcedureTypeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // getProcedureType calls notFound() itself on a missing/foreign
  // procedure type (see queries.ts) — mirrors surgeries/[id]/page.tsx.
  const procedureType = await getProcedureType(id);
  const view = toProcedureTypeDetailView(procedureType);

  return (
    <div className="flex flex-col gap-4">
      <Breadcrumbs
        items={[
          { label: messages.nav.settings, href: "/settings/procedure-types" },
          { label: view.name },
        ]}
      />
      <ProcedureTypeDetail procedureType={view} />
    </div>
  );
}
