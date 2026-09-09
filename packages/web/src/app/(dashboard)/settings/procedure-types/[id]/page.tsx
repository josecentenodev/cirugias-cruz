import { Breadcrumbs } from "@/components/Breadcrumbs";
import { messages } from "@/messages/en";
import { ProcedureTypeDetail } from "@/features/procedure-types/components/ProcedureTypeDetail";
import { toProcedureTypeDetailView } from "@/features/procedure-types/mappers";
import { getProcedureType } from "@/features/procedure-types/queries";
import { listSurgeries } from "@/features/surgeries/queries";

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

  // Presentation-layer join: a scheme element is "frozen" (ADR 0027) once
  // any Control or CustomFieldValue in the tenant references it. Computed
  // from the existing Surgery list rather than a new endpoint; `api`
  // still enforces the freeze rule authoritatively on every mutation.
  const surgeries = await listSurgeries();
  const inUseDefinitionIds = new Set<string>();
  for (const surgery of surgeries) {
    for (const value of surgery.customFieldValues) {
      inUseDefinitionIds.add(value.definitionId);
    }
    for (const control of surgery.controls) {
      if (control.definitionId) {
        inUseDefinitionIds.add(control.definitionId);
      }
      for (const value of control.customFieldValues) {
        inUseDefinitionIds.add(value.definitionId);
      }
    }
  }

  const view = toProcedureTypeDetailView(procedureType, inUseDefinitionIds);

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
