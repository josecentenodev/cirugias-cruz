import { Breadcrumbs } from "@/components/Breadcrumbs";
import { FormLayout } from "@/components/FormLayout";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { messages } from "@/messages/en";
import { ResearchStudyForm } from "@/features/research-studies/components/ResearchStudyForm";

// See app/(auth)/login/page.tsx for why: nonce-based CSP requires dynamic rendering.
export const dynamic = "force-dynamic";

export default function NewResearchStudyPage() {
  return (
    <FormLayout>
      <div className="flex flex-col gap-4">
        <Breadcrumbs
          items={[
            { label: messages.research.listTitle, href: "/research-studies" },
            { label: messages.research.newTitle },
          ]}
        />
        <PageHeader title={messages.research.newTitle} />
        <Card>
          <CardHeader>
            <CardTitle>{messages.research.detailsCard}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResearchStudyForm />
          </CardContent>
        </Card>
      </div>
    </FormLayout>
  );
}
