import { Breadcrumbs } from "@/components/Breadcrumbs";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { messages } from "@/messages/en";
import { getPatient } from "@/features/patients/queries";
import { listProcedureTypes } from "@/features/procedure-types/queries";
import { SurgeryForm } from "@/features/surgeries/components/SurgeryForm";

export const dynamic = "force-dynamic";

export default async function NewSurgeryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // getPatient calls notFound() itself on a missing/foreign patient —
  // resolved before the procedure-type read runs.
  const [patient, procedureTypes] = await Promise.all([getPatient(id), listProcedureTypes()]);
  const patientName = `${patient.firstName} ${patient.lastName}`;

  return (
    <div className="flex flex-col gap-4">
      <Breadcrumbs
        items={[
          { label: messages.patients.listTitle, href: "/patients" },
          { label: patientName, href: `/patients/${id}` },
          { label: messages.surgeries.register },
        ]}
      />
      <PageHeader title={messages.surgeries.registerFor(patientName)} />
      <Card>
        <CardHeader>
          <CardTitle>{messages.surgeries.detailsCard}</CardTitle>
        </CardHeader>
        <CardContent>
          <SurgeryForm patientId={id} procedureTypes={procedureTypes} />
        </CardContent>
      </Card>
    </div>
  );
}
