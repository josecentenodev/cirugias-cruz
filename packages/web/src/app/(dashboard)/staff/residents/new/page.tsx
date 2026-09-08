import { Breadcrumbs } from "@/components/Breadcrumbs";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { messages } from "@/messages/en";
import { ResidentForm } from "@/features/residents/components/ResidentForm";

// See app/(auth)/login/page.tsx for why: nonce-based CSP requires dynamic rendering.
export const dynamic = "force-dynamic";

export default function NewResidentPage() {
  return (
    <div className="flex flex-col gap-4">
      <Breadcrumbs
        items={[
          { label: messages.residents.listTitle, href: "/staff/residents" },
          { label: messages.residents.newTitle },
        ]}
      />
      <PageHeader title={messages.residents.newTitle} />
      <Card>
        <CardHeader>
          <CardTitle>{messages.residents.detailsCard}</CardTitle>
        </CardHeader>
        <CardContent>
          <ResidentForm />
        </CardContent>
      </Card>
    </div>
  );
}
