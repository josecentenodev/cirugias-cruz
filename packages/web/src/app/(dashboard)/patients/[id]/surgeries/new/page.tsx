import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
      <Link
        href={`/patients/${id}`}
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        ← Back to {patientName}
      </Link>
      <h1 className="text-lg font-semibold">Register surgery for {patientName}</h1>
      <Card>
        <CardHeader>
          <CardTitle>Surgery details</CardTitle>
        </CardHeader>
        <CardContent>
          <SurgeryForm patientId={id} procedureTypes={procedureTypes} />
        </CardContent>
      </Card>
    </div>
  );
}
