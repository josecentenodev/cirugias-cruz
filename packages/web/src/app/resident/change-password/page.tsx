import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { messages } from "@/messages/en";
import { ChangePasswordForm } from "@/features/resident-session/components/ChangePasswordForm";

// Same CSP-nonce reasoning as every other page in this app — see
// app/(auth)/login/page.tsx.
export const dynamic = "force-dynamic";

/**
 * A voluntary "change my password" page — the Resident's first password
 * is set by accepting their invitation (ADR 0029, `/accept-invitation`),
 * not here; there is no forced first-login redirect anymore.
 */
export default function ResidentChangePasswordPage() {
  return (
    <Card className="mx-auto max-w-md">
      <CardHeader>
        <CardTitle>{messages.resident.changePassword.title}</CardTitle>
        <CardDescription>{messages.resident.changePassword.subtitle}</CardDescription>
      </CardHeader>
      <CardContent>
        <ChangePasswordForm />
      </CardContent>
    </Card>
  );
}
