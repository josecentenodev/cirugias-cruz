import Link from "next/link";
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
      <Link
        href="/settings/procedure-types"
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        ← Back to Configuración
      </Link>
      <ProcedureTypeDetail procedureType={view} />
    </div>
  );
}
