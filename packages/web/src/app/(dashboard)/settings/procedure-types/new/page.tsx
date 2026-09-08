import { Breadcrumbs } from "@/components/Breadcrumbs";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { messages } from "@/messages/en";
import { ProcedureTypeForm } from "@/features/procedure-types/components/ProcedureTypeForm";

// See app/(auth)/login/page.tsx for why: nonce-based CSP requires dynamic rendering.
export const dynamic = "force-dynamic";

export default function NewProcedureTypePage() {
  return (
    <div className="flex flex-col gap-4">
      <Breadcrumbs
        items={[
          { label: messages.procedureTypes.listTitle, href: "/settings/procedure-types" },
          { label: messages.procedureTypes.newTitle },
        ]}
      />
      <PageHeader title={messages.procedureTypes.newTitle} />
      <Card>
        <CardHeader>
          <CardTitle>{messages.procedureTypes.detailsCard}</CardTitle>
        </CardHeader>
        <CardContent>
          <ProcedureTypeForm />
        </CardContent>
      </Card>
    </div>
  );
}
