import Link from "next/link";
import { Alert } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { LoginForm } from "@/features/auth/components/LoginForm";

// Forces per-request rendering so `proxy.ts`'s fresh CSP nonce actually
// reaches this page's script tags — a statically-prerendered page has no
// per-request nonce to thread through (see lib/security-headers.ts and
// Next's own CSP guide: nonces require dynamic rendering).
export const dynamic = "force-dynamic";

/**
 * `?reason=session-expired` — set by `authed-api-request.ts` when a
 * protected call 401s (deactivated Resident, or any other dead session)
 * and redirects here. The security behavior (immediate 401 + redirect)
 * was already correct; this just explains it instead of the silent
 * bounce-to-login a Resident/Physician previously saw.
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>;
}) {
  const { reason } = await searchParams;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Epitaxy</CardTitle>
        <CardDescription>Sign in to your account</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {reason === "session-expired" ? (
          <Alert variant="muted">Your session ended — please log in again.</Alert>
        ) : null}
        <LoginForm />
        <p className="text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="font-medium text-foreground hover:underline">
            Create one
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
