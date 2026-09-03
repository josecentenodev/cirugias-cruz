import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

// See app/(auth)/login/page.tsx for why: nonce-based CSP requires dynamic rendering.
// (This page has no data fetch of its own, but stays consistent with
// every other page in the (auth) route group for the same reason.)
export const dynamic = "force-dynamic";

/**
 * Landed on right after registering (ADR 0015) — the account exists but
 * isn't usable yet. No resend-confirmation action here yet (a known,
 * documented gap in the ADR, not an oversight).
 */
export default function CheckEmailPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Check your email</CardTitle>
        <CardDescription>
          We sent a confirmation link to the address you registered with. Open it to activate your
          account.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Already confirmed?{" "}
          <Link href="/login" className="font-medium text-foreground hover:underline">
            Sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
