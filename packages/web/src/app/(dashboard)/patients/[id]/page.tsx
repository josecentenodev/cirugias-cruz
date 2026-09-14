import Link from "next/link";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { DetailGrid } from "@/components/DetailGrid";
import { PageHeader } from "@/components/PageHeader";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { messages } from "@/messages/en";
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
      <Breadcrumbs
        items={[
          { label: messages.patients.listTitle, href: "/patients" },
          { label: view.fullName },
        ]}
      />

      <DetailGrid
        primary={
          <div className="flex flex-col gap-4">
            <PageHeader
              level={2}
              title={messages.surgeries.sectionTitle}
              action={
                <Link
                  href={`/patients/${id}/surgeries/new`}
                  className={cn(buttonVariants({ size: "sm" }))}
                >
                  {messages.surgeries.register}
                </Link>
              }
            />
            <SurgeryList patientId={id} surgeries={surgeries} />
          </div>
        }
        aside={<PatientDetail patient={view} />}
      />
    </div>
  );
}
