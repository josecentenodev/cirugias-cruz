import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResidentForm } from "@/features/residents/components/ResidentForm";

// See app/(auth)/login/page.tsx for why: nonce-based CSP requires dynamic rendering.
export const dynamic = "force-dynamic";

export default function NewResidentPage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-semibold">Register resident</h1>
      <Card>
        <CardHeader>
          <CardTitle>Resident details</CardTitle>
        </CardHeader>
        <CardContent>
          <ResidentForm />
        </CardContent>
      </Card>
    </div>
  );
}
