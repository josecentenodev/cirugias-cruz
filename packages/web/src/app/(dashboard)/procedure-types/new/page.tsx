import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProcedureTypeForm } from "@/features/procedure-types/components/ProcedureTypeForm";

export default function NewProcedureTypePage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-semibold">Register procedure type</h1>
      <Card>
        <CardHeader>
          <CardTitle>Procedure type details</CardTitle>
        </CardHeader>
        <CardContent>
          <ProcedureTypeForm />
        </CardContent>
      </Card>
    </div>
  );
}
