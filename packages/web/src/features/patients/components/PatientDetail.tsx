import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PatientView } from "../mappers";

export function PatientDetail({ patient }: { patient: PatientView }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{patient.fullName}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        <Field label="Phone" value={patient.phone} />
        <Field label="Email" value={patient.email} />
        <Field label="Date of birth" value={patient.dateOfBirthLabel} />
        {patient.observations ? (
          <div className="sm:col-span-2">
            <Field label="Observations" value={patient.observations} />
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm">{value}</dd>
    </div>
  );
}
