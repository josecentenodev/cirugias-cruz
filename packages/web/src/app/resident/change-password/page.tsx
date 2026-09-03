import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ChangePasswordForm } from "@/features/resident-session/components/ChangePasswordForm";

// Same CSP-nonce reasoning as every other page in this app — see
// app/(auth)/login/page.tsx.
export const dynamic = "force-dynamic";

/**
 * Reached two ways: forced right after a first login on a temporary
 * password (ADR 0017 — `api` blocks every other Resident route until
 * this happens), or voluntarily later from the same URL. The form and
 * the action are identical either way; this page doesn't know or care
 * which case it is.
 */
export default function ResidentChangePasswordPage() {
  return (
    <Card className="mx-auto max-w-md">
      <CardHeader>
        <CardTitle>Set your password</CardTitle>
        <CardDescription>
          Choose a password only you know. You won&apos;t be able to do anything else until you set
          one.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChangePasswordForm />
      </CardContent>
    </Card>
  );
}
