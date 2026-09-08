import { Breadcrumbs } from "@/components/Breadcrumbs";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { messages } from "@/messages/en";
import { PatientForm } from "@/features/patients/components/PatientForm";

// See app/(auth)/login/page.tsx for why: nonce-based CSP requires dynamic rendering.
export const dynamic = "force-dynamic";

export default function NewPatientPage() {
  return (
    <div className="flex flex-col gap-4">
      <Breadcrumbs
        items={[
          { label: messages.patients.listTitle, href: "/patients" },
          { label: messages.patients.newTitle },
        ]}
      />
      <PageHeader title={messages.patients.newTitle} />
      <Card>
        <CardHeader>
          <CardTitle>{messages.patients.detailsCard}</CardTitle>
        </CardHeader>
        <CardContent>
          <PatientForm />
        </CardContent>
      </Card>
    </div>
  );
}
