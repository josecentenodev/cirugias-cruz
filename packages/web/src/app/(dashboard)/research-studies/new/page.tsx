import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResearchStudyForm } from "@/features/research-studies/components/ResearchStudyForm";

// See app/(auth)/login/page.tsx for why: nonce-based CSP requires dynamic rendering.
export const dynamic = "force-dynamic";

export default function NewResearchStudyPage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-semibold">Register research study</h1>
      <Card>
        <CardHeader>
          <CardTitle>Study details</CardTitle>
        </CardHeader>
        <CardContent>
          <ResearchStudyForm />
        </CardContent>
      </Card>
    </div>
  );
}
