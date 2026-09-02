import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PatientForm } from "@/features/patients/components/PatientForm";

export default function NewPatientPage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-semibold">Register patient</h1>
      <Card>
        <CardHeader>
          <CardTitle>Patient details</CardTitle>
        </CardHeader>
        <CardContent>
          <PatientForm />
        </CardContent>
      </Card>
    </div>
  );
}
