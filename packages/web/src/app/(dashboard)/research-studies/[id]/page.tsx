import Link from "next/link";
import { listPatients } from "@/features/patients/queries";
import { listProcedureTypes } from "@/features/procedure-types/queries";
import { toResearchStudyDetailView } from "@/features/research-studies/mappers";
import { getResearchStudy } from "@/features/research-studies/queries";
import { ResearchStudyDetail } from "@/features/research-studies/components/ResearchStudyDetail";
import { toSurgeryListView } from "@/features/surgeries/mappers";
import { listSurgeries } from "@/features/surgeries/queries";

export const dynamic = "force-dynamic";

export default async function ResearchStudyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // getResearchStudy calls notFound() itself on a missing/foreign study
  // (see queries.ts) — resolved before the name-lookup reads below run.
  const study = await getResearchStudy(id);

  // ResearchStudy references Surgeries only by id (see
  // packages/domain/src/research/research-study.ts) — resolving those ids
  // to a display label reuses features/surgeries's own
  // patient/procedure-type name resolution, the same presentation-layer
  // join `app/(dashboard)/surgeries/page.tsx` already performs. No new
  // `api` call is introduced beyond the three reads that page already does.
  const [surgeries, patients, procedureTypes] = await Promise.all([
    listSurgeries(),
    listPatients(),
    listProcedureTypes(),
  ]);

  const patientNames = new Map(patients.map((p) => [p.id, `${p.firstName} ${p.lastName}`]));
  const procedureTypeNames = new Map(procedureTypes.map((pt) => [pt.id, pt.name]));
  const surgeryLabels = new Map(
    surgeries.map((surgery) => {
      const view = toSurgeryListView(surgery, patientNames, procedureTypeNames);
      return [
        surgery.id,
        `${view.patientName} — ${view.procedureTypeName} (${view.performedAtLabel})`,
      ];
    }),
  );

  const view = toResearchStudyDetailView(study, surgeryLabels);

  const inStudyIds = new Set(study.surgeryIds);
  const availableSurgeries = surgeries
    .filter((surgery) => !inStudyIds.has(surgery.id))
    .map((surgery) => ({
      id: surgery.id,
      label: surgeryLabels.get(surgery.id) ?? "Unknown surgery",
    }));

  return (
    <div className="flex flex-col gap-4">
      <Link
        href="/research-studies"
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        ← Back to research studies
      </Link>
      <ResearchStudyDetail study={view} availableSurgeries={availableSurgeries} />
    </div>
  );
}
