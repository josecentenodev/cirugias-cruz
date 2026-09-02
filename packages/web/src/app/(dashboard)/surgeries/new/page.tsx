import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listPatients } from "@/features/patients/queries";
import { listProcedureTypes } from "@/features/procedure-types/queries";
import { SurgeryForm } from "@/features/surgeries/components/SurgeryForm";

export const dynamic = "force-dynamic";

export default async function NewSurgeryPage() {
  // Reuses the existing Patient/ProcedureType reads — no new api call
  // introduced for the dropdowns.
  const [patients, procedureTypes] = await Promise.all([listPatients(), listProcedureTypes()]);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-semibold">Register surgery</h1>
      <Card>
        <CardHeader>
          <CardTitle>Surgery details</CardTitle>
        </CardHeader>
        <CardContent>
          <SurgeryForm
            patients={patients.map((p) => ({ id: p.id, label: `${p.firstName} ${p.lastName}` }))}
            procedureTypes={procedureTypes.map((pt) => ({ id: pt.id, label: pt.name }))}
          />
        </CardContent>
      </Card>
    </div>
  );
}
